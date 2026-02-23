'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChefHat, Mail, Lock, Loader2 } from 'lucide-react';

type AuthMode = 'magic' | 'password';

export default function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('magic');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const supabase = createClient();

    const resetMessages = () => {
        setError('');
        setMessage('');
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

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

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError('Неверный email или пароль.');
        } else {
            window.location.href = '/dashboard';
        }
        setLoading(false);
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
                    {/* Переключатель режима */}
                    <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => { setMode('magic'); resetMessages(); }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'magic'
                                    ? 'bg-white text-stone-800 shadow-sm'
                                    : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            ✉️ Ссылка на почту
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('password'); resetMessages(); }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'password'
                                    ? 'bg-white text-stone-800 shadow-sm'
                                    : 'text-stone-500 hover:text-stone-700'
                                }`}
                        >
                            🔑 Пароль
                        </button>
                    </div>

                    {/* === Форма Magic Link === */}
                    {mode === 'magic' && (
                        <form onSubmit={handleMagicLink} className="space-y-4">
                            <div>
                                <label htmlFor="email-magic" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                    <input
                                        id="email-magic"
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
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                                Отправить ссылку для входа
                            </button>

                            <p className="text-center text-xs text-stone-400 pt-2">
                                Входя, вы соглашаетесь с условиями использования
                            </p>
                        </form>
                    )}

                    {/* === Форма Email + Пароль === */}
                    {mode === 'password' && (
                        <form onSubmit={handlePasswordLogin} className="space-y-4">
                            <div>
                                <label htmlFor="email-pass" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                    <input
                                        id="email-pass"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                    Пароль
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email || !password}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                                Войти
                            </button>

                            <p className="text-center text-xs text-stone-400 pt-2">
                                Входя, вы соглашаетесь с условиями использования
                            </p>
                        </form>
                    )}

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
        </div>
    );
}
