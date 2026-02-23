'use client';

import React, { useEffect, useState } from 'react';
import { getPendingRecipes, updateRecipeStatus } from '@/app/actions/admin';
import { useUser } from '@/lib/hooks/useUser';
import { ShieldCheck, Check, X, Loader2, Clock, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
    const { user, loading: authLoading } = useUser();
    const [recipes, setRecipes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRecipes = async () => {
        setLoading(true);
        const res = await getPendingRecipes();
        if (res.success && res.data) {
            setRecipes(res.data);
            setError(null);
        } else {
            setError(res.error || 'Ошибка загрузки');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (authLoading) return;

        if (user?.id) {
            loadRecipes();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        const isPublic = action === 'approve';
        const status = action === 'approve' ? 'approved' : 'rejected';

        const res = await updateRecipeStatus(id, status, isPublic);
        if (res.success) {
            setRecipes(prev => prev.map(r =>
                r.id === id ? { ...r, moderation_status: status, is_public: isPublic, wp_url: (res as any).wpUrl } : r
            ));

            // Показываем результат WP публикации
            if (action === 'approve') {
                const wpRes = res as any;
                if (wpRes.wpPublished) {
                    alert(`✅ Рецепт одобрен и опубликован в WordPress!\n${wpRes.wpUrl || ''}`);
                } else if (wpRes.wpError) {
                    alert(`✅ Рецепт одобрен.\n⚠️ WP: ${wpRes.wpError}`);
                }
            }
        } else {
            alert('Ошибка: ' + res.error);
        }
    };

    // ============= ЗАГРУЗКА =============
    if (authLoading || (user && loading)) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
                <Loader2 className="animate-spin text-orange-500" size={48} />
            </div>
        );
    }

    // ============= НЕ АВТОРИЗОВАН =============
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full text-center">
                    <ShieldCheck size={48} className="mx-auto text-orange-500 mb-4" />
                    <h1 className="text-xl font-extrabold text-gray-900 mb-2">Доступ закрыт</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        Эта страница доступна только администраторам.<br />
                        Войдите с учётной записью администратора.
                    </p>
                    <Link
                        href="/auth"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
                    >
                        <LogIn size={18} /> Войти
                    </Link>
                </div>
            </div>
        );
    }

    // ============= ОШИБКА (НЕТ ПРАВ АДМИНА) =============
    if (error) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-sm w-full">
                    <ShieldCheck size={48} className="mx-auto text-red-500 mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Доступ запрещён</h1>
                    <p className="text-gray-600 mb-2">{error}</p>
                    <p className="text-xs text-gray-400 mb-6">
                        Вы вошли как: <span className="font-mono">{user.email}</span>
                    </p>
                    <Link href="/" className="text-orange-600 font-semibold hover:underline">
                        Вернуться на главную
                    </Link>
                </div>
            </div>
        );
    }

    const pending = recipes.filter(r => r.moderation_status === 'pending');
    const processed = recipes.filter(r => r.moderation_status !== 'pending');

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-gray-900 text-white px-6 py-4 shadow-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={24} className="text-orange-500" />
                        <h1 className="text-xl font-bold">Панель модератора</h1>
                    </div>
                    <div className="text-sm text-gray-400">
                        {user?.email}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="text-orange-500" size={20} />
                            Ожидают проверки ({pending.length})
                        </h2>
                        <button
                            onClick={loadRecipes}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                        >
                            Обновить
                        </button>
                    </div>

                    {pending.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center text-gray-500 text-sm">
                            Новых рецептов нет. Все проверено! ✨
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <ul className="divide-y divide-gray-100">
                                {pending.map(recipe => (
                                    <li key={recipe.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-1">{recipe.title}</h3>
                                            <p className="text-xs text-gray-500">
                                                {new Date(recipe.created_at).toLocaleString('ru-RU')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAction(recipe.id, 'approve')}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                                            >
                                                <Check size={16} /> Одобрить
                                            </button>
                                            <button
                                                onClick={() => handleAction(recipe.id, 'reject')}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                                            >
                                                <X size={16} /> Отклонить
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Недавние обработанные ({processed.length})</h2>
                    {processed.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-400 text-sm">
                            Нет обработанных рецептов
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <ul className="divide-y divide-gray-100">
                                {processed.slice(0, 50).map(recipe => (
                                    <li key={recipe.id} className="p-4 text-sm flex justify-between items-center opacity-70">
                                        <span>{recipe.title}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${recipe.moderation_status === 'approved'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {recipe.moderation_status === 'approved' ? 'Опубликован' : 'Отклонён'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

            </main>
        </div>
    );
}
