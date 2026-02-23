'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const getAdminEmails = () => {
    if (!process.env.ADMIN_EMAILS) return ['admin@example.com'];
    // Убираем возможные кавычки и пробелы из .env
    return process.env.ADMIN_EMAILS.replace(/['"]/g, '').split(',').map(e => e.trim());
};

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
        throw new Error("Unauthorized: Требуется авторизация");
    }

    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(user.email)) {
        throw new Error(`Unauthorized: Email ${user.email} не является администратором. Доступные: ${adminEmails.join(', ')}`);
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
