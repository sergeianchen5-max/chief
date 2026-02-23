'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChefHat, Mail, Lock, Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type AuthMode = 'magic' | 'password' | 'register' | 'set-password';

// Вынесено в отдельный компонент для Suspense boundary
function AuthForm() {
    const [mode, setMode] = useState<AuthMode>('magic');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const supabase = createClient();
    const searchParams = useSearchParams();

    // Проверяем, если пользователь пришёл по ссылке и нужно задать пароль
    useEffect(() => {
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const type = searchParams.get('type');

            if (user && (type === 'signup' || type === 'recovery' || type === 'magiclink')) {
                // Пользователь вошёл по magic link — предложить задать пароль
                setMode('set-password');
                setEmail(user.email || '');
            } else if (user) {
                // Уже авторизован — редирект
                window.location.href = '/dashboard';
            }
        };
        checkSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth?type=magiclink`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Проверьте почту! Мы отправили вам ссылку для входа. При первом входе вы сможете задать пароль.');
        }
        setLoading(false);
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            if (error.message.includes('Invalid login')) {
                setError('Неверный email или пароль. Если вы ещё не задали пароль — войдите по ссылке на почту.');
            } else {
                setError(error.message);
            }
        } else {
            window.location.href = '/dashboard';
        }
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        if (password.length < 4) {
            setError('Пароль должен быть минимум 4 символа');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Отлично! Проверьте почту для подтверждения. После подтверждения можно входить по email и паролю.');
        }
        setLoading(false);
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        resetMessages();

        if (password.length < 4) {
            setError('Пароль должен быть минимум 4 символа');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError('Ошибка: ' + error.message);
        } else {
            setMessage('Пароль сохранён! Теперь вы можете входить по email и паролю.');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
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
                        {mode === 'set-password'
                            ? 'Задайте пароль для быстрого входа'
                            : 'Войдите, чтобы сохранять рецепты и настройки'}
                    </p>
                </div>

                {/* Карточка формы */}
                <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">

                    {/* === Установка пароля (после magic link) === */}
                    {mode === 'set-password' && (
                        <>
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6 text-center">
                                <p className="text-sm text-green-700 font-medium">✅ Вы вошли как {email}</p>
                                <p className="text-xs text-green-600 mt-1">Задайте пароль, чтобы входить быстрее</p>
                            </div>
                            <form onSubmit={handleSetPassword} className="space-y-4">
                                <div>
                                    <label htmlFor="new-password" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                        Новый пароль
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                        <input
                                            id="new-password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Минимум 4 символа"
                                            required
                                            minLength={4}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="confirm-password" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                        Повторите пароль
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                        <input
                                            id="confirm-password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !password || !confirmPassword}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                                    Сохранить пароль
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { window.location.href = '/dashboard'; }}
                                    className="w-full text-center text-sm text-stone-400 hover:text-stone-600 mt-2"
                                >
                                    Пропустить →
                                </button>
                            </form>
                        </>
                    )}

                    {/* === Tabs: Magic / Password / Register === */}
                    {mode !== 'set-password' && (
                        <>
                            <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setMode('magic'); resetMessages(); }}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'magic'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    ✉️ Ссылка
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('password'); resetMessages(); }}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'password'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    🔑 Пароль
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('register'); resetMessages(); }}
                                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'register'
                                        ? 'bg-white text-stone-800 shadow-sm'
                                        : 'text-stone-500 hover:text-stone-700'
                                        }`}
                                >
                                    📝 Регистрация
                                </button>
                            </div>

                            {/* === Magic Link === */}
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
                                        При первом входе вы сможете задать пароль
                                    </p>
                                </form>
                            )}

                            {/* === Email + Password === */}
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
                                                minLength={4}
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
                                        Нет пароля? Войдите по ссылке на почту или зарегистрируйтесь.
                                    </p>
                                </form>
                            )}

                            {/* === Register === */}
                            {mode === 'register' && (
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div>
                                        <label htmlFor="email-reg" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                            <input
                                                id="email-reg"
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
                                        <label htmlFor="reg-password" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                            Пароль (минимум 4 символа)
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                            <input
                                                id="reg-password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Придумайте пароль"
                                                required
                                                minLength={4}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="reg-confirm" className="block text-sm font-semibold text-stone-600 mb-1.5">
                                            Повторите пароль
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                            <input
                                                id="reg-confirm"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Повторите пароль"
                                                required
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || !email || !password || !confirmPassword}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                        Зарегистрироваться
                                    </button>

                                    <p className="text-center text-xs text-stone-400 pt-2">
                                        На почту придёт письмо подтверждения
                                    </p>
                                </form>
                            )}
                        </>
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

                {/* Кнопка назад */}
                <div className="text-center mt-6">
                    <a href="/" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 transition-colors">
                        <ArrowLeft size={14} /> Вернуться к приложению
                    </a>
                </div>
            </div>
        </div>
    );
}

// Next.js 16 требует Suspense для useSearchParams
export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
        }>
            <AuthForm />
        </Suspense>
    );
}
