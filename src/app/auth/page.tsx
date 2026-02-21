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

    const handleProviderLogin = async (provider: string) => {
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider as any,
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
                    {/* ВРЕМЕННО СКРЫТЫ СОЦИАЛЬНЫЕ КНОПКИ
                    <div className="flex items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={() => handleProviderLogin('vk')}
                            disabled={loading}
                            className="flex items-center justify-center w-14 h-14 bg-white border-2 border-stone-200 hover:border-[#0077FF] hover:bg-stone-50 text-stone-600 hover:text-[#0077FF] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                            title="ВКонтакте"
                        >
                            <svg className="w-6 h-6 fill-current transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M1.687 1.687C0 3.374 0 6.09 0 11.52v.96c0 5.43 0 8.146 1.687 9.833C3.374 24 6.09 24 11.52 24h.96c5.43 0 8.146 0 9.833-1.687C24 20.626 24 17.91 24 12.48v-.96c0-5.43 0-8.146-1.687-9.833C20.626 0 17.91 0 12.48 0h-.96C6.09 0 3.374 0 1.687 1.687ZM4.05 7.3c.13 6.24 3.25 9.99 8.72 9.99h.31v-3.57c2.01.2 3.53 1.67 4.14 3.57h2.84c-.78-2.84-2.83-4.41-4.11-5.01 1.28-.74 3.08-2.54 3.51-4.98h-2.58c-.56 1.98-2.22 3.78-3.8 3.95V7.3H10.5v6.92c-1.6-.4-3.62-2.34-3.71-6.92H4.05Z" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleProviderLogin('yandex')}
                            disabled={loading}
                            className="flex items-center justify-center w-14 h-14 bg-white border-2 border-stone-200 hover:border-[#FC3F1D] hover:bg-stone-50 text-stone-600 hover:text-[#FC3F1D] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                            title="Яндекс"
                        >
                            <svg className="w-6 h-6 fill-current transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm2 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Zm-9.462-3.862h.77v8.552h1.723V6.8H12.53c-2.521 0-3.85 1.301-3.85 3.208 0 1.521.725 2.42 2.016 3.346L8.45 16.699h1.87l2.502-3.74-.87-.586c-1.055-.716-1.568-1.274-1.568-2.466 0-1.054.742-1.769 2.154-1.769Z" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleProviderLogin('mailru')}
                            disabled={loading}
                            className="flex items-center justify-center w-14 h-14 bg-white border-2 border-stone-200 hover:border-[#005FF9] hover:bg-stone-50 text-stone-600 hover:text-[#005FF9] rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                            title="Mail.ru"
                        >
                            <svg className="w-6 h-6 fill-current transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M5.105 16.095a8 8 0 1 1 13.856-8c1.136 1.968 1.178 3.795.966 5.047-.11.648-.294 1.17-.54 1.509-.215.293-.464.444-.854.444-.267 0-.425-.044-.532-.105-.1-.056-.239-.172-.386-.467-.324-.647-.58-1.934-.582-4.397v-.03h-2v.032c0 1.47-.034 2.186-.064 2.522-.005.058-.01.101-.014.131l-.024.09a3 3 0 1 1-2.122-3.673l.518-1.932a5 5 0 1 0 2.48 8.112l.019.04c.29.58.682 1.026 1.192 1.314.502.283 1.032.363 1.515.363 1.11 0 1.929-.525 2.47-1.266.507-.697.763-1.568.896-2.353.273-1.616.207-3.933-1.206-6.38-2.761-4.784-8.877-6.422-13.66-3.66-4.783 2.76-6.422 8.877-3.66 13.66 2.761 4.782 8.877 6.421 13.66 3.66l-1-1.732a8 8 0 0 1-10.928-2.929Z" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-stone-200"></div>
                        <span className="text-xs text-stone-400 font-medium">ИЛИ</span>
                        <div className="flex-1 h-px bg-stone-200"></div>
                    </div>
                    */}
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

                    <p className="text-center text-xs text-stone-400 pt-2">
                        Входя, вы соглашаетесь с условиями использования
                    </p>
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
        </div>
    );
}
