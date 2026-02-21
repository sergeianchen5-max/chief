'use client';

import { Check, Star, Zap, Shield, Loader2 } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useState } from 'react';

export default function PricingPage() {
    const { user, profile, loading: authLoading } = useUser();
    const [loading, setLoading] = useState(false);

    const isPro = profile?.subscription_tier === 'pro' && profile?.subscription_active;

    const handleSubscribe = async () => {
        if (!user) {
            alert('Сначала нужно войти в аккаунт');
            return;
        }
        setLoading(true);
        try {
            const { createSubscriptionPayment } = await import('@/app/actions/payment');
            const res = await createSubscriptionPayment();

            if (res && res.success && res.url) {
                // Redirect user to YooKassa payment page
                window.location.href = res.url;
            } else {
                alert('Ошибка создания платежа: ' + (res?.error || 'Неизвестная ошибка'));
                setLoading(false);
            }
        } catch (e: any) {
            alert('Сбой при переходе к оплате: ' + e.message);
            setLoading(false);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-orange-500" size={48} /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto text-center mb-12">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Откройте все возможности <span className="text-orange-500">Шеф-Холодильника</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Генерируйте без ограничений, планируйте покупки и питайтесь вкусно каждый день.
                </p>
            </div>

            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-start">

                {/* Free Tier */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Базовый шеф</h2>
                    <p className="text-gray-500 mb-6">Для тех, кто готовит по настроению</p>
                    <div className="mb-8">
                        <span className="text-4xl font-extrabold text-gray-900">Бесплатно</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start gap-3">
                            <Check className="text-gray-400 mt-0.5 shrink-0" size={20} />
                            <span className="text-gray-600">До 5 генераций рецептов в день</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="text-gray-400 mt-0.5 shrink-0" size={20} />
                            <span className="text-gray-600">Сохранение рецептов в избранное</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="text-gray-400 mt-0.5 shrink-0" size={20} />
                            <span className="text-gray-600">Базовые параметры ИИ</span>
                        </li>
                    </ul>

                    <div className="bg-gray-50 text-gray-600 text-center py-3 rounded-xl font-medium w-full mt-auto">
                        {isPro ? 'Доступно' : 'Ваш текущий тариф'}
                    </div>
                </div>

                {/* Pro Tier */}
                <div className="bg-orange-500 rounded-3xl p-8 shadow-xl relative text-white transform md:-translate-y-4">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl uppercase tracking-wider">
                        Популярный выбор
                    </div>

                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Star className="text-yellow-300 fill-yellow-300" size={24} />
                        Шеф PRO
                    </h2>
                    <p className="text-orange-100 mb-6">Полный контроль над вашим питанием</p>
                    <div className="mb-8">
                        <span className="text-4xl font-extrabold">199 ₽</span>
                        <span className="text-orange-200"> / месяц</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex items-start gap-3">
                            <Zap className="text-yellow-300 mt-0.5 shrink-0" size={20} />
                            <span className="font-medium">Безлимитные генерации рецептов</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="text-orange-200 mt-0.5 shrink-0" size={20} />
                            <span>Умные списки покупок</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="text-orange-200 mt-0.5 shrink-0" size={20} />
                            <span>Детальный анализ БЖУ для семьи</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <Check className="text-orange-200 mt-0.5 shrink-0" size={20} />
                            <span>Отсутствие рекламы</span>
                        </li>
                    </ul>

                    <button
                        onClick={handleSubscribe}
                        disabled={loading || isPro}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-md flex justify-center items-center gap-2 ${isPro
                            ? 'bg-orange-600 text-orange-200 cursor-not-allowed'
                            : 'bg-white text-orange-600 hover:bg-gray-50 hover:shadow-lg active:scale-95'
                            }`}
                    >
                        {loading && <Loader2 className="animate-spin" size={20} />}
                        {isPro ? 'У вас уже есть PRO' : 'Оформить подписку'}
                    </button>

                    <div className="mt-4 flex items-center justify-center gap-2 text-orange-200 text-xs opacity-80">
                        <Shield size={14} />
                        <span>Безопасная оплата картой РФ (ЮKassa)</span>
                    </div>
                </div>

            </div>

            <div className="text-center mt-12 mb-8">
                <a href="/" className="text-gray-500 hover:text-gray-900 font-medium">← Вернуться на главную</a>
            </div>
        </div>
    );
}
