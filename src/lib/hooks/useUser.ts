'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

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

// Singleton клиент
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
                console.error('[useUser] Ошибка профиля:', error);
            }
            return (data as UserProfile) || null;
        } catch (err) {
            console.error('[useUser] loadProfile error:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const supabase = getSupabase();

        // ===== ОСНОВНОЙ МЕХАНИЗМ: onAuthStateChange =====
        // Это синхронный listener, НЕ делает fetch, НЕ abort-ится.
        // Supabase @supabase/ssr автоматически восстанавливает сессию из cookies
        // и вызывает INITIAL_SESSION event.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                console.debug('[useUser] auth event:', event);

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const prof = await loadProfile(currentUser.id);
                    if (isMounted) setProfile(prof);
                } else {
                    setProfile(null);
                }

                // Снимаем loading после ЛЮБОГО auth event
                if (isMounted) setLoading(false);
            }
        );

        // Fallback: если onAuthStateChange не вызвался за 3 секунды,
        // снимаем loading (пользователь — гость)
        const fallbackTimer = setTimeout(() => {
            if (isMounted && loading) {
                console.debug('[useUser] fallback: no auth event in 3s, setting guest');
                setLoading(false);
            }
        }, 3000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(fallbackTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signOut = async () => {
        const supabase = getSupabase();
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    return { user, profile, loading, signOut };
}
