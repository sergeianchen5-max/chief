'use server';

import { ChefPlan, FamilyMember, Ingredient, Gender, GoalType, ActivityLevel } from "@/lib/types";
import { generatePlanSchema } from "@/lib/schemas";

// ===================== КОНФИГУРАЦИЯ OPENROUTER =====================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Быстрые бесплатные модели (в порядке приоритета)
const MODELS = [
    "google/gemini-2.0-flash-lite-preview-02-05:free", // Самая быстрая
    "google/gemini-2.0-pro-exp-02-05:free",           // Умная (Google)
    "meta-llama/llama-3.3-70b-instruct:free",         // Llama 70B
    "mistralai/mistral-7b-instruct:free",             // Mistral 7B
];

// URL сайта для Referer
const SITE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://schef-xi.vercel.app";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY не задан в .env.local");
    }

    for (let modelIdx = 0; modelIdx < MODELS.length; modelIdx++) {
        const model = MODELS[modelIdx];

        for (let attempt = 0; attempt < 2; attempt++) {
            console.log(`[OpenRouter] 🚀 ${model} (модель ${modelIdx + 1}/${MODELS.length}, попытка ${attempt + 1})`);

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 45000); // 45 секунд

                const response = await fetch(OPENROUTER_API_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": SITE_URL,
                        "X-Title": "Schef Fridge",
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt },
                        ],
                        temperature: 0.5,
                        max_tokens: 4000,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (response.status === 429) {
                    console.warn(`[OpenRouter] ⏳ 429 от ${model}. Ждём 3 сек...`);
                    await sleep(3000);
                    continue;
                }

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error(`[OpenRouter] ❌ ${response.status} от ${model}:`, errorBody.substring(0, 200));
                    break; // следующая модель
                }

                const data = await response.json() as any;
                const content = data?.choices?.[0]?.message?.content;

                if (!content || content.trim().length === 0) {
                    console.warn(`[OpenRouter] ⚠️ Пустой ответ от ${model}.`);
                    break;
                }

                console.log(`[OpenRouter] ✅ Ответ от ${model} (${content.length} символов)`);
                return content;

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.warn(`[OpenRouter] ⏰ Таймаут ${model} (45с).`);
                } else {
                    console.error(`[OpenRouter] ❌ ${model}:`, error.message);
                }
                break;
            }
        }
    }

    throw new Error("Все модели временно перегружены. Подождите 1-2 минуты и попробуйте снова.");
}

// Извлекает JSON из ответа модели
function extractJSON(text: string): string {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) return jsonBlockMatch[1].trim();

    const jsonObjMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) return jsonObjMatch[0].trim();

    const jsonArrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonArrMatch) return jsonArrMatch[0].trim();

    return cleaned;
}

// ===================== ГЕНЕРАЦИЯ МЕНЮ =====================

const SYSTEM_PROMPT = `Ты — JSON-генератор меню. Отвечай СТРОГО ТОЛЬКО валидным JSON. Без текста до или после JSON. Без markdown-обёрток. Без объяснений. Только JSON.`;

