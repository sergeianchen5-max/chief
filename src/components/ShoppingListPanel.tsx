'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingItem } from '@/lib/types';
import { getShoppingLists, deleteShoppingList } from '@/app/actions/shopping';
import { ShoppingCart, CheckCircle, Circle, Trash2, Loader2, RefreshCw, LogIn } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';

interface ShoppingListRecord {
    id: string;
    recipe_id: string;
    items: ShoppingItem[];
    created_at: string;
    recipes?: any;
}

interface ShoppingListPanelProps {
    user: User | null;
}

export const ShoppingListPanel: React.FC<ShoppingListPanelProps> = ({ user }) => {
    const [lists, setLists] = useState<ShoppingListRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggledItems, setToggledItems] = useState<Set<string>>(new Set());

    const fetchLists = async () => {
        setLoading(true);
        const res = await getShoppingLists();
        if (res.success && res.data) {
            setLists(res.data);
        } else {
            console.error(res.error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            fetchLists();
        } else {
            setLoading(false);
        }
    }, [user]);

    const toggleItem = (listId: string, itemIdx: number) => {
        const key = `${listId}-${itemIdx}`;
        setToggledItems(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleDeleteList = async (id: string) => {
        if (!window.confirm('Удалить этот список покупок?')) return;
        const res = await deleteShoppingList(id);
        if (res.success) {
            setLists(prev => prev.filter(l => l.id !== id));
        } else {
            alert('Ошибка удаления: ' + res.error);
        }
    };

    // ✅ Если гость — показываем красивый призыв к авторизации
    if (!user) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col items-center justify-center text-center">
                <div className="bg-orange-50 p-5 rounded-full mb-4">
                    <ShoppingCart size={40} className="text-orange-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Список покупок</h2>
                <p className="text-gray-500 text-sm mb-6 max-w-xs">
                    Войдите в аккаунт, чтобы сохранять списки покупок из рецептов и получать к ним доступ с любого устройства.
                </p>
                <Link
                    href="/auth"
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-red-600 transition-all active:scale-95"
                >
                    <LogIn size={18} />
                    Войти в аккаунт
                </Link>
                <p className="text-xs text-gray-400 mt-4">Бесплатно · Быстрая регистрация</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-orange-600">
                    <ShoppingCart size={22} />
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Список покупок</h2>
                </div>
                <button
                    onClick={fetchLists}
                    className="p-2 text-gray-400 hover:text-orange-500 rounded-full hover:bg-orange-50"
                    title="Обновить"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {lists.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10 flex flex-col items-center gap-3">
                        <ShoppingCart size={48} className="opacity-20" />
                        <p className="font-medium">Ваш список покупок пуст</p>
                        <p className="text-sm">Добавляйте ингредиенты из ваших рецептов в разделе «Рецепты»</p>
                    </div>
                ) : (
                    lists.map(list => (
                        <div key={list.id} className="border border-orange-100 rounded-xl p-3 sm:p-4 bg-orange-50/30">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                                        Для рецепта: {list.recipes?.title || 'Неизвестный рецепт'}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {new Date(list.created_at).toLocaleDateString('ru-RU')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteList(list.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    title="Очистить"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <ul className="space-y-2">
                                {list.items.map((item, idx) => {
                                    const key = `${list.id}-${idx}`;
                                    const isToggled = toggledItems.has(key);
                                    return (
                                        <li
                                            key={idx}
                                            onClick={() => toggleItem(list.id, idx)}
                                            className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors ${isToggled ? 'bg-gray-100 opacity-50' : 'bg-white hover:bg-orange-50 border border-orange-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isToggled ? <CheckCircle size={18} className="text-gray-400" /> : <Circle size={18} className="text-orange-500" />}
                                                <div>
                                                    <span className={`font-medium text-sm ${isToggled ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                        {item.name}
                                                    </span>
                                                    {item.reason && <p className="text-[10px] text-gray-500">{item.reason}</p>}
                                                </div>
                                            </div>
                                            {item.quantity && (
                                                <span className={`text-sm font-semibold ${isToggled ? 'text-gray-400' : 'text-orange-600'}`}>
                                                    {item.quantity}
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
