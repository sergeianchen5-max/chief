const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Type, Schema } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3001;

// Увеличиваем лимит, так как будем отправлять картинки в base64
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Инициализация AI (Ключ берется из переменных окружения сервера, а не клиента!)
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SCHEMAS (Перенесены с фронтенда) ---

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
                reason: { type: Type.STRING }
              },
              required: ["memberName", "percentage", "reason"]
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

// --- MIDDLEWARE ---

const checkSubscription = (req, res, next) => {
  // TODO: Подключить базу данных.
  console.log(`[AUTH] Request allowed for IP: ${req.ip}`);
  next();
};

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('Chef Fridge API Server is Active 🟢');
});

// Генерация плана питания
app.post('/api/generate-plan', checkSubscription, async (req, res) => {
  try {
    const { inventory, family, onlyFridge } = req.body;

    console.log(`[AI] Generating plan. OnlyFridge: ${onlyFridge}. Family: ${family.length}. Inventory: ${inventory.length}`);

    // Automatically append Water/Salt/Pepper so AI assumes they are available
    const inventoryList = (inventory.length > 0 ? inventory.map(i => i.name).join(", ") : "Empty Fridge") + ", Вода, Соль, Перец";

    const familyProfiles = family.map(f => 
      `- ${f.name} (${f.age} years old): Goal - ${f.goal}. Preferences: ${f.preferences}. ${f.deadline ? `Deadline: ${f.deadline}` : ''}`
    ).join("\n");

    const prompt = `
      Act as "Chef Fridge", a passionate Michelin-star chef and nutritionist.
      Current Products (Fridge + Basic Pantry): ${inventoryList}
      Family Profiles (Total members: ${family.length}):
      ${familyProfiles || "No family members added yet."}
      
      CONSTRAINT: "Cook from Fridge Only" mode is set to: ${onlyFridge ? 'TRUE' : 'FALSE'}.
      
      Task:
      1. Analyze Family Goals & Preferences DEEPLY.
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
      
      7. FAMILY SUITABILITY (CRITICAL):
         - For EACH recipe, you MUST populate the 'familySuitability' array.
         - Provide a percentage (0-100) and a brief reason for EVERY family member defined in profiles.
         - This helps visualize how well the dish fits each person's goals.
      
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
      res.json(JSON.parse(response.text));
    } else {
      throw new Error("No text returned from AI");
    }
  } catch (error) {
    console.error("Generate Plan Error:", error);
    res.status(500).json({ error: "Failed to generate plan", details: error.message });
  }
});

// Распознавание ингредиентов по фото
app.post('/api/recognize-ingredients', checkSubscription, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    console.log(`[AI] Analyzing image...`);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
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
        const itemsWithIds = rawItems.map(item => ({
          id: Date.now().toString() + Math.random().toString().slice(2, 6),
          name: item.name,
          category: item.category
        }));
        res.json(itemsWithIds);
    } else {
       throw new Error("No ingredients found");
    }

  } catch (error) {
    console.error("Vision Error:", error);
    res.status(500).json({ error: "Failed to recognize image", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🔑 Using API Key: ${process.env.API_KEY ? 'PROVIDED' : 'MISSING'}`);
});