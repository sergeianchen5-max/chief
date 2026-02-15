-- Миграция: добавить inventory и family в profiles
-- Выполнить в Supabase SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family JSONB DEFAULT '[]';
