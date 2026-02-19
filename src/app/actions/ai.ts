'use server';

// Allow streaming responses up to 60 seconds (max for Hobby/Pro on Vercel)
// Max duration config moved to next.config.ts or vercel.json if needed

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ChefPlan, FamilyMember, Ingredient, Gender, GoalType, ActivityLevel, MealCategory } from "@/lib/types";

// ===================== CONFIGURATION =====================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// OpenRouter Models 
const OPENROUTER_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "mistralai/mistral-small-24b-instruct-2501:free",
    // Fallback paid models if needed (commented out)
    // "openai/gpt-3.5-turbo",
];

const SITE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://schef-xi.vercel.app";

// Helper for type safety in responses
export type GenerateResult =
    | { success: true; data: ChefPlan }
    | { success: false; error: string };

// ===================== SCHEMAS (Gemini Fallback) =====================
const planSchema = {
    type: SchemaType.OBJECT,
    properties: {
        summary: { type: SchemaType.STRING },
        recipes: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    cookingTimeMinutes: { type: SchemaType.INTEGER },
                    difficulty: { type: SchemaType.STRING },
                    ingredientsToUse: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    missingIngredients: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    healthBenefits: { type: SchemaType.STRING },
                    weightPerServing: { type: SchemaType.STRING },
                    totalWeightForFamily: { type: SchemaType.STRING },
                    caloriesPerServing: { type: SchemaType.STRING },
                    protein: { type: SchemaType.STRING },
                    fats: { type: SchemaType.STRING },
                    carbs: { type: SchemaType.STRING },
                    instructions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    mealType: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    familySuitability: {
                        type: SchemaType.ARRAY,
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                memberName: { type: SchemaType.STRING },
                                percentage: { type: SchemaType.INTEGER },
                                reason: { type: SchemaType.STRING },
                                nutritionStats: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        caloriesPercent: { type: SchemaType.INTEGER },
                                        proteinPercent: { type: SchemaType.INTEGER },
                                        fatPercent: { type: SchemaType.INTEGER },
                                        carbPercent: { type: SchemaType.INTEGER }
                                    },
                                    required: ["caloriesPercent", "proteinPercent", "fatPercent", "carbPercent"]
                                }
                            },
                        }
                    }
                },
                required: ["name"]
            }
        },
        shoppingList: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    quantity: { type: SchemaType.STRING },
                    reason: { type: SchemaType.STRING }
                },
                required: ["name"]
            }
        }
    },
    required: ["summary", "recipes"]
};

// ===================== GENERATION LOGIC =====================

export async function generateChefPlan(
    inventory: Ingredient[],
    family: FamilyMember[],
    onlyFridge: boolean,
    categories: MealCategory[] = ['breakfast', 'soup', 'main', 'dessert']
): Promise<GenerateResult> {

    // 1. Prepare Data
    let activeFamily = family;
    if (!activeFamily || activeFamily.length === 0) {
        activeFamily = [{
            id: 'default', name: 'Тестер', age: 30, gender: Gender.MALE,
            height: 180, weight: 75, activityLevel: ActivityLevel.MODERATE,
            goal: GoalType.MAINTENANCE, preferences: 'Всеядный'
        }];
    }

    const inventoryList = (inventory.length > 0 ? inventory.map(i => i.name).join(", ") : "Empty Fridge") + ", Вода, Соль, Перец";

    const familyProfiles = activeFamily.map(f =>
        `- ${f.name}: ${f.gender}, ${f.age}y.o., ${f.height}cm, ${f.weight}kg. Activity: ${f.activityLevel}. Goal: ${f.goal}. Prefs: ${f.preferences}.`
    ).join("\n");

    const categoryDescriptions: Record<MealCategory, string> = {
        breakfast: "- Breakfast (Завтрак)",
        soup: "- Soup (Суп)",
        main: "- Main Course (Обед/Ужин)",
        dessert: "- Dessert (Десерт)",
        salad: "- Salads await (Салаты)",
        drink: "- Drinks (Напитки)"
    };

    const requestedCategories = categories.map(c => categoryDescriptions[c] || "").join("\n         ");

    const prompt = `
      Act as "Chef Fridge", a passionate Michelin-star chef and nutritionist.
      Inventories: ${inventoryList}
      Family: ${familyProfiles} 
      OnlyFridge: ${onlyFridge}.
      
      Task: Create a Menu JSON.
      Language: Russian.
      FORMAT: JSON with ChefPlan schema (summary, recipes[], shoppingList[]).
    `;

    // 2. Try OpenRouter (Primary)
    console.log("[AI] 🚀 Starting generation via OpenRouter...");
    const openRouterResult = await callOpenRouter(prompt);

    if (openRouterResult.success) {
        return openRouterResult;
    }

    // 3. Try Gemini Fallback (Secondary)
    console.warn(`[AI] ⚠️ OpenRouter failed: ${openRouterResult.error}. Trying Gemini Direct...`);
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY not found");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                // @ts-ignore
                responseSchema: planSchema,
            },
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        if (responseText) {
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(cleanText) as ChefPlan;
            return { success: true, data: plan };
        }
        throw new Error("Empty response from Gemini");

    } catch (error: any) {
        console.error(`[AI] ❌ All providers failed. Gemini Error: ${error.message}`);

        let msg = "Сервис перегружен. Попробуйте позже.";
        if (error.message.includes("404")) msg = "Ошибка доступа к AI (Геоблокировка).";

        return { success: false, error: msg };
    }
}

async function callOpenRouter(prompt: string): Promise<GenerateResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    console.log(`[OpenRouter] Extension Key Check: ${apiKey ? 'Present' : 'MISSING'}`);

    if (!apiKey) return { success: false, error: "OpenRouter Key Missing" };

    let lastError = "";

    for (const model of OPENROUTER_MODELS) {
        try {
            console.log(`[OpenRouter] 🔄 Trying ${model}...`);
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
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`[OpenRouter] ❌ ${model} failed status ${response.status}: ${text.substring(0, 200)}`);
                lastError = `Status ${response.status}`;
                continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                console.warn(`[OpenRouter] Empty content from ${model}`);
                continue;
            }

            // Try to parse JSON
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(cleanContent) as ChefPlan;

            // Basic validation
            if (!plan.recipes || !Array.isArray(plan.recipes)) {
                console.warn(`[OpenRouter] Invalid JSON structure from ${model}`);
                throw new Error("Invalid structure");
            }

            console.log(`[OpenRouter] ✅ Success with ${model}`);
            return { success: true, data: plan };
        } catch (e: any) {
            console.warn(`[OpenRouter] Exception with ${model}:`, e.message);
            lastError = e.message;
        }
    }

    return { success: false, error: `OpenRouter failed: ${lastError}` };
}

// ===================== VISION LOGIC =====================
const ingredientListSchema = {
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: { name: { type: SchemaType.STRING }, category: { type: SchemaType.STRING } }
    }
};

export async function recognizeIngredients(base64Image: string): Promise<Ingredient[]> {
    if (!base64Image) return [];
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // No schema for vision due to complexity

            const result = await model.generateContent([
                "List visible ingredients JSON: [{name, category}]",
                { inlineData: { data: base64Image.replace(/^data:image\/\w+;base64,/, ""), mimeType: "image/jpeg" } }
            ]);

            const txt = result.response.text();
            const json = JSON.parse(txt.replace(/```json/g, '').replace(/```/g, ''));
            return json.map((i: any) => ({ id: Math.random().toString(), name: i.name, category: i.category || 'other' }));
        }
    } catch (e) { console.warn("Vision failed", e); }
    return [];
}
