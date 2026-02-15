'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChefHat, Mail, Loader2 } from 'lucide-react';

export default function AuthPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const supabase = createClient();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Проверьте почту! Мы отправили вам ссылку для входа.');
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Логотип */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg mb-4">
                        <ChefHat className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-extrabold text-stone-800 tracking-tight">
                        ШЕФ <span className="text-orange-500">ХОЛОДИЛЬНИК</span>
                    </h1>
                    <p className="text-stone-500 mt-2 text-sm">
                        Войдите, чтобы сохранять рецепты и настройки
                    </p>
                </div>

                {/* Карточка формы */}
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">

                    {/* Google OAuth */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-stone-200 rounded-xl font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Войти через Google
                    </button>

                    {/* Разделитель */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-stone-200"></div>
                        <span className="text-xs text-stone-400 font-medium">ИЛИ</span>
                        <div className="flex-1 h-px bg-stone-200"></div>
                    </div>

                    {/* Email Magic Link */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Mail size={20} />
                            )}
                            Отправить ссылку для входа
                        </button>
                    </form>

                    {/* Сообщения */}
                    {message && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center">
                            ✉️ {message}
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* Подпись */}
                <p className="text-center text-xs text-stone-400 mt-6">
                    Входя, вы соглашаетесь с условиями использования
                </p>
            </div>
        </div>
    );
}
