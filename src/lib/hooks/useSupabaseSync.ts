'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from './useUser';
import { loadUserData, saveInventory, saveFamily, saveRecipeToDb, removeRecipeFromDb } from '@/lib/supabase/db';
import type { Ingredient, FamilyMember, Recipe } from '@/lib/types';

const LS_KEYS = {
    inventory: 'chef-inventory',
    family: 'chef-family',
    savedRecipes: 'chef-saved-recipes',
};

// Debounce-таймер
function useDebouncedCallback(callback: (...args: any[]) => void, delay: number) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    return useCallback((...args: any[]) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => callback(...args), delay);
    }, [callback, delay]);
}

export function useSupabaseSync() {
    const { user, loading: authLoading } = useUser();

    const [inventory, setInventoryState] = useState<Ingredient[]>(() => {
        if (typeof window !== 'undefined') {
            const lsInv = localStorage.getItem(LS_KEYS.inventory);
            return lsInv ? JSON.parse(lsInv) : [];
        }
        return [];
    });

    const [family, setFamilyState] = useState<FamilyMember[]>(() => {
        if (typeof window !== 'undefined') {
            const lsFam = localStorage.getItem(LS_KEYS.family);
            return lsFam ? JSON.parse(lsFam) : [];
        }
        return [];
    });

    const [savedRecipes, setSavedRecipesState] = useState<Recipe[]>(() => {
        if (typeof window !== 'undefined') {
            const lsRec = localStorage.getItem(LS_KEYS.savedRecipes);
            return lsRec ? JSON.parse(lsRec) : [];
        }
        return [];
    });

    const [isLoaded, setIsLoaded] = useState(false);
    const hasMigrated = useRef(false);

    // Установка флага isLoaded для скрытия лоадера после монтирования компонента
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // ==================== ЗАГРУЗКА ИЗ СУБД ====================
    useEffect(() => {
        if (authLoading || !user?.id) return;

        let isMounted = true;

        const loadDb = async () => {
            try {
                const data = await loadUserData(user.id);

                if (!isMounted) return;

                // Если в Supabase пусто, мигрировать из localStorage
                if (!hasMigrated.current && data.inventory.length === 0 && data.family.length === 0 && data.savedRecipes.length === 0) {
                    const localInv = inventory;
                    const localFam = family;
                    const localRec = savedRecipes;

                    if (localInv.length > 0 || localFam.length > 0 || localRec.length > 0) {
                        console.log('[Sync] 🔄 Миграция из localStorage в Supabase...');
                        if (localInv.length > 0) await saveInventory(user.id, localInv);
                        if (localFam.length > 0) await saveFamily(user.id, localFam);
                        for (const recipe of localRec) {
                            await saveRecipeToDb(user.id, recipe);
                        }

                        // Перезагрузить данные из Supabase
                        const freshData = await loadUserData(user.id);
                        if (isMounted) {
                            setInventoryState(freshData.inventory);
                            setFamilyState(freshData.family);
                            setSavedRecipesState(freshData.savedRecipes);
                            hasMigrated.current = true;
                        }
                    } else {
                        setInventoryState(data.inventory);
                        setFamilyState(data.family);
                        setSavedRecipesState(data.savedRecipes);
                    }
                } else {
                    setInventoryState(data.inventory);
                    setFamilyState(data.family);
                    setSavedRecipesState(data.savedRecipes);
                }
            } catch (e) {
                console.error('[Sync] Ошибка загрузки данных из БД:', e);
            }
        };

        loadDb();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, authLoading]);

    // ==================== СОХРАНЕНИЕ С DEBOUNCE ====================

    const debouncedSaveInventory = useDebouncedCallback(
        (inv: Ingredient[]) => {
            localStorage.setItem(LS_KEYS.inventory, JSON.stringify(inv));
            if (user) saveInventory(user.id, inv);
        },
        500
    );

    const debouncedSaveFamily = useDebouncedCallback(
        (fam: FamilyMember[]) => {
            localStorage.setItem(LS_KEYS.family, JSON.stringify(fam));
            if (user) saveFamily(user.id, fam);
        },
        500
    );

    // ==================== СЕТТЕРЫ ====================

    const setInventory = useCallback((updater: Ingredient[] | ((prev: Ingredient[]) => Ingredient[])) => {
        setInventoryState(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            debouncedSaveInventory(next);
            return next;
        });
    }, [debouncedSaveInventory]);

    const setFamily = useCallback((updater: FamilyMember[] | ((prev: FamilyMember[]) => FamilyMember[])) => {
        setFamilyState(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            debouncedSaveFamily(next);
            return next;
        });
    }, [debouncedSaveFamily]);

    // ==================== РЕЦЕПТЫ ====================

    const saveRecipe = useCallback(async (recipe: Recipe) => {
        const newRecipe = { ...recipe, id: recipe.id || Date.now().toString() };

        if (savedRecipes.some(r => r.id === newRecipe.id)) return;

        if (user) {
            const dbId = await saveRecipeToDb(user.id, newRecipe);
            if (dbId) {
                newRecipe.id = dbId;
            }
        }

        setSavedRecipesState(prev => {
            const updated = [...prev, newRecipe];
            localStorage.setItem(LS_KEYS.savedRecipes, JSON.stringify(updated));
            return updated;
        });
    }, [user, savedRecipes]);

    const removeRecipe = useCallback(async (id: string) => {
        if (user) {
            await removeRecipeFromDb(user.id, id);
        }

        setSavedRecipesState(prev => {
            const updated = prev.filter(r => r.id !== id);
            localStorage.setItem(LS_KEYS.savedRecipes, JSON.stringify(updated));
            return updated;
        });
    }, [user]);

    return {
        inventory,
        setInventory,
        family,
        setFamily,
        savedRecipes,
        saveRecipe,
        removeRecipe,
        isLoaded,
        user,
    };
}
