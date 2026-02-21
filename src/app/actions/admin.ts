'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['admin@example.com'];

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
        throw new Error("Unauthorized");
    }
    return supabase;
}

export async function getPendingRecipes() {
    try {
        const supabase = await checkAdmin();
        const { data, error } = await supabase
            .from('recipes')
            .select('id, title, created_at, moderation_status, is_public')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateRecipeStatus(id: string, status: 'approved' | 'rejected' | 'pending', isPublic: boolean) {
    try {
        const supabase = await checkAdmin();
        const { error } = await supabase
            .from('recipes')
            .update({
                moderation_status: status,
                is_public: isPublic
            })
            .eq('id', id);

        if (error) throw error;
        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
