import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ChefPlan, Recipe } from '@/lib/types';
import { Clock, Scale, Utensils } from 'lucide-react';

// Revalidate page every hour for new data if needed
export const revalidate = 3600;

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: recipeData } = await supabase
        .from('recipes')
        .select('title, content')
        .eq('slug', slug)
        .eq('is_public', true)
        .eq('moderation_status', 'approved')
        .single();

    if (!recipeData) {
        return { title: 'Рецепт не найден | Шеф Холодильник' };
    }

    const plan = recipeData.content as ChefPlan;
    const firstRecipe: Recipe | undefined = plan.recipes?.[0];

    return {
        title: `${recipeData.title} | Сгенерировано ИИ Шеф-Холодильник`,
        description: firstRecipe?.description || 'Отличный рецепт, сгенерированный ИИ из ваших ингредиентов.',
        openGraph: {
            title: recipeData.title,
            description: firstRecipe?.description || 'Отличный рецепт, сгенерированный ИИ из ваших ингредиентов.',
            images: firstRecipe?.imageUrl ? [firstRecipe.imageUrl] : [],
        }
    };
}

export default async function RecipePage({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: recipeData, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('slug', slug)
        // .eq('is_public', true) // Отключено для тестов, вернуть позже: .eq('moderation_status', 'approved')
        .single();

    if (error || !recipeData) {
        notFound();
    }

    const plan = recipeData.content as unknown as ChefPlan;
    if (!plan || !plan.recipes || plan.recipes.length === 0) {
        notFound();
    }

    // Для SEO страницы мы берем первый (главный) рецепт из сгенерированного плана.
    // Если план содержит 3 рецепта, мы выводим их все, но акцент на первом.
    const recipes = plan.recipes;

    // JSON-LD для Google
    const jsonLd = recipes.map(recipe => ({
        '@context': 'https://schema.org/',
        '@type': 'Recipe',
        name: recipe.name,
        image: recipe.imageUrl ? [recipe.imageUrl] : [],
        author: {
            '@type': 'Organization',
            name: 'Шеф-Холодильник'
        },
        datePublished: new Date(recipeData.created_at).toISOString(),
        description: recipe.description,
        prepTime: `PT${recipe.cookingTimeMinutes}M`,
        cookTime: `PT${recipe.cookingTimeMinutes}M`,
        totalTime: `PT${recipe.cookingTimeMinutes}M`,
        recipeYield: recipe.totalWeightForFamily,
        recipeCategory: recipe.mealType?.join(', ') || 'Main Course',
        nutrition: {
            '@type': 'NutritionInformation',
            calories: recipe.caloriesPerServing,
            proteinContent: recipe.protein,
            fatContent: recipe.fats,
            carbohydrateContent: recipe.carbs
        },
        recipeIngredient: [...recipe.ingredientsToUse, ...recipe.missingIngredients],
        recipeInstructions: recipe.instructions?.map((inst, index) => ({
            '@type': 'HowToStep',
            text: inst,
            position: index + 1
        })) || []
    }));

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* JSON-LD Script */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <header className="bg-white px-6 py-4 shadow-sm sticky top-0 z-50">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                            Ш
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                            Шеф
                        </h1>
                    </div>
                    <a href="/" className="text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 px-4 py-2 rounded-full hidden sm:block">
                        Сгенерировать свой рецепт
                    </a>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{recipeData.title}</h1>
                    <p className="text-gray-600 text-lg">{plan.summary}</p>
                </div>

                {recipes.map((recipe, index) => (
                    <article key={index} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                        {recipe.imageUrl ? (
                            <div className="w-full h-64 sm:h-80 relative bg-gray-100">
                                <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-full h-40 bg-orange-50 flex items-center justify-center text-orange-200">
                                <Utensils size={48} />
                            </div>
                        )}

                        <div className="p-6 sm:p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{recipe.name}</h2>
                            <p className="text-gray-600 mb-6">{recipe.description}</p>

                            <div className="flex flex-wrap gap-4 mb-8 bg-orange-50 rounded-2xl p-4">
                                <div className="flex items-center gap-2 text-orange-800">
                                    <Clock size={20} className="text-orange-500" />
                                    <span className="font-semibold">{recipe.cookingTimeMinutes} мин</span>
                                </div>
                                <div className="flex items-center gap-2 text-orange-800 border-l border-orange-200 pl-4">
                                    <Utensils size={20} className="text-orange-500" />
                                    <span className="font-semibold">{recipe.caloriesPerServing} / порция</span>
                                </div>
                                <div className="flex items-center gap-2 text-orange-800 border-l border-orange-200 pl-4">
                                    <Scale size={20} className="text-orange-500" />
                                    <span className="font-semibold">{recipe.weightPerServing}</span>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        Ингредиенты
                                    </h3>
                                    <ul className="space-y-2">
                                        {recipe.ingredientsToUse.map((ing, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                                                <span className="text-gray-700">{ing}</span>
                                            </li>
                                        ))}
                                        {recipe.missingIngredients.map((ing, i) => (
                                            <li key={`m-${i}`} className="flex items-start gap-2 opacity-60">
                                                <div className="w-1.5 h-1.5 rounded-full border border-orange-500 mt-2 shrink-0" />
                                                <span className="text-gray-600 line-through">{ing} (нет в наличии)</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                                    <h3 className="text-lg font-bold text-green-900 mb-2">Польза блюда</h3>
                                    <p className="text-green-800 text-sm leading-relaxed">{recipe.healthBenefits}</p>

                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <div className="flex justify-between text-xs text-green-700 mb-1">
                                            <span>Белки: {recipe.protein}</span>
                                            <span>Жиры: {recipe.fats}</span>
                                            <span>Углеводы: {recipe.carbs}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Приготовление</h3>
                                <ol className="space-y-6">
                                    {recipe.instructions?.map((step, i) => (
                                        <li key={i} className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                                {i + 1}
                                            </div>
                                            <p className="text-gray-700 leading-relaxed pt-1">{step}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </article>
                ))}

                <div className="bg-orange-600 rounded-3xl p-8 text-center text-white mt-12 shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Хотите сгенерировать своё меню?</h2>
                    <p className="text-orange-100 mb-8 max-w-lg mx-auto">
                        Введите список продуктов, которые есть у вас в холодильнике, и ИИ-Шеф подберёт для вас идеальные блюда.
                    </p>
                    <a href="/" className="inline-block bg-white text-orange-600 font-bold px-8 py-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        Создать меню бесплатно
                    </a>
                </div>
            </main>
        </div>
    );
}
