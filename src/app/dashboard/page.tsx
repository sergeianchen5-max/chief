import React from 'react';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';
import { ChefHat, LogIn } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = await createClient();

    // Получаем сессию на стороне сервера (безопасный вызов getUser, который валидирует токен)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // ============= НЕАВТОРИЗОВАН =============
    if (!user || authError) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg mb-6">
                        <ChefHat className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-stone-800 mb-2">Личный кабинет</h1>
                    <p className="text-stone-500 mb-6">Войдите, чтобы видеть сохранённые рецепты и управлять подпиской</p>
                    <Link
                        href="/auth"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
                    >
                        <LogIn size={18} /> Войти
                    </Link>
                </div>
            </div>
        );
    }

    // Загружаем профиль
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Загружаем рецепты (с join)
    let initialRecipes: any[] = [];
    const { data: recipesData, error } = await supabase
        .from('saved_recipes')
        .select('recipe_id, saved_at, recipes(id, title, content, created_at)')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

    if (error) {
        console.error('[Dashboard Server] Ошибка загрузки рецептов (join):', error);
        // Fallback
        const { data: fallbackData } = await supabase
            .from('saved_recipes')
            .select('recipe_id, saved_at')
            .eq('user_id', user.id)
            .order('saved_at', { ascending: false });

        if (fallbackData) {
            initialRecipes = fallbackData.map((r: any) => ({
                recipe_id: r.recipe_id,
                saved_at: r.saved_at,
                recipes: { id: r.recipe_id, title: 'Рецепт', content: {}, created_at: r.saved_at }
            }));
        }
    } else if (recipesData) {
        initialRecipes = recipesData;
    }

    return (
        <DashboardClient
            user={user}
            profile={profile || null}
            initialRecipes={initialRecipes}
        />
    );
}

