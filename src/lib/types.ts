
// Категории блюд для генерации
export type MealCategory = 'breakfast' | 'salad' | 'soup' | 'main' | 'dessert' | 'drink';

export const MEAL_CATEGORIES: { id: MealCategory; label: string; emoji: string; count: string }[] = [
  { id: 'breakfast', label: 'Завтраки', emoji: '🍳', count: '1-2' },
  { id: 'salad', label: 'Салаты и закуски', emoji: '🥗', count: '1-2' },
  { id: 'soup', label: 'Первые блюда', emoji: '🍲', count: '1' },
  { id: 'main', label: 'Вторые блюда', emoji: '🥩', count: '1-2' },
  { id: 'dessert', label: 'Выпечка и десерты', emoji: '🍰', count: '1' },
  { id: 'drink', label: 'Напитки', emoji: '🥤', count: '1' },
];

export enum GoalType {
  WEIGHT_LOSS = 'Похудение',
  MAINTENANCE = 'Поддержание веса',
  MUSCLE_GAIN = 'Набор мышечной массы',
  LOW_CHOLESTEROL = 'Снижение холестерина',
  DIABETES_FRIENDLY = 'Диабетическое питание',
  VEGETARIAN = 'Вегетарианство',
  CHILD_NUTRITION = 'Детское питание',
  GENERAL_HEALTH = 'Общее здоровье'
}

export enum Gender {
  MALE = 'Мужской',
  FEMALE = 'Женский'
}

export enum ActivityLevel {
  SEDENTARY = 'Сидячий образ жизни (1.2)',
  LIGHT = 'Легкая активность (1.375)',
  MODERATE = 'Средняя активность (1.55)',
  ACTIVE = 'Высокая активность (1.725)',
  VERY_ACTIVE = 'Экстремальная активность (1.9)'
}

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  activityLevel: ActivityLevel;
  goal: GoalType;
  preferences: string; // e.g., "No nuts", "Loves pasta"
  deadline?: string; // Optional deadline for goals like weight loss
}

export type Category = 'produce' | 'dairy' | 'meat' | 'pantry' | 'frozen' | 'other';

export interface Ingredient {
  id: string;
  name: string;
  category?: Category;
}

export interface NutritionCoverage {
  caloriesPercent: number; // % of daily need
  proteinPercent: number;
  fatPercent: number;
  carbPercent: number;
}

export interface Suitability {
  memberName: string;
  percentage: number; // 0-100 (Overall Match Score)
  reason: string; // Why it fits or not
  nutritionStats?: NutritionCoverage; // New detailed stats
}

// AI Response Structures
export interface Recipe {
  id?: string; // For local key
  name: string;
  description: string;
  cookingTimeMinutes: number;
  difficulty: string;
  ingredientsToUse: string[];
  missingIngredients: string[];
  healthBenefits: string; // Why this fits the family goals

  // Nutrition & Weights
  weightPerServing: string; // e.g. "350g"
  totalWeightForFamily: string; // e.g. "1.5 kg"
  caloriesPerServing: string; // e.g. "450 kcal"
  protein: string;
  fats: string;
  carbs: string;

  // Personalization
  familySuitability: Suitability[];

  // New fields
  instructions: string[]; // Step by step
  mealType: string[]; // e.g. ["Завтрак", "Обед"]
  imageUrl?: string; // Unsplash Image
}

export interface ShoppingItem {
  name: string;
  quantity: string;
  reason: string; // Which recipe or goal requires this
}

export interface ChefPlan {
  summary: string; // General advice regarding the goals
  recipes: Recipe[];
  shoppingList: ShoppingItem[];
}
