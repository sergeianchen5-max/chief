'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;

        const getUser = async () => {
            try {
                // Используем getUser для надежности (getSession может кэшироваться слишком агрессивно)
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;

                if (isMounted) setUser(user);

                if (user) {
                    const { data: profile, error: profError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (profError && profError.code !== 'PGRST116') {
                        console.error('[useUser] Ошибка загрузки профиля:', profError);
                    }
                    if (isMounted) setProfile(profile || null);
                } else {
                    if (isMounted) setProfile(null);
                }
            } catch (err: any) {
                if (err.message && err.message.includes('Auth session missing')) {
                    // Игнорируем штатную ошибку отсутствия сессии
                } else {
                    console.error('[useUser] Ошибка загрузки пользователя:', err);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        getUser();

        // Подписка на изменения состояния Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currUser = session?.user ?? null;
                if (!isMounted) return;

                setUser(currUser);

                if (currUser) {
                    const { data: prof, error: profError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currUser.id)
                        .single();
                    if (profError && profError.code !== 'PGRST116') {
                        console.error('[useUser] Ошибка профиля (AuthChange):', profError);
                    }
                    if (isMounted) setProfile(prof || null);
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
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    return { user, profile, loading, signOut };
}
