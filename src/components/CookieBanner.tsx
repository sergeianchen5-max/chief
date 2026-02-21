'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Проверяем, есть ли уже согласие
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 sm:p-6 shadow-2xl z-[100] transform transition-transform duration-500 translate-y-0">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-4xl">
                    Мы используем файлы cookie для улучшения работы сайта (согласно ФЗ-152), настройки персонализации и обеспечения безопасности.
                    Продолжая использовать наш сервис, вы автоматически соглашаетесь с{' '}
                    <Link href="/privacy" className="text-orange-400 hover:text-orange-300 underline font-medium cursor-pointer">
                        Политикой конфиденциальности
                    </Link>
                    {' '}и{' '}
                    <Link href="/terms" className="text-orange-400 hover:text-orange-300 underline font-medium cursor-pointer">
                        Пользовательским соглашением (Офертой)
                    </Link>.
                </div>
                <button
                    onClick={handleAccept}
                    className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 focus:ring-4 focus:ring-orange-500/30 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
                >
                    Понятно, Спасибо!
                </button>
            </div>
        </div>
    );
}
