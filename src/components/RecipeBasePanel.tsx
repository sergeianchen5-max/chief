'use client';

import React, { useState } from 'react';
import { Recipe } from '@/lib/types';
import { BookOpen, Clock, Scale, Trash2, ChevronDown, ChevronUp, Utensils, Share2 } from 'lucide-react';

interface RecipeBasePanelProps {
    savedRecipes: Recipe[];
    onRemoveRecipe: (id: string) => void;
}

export const RecipeBasePanel: React.FC<RecipeBasePanelProps> = ({ savedRecipes, onRemoveRecipe }) => {
    const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

    const toggleInstructions = (id: string) => {
        if (expandedRecipe === id) {
            setExpandedRecipe(null);
        } else {
            setExpandedRecipe(id);
        }
    };

    const handleShareRecipe = (r: Recipe) => {
        let text = `🍽 *${r.name}* \n\n⏱ ${r.cookingTimeMinutes} мин | ${r.caloriesPerServing}\n\n${r.description}\n\n🛒 Ингредиенты:\n${r.ingredientsToUse.join(', ')}\n`;
        if (r.missingIngredients.length > 0) text += `🛒 *Купить:* ${r.missingIngredients.join(', ')}\n`;
        text += `\n👨‍🍳 *Приготовление:*\n`;
        r.instructions.forEach((step, i) => text += `${i + 1}. ${step}\n`);
        navigator.clipboard.writeText(text)
            .then(() => alert('Рецепт скопирован в буфер обмена!'))
            .catch(err => {
                console.error('Clipboard failed', err);
                alert('Не удалось скопировать рецепт.');
            });
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6 text-purple-600">
                <BookOpen size={24} />
                <h2 className="text-xl font-bold text-gray-800">База Рецептов</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
                {savedRecipes.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">
                        <p>Нет сохраненных рецептов 📖</p>
                        <p className="text-sm mt-2">Сохраняйте понравившиеся рецепты<br />после генерации меню.</p>
                    </div>
                ) : (
                    savedRecipes.map((recipe, index) => {
                        const recipeId = recipe.id || index.toString();
                        return (
                            <div key={recipeId} className="border border-purple-100 rounded-xl p-4 bg-purple-50 hover:shadow-md transition-shadow relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{recipe.name}</h3>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {recipe.mealType && recipe.mealType.map((type, tIdx) => (
                                                <span key={tIdx} className="bg-white text-purple-600 border border-purple-100 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleShareRecipe(recipe)}
                                            className="text-gray-400 hover:text-blue-500"
                                            title="Поделиться рецептом"
                                        >
                                            <Share2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => recipe.id && onRemoveRecipe(recipe.id)}
                                            className="text-gray-400 hover:text-red-500"
                                            title="Удалить"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 mb-3 text-sm text-gray-600">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {recipe.cookingTimeMinutes} мин</span>
                                    <span className="flex items-center gap-1"><Scale size={14} /> {recipe.weightPerServing}</span>
                                    <span className="font-medium text-purple-700">{recipe.caloriesPerServing}</span>
                                </div>

                                <p className="text-sm text-gray-700 mb-3">{recipe.description}</p>

                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div className="bg-white p-2 rounded border border-purple-100">
                                        <span className="font-semibold text-gray-500 block mb-1">Ингредиенты:</span>
                                        <p>{[...recipe.ingredientsToUse, ...recipe.missingIngredients].join(", ")}</p>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                        <span className="font-semibold text-green-600 block mb-1">Польза:</span>
                                        <p className="text-green-800">{recipe.healthBenefits}</p>
                                    </div>
                                </div>

                                {/* Instructions Toggle */}
                                <div className="pt-2 border-t border-purple-100">
                                    <button
                                        onClick={() => toggleInstructions(recipeId)}
                                        className="w-full flex items-center justify-between text-purple-700 hover:text-purple-900 text-sm font-medium transition-colors"
                                    >
                                        <span className="flex items-center gap-2"><Utensils size={16} /> Приготовление</span>
                                        {expandedRecipe === recipeId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {expandedRecipe === recipeId && (
                                        <div className="mt-3 space-y-2 text-sm text-gray-700 bg-white p-3 rounded-lg animate-fade-in border border-purple-100">
                                            {recipe.instructions && recipe.instructions.length > 0 ? (
                                                <ol className="list-decimal list-inside space-y-1">
                                                    {recipe.instructions.map((step, sIdx) => (
                                                        <li key={sIdx}>{step}</li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <p className="italic text-gray-400">Инструкция не загружена</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
