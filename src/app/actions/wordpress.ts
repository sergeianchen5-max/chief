'use server';

/**
 * Публикация рецептов в WordPress через REST API
 * 
 * Нужны env-переменные:
 *   WP_API_URL — URL REST API, например: https://blog.schef.ru/wp-json/wp/v2
 *   WP_APP_PASSWORD — Application Password (Настройки → Пользователи → Application Passwords)
 *   WP_USERNAME — Имя пользователя WordPress (обычно admin)
 */

import { createClient } from '@/lib/supabase/server';

interface WPPostData {
    title: string;
    content: string;
    status: 'publish' | 'draft';
    categories?: number[];
    tags?: number[];
    meta?: Record<string, any>;
}

/**
 * Генерирует HTML-контент статьи из рецепта
 */
function generateRecipeHTML(recipe: any): string {
    const content = recipe.content || recipe;

    const name = content.name || recipe.title || 'Рецепт';
    const description = content.description || '';
    const cookTime = content.cookingTimeMinutes || '—';
    const calories = content.caloriesPerServing || '—';
    const weight = content.weightPerServing || '—';
    const difficulty = content.difficulty || '—';
    const servings = content.servings || 2;
    const healthBenefits = content.healthBenefits || '';

    const ingredientsUsed = content.ingredientsToUse || [];
    const ingredientsMissing = content.missingIngredients || [];
    const allIngredients = [...ingredientsUsed, ...ingredientsMissing];
    const instructions = content.instructions || [];
    const mealTypes = content.mealType || [];

    let html = '';

    // Описание
    if (description) {
        html += `<p class="recipe-description">${description}</p>\n\n`;
    }

    // Мета-данные рецепта
    html += `<div class="recipe-meta">\n`;
    html += `<p>⏱ <strong>Время приготовления:</strong> ${cookTime} мин</p>\n`;
    html += `<p>🔥 <strong>Калорийность:</strong> ${calories}</p>\n`;
    html += `<p>⚖️ <strong>Вес порции:</strong> ${weight}</p>\n`;
    html += `<p>📊 <strong>Сложность:</strong> ${difficulty}</p>\n`;
    html += `<p>🍽 <strong>Порций:</strong> ${servings}</p>\n`;
    if (mealTypes.length > 0) {
        html += `<p>🏷 <strong>Категория:</strong> ${mealTypes.join(', ')}</p>\n`;
    }
    html += `</div>\n\n`;

    // Ингредиенты
    if (allIngredients.length > 0) {
        html += `<h2>🛒 Ингредиенты</h2>\n<ul>\n`;
        ingredientsUsed.forEach((ing: string) => {
            html += `<li>✅ ${ing}</li>\n`;
        });
        ingredientsMissing.forEach((ing: string) => {
            html += `<li>🛒 ${ing} <em>(нужно купить)</em></li>\n`;
        });
        html += `</ul>\n\n`;
    }

    // Инструкция
    if (instructions.length > 0) {
        html += `<h2>👨‍🍳 Приготовление</h2>\n<ol>\n`;
        instructions.forEach((step: string) => {
            html += `<li>${step}</li>\n`;
        });
        html += `</ol>\n\n`;
    }

    // Польза
    if (healthBenefits) {
        html += `<h2>💚 Польза для здоровья</h2>\n`;
        html += `<p>${healthBenefits}</p>\n\n`;
    }

    // Schema.org (JSON-LD для SEO)
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": name,
        "description": description,
        "totalTime": `PT${cookTime}M`,
        "recipeYield": `${servings} порций`,
        "recipeCategory": mealTypes.join(', '),
        "recipeIngredient": allIngredients,
        "recipeInstructions": instructions.map((step: string, i: number) => ({
            "@type": "HowToStep",
            "position": i + 1,
            "text": step
        })),
        "nutrition": {
            "@type": "NutritionInformation",
            "calories": calories
        }
    };

    html += `\n<!-- Schema.org JSON-LD -->\n`;
    html += `<script type="application/ld+json">${JSON.stringify(schemaData)}</script>\n`;

    return html;
}

/**
 * Публикует рецепт в WordPress
 * Возвращает URL опубликованной статьи или null при ошибке
 */
export async function publishToWordPress(recipeId: string): Promise<{ success: boolean; wpUrl?: string; error?: string }> {
    const wpApiUrl = process.env.WP_API_URL;
    const wpUsername = process.env.WP_USERNAME || 'admin';
    const wpAppPassword = process.env.WP_APP_PASSWORD;

    if (!wpApiUrl || !wpAppPassword) {
        console.log('[WP] Публикация в WP пропущена — WP_API_URL или WP_APP_PASSWORD не настроены');
        return { success: false, error: 'WordPress не настроен (нет WP_API_URL / WP_APP_PASSWORD)' };
    }

    try {
        // Загружаем рецепт из Supabase
        const supabase = await createClient();
        const { data: recipe, error: dbError } = await supabase
            .from('recipes')
            .select('id, title, slug, content, created_at')
            .eq('id', recipeId)
            .single();

        if (dbError || !recipe) {
            throw new Error(`Рецепт не найден: ${dbError?.message || 'нет данных'}`);
        }

        // Генерируем HTML
        const htmlContent = generateRecipeHTML(recipe);
        const authHeader = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64');

        // Публикуем в WordPress
        const postData: WPPostData = {
            title: recipe.title || recipe.content?.name || 'Рецепт',
            content: htmlContent,
            status: 'publish',
        };

        const response = await fetch(`${wpApiUrl}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`WP API ошибка ${response.status}: ${errorBody}`);
        }

        const wpPost = await response.json();
        const wpUrl = wpPost.link || wpPost.guid?.rendered || '';

        console.log(`[WP] ✅ Рецепт "${recipe.title}" опубликован: ${wpUrl}`);

        // Сохраняем ссылку на WP-статью в Supabase
        await supabase
            .from('recipes')
            .update({ wp_url: wpUrl })
            .eq('id', recipeId);

        return { success: true, wpUrl };
    } catch (err: any) {
        console.error('[WP] ❌ Ошибка публикации:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Массовая публикация всех одобренных рецептов без wp_url
 */
export async function publishPendingToWordPress(): Promise<{ published: number; errors: number }> {
    const supabase = await createClient();

    const { data: recipes, error } = await supabase
        .from('recipes')
        .select('id')
        .eq('moderation_status', 'approved')
        .eq('is_public', true)
        .is('wp_url', null)
        .limit(10);

    if (error || !recipes) {
        console.error('[WP] Ошибка получения рецептов:', error?.message);
        return { published: 0, errors: 1 };
    }

    let published = 0;
    let errors = 0;

    for (const recipe of recipes) {
        const result = await publishToWordPress(recipe.id);
        if (result.success) {
            published++;
        } else {
            errors++;
        }
    }

    console.log(`[WP] Массовая публикация: ${published} опубликовано, ${errors} ошибок`);
    return { published, errors };
}
