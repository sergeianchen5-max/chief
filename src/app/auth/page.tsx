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

                    {/* Социальные сети */}
                    <div className="space-y-3">
                        {/* VK OAuth */}
                        <button
                            onClick={() => handleProviderLogin('vk')}
                            disabled={loading}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-[#0077FF] hover:bg-[#0066d6] text-white rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.071 2.396c0-1.196-1.503-1.66-2.18-.654-.251.373-.41.777-.59 1.18-.846 1.884-2.164 3.491-3.64 4.957-.791.785-1.579 1.571-2.316 2.404-.755.854-1.39 1.815-1.782 2.9-.661 1.83-1.282 3.673-1.077 5.66.195 1.889 1.258 3.551 2.766 4.75 1.701 1.355 3.829 1.847 5.922 1.942 2.809.127 5.626-.532 8.082-1.921 1.87-1.057 3.418-2.671 4.544-4.502.946-1.543 1.546-3.262 1.814-5.045.289-1.916.14-3.876-.445-5.717-.5-1.573-1.309-3.036-2.427-4.229-1.386-1.48-3.158-2.466-5.111-2.903-1.144-.256-2.327-.291-3.483-.173-.85.086-1.594.733-1.594 1.597v.528c0 .886.711 1.637 1.597 1.65.654.01 1.32.062 1.968.18 1.401.257 2.664.996 3.593 2.059.882 1.006 1.41 2.298 1.63 3.619.248 1.488.243 3.013-.03 4.484-.252 1.354-.784 2.64-1.554 3.754-.863 1.252-2.028 2.247-3.328 2.92-1.895.98-4.135 1.349-6.264 1.146-1.638-.156-3.167-.714-4.42-1.748-1.066-.88-1.794-2.115-2.02-3.473-.207-1.24-.131-2.525.17-3.757.362-1.474 1.15-2.825 2.23-3.882.97-.952 2.083-1.761 3.28-2.392 1.229-.648 2.55-1.127 3.901-1.383 1.042-.198 2.112-.301 3.178-.344.939-.039 1.7-.817 1.7-1.758v-1.173z" />
                            </svg>
                            <span className="flex-1 text-center font-bold">ВКонтакте</span>
                        </button>

                        {/* Yandex OAuth */}
                        <button
                            onClick={() => handleProviderLogin('yandex')}
                            disabled={loading}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-[#FFCC00] hover:bg-[#E6B800] text-black rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.9211 20.3016C12.9211 18.0494 14.5029 16.4867 17.5873 14.9365L22.6159 12.3968C23.5175 11.9587 24 11.2317 24 10.3683C24 8.79998 22.8286 7.64442 20.5714 7.64442H16.4826V4.18728C16.4826 3.14918 15.6572 2.30792 14.6222 2.30792C13.5873 2.30792 12.7619 3.14918 12.7619 4.18728V14.6984C12.7619 15.4254 12.3873 15.8032 11.6984 15.8032C11.1206 15.8032 10.7429 15.4851 10.4286 14.7778L7.69528 8.87935L7.02224 7.4254C6.54605 6.36506 5.86986 5.81586 4.90478 5.81586H2.17145C0.844464 5.81586 0 6.64442 0 7.8222C0 8.44124 0.288889 8.95869 0.815873 9.4952L5.87937 14.3683C7.57143 15.9048 9.06349 19.346 9.06349 20.3016C9.06349 21.0508 9.5397 21.6952 10.2794 21.6952C10.6699 21.6952 11.1397 21.4984 11.4571 21.2222C11.6667 21 11.9746 20.6984 12.1873 20.4444C12.6349 20.6984 12.9211 20.7365 12.9211 20.3016Z" fill="#FC3F1D" />
                            </svg>
                            <span className="flex-1 text-center font-bold">Яндекс</span>
                        </button>

                        {/* Mail.ru OAuth */}
                        <button
                            onClick={() => handleProviderLogin('mailru')}
                            disabled={loading}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-[#005FF9] hover:bg-[#0050d4] text-white rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M23.088 11.14c0 3.821-3.665 6.471-7.794 5.753-1.634-.284-3.52-1.745-3.52-1.745s1.952.1 3.551-.59v-1.1c-1.285.45-3.08.405-3.08.405s-.96 1.745-3.518 1.745c-2.43 0-4.524-1.644-4.524-4.468C4.203 7.8 7.375 7 10.151 7c4.616 0 8.239 1.95 8.239 5.865h-.002v1.077c0 .874-.693 1.58-1.547 1.58-.854 0-1.548-.707-1.548-1.581V11.23c0-2.39-1.898-4.331-4.24-4.331-2.341 0-4.239 1.942-4.239 4.332s1.898 4.33 4.24 4.33c.805 0 1.558-.235 2.193-.64.444.606 1.157 1.002 1.968 1.002 1.34 0 2.427-1.11 2.427-2.477v-.234-.582-.008.006-.016.03c-.02-1.99 1.408-3.084 3.447-2.35.006 1.258.053 4.312-3.666 5.804-.545.22-.647 1.05-.183 1.433.805.666 2.057 1.636 2.502 1.996C21.841 17.59 24 14.864 24 11.14c0-.395-.145-2.096-1.536-3.834-.652-.813-1.815-.815-2.441.015-.461.611-.531 1.487-.251 2.083.473-.399 2.196-1.838 2.378-2.614.938 1.535.938 3.597.938 4.316.001.012.001.025.001.034zM11.054 9.172c-1.118 0-2.023.926-2.023 2.065 0 1.14.905 2.065 2.023 2.065 1.117 0 2.023-.926 2.023-2.065 0-1.14-.906-2.065-2.023-2.065zM2.81 12.086c0-1.282.883-2.673 2.57-2.91 1-.14 1.77.712 1.624 1.7-.14 1-.941 1.028-1.527 1.028-.432 0-.822.404-.822.842 0 .437.388.84.811.84.664 0 1.256-.445 1.493-1.071.304-.798 1.347-1.17 2.046-.723.753.483.743 1.53.076 2.155-1.066.995-2.482 1.328-3.842 1.328-1.36 0-2.43-1.428-2.43-3.189zM10.15 4.888C6.918 4.888 3.193 5.483 1.272 7.749c-.838.988-1.036 2.296-.549 3.635.311.854 1.275 1.082 1.836.435.632-.731.543-1.666-.027-2.227-.376-.369-1.121-1.018-.73-2.26 1.052-3.328 6.071-3.692 8.35-3.692.658 0 1.265-.121 1.796-.341.745-.308.777-1.367.05-1.721A6.772 6.772 0 0010.15 4.89h-.001z" />
                            </svg>
                            <span className="flex-1 text-center font-bold">Mail.ru</span>
                        </button>
                    </div>

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
