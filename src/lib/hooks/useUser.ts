'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Строгий тип профиля — соответствует таблице profiles в Supabase
export interface UserProfile {
    id: string;
    email: string | null;
    display_name: string | null;
    subscription_tier: 'free' | 'pro';
    subscription_active: boolean;
    daily_generations_count: number;
    daily_generations_reset_at: string | null;
    created_at: string;
}

// Singleton клиент — один на всё приложение
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
    if (!_supabase) _supabase = createClient();
    return _supabase;
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
        try {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[useUser] Ошибка загрузки профиля:', error);
            }
            return (data as UserProfile) || null;
        } catch (err) {
            console.error('[useUser] Критическая ошибка loadProfile:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const supabase = getSupabase();

        const fetchUser = async (retryCount = 0) => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    // Если AbortError и ещё есть попытки — retry через 100ms
                    if (error.name === 'AbortError' && retryCount < 3) {
                        console.debug(`[useUser] getSession aborted, retry ${retryCount + 1}/3`);
                        setTimeout(() => { if (isMounted) fetchUser(retryCount + 1); }, 100);
                        return;
                    }
                    if (!error.message?.includes('Auth session missing')) {
                        console.warn('[useUser] getSession error:', error.message);
                    }
                }

                if (!isMounted) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const prof = await loadProfile(currentUser.id);
                    if (isMounted) setProfile(prof);
                } else {
                    setProfile(null);
                }
            } catch (err: any) {
                // Retry на AbortError
                if (err.name === 'AbortError' && retryCount < 3) {
                    console.debug(`[useUser] catch AbortError, retry ${retryCount + 1}/3`);
                    setTimeout(() => { if (isMounted) fetchUser(retryCount + 1); }, 100);
                    return;
                }
                if (!err.message?.includes('Auth session missing') && err.name !== 'AbortError') {
                    console.error('[useUser] Ошибка:', err);
                }
            } finally {
                // Снимаем loading только если не было retry
                if (isMounted) setLoading(false);
            }
        };

        fetchUser();

        // Подписка на изменения auth — это основной механизм обнаружения логина
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!isMounted) return;
                console.debug('[useUser] Auth state change:', _event);

                const currUser = session?.user ?? null;
                setUser(currUser);

                try {
                    if (currUser) {
                        const prof = await loadProfile(currUser.id);
                        if (isMounted) setProfile(prof);
                    } else {
                        if (isMounted) setProfile(null);
                    }
                } catch (err: any) {
                    if (err.name !== 'AbortError') {
                        console.error('[useUser] onAuthStateChange error:', err);
                    }
                } finally {
                    if (isMounted) setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [loadProfile]);

    const signOut = async () => {
        const supabase = getSupabase();
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    return { user, profile, loading, signOut };
}
