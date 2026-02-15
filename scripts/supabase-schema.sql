-- ============================================
-- ШЕФ-ХОЛОДИЛЬНИК: Полная SQL-схема для Supabase
-- Выполнить целиком в Supabase SQL Editor
-- ============================================

-- 0. Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Профили (связь с auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  subscription_tier TEXT DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro')),
  subscription_active BOOLEAN DEFAULT false,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  daily_generations_count INTEGER DEFAULT 0,
  daily_generations_reset_at TIMESTAMPTZ DEFAULT NOW(),
  yookassa_payment_method_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Триггер: создание профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Рецепты
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ingredients_input TEXT[] NOT NULL,
  inventory_hash TEXT NOT NULL,
  content JSONB NOT NULL,
  image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  moderation_status TEXT DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_hash ON public.recipes (inventory_hash);
CREATE INDEX idx_recipes_public ON public.recipes (is_public)
  WHERE is_public = true AND moderation_status = 'approved';
CREATE INDEX idx_recipes_user ON public.recipes (user_id);

-- 3. Избранное
CREATE TABLE public.saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- 4. Платежи
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'RUB',
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'succeeded', 'canceled', 'refunded')),
  yookassa_payment_id TEXT UNIQUE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Списки покупок
CREATE TABLE public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS-политики (Row Level Security)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Recipes: публичные одобренные видят все, свои — автор
CREATE POLICY "recipes_select" ON public.recipes
  FOR SELECT USING (
    (is_public = true AND moderation_status = 'approved')
    OR auth.uid() = user_id
  );
CREATE POLICY "recipes_insert_own" ON public.recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved recipes
CREATE POLICY "saved_select_own" ON public.saved_recipes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_insert_own" ON public.saved_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_delete_own" ON public.saved_recipes
  FOR DELETE USING (auth.uid() = user_id);

-- Payments: только чтение своих
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Shopping lists
CREATE POLICY "shopping_select_own" ON public.shopping_lists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "shopping_insert_own" ON public.shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shopping_update_own" ON public.shopping_lists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "shopping_delete_own" ON public.shopping_lists
  FOR DELETE USING (auth.uid() = user_id);
