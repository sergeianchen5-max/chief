'use server';

import { ChefPlan, FamilyMember, Ingredient, Gender, GoalType, ActivityLevel } from "@/lib/types";
import { generatePlanSchema } from "@/lib/schemas";

// ===================== КОНФИГУРАЦИЯ OPENROUTER =====================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Бесплатные модели (в порядке приоритета)
const MODELS = [
    "google/gemma-3-27b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1-0528:free",
    "google/gemma-3-1b-it:free",
    "microsoft/phi-4-reasoning:free",
    "nvidia/llama-3.1-nemotron-nano-12b-v1:free",
];

// Задержка в мс
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenRouter(userPrompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY не задан в .env.local");
    }

    // Пробуем каждую модель, при 429 делаем retry
    for (let modelIdx = 0; modelIdx < MODELS.length; modelIdx++) {
        const model = MODELS[modelIdx];

        for (let attempt = 0; attempt < 2; attempt++) { // 2 попытки на модель
            console.log(`[OpenRouter] 🚀 ${model} (модель ${modelIdx + 1}/${MODELS.length}, попытка ${attempt + 1})`);

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 120000);

                const response = await fetch(OPENROUTER_API_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Schef Fridge",
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: "user", content: userPrompt }],
                        temperature: 0.7,
                        max_tokens: 8000,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (response.status === 429) {
                    console.warn(`[OpenRouter] ⏳ 429 от ${model}. Ждём 10 сек...`);
                    await sleep(10000);
                    continue; // retry та же модель
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
                    break; // следующая модель
                }

                console.log(`[OpenRouter] ✅ Ответ от ${model} (${content.length} символов)`);
                return content;

            } catch (error: any) {
                if (error.name === 'AbortError') {
                    console.warn(`[OpenRouter] ⏰ Таймаут ${model}.`);
                } else {
                    console.error(`[OpenRouter] ❌ ${model}:`, error.message);
                }
                break; // следующая модель
            }
        }
    }

    throw new Error("Все модели временно перегружены (429). Подождите 1-2 минуты и попробуйте снова.");
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

    const prompt = `Ты — "Шеф Холодильник", шеф-повар и нутрициолог.

Продукты: ${inventoryList}
Семья (${activeFamily.length} чел.):
${familyProfiles}

Готовить ТОЛЬКО из холодильника: ${onlyFridge ? 'ДА' : 'НЕТ'}.

Создай меню:
- Завтрак: 3 блюда
- Суп: 2 блюда
- Основное (Обед/Ужин): 3 блюда
- Десерт: 2 блюда
- Хиты: 2 блюда

Для каждого: подробные пошаговые инструкции, количества на семью "Название (Количество)", КБЖУ на порцию, процент от дневной нормы каждого члена семьи.
Список покупок: поле reason = точное название рецепта.
ВСЁ на русском языке.

ОТВЕТЬ СТРОГО ТОЛЬКО ВАЛИДНЫМ JSON (без текста до/после, без \`\`\`json обёрток):
{
  "summary": "краткое описание меню",
  "recipes": [
    {
      "name": "название блюда",
      "description": "описание",
      "cookingTimeMinutes": 30,
      "difficulty": "легко|средне|сложно",
      "ingredientsToUse": ["Название (Количество)"],
      "missingIngredients": ["Название (Количество)"],
      "healthBenefits": "польза для здоровья",
      "weightPerServing": "250г",
      "totalWeightForFamily": "1кг",
      "caloriesPerServing": "350 ккал",
      "protein": "25г",
      "fats": "15г",
      "carbs": "30г",
      "instructions": ["шаг 1...", "шаг 2..."],
      "mealType": ["Завтрак"],
      "familySuitability": [
        {
          "memberName": "Имя",
          "percentage": 85,
          "reason": "причина оценки",
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
    { "name": "продукт", "quantity": "количество", "reason": "Точное Название Рецепта" }
  ]
}`;

    try {
        const rawResponse = await callOpenRouter(prompt);
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

export async function recognizeIngredients(base64Image: string): Promise<Ingredient[]> {
    if (!base64Image) throw new Error("Изображение не предоставлено");

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("OPENROUTER_API_KEY не задан");

        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

        const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Schef Fridge",
            },
            body: JSON.stringify({
                model: "google/gemma-3-27b-it:free",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
                            {
                                type: "text", text: `Определи все продукты питания на изображении.
ОТВЕТЬ СТРОГО ТОЛЬКО ВАЛИДНЫМ JSON массивом:
[{"name": "название на русском", "category": "produce|dairy|meat|pantry|frozen|other"}]` }
                        ]
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenRouter vision: ${response.status} - ${err.substring(0, 200)}`);
        }

        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Пустой ответ");

        const jsonStr = extractJSON(content);
        const rawItems = JSON.parse(jsonStr);
        return rawItems.map((item: any) => ({
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            name: item.name,
            category: item.category
        }));
    } catch (error: any) {
        console.error("Ошибка Vision:", error.message);
        throw new Error("Не удалось распознать продукты: " + error.message);
    }
}
