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
                console.log('[useUser] Запрос сессии пользователя...');
                const { data: { session }, error: authError } = await supabase.auth.getSession();
                if (authError) throw authError;

                const user = session?.user ?? null;
                if (isMounted) setUser(user);

                if (user) {
                    console.log(`[useUser] Запрос профиля для ${user.id}...`);
                    const { data: profile, error: profError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                    if (profError && profError.code !== 'PGRST116') {
                        console.error('[useUser] Ошибка профиля:', profError);
                    }
                    if (isMounted) setProfile(profile || null);
                } else {
                    if (isMounted) setProfile(null);
                }
            } catch (err) {
                console.error('[useUser] Критическая ошибка getUser:', err);
            } finally {
                if (isMounted) {
                    console.log('[useUser] Загрузка завершена');
                    setLoading(false);
                }
            }
        };

        getUser();

        // Подписка на изменения состояния Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                try {
                    console.log(`[useUser] onAuthStateChange event: ${_event}`);
                    const currUser = session?.user ?? null;
                    if (isMounted) setUser(currUser);

                    if (currUser) {
                        const { data: prof, error: profError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', currUser.id)
                            .single();
                        if (profError && profError.code !== 'PGRST116') {
                            console.error('[useUser] Ошибка профиля (onAuthStateChange):', profError);
                        }
                        if (isMounted) setProfile(prof || null);
                    } else {
                        if (isMounted) setProfile(null);
                    }
                } catch (err) {
                    console.error('[useUser] Ошибка onAuthStateChange:', err);
                } finally {
                    if (isMounted) setLoading(false);
                }
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
