import { GoogleGenAI, Type } from "@google/genai";
import { ChefPlan, FamilyMember, Ingredient, MealCategory } from "@/lib/types";
import { generateChefPlan as generateChefPlanServerAction } from "@/app/actions/ai";

// === SCHEMAS FOR CLIENT-SIDE VALIDATION ===
// Дублируем схемы, используем Type вместо SchemaType для @google/genai

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

export class GenerationService {

    /**
     * Safe generation method:
     * 1. Tries Server Action (Server-Side Gemini/OpenRouter)
     * 2. If Server fails, tries Client-Side Gemini (Direct Google API)
     */
    static async generateChefPlanSafe(
        inventory: Ingredient[],
        family: FamilyMember[],
        onlyFridge: boolean,
        categories: MealCategory[]
    ): Promise<{ success: boolean; data?: ChefPlan; error?: string; source: 'server' | 'client' }> {

        // 1. Try Server Action
        try {
            console.log("🚀 [GenerationService] Trying Server Action...");
            const serverResult = await generateChefPlanServerAction(inventory, family, onlyFridge, categories);

            if (serverResult.success) {
                // Success case
                console.log("✅ [GenerationService] Server Action Success");
                return { success: true, data: serverResult.data, source: 'server' };
            } else {
                // Error case
                console.warn("⚠️ [GenerationService] Server Action returned error:", serverResult.error);
                // Continue to fallback...
            }
        } catch (serverError) {
            console.error("❌ [GenerationService] Server Action Failed (Network/Timeout):", serverError);
        }

        // 2. Client-Side Fallback
        console.log("🔄 [GenerationService] Switching to Client-Side Fallback...");
        try {
            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            console.log("🔑 [GenerationService] API Key check:", apiKey ? "Present (" + apiKey.substring(0, 5) + "...)" : "MISSING");
            if (!apiKey) {
                return {
                    success: false,
                    error: "Server failed and NEXT_PUBLIC_GEMINI_API_KEY is missing for fallback.",
                    source: 'client' // Or server, but it failed at client stage logic
                };
            }

            const client = new GoogleGenAI({ apiKey });

            // Prepare Prompt (Duplicate logic to ensure independence)
            const inventoryList = (inventory.length > 0 ? inventory.map(i => i.name).join(", ") : "Empty Fridge") + ", Вода, Соль, Перец";
            const familyProfiles = family.map(f =>
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

            const prompt = `
          Act as "Chef Fridge", a passionate Michelin-star chef and nutritionist.
          Current Products (Fridge + Basic Pantry): ${inventoryList}
          Family Profiles:
          ${familyProfiles}
          
          CONSTRAINT: "Cook from Fridge Only" mode is set to: ${onlyFridge ? 'TRUE' : 'FALSE'}.
          
          Task:
           1. Analyze Family Goals & Body Stats.
           2. Create a MENU. 
             ${onlyFridge
                    ? 'PRIORITY 1: Suggest recipes that use 100% of available ingredients. PRIORITIZE EXISTING STOCK over variety.'
                    : 'Suggest balanced recipes. It is okay to buy new ingredients.'
                }
           3. CATEGORIES:
             ${requestedCategories}
             - Popular/Hits (Популярное): 2+ options.
           
           4. QUANTITIES (CRITICAL):
             - Format: "Product Name (Quantity)". 
             - Example: "Chicken Breast (600g)".
             - Do NOT just list the name. 
           
           5. FAMILY SUITABILITY & NUTRITION (CRITICAL):
             - Calculate 'nutritionStats' (% Daily Value) for EACH person.
           
           6. SHOPPING LIST:
             - 'reason' field MUST be the EXACT name of the recipe.
           
           7. LANGUAGE: Russian.
        `;

            const response = await client.models.generateContent({
                model: "gemini-1.5-flash-001", // Use specific version to avoid 404
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: planSchema,
                }
            });

            if (response.text) {
                const responseText = response.text;
                const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const plan = JSON.parse(cleanText) as ChefPlan;
                console.log("✅ [GenerationService] Client-Side Success");
                return { success: true, data: plan, source: 'client' };
            }

        } catch (clientError: any) {
            console.error("❌ [GenerationService] Client-Side Fallback Failed:", clientError);

            let errorMessage = `All methods failed. Client error: ${clientError.message}`;

            // Check for known quota errors
            if (
                clientError.message?.includes("429") ||
                clientError.message?.includes("RESOURCE_EXHAUSTED") ||
                clientError.message?.includes("quota")
            ) {
                errorMessage = "Превышен лимит бесплатных запросов к AI. Пожалуйста, подождите 1-2 минуты и попробуйте снова.";
            }

            return {
                success: false,
                error: errorMessage,
                source: 'client'
            };
        }

        return {
            success: false,
            error: "Unknown error during generation.",
            source: 'client'
        };
    }
}
