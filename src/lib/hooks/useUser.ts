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
        // Получить текущего пользователя
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profile);
            } else {
                setProfile(null);
            }

            setLoading(false);
        };

        getUser();

        // Подписка на изменения состояния Auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currUser = session?.user ?? null;
                setUser(currUser);

                if (currUser) {
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currUser.id)
                        .single();
                    setProfile(prof);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        window.location.href = '/';
    };

    return { user, profile, loading, signOut };
}
