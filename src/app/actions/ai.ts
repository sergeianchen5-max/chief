'use server';

// Allow streaming responses up to 60 seconds (max for Hobby/Pro on Vercel)
// Max duration config moved to next.config.ts or vercel.json if needed

import { SchemaType } from "@google/generative-ai";
import { ChefPlan, FamilyMember, Ingredient, Gender, GoalType, ActivityLevel, MealCategory } from "@/lib/types";
import { HttpsProxyAgent } from 'https-proxy-agent';

// ===================== CONFIGURATION =====================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// OpenRouter Models 
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

// ===================== HELPERS =====================

function getProxyAgent() {
    const proxyUrl = process.env.PROXY_URL;
    if (proxyUrl) {
        console.log("[AI] 🛡️ Using Proxy:", proxyUrl.replace(/:[^:@]*@/, ':****@')); // Mask password
        return new HttpsProxyAgent(proxyUrl);
    }
    return undefined;
}

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

    // 2. Try Gemini Direct via Proxy (Primary)
    console.log("[AI] 🚀 Starting generation via Gemini (Proxy)...");
    const geminiResult = await callGeminiWithProxy(prompt);

    if (geminiResult.success) {
        return geminiResult;
    }

    // 3. Try OpenRouter (Secondary / Fallback)
    console.warn(`[AI] ⚠️ Gemini failed: ${geminiResult.error}. Trying OpenRouter...`);

    const openRouterResult = await callOpenRouter(prompt);

    if (openRouterResult.success) {
        return openRouterResult;
    }

    return {
        success: false,
        error: `Все сервисы недоступны. Gemini: ${geminiResult.error}, OpenRouter: ${openRouterResult.error}`
    };
}

// Helper to call Gemini REST API manually to support Proxy
async function callGeminiWithProxy(prompt: string): Promise<GenerateResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { success: false, error: "GEMINI_API_KEY not found" };

    const agent = getProxyAgent();

    try {
        const url = `${GEMINI_API_URL}?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: planSchema
                }
            }),
            // @ts-ignore - custom agent for node-fetch if used, or next.js might ignore it without custom config
            agent: agent,
            // For standard fetch in Node 18+ (undici), we might need dispatcher, but https-proxy-agent works with node-fetch
            // Next.js patches fetch, so this might be tricky. 
            // If this fails in Next.js environment without node-fetch, we might need 'node-fetch' package explicitly.
            // But let's try standard fetch property first which some environments support.
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (responseText) {
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(cleanText) as ChefPlan;
            return { success: true, data: plan };
        }
        throw new Error("Empty response from Gemini");

    } catch (e: any) {
        console.error(`[AI] ❌ Gemini Proxy Call Failed: ${e.message}`);
        return { success: false, error: e.message };
    }
}

async function callOpenRouter(prompt: string): Promise<GenerateResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const agent = getProxyAgent();

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
                }),
                // @ts-ignore
                agent: agent
            });

            if (!response.ok) {
                const text = await response.text();
                // console.error(`[OpenRouter] ❌ ${model} failed status ${response.status}: ${text.substring(0, 200)}`);
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
// Vision also needs proxy now
export async function recognizeIngredients(base64Image: string): Promise<Ingredient[]> {
    if (!base64Image) return [];
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const agent = getProxyAgent();

        if (apiKey) {
            // Using REST API for Vision to support Proxy
            // endpoint: models/gemini-1.5-flash:generateContent
            const url = `${GEMINI_API_URL}?key=${apiKey}`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "List visible ingredients JSON: [{name, category}]" },
                            { inlineData: { data: base64Image.replace(/^data:image\/\w+;base64,/, ""), mimeType: "image/jpeg" } }
                        ]
                    }]
                }),
                // @ts-ignore
                agent: agent
            });

            if (!response.ok) throw new Error("Vision API failed");

            const data = await response.json();
            const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (txt) {
                const json = JSON.parse(txt.replace(/```json/g, '').replace(/```/g, ''));
                return json.map((i: any) => ({ id: Math.random().toString(), name: i.name, category: i.category || 'other' }));
            }
        }
    } catch (e) { console.warn("Vision failed", e); }
    return [];
}
