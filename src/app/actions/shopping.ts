'use server';

import { createClient } from '@/lib/supabase/server';
import { ShoppingItem } from '@/lib/types';

// Вспомогательная функция для проверки UUID
function isValidUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function addItemsToShoppingList(
    recipeName: string,
    items: ShoppingItem[],
    recipeId?: string | null
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Войдите в аккаунт, чтобы добавлять в список покупок' };
    }

    // Используем recipe_id только если это валидный UUID, иначе null
    const validRecipeId = recipeId && isValidUUID(recipeId) ? recipeId : null;

    try {
        const { error } = await supabase
            .from('shopping_lists')
            .insert({
                user_id: user.id,
                recipe_id: validRecipeId,
                // Сохраняем имя рецепта в items для отображения
                items: items as any,
                ...(recipeName ? { recipe_title: recipeName } : {})
            });

        if (error) {
            // Если поле recipe_title не существует — пробуем без него
            if (error.message.includes('recipe_title')) {
                const { error: error2 } = await supabase
                    .from('shopping_lists')
                    .insert({
                        user_id: user.id,
                        recipe_id: validRecipeId,
                        items: items as any,
                    });
                if (error2) throw error2;
            } else {
                throw error;
            }
        }

        return { success: true };
    } catch (e: any) {
        console.error("Failed to add to shopping list:", e);
        return { success: false, error: e.message };
    }
}

export async function getShoppingLists() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { data, error } = await supabase
            .from('shopping_lists')
            .select('id, recipe_id, items, created_at, recipes(title)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        console.error("Failed to get shopping lists:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteShoppingList(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { error } = await supabase
            .from('shopping_lists')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error("Failed to delete shopping list:", e);
        return { success: false, error: e.message };
    }
}
