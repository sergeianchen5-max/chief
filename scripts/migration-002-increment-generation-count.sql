-- SQL-миграция: Атомарная функция для инкремента счётчика генераций
-- Используется из generate.ts: supabase.rpc('increment_generation_count', { p_user_id: ... })

CREATE OR REPLACE FUNCTION public.increment_generation_count(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET daily_generations_count = daily_generations_count + 1
    WHERE id = p_user_id
      AND subscription_tier != 'pro';
END;
$$;
