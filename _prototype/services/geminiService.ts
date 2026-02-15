import { GoogleGenAI, Type } from "@google/genai";
import { FamilyMember, Ingredient, ChefPlan } from "../types";

// В продакшене это может быть переменная окружения.
// Для локальной разработки используем localhost, но с fallback на клиентский AI
const API_URL = 'http://localhost:3001/api';

// Инициализируем клиентский AI как запасной вариант (Fallback)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SCHEMAS (Дублируются с сервером для Fallback режима) ---

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

export const generateChefPlan = async (
  inventory: Ingredient[],
  family: FamilyMember[],
  onlyFridge: boolean = false
): Promise<ChefPlan> => {
  try {
    // 1. Пытаемся стучаться на сервер
    const response = await fetch(`${API_URL}/generate-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inventory, family, onlyFridge }),
    });

    if (!response.ok) {
       throw new Error('Server responded with error');
    }

    return await response.json();
  } catch (error) {
    console.warn("⚠️ Server unavailable. Switching to Client-Side AI Fallback mode.", error);
    
    // 2. Fallback: Выполняем логику на клиенте
    const inventoryList = (inventory.length > 0 ? inventory.map(i => i.name).join(", ") : "Empty Fridge") + ", Вода, Соль, Перец";
    
    const familyProfiles = family.map(f => 
      `- ${f.name}: ${f.gender}, ${f.age}y.o., ${f.height}cm, ${f.weight}kg. Activity: ${f.activityLevel}. Goal: ${f.goal}. Prefs: ${f.preferences}.`
    ).join("\n");

    const prompt = `
      Act as "Chef Fridge", a passionate Michelin-star chef and nutritionist.
      Current Products (Fridge + Basic Pantry): ${inventoryList}
      Family Profiles (Total members: ${family.length}):
      ${familyProfiles || "No family members added yet."}
      
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
         - Breakfast (Завтрак): 3+ options.
         - Soup (Суп): 2+ options.
         - Main Course (Обед/Ужин): 3+ options.
         - Dessert (Десерт): 2+ options.
         - Popular/Hits (Популярное): 2+ options. These MUST be universally loved "Hit" recipes.
      
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: planSchema,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ChefPlan;
    }
    throw new Error("Client-side AI failed to return text.");
  }
};

export const recognizeIngredients = async (base64Image: string): Promise<Ingredient[]> => {
  try {
    const response = await fetch(`${API_URL}/recognize-ingredients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64: base64Image }),
    });

    if (!response.ok) {
       throw new Error('Server responded with error');
    }

    return await response.json();
  } catch (error) {
    console.warn("⚠️ Server unavailable. Switching to Client-Side Vision Fallback mode.", error);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Analyze this image. Identify all visible food ingredients. Return list with categories. Language: Russian." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ingredientListSchema
      }
    });

    if (response.text) {
        const rawItems = JSON.parse(response.text);
        return rawItems.map((item: any) => ({
          id: Date.now().toString() + Math.random().toString().slice(2, 6),
          name: item.name,
          category: item.category
        }));
    }
    throw new Error("Client-side Vision failed.");
  }
};