export async function generateChefPlan(
    inventory: Ingredient[],
    family: FamilyMember[],
    onlyFridge: boolean
): Promise<ChefPlan> {

    let activeFamily = family;
    if (!activeFamily || activeFamily.length === 0) {
        activeFamily = [{
            id: 'default', name: 'Тестер', age: 30, gender: Gender.MALE,
            height: 180, weight: 75, activityLevel: ActivityLevel.MODERATE,
            goal: GoalType.MAINTENANCE, preferences: 'Всеядный'
        }];
    }

    const validation = generatePlanSchema.safeParse({ inventory, family: activeFamily, onlyFridge });
    if (!validation.success) {
        throw new Error("Ошибка валидации: " + validation.error.message);
    }

    const inventoryList = (inventory.length > 0 ? inventory.map(i => i.name).join(", ") : "Пустой холодильник") + ", Вода, Соль, Перец";

    const familyProfiles = activeFamily.map(f =>
        `- ${f.name}: ${f.gender}, ${f.age} лет, ${f.height}см, ${f.weight}кг. Активность: ${f.activityLevel}. Цель: ${f.goal}. Предпочтения: ${f.preferences}.`
    ).join("\n");

    const prompt = `Продукты: ${inventoryList}
Семья (${activeFamily.length} чел.):
${familyProfiles}

Только из холодильника: ${onlyFridge ? 'ДА' : 'НЕТ'}.

Создай меню:
- Завтрак: 2 блюда
- Суп: 1 блюдо
- Основное: 2 блюда
- Десерт: 1 блюдо

Для каждого: краткие пошаговые инструкции, ингредиенты с количеством, КБЖУ, процент от нормы каждого члена семьи.
Список покупок: reason = название рецепта.
ВСЁ на русском.

JSON:
{
  "summary": "краткое описание",
  "recipes": [
    {
      "name": "название",
      "description": "описание",
      "cookingTimeMinutes": 30,
      "difficulty": "легко|средне|сложно",
      "ingredientsToUse": ["Название (Кол-во)"],
      "missingIngredients": ["Название (Кол-во)"],
      "healthBenefits": "польза",
      "weightPerServing": "250г",
      "totalWeightForFamily": "1кг",
      "caloriesPerServing": "350 ккал",
      "protein": "25г",
      "fats": "15г",
      "carbs": "30г",
      "instructions": ["шаг 1", "шаг 2"],
      "mealType": ["Завтрак"],
      "familySuitability": [
        {
          "memberName": "Имя",
          "percentage": 85,
          "reason": "причина",
          "nutritionStats": {
            "caloriesPercent": 14,
            "proteinPercent": 20,
            "fatPercent": 18,
            "carbPercent": 10
          }
        }
      ]
    }
  ],
  "shoppingList": [
    { "name": "продукт", "quantity": "кол-во", "reason": "Название Рецепта" }
  ]
}`;

    try {
        const rawResponse = await callOpenRouter(SYSTEM_PROMPT, prompt);
        const jsonStr = extractJSON(rawResponse);
        const plan = JSON.parse(jsonStr) as ChefPlan;
        console.log(`[OpenRouter] ✅ Меню: ${plan.recipes?.length || 0} рецептов`);
        return plan;
    } catch (error: any) {
        console.error("Ошибка генерации меню:", error.message);
        throw new Error(`Ошибка генерации меню: ${error.message || 'Неизвестная ошибка'}`);
    }
}

// ===================== РАСПОЗНАВАНИЕ ПРОДУКТОВ =====================

const VISION_MODELS = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "google/gemini-2.0-pro-exp-02-05:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "google/gemini-flash-1.5-8b",
];

export async function recognizeIngredients(base64Image: string): Promise<Ingredient[]> {
    if (!base64Image) throw new Error("Изображение не предоставлено");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY не задан");

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    for (let modelIdx = 0; modelIdx < VISION_MODELS.length; modelIdx++) {
        const model = VISION_MODELS[modelIdx];
        console.log(`[Vision] 👁️ Пробуем ${model}...`);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30 сек на фото

            const response = await fetch(OPENROUTER_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": SITE_URL,
                    "X-Title": "Schef Fridge",
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
                                {
                                    type: "text",
                                    text: `Посмотри на фото холодильника или продуктов. Перечисли ВСЕ продукты, которые видишь.
ОТВЕТЬ СТРОГО ТОЛЬКО ВАЛИДНЫМ JSON массивом объектов (без Markdown, без 'json'):
[{"name": "Название (RU)", "category": "produce|dairy|meat|pantry|frozen|other"}]`
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1000,
                }),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (response.status === 429) {
                console.warn(`[Vision] ⏳ 429 от ${model}.`);
                continue;
            }

            if (!response.ok) {
                const err = await response.text();
                console.error(`[Vision] ❌ Ошибка ${model}: ${err.substring(0, 100)}`);
                continue;
            }

            const data = await response.json() as any;
            const content = data?.choices?.[0]?.message?.content;

            if (!content) {
                console.warn(`[Vision] ⚠️ Пустой ответ от ${model}`);
                continue;
            }

            console.log(`[Vision] ✅ Успех (${model})`);

            const jsonStr = extractJSON(content);
            const rawItems = JSON.parse(jsonStr);

            if (!Array.isArray(rawItems)) throw new Error("Ответ не является массивом");

            return rawItems.map((item: any) => ({
                id: Date.now().toString() + Math.random().toString().slice(2, 6),
                name: item.name,
                category: item.category || 'other'
            }));

        } catch (error: any) {
            console.error(`[Vision] 💥 Ошибка ${model}:`, error.message);
        }
    }

    throw new Error("Не удалось распознать продукты. Все Vision-модели недоступны или не поняли фото.");
}
