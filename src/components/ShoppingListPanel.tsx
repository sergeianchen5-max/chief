'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingItem } from '@/lib/types';
import { getShoppingLists, deleteShoppingList } from '@/app/actions/shopping';
import { ShoppingCart, CheckCircle, Circle, Trash2, Loader2, RefreshCw } from 'lucide-react';

interface ShoppingListRecord {
    id: string;
    recipe_id: string;
    items: ShoppingItem[];
    created_at: string;
    recipes?: any;
}

export const ShoppingListPanel: React.FC = () => {
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
        fetchLists();
    }, []);

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
            alert('Ошбика удаления: ' + res.error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-orange-600">
                    <ShoppingCart size={24} />
                    <h2 className="text-xl font-bold text-gray-800">Список покупок</h2>
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
                    <div className="text-center text-gray-400 mt-10">
                        <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Ваш список покупок пуст</p>
                        <p className="text-sm mt-2">Добавляйте ингредиенты из ваших рецептов.</p>
                    </div>
                ) : (
                    lists.map(list => (
                        <div key={list.id} className="border border-orange-100 rounded-xl p-4 bg-orange-50/30">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-800">
                                        Для рецепта: {list.recipes?.title || 'Неизвестный рецепт'}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {new Date(list.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteList(list.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Очистить"
                                >
                                    <Trash2 size={18} />
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
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isToggled ? 'bg-gray-100 opacity-50' : 'bg-white hover:bg-orange-50 border border-orange-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isToggled ? <CheckCircle size={18} className="text-gray-400" /> : <Circle size={18} className="text-orange-500" />}
                                                <div>
                                                    <span className={`font-medium ${isToggled ? 'line-through text-gray-500' : 'text-gray-800'}`}>
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
