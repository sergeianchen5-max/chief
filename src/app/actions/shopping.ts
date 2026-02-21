'use server';

import { createClient } from '@/lib/supabase/server';
import { ShoppingItem } from '@/lib/types';

export async function addItemsToShoppingList(recipeId: string, items: ShoppingItem[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const { data, error } = await supabase
            .from('shopping_lists')
            .insert({
                user_id: user.id,
                recipe_id: recipeId,
                items: items as any
            });

        if (error) throw error;
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
