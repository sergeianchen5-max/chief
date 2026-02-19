'use client';

import React, { useState, useRef } from 'react';
import { Ingredient, Category } from '@/lib/types';
import { Plus, Trash2, Camera, Loader2, Apple, Milk, Beef, Wheat, Snowflake, Package, ChevronDown, Check } from 'lucide-react';
import { recognizeIngredients } from '@/app/actions/vision';

interface FridgePanelProps {
    inventory: Ingredient[];
    setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
}

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
    produce: <Apple size={16} className="text-green-500" />,
    dairy: <Milk size={16} className="text-blue-400" />,
    meat: <Beef size={16} className="text-red-500" />,
    pantry: <Wheat size={16} className="text-yellow-600" />,
    frozen: <Snowflake size={16} className="text-cyan-400" />,
    other: <Package size={16} className="text-gray-400" />
};

const CATEGORY_NAMES: Record<Category, string> = {
    produce: 'Овощи и Фрукты',
    dairy: 'Молочные',
    meat: 'Мясо/Рыба',
    pantry: 'Бакалея',
    frozen: 'Заморозка',
    other: 'Разное'
};

// Data for Quick Add feature
interface QuickItem {
    name: string;
    category: Category;
}

interface QuickCategory {
    id: string;
    label: string;
    items: QuickItem[];
}

const QUICK_CATEGORIES: QuickCategory[] = [
    {
        id: 'base',
        label: 'База и Гарниры',
        items: [
            { name: 'Яйца', category: 'dairy' },
            { name: 'Хлеб', category: 'pantry' },
            { name: 'Рис', category: 'pantry' },
            { name: 'Гречка', category: 'pantry' },
            { name: 'Макароны', category: 'pantry' },
            { name: 'Овсянка', category: 'pantry' },
            { name: 'Картофель', category: 'produce' },
            { name: 'Мука', category: 'pantry' },
            { name: 'Чечевица', category: 'pantry' },
            { name: 'Фасоль', category: 'pantry' },
        ]
    },
    {
        id: 'veg',
        label: 'Овощи и Фрукты',
        items: [
            { name: 'Лук репчатый', category: 'produce' },
            { name: 'Морковь', category: 'produce' },
            { name: 'Помидоры', category: 'produce' },
            { name: 'Огурцы', category: 'produce' },
            { name: 'Чеснок', category: 'produce' },
            { name: 'Перец болгарский', category: 'produce' },
            { name: 'Капуста', category: 'produce' },
            { name: 'Зелень (Укроп/Петрушка)', category: 'produce' },
            { name: 'Яблоки', category: 'produce' },
            { name: 'Бананы', category: 'produce' },
            { name: 'Лимон', category: 'produce' },
        ]
    },
    {
        id: 'meat',
        label: 'Мясо и Рыба',
        items: [
            { name: 'Курица', category: 'meat' },
            { name: 'Фарш', category: 'meat' },
            { name: 'Свинина', category: 'meat' },
            { name: 'Говядина', category: 'meat' },
            { name: 'Рыба (Филе)', category: 'meat' },
            { name: 'Сосиски', category: 'meat' },
            { name: 'Бекон', category: 'meat' },
        ]
    },
    {
        id: 'dairy',
        label: 'Молочка и Жиры',
        items: [
            { name: 'Молоко', category: 'dairy' },
            { name: 'Сметана', category: 'dairy' },
            { name: 'Сыр', category: 'dairy' },
            { name: 'Масло сливочное', category: 'dairy' },
            { name: 'Творог', category: 'dairy' },
            { name: 'Кефир', category: 'dairy' },
            { name: 'Масло растительное', category: 'pantry' },
            { name: 'Масло оливковое', category: 'pantry' },
        ]
    },
    {
        id: 'spices',
        label: 'Специи и Вода',
        items: [
            { name: 'Вода', category: 'pantry' },
            { name: 'Соль', category: 'pantry' },
            { name: 'Перец черный', category: 'pantry' },
            { name: 'Сахар', category: 'pantry' },
            { name: 'Томатная паста', category: 'pantry' },
            { name: 'Соевый соус', category: 'pantry' },
            { name: 'Майонез', category: 'pantry' },
            { name: 'Чай/Кофе', category: 'pantry' },
        ]
    },
];

