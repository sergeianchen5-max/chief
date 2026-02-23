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
    inventory?: any;
    family?: any;
    preferences?: any;
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error && error.code !== 'PGRST116') {
                console.error('[useUser] Ошибка профиля:', error);
            }
            return data ? (data as unknown as UserProfile) : null;
        } catch (err) {
            console.error('[useUser] loadProfile error:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const supabase = createClient();

        // Загрузка сессии из localStorage (supabase-js)
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
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
                console.warn('[useUser] initSession error:', err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        initSession();

        // Слушатель изменений auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!isMounted) return;
                console.debug('[useUser] auth event:', _event);

                const currUser = session?.user ?? null;
                setUser(currUser);

                if (currUser) {
                    const prof = await loadProfile(currUser.id);
                    if (isMounted) setProfile(prof);
                } else {
                    if (isMounted) setProfile(null);
                }
                if (isMounted) setLoading(false);
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [loadProfile]);

    const signOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    return { user, profile, loading, signOut };
}
