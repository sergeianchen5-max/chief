'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';

// Расширяем тип BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface WindowEventMap {
        beforeinstallprompt: BeforeInstallPromptEvent;
    }
}

export default function PWAInstallBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Проверяем, уже установлено ли приложение
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Проверяем была ли уже закрыта подсказка сегодня
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
            if (dismissedTime > dayAgo) return;
        }

        // Определяем iOS
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const isInStandalone = ('standalone' in navigator) && (navigator as any).standalone;

        if (ios && !isInStandalone) {
            setIsIOS(true);
            // Показываем промпт через 3 секунды для iOS
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        // Android / Chrome — ловим beforeinstallprompt
        const handler = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Показываем через 3 секунды
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    };

    if (!showBanner || isInstalled) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] p-3 animate-fade-in">
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 max-w-sm mx-auto">
                {/* Иконка приложения */}
                <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <img src="/logo-chef.svg" alt="Шеф-холодильник" className="w-9 h-9" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight">Установить Шеф-холодильник</p>
                    {isIOS ? (
                        <>
                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                                Нажмите <Share size={11} className="inline mx-0.5" /> в браузере, затем <strong>«На экран Домой»</strong>
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Работает без интернета, быстрее браузера</p>
                            <button
                                onClick={handleInstall}
                                className="mt-2 flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-orange-600 transition-colors"
                            >
                                <Plus size={12} /> Установить
                            </button>
                        </>
                    )}
                </div>

                <button
                    onClick={handleDismiss}
                    className="p-1 text-gray-500 hover:text-gray-300 shrink-0 -mt-1"
                    aria-label="Закрыть"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
