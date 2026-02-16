'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, ShoppingCart, Clock, TrendingUp, CheckCircle, Loader2, Send, Bookmark, Scale, Utensils, ChevronDown, ChevronUp, Sun, Moon, Coffee, Soup, CheckSquare, Square, User, Users, Copy, Star, Eye, EyeOff, Share2, Download, ExternalLink, Printer, Image as ImageIcon, PlusCircle, StickyNote, Mail, PackagePlus, Zap, Check } from 'lucide-react';
import { ChefPlan, FamilyMember, Ingredient, Recipe, ShoppingItem, MealCategory, MEAL_CATEGORIES } from '@/lib/types';
import { generateChefPlan } from '@/app/actions/ai';

interface ChefPanelProps {
    inventory: Ingredient[];
    family: FamilyMember[];
    onSaveRecipe: (recipe: Recipe) => void;
    savedRecipeIds: string[];
}

export const ChefPanel: React.FC<ChefPanelProps> = ({ inventory, family, onSaveRecipe, savedRecipeIds }) => {
    const [onlyFridge, setOnlyFridge] = useState(false);
    const [plan, setPlan] = useState<ChefPlan | null>(null);
    const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
    const [checkedShoppingItems, setCheckedShoppingItems] = useState<Record<string, boolean>>({});
    const [selectedCategories, setSelectedCategories] = useState<MealCategory[]>(['breakfast', 'soup', 'main', 'dessert']);

    const toggleCategory = (cat: MealCategory) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    // Таймер ожидания генерации
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (generationState === 'generating') {
            setElapsedSeconds(0);
            interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [generationState]);

    const handleGenerate = async () => {
        if (inventory.length === 0) {
            alert("Добавьте продукты в холодильник перед генерацией!");
            return;
        }
        if (family.length === 0) {
            // Optional warning, but allowed
        }

        setGenerationState('generating');
        setPlan(null);
        setErrorMessage('');
        setShowShoppingList(false);

        try {
            const result = await generateChefPlan(inventory, family, onlyFridge, selectedCategories);
            if (result.success) {
                setPlan(result.data);
                setGenerationState('success');
            } else {
                setErrorMessage(result.error);
                setGenerationState('error');
            }
        } catch (error: any) {
            console.error("Generation failed:", error);
            setErrorMessage('Ошибка соединения с сервером. Попробуйте ещё раз.');
            setGenerationState('error');
        }
    };

    const toggleShoppingItem = (name: string) => {
        setCheckedShoppingItems(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    const copyShoppingList = () => {
        if (!plan) return;
        const text = `🛒 *Список покупок (Шеф-Холодильник)*\n\n` +
            plan.shoppingList.map(item => `${checkedShoppingItems[item.name] ? '✅' : '⭕'} ${item.name} (${item.quantity})`).join('\n');

        navigator.clipboard.writeText(text).then(() => alert("Список скопирован!"));
    };

    const sharePlan = () => {
        if (!plan) return;
        const recipeNames = plan.recipes.map(r => r.name).join(", ");
        const text = `🍽 *Мое Меню от Шефа*\n\n${plan.summary}\n\n🍳 *Блюда:* ${recipeNames}\n\nСоздано в приложении Шеф-Холодильник 👨‍🍳`;
        navigator.clipboard.writeText(text).then(() => alert("План скопирован!"));
    };

    const calculateTotalNutrients = () => {
        if (!plan) return { cal: 0, prot: 0, fat: 0, carb: 0 };
        // Simplified total (just sum of numbers found in strings)
        return { cal: 0, prot: 0, fat: 0, carb: 0 }; // Placeholder
    };

    // Helper to toggle recipe details
    const toggleRecipeExpand = (id: string) => {
        if (expandedRecipe === id) {
            setExpandedRecipe(null);
        } else {
            setExpandedRecipe(id);
        }
    };


    if (generationState === 'generating') {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-full text-center space-y-6 animate-pulse">
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <ChefHat size={64} className="text-orange-500 animate-bounce relative z-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Шеф думает...</h2>
                <div className="text-3xl font-mono font-bold text-orange-500">{elapsedSeconds} сек</div>
                <div className="max-w-md space-y-2 text-gray-500 text-sm">
                    <p className="flex items-center gap-2 justify-center"><CheckCircle size={14} className="text-green-500" /> Анализирую {inventory.length} продуктов</p>
                    <p className="flex items-center gap-2 justify-center"><CheckCircle size={14} className="text-blue-500" /> Учитываю цели {family.length} членов семьи</p>
                    <p className="flex items-center gap-2 justify-center"><CheckCircle size={14} className="text-purple-500" /> Подбираю рецепты...</p>
                </div>

                <div className="w-full max-w-xs bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-400 to-red-500 h-2.5 rounded-full animate-[shimmer_1s_infinite]" style={{ width: `${Math.min(90, elapsedSeconds * 2)}%`, transition: 'width 1s ease' }}></div>
                </div>
                {elapsedSeconds > 15 && <p className="text-xs text-gray-400">Почти готово, подождите ещё немного...</p>}
            </div>
        );
    }

    if (generationState === 'error') {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="bg-red-50 p-4 rounded-full">
                    <Soup size={48} className="text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-red-600">Упс, кухня закрыта!</h2>
                <p className="text-gray-600 max-w-md">{errorMessage || 'Шеф не смог придумать меню. Возможно, сервер перегружен.'}</p>
                <button
                    onClick={handleGenerate}
                    className="bg-orange-500 text-white px-6 py-2 rounded-xl mt-4 hover:bg-orange-600 transition-colors"
                >
                    Попробовать снова
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-2 text-white rounded-xl shadow-lg shadow-orange-200">
                        <ChefHat size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Меню от Шефа</h2>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Персональный план питания</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button
                        // This state isn't actually managed, maybe just toggle visually for now if needed. 
                        // Wait, onlyFridge state is managed above.
                        onClick={() => setOnlyFridge(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 
                    ${!onlyFridge ? 'bg-white text-gray-800 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        <ShoppingCart size={14} /> Надо купить
                    </button>
                    <button
                        onClick={() => setOnlyFridge(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5
                    ${onlyFridge ? 'bg-white text-green-700 shadow-sm border border-green-100' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        <CheckCircle size={14} /> Только из холодильника
                    </button>
                </div>
            </div>

            {!plan ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 bg-stone-50/50 rounded-2xl border-2 border-dashed border-gray-200 m-4 p-6">
                    <div className="bg-white p-5 rounded-full shadow-sm mb-1">
                        <Zap size={44} className="text-yellow-400 fill-current" />
                    </div>

                    <div className="max-w-md mx-auto w-full">
                        <h3 className="text-lg font-bold text-gray-700 mb-1">Что приготовить?</h3>
                        <p className="text-gray-400 mb-4 text-sm">Выберите категории блюд для генерации</p>

                        {/* Чекбоксы категорий */}
                        <div className="grid grid-cols-2 gap-2 mb-6 text-left">
                            {MEAL_CATEGORIES.map(cat => {
                                const isSelected = selectedCategories.includes(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => toggleCategory(cat.id)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium ${isSelected
                                            ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm'
                                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="text-lg">{cat.emoji}</span>
                                        <span className="flex-1">{cat.label}</span>
                                        {isSelected ? (
                                            <CheckSquare size={16} className="text-orange-500 flex-shrink-0" />
                                        ) : (
                                            <Square size={16} className="text-gray-300 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={inventory.length === 0 || selectedCategories.length === 0}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg font-bold py-4 px-8 rounded-xl shadow-xl shadow-orange-200 transition-transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <ChefHat className="group-hover:rotate-12 transition-transform" />
                            СОСТАВИТЬ МЕНЮ
                        </button>
                        {inventory.length === 0 && <p className="text-red-400 text-xs mt-3 font-medium">Сначала добавьте продукты в холодильник!</p>}
                        {selectedCategories.length === 0 && <p className="text-red-400 text-xs mt-3 font-medium">Выберите хотя бы одну категорию!</p>}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-5 rounded-xl shadow-lg mb-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp size={100} />
                        </div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <h3 className="font-bold text-orange-400 mb-1 flex items-center gap-2"><ChefHat size={16} /> Мнение Шефа:</h3>
                                <p className="text-sm text-gray-300 leading-relaxed max-w-xl italic">"{plan.summary}"</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={sharePlan} className="text-gray-400 hover:text-white transition-colors bg-white/10 p-2 rounded-lg backdrop-blur-sm" title="Поделиться">
                                    <Share2 size={16} />
                                </button>
                                <button onClick={() => setShowShoppingList(!showShoppingList)} className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${showShoppingList ? 'bg-white text-gray-900' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                                    <ShoppingCart size={16} /> {showShoppingList ? 'К Рецептам' : `Список покупок (${plan.shoppingList.length})`}
                                </button>
                            </div>
                        </div>
                    </div>

                    {showShoppingList ? (
                        <div className="space-y-4 animate-fade-in shopping-list-print">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-lg">Список покупок</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => window.print()} className="text-sm text-gray-500 hover:text-blue-500 flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-lg">
                                        <Printer size={14} /> Печать
                                    </button>
                                    <button onClick={copyShoppingList} className="text-sm text-gray-500 hover:text-blue-500 flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-lg">
                                        <Copy size={14} /> Копировать
                                    </button>
                                </div>
                            </div>

                            {plan.shoppingList.length > 0 ? (
                                <div className="bg-orange-50/50 rounded-xl border border-orange-100 divide-y divide-orange-100">
                                    {plan.shoppingList.map((item, idx) => (
                                        <div key={idx}
                                            onClick={() => toggleShoppingItem(item.name)}
                                            className={`p-3 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors ${checkedShoppingItems[item.name] ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checkedShoppingItems[item.name] ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                                                    {checkedShoppingItems[item.name] && <Check size={12} className="text-white" />}
                                                </div>
                                                <div>
                                                    <p className={`font-medium ${checkedShoppingItems[item.name] ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.name}</p>
                                                    <div className="flex gap-2 text-[10px] text-gray-500">
                                                        <span className="bg-white px-1.5 py-0.5 rounded border border-orange-100 text-orange-600 font-bold">{item.quantity}</span>
                                                        <span>для: {item.reason}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                                    <CheckSquare size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Список покупок пуст. Всё есть дома! 🎉</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            {plan.recipes.map((recipe, index) => {
                                const recipeId = recipe.id || index.toString();
                                const isExpanded = expandedRecipe === recipeId;
                                const isSaved = savedRecipeIds.includes(recipeId);

                                return (
                                    <div key={recipeId} className="border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden recipe-card-print">
                                        {/* Card Header & Main Info */}
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex gap-2 mb-2">
                                                        {recipe.mealType && recipe.mealType.map(tag => (
                                                            <span key={tag} className="bg-orange-100 text-orange-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide border ${recipe.difficulty === 'Easy' ? 'border-green-200 text-green-600' :
                                                            recipe.difficulty === 'Medium' ? 'border-yellow-200 text-yellow-600' : 'border-red-200 text-red-600'
                                                            }`}>
                                                            {recipe.difficulty}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{recipe.name}</h3>
                                                </div>
                                                <button
                                                    onClick={() => onSaveRecipe(recipe)}
                                                    disabled={isSaved}
                                                    className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-orange-100 text-orange-500' : 'bg-gray-50 text-gray-400 hover:bg-orange-50 hover:text-orange-500'}`}
                                                >
                                                    <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
                                                </button>
                                            </div>

                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 md:line-clamp-none leading-relaxed">
                                                {recipe.description}
                                            </p>

                                            <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={16} className="text-orange-400" /> {recipe.cookingTimeMinutes} мин
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Scale size={16} className="text-blue-400" /> {recipe.weightPerServing} / порция
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <TrendingUp size={16} className="text-green-400" /> {recipe.caloriesPerServing}
                                                </div>
                                            </div>

                                            {/* Ingredient Preview */}
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {recipe.ingredientsToUse.slice(0, 5).map((ing, i) => (
                                                    <span key={i} className="text-[11px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                                                        {ing}
                                                    </span>
                                                ))}
                                                {recipe.ingredientsToUse.length > 5 && (
                                                    <span className="text-[11px] text-gray-400 px-1 py-1">+{recipe.ingredientsToUse.length - 5} еще</span>
                                                )}
                                                {recipe.missingIngredients.length > 0 && recipe.missingIngredients.map((ing, i) => (
                                                    <span key={`miss-${i}`} className="text-[11px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 flex items-center gap-1">
                                                        <ShoppingCart size={10} /> {ing}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Expand Button */}
                                            <button
                                                onClick={() => toggleRecipeExpand(recipeId)}
                                                className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                            >
                                                {isExpanded ? 'Свернуть детали' : 'Смотреть рецепт и пользу'}
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 bg-gray-50/50 p-5 animate-slide-down">
                                                {/* Health Stats */}
                                                <div className="mb-6">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Почему это полезно</h4>
                                                    <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800 mb-3">
                                                        {recipe.healthBenefits}
                                                    </div>

                                                    {/* Family Suitability */}
                                                    <div className="space-y-2">
                                                        {recipe.familySuitability.map((suit, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${suit.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                                                    suit.percentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                    {suit.percentage}%
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-bold text-gray-800 text-sm">{suit.memberName}</span>
                                                                        {/* Nutrition Stats (Mini) */}
                                                                        {suit.nutritionStats && (
                                                                            <div className="flex gap-2 text-[10px] text-gray-400">
                                                                                <span title="Ккал">%DV: {suit.nutritionStats.caloriesPercent}% Cal</span>
                                                                                <span title="Белок">{suit.nutritionStats.proteinPercent}% Prot</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-gray-500">{suit.reason}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Instructions */}
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Utensils size={14} /> Процесс приготовления</h4>
                                                    <ol className="space-y-4 relative border-l-2 border-orange-100 ml-3 pl-5 py-2">
                                                        {recipe.instructions.map((step, sIdx) => (
                                                            <li key={sIdx} className="text-sm text-gray-700 relative">
                                                                <span className="absolute -left-[27px] top-0 bg-orange-100 text-orange-600 font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm ring-2 ring-white">{sIdx + 1}</span>
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                                                    <Share2 size={16} className="text-gray-400 cursor-pointer hover:text-blue-500" onClick={() => {
                                                        const text = `${recipe.name}\n\n${recipe.instructions.join('\n')}`;
                                                        navigator.clipboard.writeText(text);
                                                        alert("Рецепт скопирован!");
                                                    }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
