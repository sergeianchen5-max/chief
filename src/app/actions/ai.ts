'use server';

import { GoogleGenAI, Type } from "@google/genai";
import { ChefPlan, FamilyMember, Ingredient, Gender, GoalType, ActivityLevel, MealCategory } from "@/lib/types";

// ===================== CONFIGURATION =====================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Fallback models for OpenRouter (Free Tier priority)
const OPENROUTER_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "mistralai/mistral-small-24b-instruct-2501:free",
];

const SITE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://schef-xi.vercel.app";

// Helper for type safety in responses
export type GenerateResult =
    | { success: true; data: ChefPlan }
    | { success: false; error: string };

// ===================== SCHEMAS =====================

// Strict Schema for Gemini
const planSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING },
        recipes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    cookingTimeMinutes: { type: Type.INTEGER },
                    difficulty: { type: Type.STRING },
                    ingredientsToUse: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients FROM FRIDGE with quantities calculated for the family. Format: 'Name (Quantity)', e.g., 'Carrots (200g)'" },
                    missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of ingredients TO BUY with quantities. Format: 'Name (Quantity)', e.g., 'Cream (500ml)'" },
                    healthBenefits: { type: Type.STRING },
                    weightPerServing: { type: Type.STRING },
                    totalWeightForFamily: { type: Type.STRING, description: "Total weight of the cooked dish for the entire family (e.g. '1.2 kg')" },
                    caloriesPerServing: { type: Type.STRING },
                    protein: { type: Type.STRING },
                    fats: { type: Type.STRING },
                    carbs: { type: Type.STRING },
                    instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    mealType: { type: Type.ARRAY, items: { type: Type.STRING } },
                    familySuitability: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                memberName: { type: Type.STRING },
                                percentage: { type: Type.INTEGER, description: "Suitability score 0-100" },
                                reason: { type: Type.STRING },
                                nutritionStats: {
                                    type: Type.OBJECT,
                                    description: "Percentage of Daily Value (DV) for this specific person provided by ONE serving of this recipe.",
                                    properties: {
                                        caloriesPercent: { type: Type.INTEGER, description: "% of daily Calorie needs" },
                                        proteinPercent: { type: Type.INTEGER, description: "% of daily Protein needs" },
                                        fatPercent: { type: Type.INTEGER, description: "% of daily Fat needs" },
                                        carbPercent: { type: Type.INTEGER, description: "% of daily Carb needs" }
                                    },
                                    required: ["caloriesPercent", "proteinPercent", "fatPercent", "carbPercent"]
                                }
                            },
                            required: ["memberName", "percentage", "reason", "nutritionStats"]
                        }
                    }
                },
                required: ["name", "description", "cookingTimeMinutes", "difficulty", "ingredientsToUse", "missingIngredients", "healthBenefits", "weightPerServing", "totalWeightForFamily", "caloriesPerServing", "protein", "fats", "carbs", "instructions", "mealType", "familySuitability"]
            }
        },
        shoppingList: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    reason: { type: Type.STRING, description: "MUST be the EXACT name of the recipe requiring this item." }
                },
                required: ["name", "quantity", "reason"]
            }
        }
    },
    required: ["summary", "recipes", "shoppingList"]
};

