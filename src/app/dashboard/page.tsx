'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/hooks/useUser';
import type { Recipe } from '@/lib/types';
import {
    ChefHat, BookOpen, Crown, CalendarDays,
    Trash2, ArrowLeft, Loader2, Clock,
    Users as UsersIcon, Flame, LogIn
} from 'lucide-react';
import Link from 'next/link';

interface ProfileData {
    email: string | null;
    display_name: string | null;
    subscription_tier: string;
    subscription_active: boolean;
    daily_generations_count: number;
    created_at: string;
}

interface SavedRecipeRow {
    recipe_id: string;
    saved_at: string;
    recipes: {
        id: string;
        title: string;
        content: any;
        created_at: string;
    };
}

export default function DashboardPage() {
    const { user, loading: authLoading, signOut } = useUser();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [savedRecipes, setSavedRecipes] = useState<SavedRecipeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'recipes' | 'profile'>('recipes');
    const supabase = createClient();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const loadData = async () => {
            // Загрузить профиль
            const { data: profileData } = await supabase
                .from('profiles')
                .select('email, display_name, subscription_tier, subscription_active, daily_generations_count, created_at')
                .eq('id', user.id)
                .single();

            if (profileData) setProfile(profileData);

            // Загрузить сохранённые рецепты
            const { data: recipesData } = await supabase
                .from('saved_recipes')
                .select('recipe_id, saved_at, recipes(id, title, content, created_at)')
                .eq('user_id', user.id)
                .order('saved_at', { ascending: false });

            if (recipesData) setSavedRecipes(recipesData as any);

            setLoading(false);
        };

        loadData();
    }, [user, authLoading]);

    const removeRecipe = async (recipeId: string) => {
        if (!user || !window.confirm('Удалить рецепт из избранного?')) return;

        await supabase
            .from('saved_recipes')
            .delete()
            .eq('user_id', user.id)
            .eq('recipe_id', recipeId);

        setSavedRecipes(prev => prev.filter(r => r.recipe_id !== recipeId));
    };

    // ============= НЕАВТОРИЗОВАН =============
    if (!authLoading && !user) {
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

    // ============= ЗАГРУЗКА =============
    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        );
    }

    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
            {/* Шапка */}
            <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/" className="text-stone-400 hover:text-stone-600 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user?.email?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                            <h1 className="font-bold text-stone-800 text-lg leading-tight">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                            </h1>
                            <p className="text-xs text-stone-400">{user?.email}</p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        {profile?.subscription_tier === 'pro' ? (
                            <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
                                <Crown size={12} /> PRO
                            </span>
                        ) : (
                            <span className="px-3 py-1 bg-stone-100 text-stone-500 text-xs font-medium rounded-full">
                                Free
                            </span>
                        )}
                        <button
                            onClick={signOut}
                            className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                        >
                            Выйти
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Переключатель секций */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveSection('recipes')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeSection === 'recipes'
                            ? 'bg-orange-50 text-orange-600 shadow-sm'
                            : 'text-stone-400 hover:bg-stone-100'
                            }`}
                    >
                        <BookOpen size={16} /> Мои рецепты
                        <span className="bg-white/80 text-orange-500 text-xs px-2 py-0.5 rounded-full">{savedRecipes.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveSection('profile')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeSection === 'profile'
                            ? 'bg-blue-50 text-blue-600 shadow-sm'
                            : 'text-stone-400 hover:bg-stone-100'
                            }`}
                    >
                        <UsersIcon size={16} /> Профиль
                    </button>
                </div>

                {/* ============= РЕЦЕПТЫ ============= */}
                {activeSection === 'recipes' && (
                    <div>
                        {savedRecipes.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
                                <BookOpen className="mx-auto text-stone-300 mb-4" size={48} />
                                <h2 className="font-bold text-stone-600 text-lg mb-2">Пока пусто</h2>
                                <p className="text-stone-400 text-sm mb-6">Сохраняйте рецепты из Шеф-Повара, чтобы они появились здесь</p>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all"
                                >
                                    <ChefHat size={16} /> Перейти к Шеф-Повару
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {savedRecipes.map((item) => {
                                    const content = item.recipes?.content as any;
                                    if (!content) return null;

                                    const savedDate = new Date(item.saved_at).toLocaleDateString('ru-RU', {
                                        day: 'numeric', month: 'short'
                                    });

                                    return (
                                        <div
                                            key={item.recipe_id}
                                            className="bg-white rounded-2xl border border-stone-100 p-5 hover:shadow-sm transition-shadow group"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Иконка */}
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <Flame className="text-orange-500" size={22} />
                                                </div>

                                                {/* Контент */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-stone-800 truncate">{content.name || item.recipes.title}</h3>
                                                    <p className="text-sm text-stone-400 line-clamp-2 mt-1">{content.description || ''}</p>

                                                    <div className="flex items-center gap-4 mt-3 text-xs text-stone-400">
                                                        {content.cookingTimeMinutes && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} /> {content.cookingTimeMinutes} мин
                                                            </span>
                                                        )}
                                                        {content.difficulty && (
                                                            <span className="px-2 py-0.5 bg-stone-100 rounded-full">{content.difficulty}</span>
                                                        )}
                                                        {content.caloriesPerServing && (
                                                            <span>{content.caloriesPerServing}</span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <CalendarDays size={12} /> {savedDate}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Удалить */}
                                                <button
                                                    onClick={() => removeRecipe(item.recipe_id)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Удалить из избранного"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ============= ПРОФИЛЬ ============= */}
                {activeSection === 'profile' && (
                    <div className="space-y-4">
                        {/* Информация */}
                        <div className="bg-white rounded-2xl border border-stone-100 p-6">
                            <h2 className="font-bold text-stone-700 mb-4">Информация</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                                    <span className="text-sm text-stone-500">Email</span>
                                    <span className="text-sm font-medium text-stone-700">{user?.email}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                                    <span className="text-sm text-stone-500">Подписка</span>
                                    <span className={`text-sm font-medium ${profile?.subscription_tier === 'pro' ? 'text-orange-500' : 'text-stone-700'}`}>
                                        {profile?.subscription_tier === 'pro' ? '⭐ Pro' : 'Free'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                                    <span className="text-sm text-stone-500">Генерации сегодня</span>
                                    <span className="text-sm font-medium text-stone-700">
                                        {profile?.daily_generations_count || 0} / {profile?.subscription_tier === 'pro' ? '∞' : '5'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-stone-50">
                                    <span className="text-sm text-stone-500">Сохранено рецептов</span>
                                    <span className="text-sm font-medium text-stone-700">{savedRecipes.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-stone-500">Дата регистрации</span>
                                    <span className="text-sm font-medium text-stone-700">{memberSince}</span>
                                </div>
                            </div>
                        </div>

                        {/* Подписка */}
                        {profile?.subscription_tier !== 'pro' && (
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-orange-100 p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Crown className="text-orange-500" size={20} />
                                    <h2 className="font-bold text-orange-700">Перейти на Pro</h2>
                                </div>
                                <p className="text-sm text-orange-600/80 mb-4">
                                    Безлимитные генерации, списки покупок, персонализация диеты и без рекламы — 199 ₽/мес
                                </p>
                                <button
                                    disabled
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-semibold text-sm shadow-sm opacity-60 cursor-not-allowed"
                                >
                                    Скоро
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
