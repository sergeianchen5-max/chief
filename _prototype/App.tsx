import React, { useState, useEffect } from 'react';
import { Ingredient, FamilyMember, Recipe, ChefPlan } from './types';
import { FridgePanel } from './components/FridgePanel';
import { FamilyPanel } from './components/FamilyPanel';
import { ChefPanel } from './components/ChefPanel';
import { RecipeBasePanel } from './components/RecipeBasePanel';
import { Package, Users, ChefHat, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE INITIALIZATION WITH CACHING ---
  
  const [activeTab, setActiveTab] = useState<'fridge' | 'family' | 'chef' | 'recipes'>('chef');

  // Helper for safe parsing to prevent "uncaught exception" on corrupted data
  const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      console.error(`Error parsing ${key} from localStorage`, e);
      return fallback;
    }
  };

  const [inventory, setInventory] = useState<Ingredient[]>(() => safeJsonParse('chef_inventory', []));

  const [family, setFamily] = useState<FamilyMember[]>(() => safeJsonParse('chef_family', []));

  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(() => safeJsonParse('chef_saved_recipes', []));

  const [plan, setPlan] = useState<ChefPlan | null>(() => safeJsonParse('chef_plan', null));

  // Manual exclusions for shopping list items (persisted)
  const [excludedShoppingItems, setExcludedShoppingItems] = useState<string[]>(() => safeJsonParse('chef_excluded_shopping', []));

  // --- PERSISTENCE EFFECTS ---

  useEffect(() => { localStorage.setItem('chef_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('chef_family', JSON.stringify(family)); }, [family]);
  useEffect(() => { localStorage.setItem('chef_saved_recipes', JSON.stringify(savedRecipes)); }, [savedRecipes]);
  useEffect(() => { 
    if (plan) localStorage.setItem('chef_plan', JSON.stringify(plan)); 
    else localStorage.removeItem('chef_plan');
  }, [plan]);
  useEffect(() => { localStorage.setItem('chef_excluded_shopping', JSON.stringify(excludedShoppingItems)); }, [excludedShoppingItems]);


  const handleSaveRecipe = (recipe: Recipe) => {
    if (savedRecipes.some(r => r.name === recipe.name)) {
      setSavedRecipes(prev => prev.filter(r => r.name !== recipe.name));
    } else {
      const newRecipe = { ...recipe, id: Date.now().toString() };
      setSavedRecipes(prev => [...prev, newRecipe]);
    }
  };

  const handleRemoveRecipe = (id: string) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== id));
  };

  // Reset exclusions when a NEW plan is generated (optional, depends on UX preference)
  const handleSetPlan = (newPlan: React.SetStateAction<ChefPlan | null>) => {
    if (typeof newPlan === 'function') {
        setPlan(prev => {
            const result = newPlan(prev);
            // If it's a completely new plan object (not null), maybe we should reset exclusions?
            // For now, let's keep it manual or reset if result is different.
            return result;
        });
    } else {
        setPlan(newPlan);
        // If we setting a new plan (and it's not null), clear old exclusions to avoid stale names
        if (newPlan) {
            setExcludedShoppingItems([]);
        }
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans flex flex-col md:flex-row max-w-7xl mx-auto overflow-hidden shadow-2xl my-0 md:my-8 rounded-none md:rounded-3xl border border-stone-200">
      
      {/* Mobile Navigation (Bottom) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-stone-200 flex justify-around p-3 z-50 text-xs no-print shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('fridge')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'fridge' ? 'text-orange-500 font-bold' : 'text-stone-400'}`}
        >
          <Package size={24} />
          <span className="mt-1">Продукты</span>
        </button>
         <button 
          onClick={() => setActiveTab('recipes')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'recipes' ? 'text-orange-500 font-bold' : 'text-stone-400'}`}
        >
          <BookOpen size={24} />
          <span className="mt-1">Рецепты</span>
        </button>
        <button 
          onClick={() => setActiveTab('chef')}
          className={`flex flex-col items-center ${activeTab === 'chef' ? 'text-orange-600' : 'text-stone-400'}`}
        >
          <div className={`p-3 rounded-full -mt-8 border-4 border-stone-50 shadow-lg transition-transform ${activeTab === 'chef' ? 'bg-orange-50 text-white scale-110' : 'bg-white text-stone-400'}`}>
             <ChefHat size={28} />
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('family')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'family' ? 'text-orange-500 font-bold' : 'text-stone-400'}`}
        >
          <Users size={24} />
          <span className="mt-1">Семья</span>
        </button>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-100 p-6 no-print">
        <div className="flex items-center gap-3 mb-10 text-orange-600">
          <ChefHat size={32} />
          <h1 className="text-xl font-extrabold leading-tight tracking-tight">ШЕФ<br/>ХОЛОДИЛЬНИК</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setActiveTab('fridge')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-semibold ${activeTab === 'fridge' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
          >
            <Package size={20} />
            Продукты
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-semibold ${activeTab === 'family' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
          >
            <Users size={20} />
            Семья & Цели
          </button>
           <button
            onClick={() => setActiveTab('recipes')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-semibold ${activeTab === 'recipes' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
          >
            <BookOpen size={20} />
            База Рецептов
          </button>
          <button
            onClick={() => setActiveTab('chef')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold ${activeTab === 'chef' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}`}
          >
            <ChefHat size={20} />
            Шеф & Меню
          </button>
        </nav>

        <div className="text-xs text-stone-400 mt-auto pt-6 border-t border-stone-100">
          v1.6.2 <br/>
          Powered by Gemini AI
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen md:h-auto overflow-hidden relative bg-stone-50/50">
        <div className="h-full overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          
          {/* Mobile Tab Logic */}
          <div className="md:hidden">
            {activeTab === 'fridge' && <FridgePanel inventory={inventory} setInventory={setInventory} />}
            {activeTab === 'family' && <FamilyPanel family={family} setFamily={setFamily} />}
            {activeTab === 'chef' && 
              <ChefPanel 
                inventory={inventory}
                setInventory={setInventory}
                family={family} 
                onSaveRecipe={handleSaveRecipe} 
                savedRecipes={savedRecipes}
                plan={plan} 
                setPlan={handleSetPlan}
                excludedShoppingItems={excludedShoppingItems}
                setExcludedShoppingItems={setExcludedShoppingItems}
              />
            }
            {activeTab === 'recipes' && <RecipeBasePanel savedRecipes={savedRecipes} onRemoveRecipe={handleRemoveRecipe} />}
          </div>

          {/* Desktop Grid Logic */}
          <div className="hidden md:block h-full">
             {activeTab === 'fridge' && <FridgePanel inventory={inventory} setInventory={setInventory} />}
             {activeTab === 'family' && <FamilyPanel family={family} setFamily={setFamily} />}
             {activeTab === 'chef' && 
                <ChefPanel 
                  inventory={inventory}
                  setInventory={setInventory}
                  family={family} 
                  onSaveRecipe={handleSaveRecipe} 
                  savedRecipes={savedRecipes}
                  plan={plan} 
                  setPlan={handleSetPlan}
                  excludedShoppingItems={excludedShoppingItems}
                  setExcludedShoppingItems={setExcludedShoppingItems}
                />
              }
             {activeTab === 'recipes' && <RecipeBasePanel savedRecipes={savedRecipes} onRemoveRecipe={handleRemoveRecipe} />}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;