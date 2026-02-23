import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AdminClient from './AdminClient';
import { getPendingRecipes } from '@/app/actions/admin';
import { ShieldCheck, LogIn } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const supabase = await createClient();

    // Получаем сессию
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // ============= НЕ АВТОРИЗОВАН =============
    if (!user || authError) {
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

    // Вызываем серверный метод, который сам проверяет ADMIN_EMAILS
    const res = await getPendingRecipes();

    // ============= ОШИБКА (НЕТ ПРАВ АДМИНА) =============
    if (!res.success) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-sm w-full">
                    <ShieldCheck size={48} className="mx-auto text-red-500 mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Доступ запрещён</h1>
                    <p className="text-gray-600 mb-2">{res.error}</p>
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

    return (
        <AdminClient
            user={user}
            initialRecipes={res.data || []}
        />
    );
}
