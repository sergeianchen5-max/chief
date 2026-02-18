import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ChefPlan, FamilyMember, Ingredient, MealCategory } from "@/lib/types";
import { generateChefPlan as generateChefPlanServerAction } from "@/app/actions/ai";

// === SCHEMAS FOR CLIENT-SIDE VALIDATION ===

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
                    ingredientsToUse: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "List of ingredients FROM FRIDGE with quantities calculated for the family. Format: 'Name (Quantity)', e.g., 'Carrots (200g)'" },
                    missingIngredients: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "List of ingredients TO BUY with quantities. Format: 'Name (Quantity)', e.g., 'Cream (500ml)'" },
                    healthBenefits: { type: SchemaType.STRING },
                    weightPerServing: { type: SchemaType.STRING },
                    totalWeightForFamily: { type: SchemaType.STRING, description: "Total weight of the cooked dish for the entire family (e.g. '1.2 kg')" },
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
                                percentage: { type: SchemaType.INTEGER, description: "Suitability score 0-100" },
                                reason: { type: SchemaType.STRING },
                                nutritionStats: {
                                    type: SchemaType.OBJECT,
                                    description: "Percentage of Daily Value (DV) for this specific person provided by ONE serving of this recipe.",
                                    properties: {
                                        caloriesPercent: { type: SchemaType.INTEGER, description: "% of daily Calorie needs" },
                                        proteinPercent: { type: SchemaType.INTEGER, description: "% of daily Protein needs" },
                                        fatPercent: { type: SchemaType.INTEGER, description: "% of daily Fat needs" },
                                        carbPercent: { type: SchemaType.INTEGER, description: "% of daily Carb needs" }
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
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    quantity: { type: SchemaType.STRING },
                    reason: { type: SchemaType.STRING, description: "MUST be the EXACT name of the recipe requiring this item." }
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

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    // @ts-ignore
                    responseSchema: planSchema,
                }
            });

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
             - 'reason' field MUST be the EXACT name of the recipe requiring this item.
           
           7. LANGUAGE: Russian.
        `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            if (responseText) {
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
