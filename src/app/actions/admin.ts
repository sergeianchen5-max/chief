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

        // ✅ При одобрении — автоматически публикуем в WordPress
        let wpResult: { success: boolean; wpUrl?: string; error?: string } | null = null;
        if (status === 'approved' && isPublic) {
            try {
                const { publishToWordPress } = await import('./wordpress');
                wpResult = await publishToWordPress(id);
                console.log(`[Admin] WP публикация для ${id}:`, wpResult);
            } catch (wpErr: any) {
                console.error('[Admin] Ошибка WP модуля:', wpErr.message);
                wpResult = { success: false, error: wpErr.message };
            }
        }

        revalidatePath('/admin');
        return {
            success: true,
            wpPublished: wpResult?.success || false,
            wpUrl: wpResult?.wpUrl,
            wpError: wpResult?.error
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
