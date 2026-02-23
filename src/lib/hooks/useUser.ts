'use client';

import { useEffect, useState } from 'react';
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

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;

        const loadProfile = async (userId: string): Promise<UserProfile | null> => {
            try {
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
        };

        const getUser = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;

                if (!isMounted) return;
                setUser(user);

                if (user) {
                    const prof = await loadProfile(user.id);
                    if (isMounted) setProfile(prof);
                } else {
                    if (isMounted) setProfile(null);
                }
            } catch (err: any) {
                if (!err.message?.includes('Auth session missing')) {
                    console.error('[useUser] Ошибка загрузки пользователя:', err);
                }
            } finally {
                // Гарантированно снимаем loading — даже если профиль не загрузился
                if (isMounted) setLoading(false);
            }
        };

        getUser();

        // Подписка на изменения состояния Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!isMounted) return;

                const currUser = session?.user ?? null;
                setUser(currUser);

                // Оборачиваем в try-catch чтобы setLoading(false) вызвался ВСЕГДА
                try {
                    if (currUser) {
                        const prof = await loadProfile(currUser.id);
                        if (isMounted) setProfile(prof);
                    } else {
                        if (isMounted) setProfile(null);
                    }
                } catch (err) {
                    console.error('[useUser] Ошибка в onAuthStateChange:', err);
                } finally {
                    if (isMounted) setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    return { user, profile, loading, signOut };
}
