'use client';

import React, { useState } from 'react';
import { Ingredient, FamilyMember, Recipe, ChefPlan } from '@/lib/types';
import { FridgePanel } from '@/components/FridgePanel';
import { FamilyPanel } from '@/components/FamilyPanel';
import { ChefPanel } from '@/components/ChefPanel';
import { RecipeBasePanel } from '@/components/RecipeBasePanel';
import { Package, Users, ChefHat, BookOpen, LogIn, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useSupabaseSync } from '@/lib/hooks/useSupabaseSync';
import Link from 'next/link';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'fridge' | 'family' | 'chef' | 'recipes'>('chef');
  const { user, loading: authLoading, signOut } = useUser();

  // Данные: Supabase (авторизован) или localStorage (гость)
  const {
    inventory, setInventory,
    family, setFamily,
    savedRecipes, saveRecipe: saveRecipeToStore, removeRecipe: removeRecipeFromStore,
    isLoaded,
  } = useSupabaseSync();

  const saveRecipe = async (recipe: Recipe) => {
    await saveRecipeToStore(recipe);
  };

  const removeRecipe = async (id: string) => {
    if (window.confirm("Удалить рецепт из базы?")) {
      await removeRecipeFromStore(id);
    }
  };

  // Не рендерить до загрузки
  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20 md:pb-0">

      {/* Mobile Navigation (Bottom) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden pb-safe">
        <div className="flex justify-around items-center p-2">
          <button
            onClick={() => setActiveTab('fridge')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'fridge' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
          >
            <Package size={24} />
            <span className="text-[10px] font-medium mt-1">Холодильник</span>
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'family' ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}
          >
            <Users size={24} />
            <span className="text-[10px] font-medium mt-1">Семья</span>
          </button>

          {/* Main Action Button (Center) */}
          <div className="relative -top-6">
            <button
              onClick={() => setActiveTab('chef')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-4 border-stone-50 ${activeTab === 'chef' ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' : 'bg-white text-gray-400'}`}
            >
              <ChefHat size={28} />
            </button>
          </div>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === 'recipes' ? 'text-purple-600 bg-purple-50' : 'text-gray-400'}`}
          >
            <BookOpen size={24} />
            <span className="text-[10px] font-medium mt-1">Рецепты</span>
          </button>
        </div>
        {/* Auth indicator (mobile) */}
        {user ? (
          <div className="absolute top-2 right-3">
            <Link href="/dashboard" className="w-7 h-7 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              {user.email?.charAt(0).toUpperCase() || '?'}
            </Link>
          </div>
        ) : (
          <div className="absolute top-2 right-3">
            <Link href="/auth" className="w-7 h-7 bg-stone-200 rounded-full flex items-center justify-center text-stone-500">
              <LogIn size={14} />
            </Link>
          </div>
        )}
      </nav>

      {/* Desktop Layout Container */}
      <div className="max-w-7xl mx-auto md:p-6 h-screen md:h-[calc(100vh-20px)] overflow-hidden flex flex-col md:flex-row gap-6">

        {/* Sidebar (Desktop Only) */}
        <aside className="hidden md:flex flex-col w-64 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="bg-orange-500 p-2 rounded-lg text-white">
              <ChefHat size={24} />
            </div>
            <h1 className="font-extrabold text-xl tracking-tight text-gray-800">ШЕФ<br /><span className="text-orange-500">ХОЛОДИЛЬНИК</span></h1>
          </div>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => setActiveTab('chef')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'chef' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <ChefHat size={20} /> Шеф-Повар
            </button>
            <button
              onClick={() => setActiveTab('fridge')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'fridge' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Package size={20} /> Продукты <span className="ml-auto bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full">{inventory.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'family' ? 'bg-green-50 text-green-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Users size={20} /> Семья <span className="ml-auto bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full">{family.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'recipes' ? 'bg-purple-50 text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <BookOpen size={20} /> Книга рецептов <span className="ml-auto bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full">{savedRecipes.length}</span>
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">
            {user ? (
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {user.email?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-orange-500 hover:bg-orange-50 rounded-lg transition-colors font-medium mb-1"
                >
                  <LayoutDashboard size={14} /> Кабинет
                </Link>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={14} /> Выйти
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <LogIn size={16} /> Войти
              </Link>
            )}
            <div className="bg-stone-50 rounded-xl p-4 text-xs text-gray-500">
              <p className="font-bold text-gray-700 mb-1">Версия 2.0 (Next.js)</p>
              <p>Powered by OpenRouter AI</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-hidden md:rounded-3xl md:border md:border-gray-100 md:shadow-sm bg-white md:bg-stone-50 relative">
          <div className="h-full overflow-y-auto no-scrollbar md:p-0">
            {activeTab === 'chef' && (
              <ChefPanel
                inventory={inventory}
                family={family}
                onSaveRecipe={saveRecipe}
                savedRecipeIds={savedRecipes.map(r => r.id!)}
              />
            )}
            {activeTab === 'fridge' && (
              <FridgePanel
                inventory={inventory}
                setInventory={setInventory}
              />
            )}
            {activeTab === 'family' && (
              <FamilyPanel
                family={family}
                setFamily={setFamily}
              />
            )}
            {activeTab === 'recipes' && (
              <RecipeBasePanel
                savedRecipes={savedRecipes}
                onRemoveRecipe={removeRecipe}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