// Simplified JSON Schema for OpenRouter (compatible with OpenAI format)
const openRouterPlanSchema = {
    type: "object",
    properties: {
        summary: { type: "string" },
        recipes: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    cookingTimeMinutes: { type: "integer" },
                    difficulty: { type: "string" },
                    ingredientsToUse: { type: "array", items: { type: "string" } },
                    missingIngredients: { type: "array", items: { type: "string" } },
                    healthBenefits: { type: "string" },
                    weightPerServing: { type: "string" },
                    totalWeightForFamily: { type: "string" },
                    caloriesPerServing: { type: "string" },
                    protein: { type: "string" },
                    fats: { type: "string" },
                    carbs: { type: "string" },
                    instructions: { type: "array", items: { type: "string" } },
                    mealType: { type: "array", items: { type: "string" } },
                    familySuitability: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                memberName: { type: "string" },
                                percentage: { type: "integer" },
                                reason: { type: "string" },
                                nutritionStats: {
                                    type: "object",
                                    properties: {
                                        caloriesPercent: { type: "integer" },
                                        proteinPercent: { type: "integer" },
                                        fatPercent: { type: "integer" },
                                        carbPercent: { type: "integer" }
                                    },
                                    required: ["caloriesPercent", "proteinPercent", "fatPercent", "carbPercent"]
                                }
                            },
                            required: ["memberName", "percentage", "reason", "nutritionStats"]
                        }
                    }
                },
                required: ["name", "description", "cookingTimeMinutes", "difficulty", "ingredientsToUse", "missingIngredients", "healthBenefits", "weightPerServing", "totalWeightForFamily", "caloriesPerServing", "protein", "fats", "carbs", "instructions", "mealType", "familySuitability"]
            }
        },
        shoppingList: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    quantity: { type: "string" },
                    reason: { type: "string" }
                },
                required: ["name", "quantity", "reason"]
            }
        }
    },
    required: ["summary", "recipes", "shoppingList"]
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
        breakfast: "- Breakfast (Завтрак): 2+ options.",
        soup: "- Soup (Суп): 1+ options.",
        main: "- Main Course (Обед/Ужин): 2+ options.",
        dessert: "- Dessert (Десерт): 1+ options.",
        salad: "- Salads (Салаты): 1+ options.",
        drink: "- Drinks (Напитки): 1+ options."
    };

    const requestedCategories = categories.map(c => categoryDescriptions[c] || "").join("\n         ");

    const categoriesSection = `
         ${requestedCategories}
         - Popular/Hits (Популярное): 2+ options. These MUST be universally loved "Hit" recipes.
    `;

    const prompt = `
      Act as "Chef Fridge", a passionate Michelin-star chef and nutritionist.
      Current Products (Fridge + Basic Pantry): ${inventoryList}
      Family Profiles (Total members: ${activeFamily.length}):
      ${familyProfiles} 
      
      CONSTRAINT: "Cook from Fridge Only" mode is set to: ${onlyFridge ? 'TRUE' : 'FALSE'}.
      
      Task:
      1. Analyze Family Goals & Body Stats (Height/Weight/Gender) to estimate daily calorie needs (TDEE).
      2. Create a MENU. 
         ${onlyFridge
            ? 'PRIORITY 1: Suggest recipes that use 100% of available ingredients. If impossible, missing ingredients must be minimal. PRIORITIZE EXISTING STOCK over variety.'
            : 'Suggest balanced recipes. It is okay to buy new ingredients.'
        }
      3. SELECT RECIPES: Choose dishes that are popularly known to be delicious and have high ratings in culinary culture.
      4. CATEGORIES:
         ${categoriesSection}
      
      5. INSTRUCTIONS: Provide **EXTREMELY DETAILED** cooking instructions. 
      
      6. QUANTITIES (CRITICAL):
         - In 'ingredientsToUse' and 'missingIngredients', you MUST specify the EXACT QUANTITY needed for the WHOLE FAMILY.
         - Format: "Product Name (Quantity)". 
         - Example: "Chicken Breast (600g)", "Carrots (2 medium)", "Milk (500ml)".
         - Do NOT just list the name. 
      
      7. FAMILY SUITABILITY & NUTRITION (CRITICAL):
         - For EACH recipe, populate 'familySuitability'.
         - 'nutritionStats': Calculate what percentage of the person's Daily Norm (KBJU) is covered by ONE serving of this dish.
         - Example: If Dad needs 2500kcal and the dish is 500kcal, caloriesPercent = 20.
      
      8. SHOPPING LIST:
         - 'reason' field MUST be the EXACT name of the recipe string. If the recipe name is "Borscht with Cream", the reason must be "Borscht with Cream".
      
      9. LANGUAGE: Russian.
    `;

    // 2. Try Gemini (Primary)
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY not found");

        const client = new GoogleGenAI({ apiKey });

        const response = await client.models.generateContent({
            model: "gemini-1.5-flash-001", // Use specific version to avoid 404
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: planSchema,
            },
        });

        const responseText = response.text;
        console.log("🔍 [AI] Raw response length:", responseText?.length);

        if (responseText) {
            // Clean up Markdown if present
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(cleanText) as ChefPlan;
            return { success: true, data: plan };
        }
        throw new Error("Empty response from Gemini");

    } catch (error: any) {
        console.warn(`[AI] ⚠️ Gemini Error: ${error.message}. Switching to OpenRouter Fallback...`);
        return await callOpenRouterFallback(prompt);
    }
}

async function callOpenRouterFallback(prompt: string): Promise<GenerateResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { success: false, error: "OpenRouter Key Missing" };

    for (const model of OPENROUTER_MODELS) {
        try {
            console.log(`[OpenRouter] Trying ${model}...`);
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
                    // Use 'json_object' mode instead of 'json_schema' for better compatibility with free models like Llama 3
                    response_format: { type: "json_object" },
                })
            });

            if (!response.ok) {
                const text = await response.text();
                // console.warn(`[OpenRouter] ${model} failed: ${text}`); 
                continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) continue;

            // Try to parse JSON from content (it might be wrapped in ```json ... ```)
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

            const plan = JSON.parse(cleanContent) as ChefPlan;

            // Basic validation
            if (!plan.recipes || !Array.isArray(plan.recipes)) {
                throw new Error("Invalid structure from OpenRouter");
            }

            return { success: true, data: plan };
        } catch (e: any) {
            console.warn(`[OpenRouter] Failed ${model}`, e.message);
        }
    }

    return { success: false, error: "Все AI сервисы недоступны. Попробуйте позже." };
}

// ===================== VISION LOGIC =====================

const ingredientListSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['produce', 'dairy', 'meat', 'pantry', 'frozen', 'other'] }
        },
        required: ["name", "category"]
    }
};

export async function recognizeIngredients(base64Image: string): Promise<Ingredient[]> {
    if (!base64Image) return [];

    const promptText = "Analyze this image. Identify all visible food ingredients. Return list with categories. Language: Russian.";

    // 1. Gemini Vision
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            const client = new GoogleGenAI({ apiKey });
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

            const response = await client.models.generateContent({
                model: "gemini-1.5-flash-001",
                contents: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Data } },
                    { text: promptText }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: ingredientListSchema,
                }
            });

            const text = response.text;
            if (text) {
                const rawItems = JSON.parse(text);
                return rawItems.map((item: any) => ({
                    id: Date.now().toString() + Math.random().toString().slice(2, 6),
                    name: item.name,
                    category: item.category
                }));
            }
        }
    } catch (e) {
        console.warn("Gemini Vision failed", e);
    }

    return [];
}
