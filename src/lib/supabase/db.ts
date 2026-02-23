import { createClient } from '@/lib/supabase/client'
import type { Ingredient, FamilyMember, Recipe } from '@/lib/types'
import { hashIngredients } from '@/lib/hash'

// ===================== ТИПЫ =====================

export interface UserData {
    inventory: Ingredient[]
    family: FamilyMember[]
    savedRecipes: Recipe[]
}

// ===================== ЗАГРУЗКА =====================

export async function loadUserData(userId: string): Promise<UserData> {
    const supabase = createClient()

    // Загрузить профиль (inventory + family)
    const { data, error: profileError } = await supabase
        .from('profiles')
        .select('inventory, family')
        .eq('id', userId)
        .single()
    const profile = data as any;

    if (profileError) {
        console.error('[DB] Ошибка загрузки профиля:', profileError.message)
    }

    // Загрузить сохранённые рецепты
    const { data: savedRecipeLinks, error: savedError } = await supabase
        .from('saved_recipes')
        .select('recipe_id, recipes(id, content)')
        .eq('user_id', userId)

    if (savedError) {
        console.error('[DB] Ошибка загрузки рецептов:', savedError.message)
    }

    const savedRecipes: Recipe[] = (savedRecipeLinks || [])
        .map((link: any) => {
            const recipe = link.recipes
            if (!recipe?.content) return null
            return { ...recipe.content, id: recipe.id } as Recipe
        })
        .filter(Boolean) as Recipe[]

    return {
        inventory: (profile?.inventory as Ingredient[]) || [],
        family: (profile?.family as FamilyMember[]) || [],
        savedRecipes,
    }
}

// ===================== СОХРАНЕНИЕ INVENTORY =====================

export async function saveInventory(userId: string, inventory: Ingredient[]): Promise<void> {
    const supabase = createClient()

    const { error } = await (supabase as any)
        .from('profiles')
        .update({ inventory, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) {
        console.error('[DB] Ошибка сохранения inventory:', error.message)
    }
}

// ===================== СОХРАНЕНИЕ FAMILY =====================

export async function saveFamily(userId: string, family: FamilyMember[]): Promise<void> {
    const supabase = createClient()

    const { error } = await (supabase as any)
        .from('profiles')
        .update({ family, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) {
        console.error('[DB] Ошибка сохранения family:', error.message)
    }
}

// ===================== СОХРАНЕНИЕ РЕЦЕПТА =====================

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^а-яёa-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 80) + '-' + Date.now().toString(36)
}

export async function saveRecipeToDb(userId: string, recipe: Recipe): Promise<string | null> {
    const supabase = createClient()

    // 1. Вставить рецепт в таблицу recipes
    const slug = generateSlug(recipe.name)
    const { data: insertedRecipe, error: recipeError } = await (supabase as any)
        .from('recipes')
        .insert({
            user_id: userId,
            title: recipe.name,
            slug,
            ingredients_input: recipe.ingredientsToUse || [],
            inventory_hash: hashIngredients(recipe.ingredientsToUse || []),
            content: recipe as any, // весь рецепт как JSONB
            is_public: false,
            moderation_status: 'pending',
        })
        .select('id')
        .single()

    if (recipeError) {
        console.error('[DB] Ошибка сохранения рецепта:', recipeError.message)
        return null
    }

    // 2. Создать связь в saved_recipes
    const { error: linkError } = await (supabase as any)
        .from('saved_recipes')
        .insert({
            user_id: userId,
            recipe_id: insertedRecipe.id,
        })

    if (linkError) {
        console.error('[DB] Ошибка сохранения связи:', linkError.message)
    }

    return insertedRecipe.id
}

// ===================== УДАЛЕНИЕ РЕЦЕПТА =====================

export async function removeRecipeFromDb(userId: string, recipeId: string): Promise<void> {
    const supabase = createClient()

    // Удаляем только связь (рецепт остаётся для других пользователей / кеша)
    const { error } = await supabase
        .from('saved_recipes')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId)

    if (error) {
        console.error('[DB] Ошибка удаления рецепта:', error.message)
    }
}