export const FridgePanel: React.FC<FridgePanelProps> = ({ inventory, setInventory }) => {
    const [newItem, setNewItem] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeQuickTab, setActiveQuickTab] = useState<string>('base');
    const [isQuickPanelOpen, setIsQuickPanelOpen] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addIngredient = (name: string, category: Category = 'other') => {
        // Prevent duplicates
        if (inventory.some(i => i.name.toLowerCase() === name.toLowerCase())) return;

        const ingredient: Ingredient = {
            id: Date.now().toString() + Math.random().toString(),
            name: name.trim(),
            category: category
        };
        setInventory(prev => [...prev, ingredient]);
    };

    const handleManualAdd = () => {
        if (!newItem.trim()) return;
        addIngredient(newItem.trim(), 'other');
        setNewItem('');
    };

    const removeIngredient = (id: string) => {
        setInventory(inventory.filter(i => i.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleManualAdd();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const base64String = (reader.result as string).split(',')[1];
                const detectedItems = await recognizeIngredients(base64String);
                // Avoid adding duplicates from AI
                setInventory(prev => {
                    const existingNames = new Set(prev.map(i => i.name.toLowerCase()));
                    const newUniqueItems = detectedItems.filter(i => !existingNames.has(i.name.toLowerCase()));
                    return [...prev, ...newUniqueItems];
                });
            } catch (error) {
                alert("Не удалось распознать продукты. Попробуйте четкое фото.");
            } finally {
                setIsAnalyzing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    // Group items by category for the list view
    const groupedInventory = inventory.reduce((acc, item) => {
        const cat = item.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<Category, Ingredient[]>);

    // Check if item is already in fridge (for Quick Add highlighting)
    const isItemInFridge = (name: string) => {
        return inventory.some(i => i.name.toLowerCase() === name.toLowerCase());
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-blue-600">
                    <Package size={24} />
                    <h2 className="text-xl font-bold text-gray-800">Мои Продукты</h2>
                </div>
                <span className="text-sm font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {inventory.length} шт.
                </span>
            </div>

            {/* Input Area */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Яйца, курица..."
                        className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="bg-indigo-100 text-indigo-600 p-3 rounded-xl hover:bg-indigo-200 transition-colors disabled:opacity-50"
                    title="Скан по фото"
                >
                    {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                </button>

                <button
                    onClick={handleManualAdd}
                    className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors"
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Quick Add Section */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Быстрый выбор</h3>
                    <button
                        onClick={() => setIsQuickPanelOpen(!isQuickPanelOpen)}
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                    >
                        {isQuickPanelOpen ? <ChevronDown size={14} className="transform rotate-180" /> : <ChevronDown size={14} />}
                    </button>
                </div>

                {isQuickPanelOpen && (
                    <div className="animate-fade-in">
                        {/* Categories Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
                            {QUICK_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveQuickTab(cat.id)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                                ${activeQuickTab === cat.id
                                            ? 'bg-gray-800 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Chips Grid */}
                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 max-h-32 overflow-y-auto">
                            {QUICK_CATEGORIES.find(c => c.id === activeQuickTab)?.items.map((item, idx) => {
                                const active = isItemInFridge(item.name);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => active ? null : addIngredient(item.name, item.category)}
                                        disabled={active}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                                    ${active
                                                ? 'bg-green-100 text-green-700 border-green-200 opacity-60'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600 hover:shadow-sm'}`}
                                    >
                                        {active && <Check size={10} />}
                                        {item.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Inventory List */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {inventory.length === 0 ? (
                    <div className="text-center text-gray-400 mt-4">
                        <p>Холодильник пуст 🧊</p>
                        <p className="text-sm mt-2">Выберите базовые продукты сверху<br />или добавьте свои</p>
                    </div>
                ) : (
                    Object.entries(groupedInventory).map(([cat, items]) => (
                        <div key={cat}>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1 sticky top-0 bg-white py-2 z-10">
                                {CATEGORY_ICONS[cat as Category]} {CATEGORY_NAMES[cat as Category]}
                            </h3>
                            <div className="space-y-2">
                                {(items as Ingredient[]).map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100">
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                        <button
                                            onClick={() => removeIngredient(item.id)}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
