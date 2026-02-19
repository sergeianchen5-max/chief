import React, { useState, useEffect } from 'react';
import { ChefHat, ShoppingCart, Clock, TrendingUp, CheckCircle, Loader2, Send, Bookmark, Scale, Utensils, ChevronDown, ChevronUp, Sun, Moon, Coffee, Soup, CheckSquare, Square, User, Users, Copy, Star, Eye, EyeOff, Share2, Download, ExternalLink, Printer, Image as ImageIcon, PlusCircle, StickyNote, Mail, PackagePlus, Zap } from 'lucide-react';
import { ChefPlan, FamilyMember, Ingredient, Recipe, ShoppingItem } from '../types';
import { generateChefPlan } from '../services/geminiService';

interface ChefPanelProps {
  inventory: Ingredient[];
  setInventory: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  family: FamilyMember[];
  onSaveRecipe: (recipe: Recipe) => void;
  savedRecipes: Recipe[];
  plan: ChefPlan | null;
  setPlan: React.Dispatch<React.SetStateAction<ChefPlan | null>>;
  excludedShoppingItems: string[];
  setExcludedShoppingItems: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ChefPanel: React.FC<ChefPanelProps> = ({ 
  inventory,
  setInventory,
  family, 
  onSaveRecipe, 
  savedRecipes, 
  plan, 
  setPlan,
  excludedShoppingItems,
  setExcludedShoppingItems
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Toggle states
  const [expandedRecipeInstructions, setExpandedRecipeInstructions] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<'breakfast' | 'soup' | 'main' | 'dessert' | 'popular'>('main');
  
  // State for recipe selection (persisted via internal localStorage just for this view session)
  const [selectedRecipeNames, setSelectedRecipeNames] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('chef_selected_recipes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  
  const [onlyFridge, setOnlyFridge] = useState(false);
  const [showAllShoppingItems, setShowAllShoppingItems] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Initialize selected recipes when NEW plan loads
  useEffect(() => {
    if (plan && plan.recipes) {
      try {
        const saved = localStorage.getItem('chef_selected_recipes');
        if (!saved || JSON.parse(saved).length === 0) {
            const initialSelection = plan.recipes
              .filter(r => r.mealType && !r.mealType.some(t => t.toLowerCase().includes('популярное')))
              .map(r => r.name);
            setSelectedRecipeNames(new Set(initialSelection));
        }
      } catch (e) {
        // Fallback if parsing failed
        const initialSelection = plan.recipes
            .filter(r => r.mealType && !r.mealType.some(t => t.toLowerCase().includes('популярное')))
            .map(r => r.name);
        setSelectedRecipeNames(new Set(initialSelection));
      }
    }
  }, [plan]);

  // Persist recipe selection
  useEffect(() => {
    localStorage.setItem('chef_selected_recipes', JSON.stringify(Array.from(selectedRecipeNames)));
  }, [selectedRecipeNames]);

  const toggleRecipeSelection = (name: string) => {
    const newSelection = new Set(selectedRecipeNames);
    if (newSelection.has(name)) {
      newSelection.delete(name);
    } else {
      newSelection.add(name);
    }
    setSelectedRecipeNames(newSelection);
  };

  const toggleShoppingItemExclusion = (itemName: string) => {
    setExcludedShoppingItems(prev => {
        if (prev.includes(itemName)) {
            return prev.filter(i => i !== itemName);
        } else {
            return [...prev, itemName];
        }
    });
  };

  const handleHaveAtHome = (item: ShoppingItem) => {
    // 1. Add to inventory if not exists
    setInventory(prev => {
        if (prev.some(i => i.name.toLowerCase() === item.name.toLowerCase())) {
            return prev;
        }
        return [...prev, {
            id: Date.now().toString() + Math.random().toString(),
            name: item.name,
            category: 'other' // Default category since we don't know it
        }];
    });

    // 2. Mark as excluded/bought in the shopping list
    if (!excludedShoppingItems.includes(item.name)) {
        setExcludedShoppingItems(prev => [...prev, item.name]);
    }
    
    // Optional: could add a toast notification here
  };

  const toggleDescription = (name: string) => {
    const newSet = new Set(expandedDescriptions);
    if (newSet.has(name)) {
        newSet.delete(name);
    } else {
        newSet.add(name);
    }
    setExpandedDescriptions(newSet);
  };

  const handleGenerate = async () => {
    if (family.length === 0) {
      setError("Добавьте хотя бы одного члена семьи, чтобы я знал, для кого готовить!");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateChefPlan(inventory, family, onlyFridge);
      setPlan(result);
      
      // Reset exclusions and selection for fresh start
      setExcludedShoppingItems([]);
      const initialSelection = result.recipes
        .filter(r => !r.mealType.some(t => t.toLowerCase().includes('популярное')))
        .map(r => r.name);
      setSelectedRecipeNames(new Set(initialSelection));

      setActiveTab('breakfast');
    } catch (err) {
      setError("Не удалось связаться с шефом. Проверьте API ключ или попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get recipes for active tab
  const getRecipesByTag = (tags: string[]) => {
    if (!plan || !plan.recipes) return [];
    return plan.recipes.filter(recipe => 
      recipe.mealType && recipe.mealType.some((type: string) => tags.some(tag => type.toLowerCase().includes(tag.toLowerCase())))
    );
  };

  const breakfastRecipes = getRecipesByTag(['Завтрак']);
  const soupRecipes = getRecipesByTag(['Суп', 'Первое']);
  const mainRecipes = getRecipesByTag(['Обед', 'Ужин', 'Второе']).filter(r => 
    !r.mealType.some(t => t.toLowerCase().includes('суп')) && 
    !r.mealType.some(t => t.toLowerCase().includes('завтрак'))
  ); 
  const dessertRecipes = getRecipesByTag(['Десерт']);
  const popularRecipes = getRecipesByTag(['Популярное']);

  const getCurrentTabRecipes = () => {
    switch(activeTab) {
        case 'breakfast': return breakfastRecipes;
        case 'soup': return soupRecipes;
        case 'main': return mainRecipes;
        case 'dessert': return dessertRecipes;
        case 'popular': return popularRecipes;
        default: return [];
    }
  };

  const currentTabRecipes = getCurrentTabRecipes();
  const isCategoryAllSelected = currentTabRecipes.length > 0 && currentTabRecipes.every(r => selectedRecipeNames.has(r.name));
  
  const toggleCategorySelection = () => {
      const newSet = new Set(selectedRecipeNames);
      if (isCategoryAllSelected) {
          currentTabRecipes.forEach(r => newSet.delete(r.name));
      } else {
          currentTabRecipes.forEach(r => newSet.add(r.name));
      }
      setSelectedRecipeNames(newSet);
  };

  // Filter shopping list
  const rawShoppingList = plan?.shoppingList?.filter((item: ShoppingItem) => {
    if (showAllShoppingItems) return true;
    const normalizedReason = item.reason.toLowerCase();
    return Array.from(selectedRecipeNames).some((recipeName: string) => 
      normalizedReason.includes(recipeName.toLowerCase().trim())
    );
  }) || [];

  const activeShoppingList = rawShoppingList.filter(item => !excludedShoppingItems.includes(item.name));
  const boughtShoppingList = rawShoppingList.filter(item => excludedShoppingItems.includes(item.name));

  // --- SHARING ---
  const generateShareText = () => {
    if (!plan) return '';
    let text = `👨‍🍳 *МОЙ ПЛАН ПИТАНИЯ (Шеф Холодильник)*\n\n`;

    if (activeShoppingList.length > 0) {
        text += `🛒 *КУПИТЬ:*\n`;
        activeShoppingList.forEach(item => text += `▫️ ${item.name} (${item.quantity})\n`);
        text += `\n`;
    }

    const selectedRecipesList = plan.recipes.filter(r => selectedRecipeNames.has(r.name));
    if (selectedRecipesList.length > 0) {
        text += `🍽 *РЕЦЕПТЫ:*\n\n`;
        selectedRecipesList.forEach(r => {
            text += `🔸 *${r.name}*\n`;
            text += `📝 *Надо:* ${r.ingredientsToUse.join(', ')}\n`;
            if (r.missingIngredients.length > 0) text += `🛒 *Купить:* ${r.missingIngredients.join(', ')}\n`;
            text += `👨‍🍳 *Шаги:*\n`;
            r.instructions.forEach((step, i) => text += `${i+1}. ${step}\n`);
            text += `\n`;
        });
    }
    return text;
  };

  const handleCopyText = async () => {
      try {
        await navigator.clipboard.writeText(generateShareText());
        alert('План скопирован в буфер обмена!');
      } catch (e) {
        console.error('Clipboard error:', e);
        alert('Не удалось скопировать текст. Возможно, нет прав доступа.');
      }
  };

  const handleGoogleKeep = async () => {
      await handleCopyText();
      window.open('https://keep.google.com/', '_blank');
  };

  const handleSendEmail = () => {
    // Симуляция отправки на почту, так как бэкенда с SMTP нет
    // В реальном приложении здесь был бы вызов API
    const confirm = window.confirm("Отправить план питания на вашу почту (user@example.com)?");
    if (confirm) {
        alert("✅ План успешно отправлен на вашу почту!");
        setShowShareModal(false);
    }
  };

  const handlePrintPDF = () => {
      // Закрываем модальное окно перед печатью
      setShowShareModal(false);
      // Небольшая задержка чтобы стейт успел обновиться
      setTimeout(() => {
          window.print();
      }, 300);
  };

  const handleShareRecipeToTelegram = (r: Recipe) => {
    let text = `🍽 *${r.name}* \n\n⏱ ${r.cookingTimeMinutes} мин | ${r.caloriesPerServing}\n\n${r.description}\n\n🛒 Ингредиенты:\n${r.ingredientsToUse.join(', ')}\n`;
    if (r.missingIngredients.length > 0) text += `🛒 *Купить:* ${r.missingIngredients.join(', ')}\n`;
    text += `\n👨‍🍳 *Приготовление:*\n`;
    r.instructions.forEach((step, i) => text += `${i+1}. ${step}\n`);
    navigator.clipboard.writeText(text)
        .then(() => alert('Рецепт скопирован!'))
        .catch(err => {
            console.error('Clipboard failed', err);
            // Don't alert if the user just cancelled, but here we assume failure
            // Note: uncaught Object exception often comes from here if not handled
        });
  }

  const toggleInstructions = (name: string) => {
    setExpandedRecipeInstructions(expandedRecipeInstructions === name ? null : name);
  };

  const handleSearchImage = (recipeName: string) => {
      const query = encodeURIComponent(`${recipeName} рецепт красивое фото`);
      window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
  };

  const RecipeCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
    const isSaved = savedRecipes.some(r => r.name === recipe.name);
    const isSelected = selectedRecipeNames.has(recipe.name);
    const isDescExpanded = expandedDescriptions.has(recipe.name);

    return (
    <div className={`recipe-card-print bg-white rounded-2xl shadow-sm border flex flex-col hover:shadow-md transition-all h-full
        ${isSelected ? 'border-orange-200 opacity-100 ring-2 ring-orange-100' : 'border-gray-100 opacity-75 grayscale-[0.3] no-print'}`}>
      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-3 flex-1">
             <button onClick={() => toggleRecipeSelection(recipe.name)} className="mt-1 text-orange-500 hover:text-orange-700 transition-colors no-print shrink-0">
                {isSelected ? <CheckSquare size={24} /> : <Square size={24} className="text-gray-300" />}
             </button>
             <h4 className={`text-lg font-bold leading-snug cursor-pointer ${isSelected ? 'text-gray-900' : 'text-gray-500 line-through decoration-gray-300'}`} onClick={() => toggleRecipeSelection(recipe.name)}>{recipe.name}</h4>
          </div>
          <div className="flex gap-2 shrink-0 ml-2 no-print">
            <button 
              onClick={() => handleSearchImage(recipe.name)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Найти фото в Google"
            >
              <ImageIcon size={18} />
            </button>
            <button 
              onClick={() => handleShareRecipeToTelegram(recipe)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Скопировать рецепт"
            >
              <Copy size={18} />
            </button>
            <button 
              onClick={() => onSaveRecipe(recipe)} 
              className={`transition-colors ${isSaved ? 'text-orange-500 fill-orange-500' : 'text-gray-400 hover:text-orange-500'}`} 
              title={isSaved ? "Убрать из избранного" : "В избранное"}
            >
              <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
        
        {/* Meta Stats */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500 pl-9">
            <span className="flex items-center gap-1"><Clock size={12} /> {recipe.cookingTimeMinutes} мин</span>
            <span className="flex items-center gap-1" title="Вес одной порции"><User size={12} /> {recipe.weightPerServing}</span>
            <span className="text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded border border-red-100">{recipe.caloriesPerServing}</span>
        </div>

        {/* Description with Click to Expand */}
        <div 
            onClick={() => toggleDescription(recipe.name)}
            className="pl-9 mb-4 group cursor-pointer"
            title="Нажмите, чтобы развернуть описание"
        >
             <p className={`text-gray-600 text-sm transition-all duration-200 ${isDescExpanded ? '' : 'line-clamp-2 min-h-[40px]'}`}>
                {recipe.description}
             </p>
             {!isDescExpanded && (
                 <div className="flex justify-center -mt-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                     <ChevronDown size={12} className="text-gray-400" />
                 </div>
             )}
        </div>
        
        {/* Suitability Bars & KBJU Stats */}
        <div className="pl-9 mb-4 no-print">
            {recipe.familySuitability && recipe.familySuitability.length > 0 ? (
                <div className="space-y-3 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                    {recipe.familySuitability.map((s, idx) => {
                         // Color logic
                         let colorClass = 'bg-red-400';
                         if (s.percentage >= 80) colorClass = 'bg-green-500';
                         else if (s.percentage >= 50) colorClass = 'bg-yellow-400';

                         return (
                            <div key={idx} className="text-xs">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="font-semibold text-gray-700 truncate max-w-[100px]">{s.memberName}</span>
                                    <span className="text-[10px] text-gray-400">{s.percentage}% match</span>
                                </div>
                                
                                {/* Overall Match Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-1.5">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
                                        style={{ width: `${s.percentage}%` }}
                                    ></div>
                                </div>

                                {/* Detailed Nutrition Stats (KBJU Coverage) */}
                                {s.nutritionStats && (
                                    <div className="grid grid-cols-4 gap-1 text-[9px] text-gray-500 mt-1 bg-white p-1 rounded border border-gray-100">
                                        <div className="text-center">
                                            <span className="block font-bold text-red-500">{s.nutritionStats.caloriesPercent}%</span>
                                            <span>Ккал</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-blue-500">{s.nutritionStats.proteinPercent}%</span>
                                            <span>Белок</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-yellow-500">{s.nutritionStats.fatPercent}%</span>
                                            <span>Жир</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block font-bold text-green-500">{s.nutritionStats.carbPercent}%</span>
                                            <span>Углев</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                         );
                    })}
                </div>
            ) : (
                <div className="text-[10px] text-gray-400 italic">Анализ совместимости недоступен</div>
            )}
        </div>

        {/* Ingredients Summary */}
        <div className="text-xs mb-3 ml-9 space-y-2 flex-grow">
             <div className="bg-stone-50 p-2 rounded">
                <p className="text-gray-500 mb-1"><span className="font-semibold text-gray-700">✅ Из холодильника:</span></p>
                <p className="text-gray-600 leading-tight">{recipe.ingredientsToUse.join(', ')}</p>
             </div>
             
             {recipe.missingIngredients.length > 0 && (
                <div className="bg-red-50 p-2 rounded">
                    <p className="text-red-400 mb-1"><span className="font-semibold text-red-500">🛒 Докупить:</span></p>
                    <p className="text-gray-600 leading-tight">{recipe.missingIngredients.join(', ')}</p>
                </div>
             )}
        </div>

        {/* Instructions Toggle */}
        <div className="mt-auto pl-9 pt-2">
          <button 
            onClick={() => toggleInstructions(recipe.name)}
            className="w-full flex items-center justify-between text-gray-500 hover:text-orange-500 text-xs font-bold uppercase tracking-wider transition-colors py-2 border-t border-gray-100 no-print"
          >
            <span className="flex items-center gap-2"><Utensils size={14} /> Рецепт</span>
            {expandedRecipeInstructions === recipe.name ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          <div className={`${expandedRecipeInstructions === recipe.name ? 'block' : 'hidden'} print:block mt-2 space-y-2 text-sm text-gray-700 bg-white p-3 rounded-lg animate-fade-in border border-stone-200`}>
            {recipe.instructions && recipe.instructions.length > 0 ? (
                <ol className="list-decimal list-inside space-y-2 marker:text-orange-400 marker:font-bold">
                {recipe.instructions.map((step, sIdx) => (
                    <li key={sIdx}>{step}</li>
                ))}
                </ol>
            ) : (
                <p className="italic text-gray-400">Инструкция не загружена</p>
            )}
            </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Share Modal */}
      {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print" onClick={() => setShowShareModal(false)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold text-lg">Экспорт Плана</h3>
                      <button onClick={() => setShowShareModal(false)} className="text-white/80 hover:text-white"><ChevronDown className="rotate-180" /></button>
                  </div>
                  <div className="p-4 grid gap-3">
                      <button onClick={handleSendEmail} className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100 group">
                          <Mail size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                          <div className="text-left">
                              <div className="text-sm font-bold text-gray-800">Отправить на почту</div>
                              <div className="text-[10px] text-gray-500">Привязанную к аккаунту</div>
                          </div>
                      </button>

                      <hr className="border-gray-100 my-1"/>

                      <button onClick={handleCopyText} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border">
                          <Copy size={20} className="text-gray-600" />
                          <div className="text-left">
                              <div className="text-sm font-bold text-gray-800">Копировать</div>
                              <div className="text-[10px] text-gray-500">В буфер обмена</div>
                          </div>
                      </button>

                       <button onClick={handleGoogleKeep} className="flex items-center gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition-colors border border-yellow-100">
                          <StickyNote size={20} className="text-yellow-600" />
                          <div className="text-left">
                              <div className="text-sm font-bold text-gray-800">Google Keep</div>
                              <div className="text-[10px] text-gray-500">Скопировать и открыть</div>
                          </div>
                      </button>
                      
                       <hr className="border-gray-100 my-1"/>

                      <button onClick={handlePrintPDF} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border">
                          <Printer size={20} className="text-red-600" />
                          <div className="text-sm font-bold text-gray-800">Скачать PDF</div>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-8 rounded-2xl shadow-lg mb-6 text-white text-center relative overflow-hidden shrink-0 no-print">
        <div className="relative z-10">
          <ChefHat size={48} className="mx-auto mb-4 drop-shadow-md" />
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">ШЕФ ХОЛОДИЛЬНИК</h1>
          <p className="opacity-95 font-medium mb-6 max-w-lg mx-auto">
            Ваш личный су-шеф для создания вкусных и полезных блюд.
          </p>
          
          <div className="flex flex-col items-center gap-4">
             <label className="flex items-center gap-2 text-sm font-semibold bg-white/20 px-5 py-2.5 rounded-full cursor-pointer hover:bg-white/30 transition-colors backdrop-blur-sm select-none border border-white/30">
                <div className={`w-5 h-5 rounded border-2 border-white flex items-center justify-center transition-colors ${onlyFridge ? 'bg-white text-orange-600' : 'transparent'}`}>
                   {onlyFridge && <CheckSquare size={16} />}
                </div>
                <input type="checkbox" checked={onlyFridge} onChange={(e) => setOnlyFridge(e.target.checked)} className="hidden" />
                Готовим только из того, что есть
             </label>

             <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-white text-orange-600 font-extrabold py-3.5 px-8 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2 text-base"
            >
              {loading ? <Loader2 className="animate-spin" /> : (plan ? "Пересоставить Меню" : "Создать Рацион")}
            </button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-300 rounded-full mix-blend-overlay filter blur-xl"></div>
             <div className="absolute top-20 right-10 w-60 h-60 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-6 text-center shrink-0 font-medium">{error}</div>
      )}

      {plan && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 mb-4 shrink-0 mx-1 no-print">
            <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2 uppercase tracking-wide">
              <TrendingUp className="text-orange-500" size={18} /> Стратегия Шефа
            </h3>
            <p className="text-stone-700 leading-relaxed text-sm">{plan.summary}</p>
          </section>

          {/* TABS (WRAP instead of SCROLL) */}
          <div className="flex flex-wrap gap-2 mb-4 shrink-0 px-1 no-print justify-center md:justify-start">
            {[
              { id: 'breakfast', label: 'Завтрак', icon: Coffee, count: breakfastRecipes.length },
              { id: 'soup', label: 'Супы', icon: Soup, count: soupRecipes.length },
              { id: 'main', label: 'Обед/Ужин', icon: Sun, count: mainRecipes.length },
              { id: 'dessert', label: 'Десерт', icon: Moon, count: dessertRecipes.length },
              { id: 'popular', label: 'Хиты', icon: Star, count: popularRecipes.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm
                  ${activeTab === tab.id 
                    ? 'bg-stone-800 text-white shadow-md transform scale-105' 
                    : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-100 hover:text-stone-800'}`}
              >
                <tab.icon size={16} className={tab.id === 'popular' ? 'text-yellow-400 fill-yellow-400' : ''} />
                {tab.label}
                <span className={`text-[10px] py-0.5 px-2 rounded-full ${activeTab === tab.id ? 'bg-stone-600' : 'bg-stone-100'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {currentTabRecipes.length > 0 && (
              <div className="flex items-center gap-2 px-2 mb-2 no-print">
                   <button onClick={toggleCategorySelection} className="flex items-center gap-2 text-sm text-stone-500 hover:text-orange-600 transition-colors">
                       {isCategoryAllSelected ? <CheckSquare size={18} className="text-orange-600" /> : <Square size={18} />}
                       <span className="font-semibold">{isCategoryAllSelected ? 'Снять выделение' : 'Выбрать все в этой категории'}</span>
                   </button>
              </div>
          )}

          {/* RECIPES LIST */}
          <div className="flex-1 overflow-y-auto pb-10 px-1">
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
               {currentTabRecipes.map((r, i) => <RecipeCard key={`${activeTab}-${i}`} recipe={r} />)}
               {currentTabRecipes.length === 0 && <p className="text-gray-400 italic p-4 col-span-full text-center">Нет рецептов в этой категории.</p>}
             </div>

             {/* SHOPPING LIST */}
             <section className="shopping-list-print bg-amber-50 p-4 md:p-6 rounded-2xl shadow-sm border border-amber-100 mt-6 md:mt-8 mb-4 transition-all">
                {/* Header (Stack on mobile) */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 no-print">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-extrabold text-amber-800 flex items-center gap-2">
                            <ShoppingCart className="text-amber-600" /> Список Покупок
                        </h3>
                        <div className="flex gap-4 mt-1 items-center">
                           <span className="text-xs font-semibold text-amber-700">Для {selectedRecipeNames.size} выбранных блюд</span>
                           <button 
                             onClick={() => setShowAllShoppingItems(!showAllShoppingItems)}
                             className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-200/50 px-2.5 py-1 rounded-full hover:bg-amber-200 transition-colors"
                           >
                              {showAllShoppingItems ? <EyeOff size={10} /> : <Eye size={10} />}
                              {showAllShoppingItems ? 'Скрыть лишнее' : 'Показать всё'}
                           </button>
                        </div>
                    </div>
                    
                    <button onClick={() => setShowShareModal(true)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white text-sm px-5 py-2.5 rounded-xl transition-colors shadow-md font-bold">
                      <Share2 size={16} /> Экспорт
                    </button>
                </div>
                
                <h3 className="hidden print:block text-xl font-bold text-black mb-4 border-b pb-2">Список Покупок</h3>

                {activeShoppingList.length === 0 && boughtShoppingList.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-amber-200 rounded-xl">
                        <p className="text-amber-800/50 font-medium text-sm">Список пуст.</p>
                        {!showAllShoppingItems && <p className="text-xs text-stone-500 mt-2">Возможно, все продукты скрыты или рецепты не выбраны.</p>}
                    </div>
                ) : (
                    <>
                    {/* Active Items */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {activeShoppingList.map((item, idx) => (
                        <div key={`active-${idx}`} className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-amber-100 shadow-sm animate-fade-in break-inside-avoid relative group">
                            <div className="flex flex-col gap-2 shrink-0 mt-1">
                                <button 
                                    onClick={() => toggleShoppingItemExclusion(item.name)}
                                    className="text-amber-300 hover:text-green-500 transition-colors"
                                    title="Вычеркнуть (куплено)"
                                >
                                    <CheckCircle size={20} />
                                </button>
                                <button 
                                    onClick={() => handleHaveAtHome(item)}
                                    className="text-blue-300 hover:text-blue-500 transition-colors"
                                    title="Есть дома (добавить в продукты)"
                                >
                                    <PackagePlus size={20} />
                                </button>
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-stone-800 text-sm leading-tight break-words">{item.name}</p>
                                <p className="text-sm text-stone-600 font-medium">{item.quantity}</p>
                                <p className="text-[10px] text-amber-600/70 mt-0.5 font-medium truncate">Для: {item.reason}</p>
                            </div>
                        </div>
                    ))}
                    </div>

                    {/* Bought / Excluded Items */}
                    {boughtShoppingList.length > 0 && (
                        <div className="opacity-60 grayscale no-print">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <CheckCircle size={12} /> Вычеркнуто / Есть дома ({boughtShoppingList.length})
                            </h4>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {boughtShoppingList.map((item, idx) => (
                                <div key={`bought-${idx}`} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <button 
                                        onClick={() => toggleShoppingItemExclusion(item.name)}
                                        className="text-green-600 hover:text-amber-500 transition-colors shrink-0"
                                        title="Вернуть в список"
                                    >
                                        <PlusCircle size={16} />
                                    </button>
                                    <p className="text-xs text-gray-500 line-through decoration-gray-400 break-words">{item.name}</p>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                    </>
                )}
              </section>
          </div>
        </div>
      )}
    </div>
  );
};