-- Supabase Schema V3: Missing Logs & Activity Tables
-- Run this in the Supabase SQL Editor to enable full app functionality

-- Diets (Biberones/Lactancia)
CREATE TABLE IF NOT EXISTS public.diets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'Formula', 'Breastmilk'
    amount INT, -- in ml
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.diets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage diets" ON public.diets FOR ALL USING (auth.uid() = user_id);

-- Diapers (Pañales)
CREATE TABLE IF NOT EXISTS public.diapers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'Pipi', 'Popo', etc
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.diapers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage diapers" ON public.diapers FOR ALL USING (auth.uid() = user_id);

-- Sleep Logs (Sueño)
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage sleep logs" ON public.sleep_logs FOR ALL USING (auth.uid() = user_id);

-- Solids Logs (Sólidos)
CREATE TABLE IF NOT EXISTS public.solids_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    foods JSONB NOT NULL,
    amount TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.solids_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage solids logs" ON public.solids_logs FOR ALL USING (auth.uid() = user_id);

-- Medicine Logs (Medicinas)
CREATE TABLE IF NOT EXISTS public.medicine_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage medicine logs" ON public.medicine_logs FOR ALL USING (auth.uid() = user_id);

-- Growth Logs (Crecimiento)
CREATE TABLE IF NOT EXISTS public.growth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    weight NUMERIC NOT NULL,
    height NUMERIC NOT NULL,
    head_circumference NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.growth_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage growth logs" ON public.growth_logs FOR ALL USING (auth.uid() = user_id);

-- Temperature Logs (Temperatura)
CREATE TABLE IF NOT EXISTS public.temperature_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    temperature NUMERIC NOT NULL,
    unit TEXT DEFAULT 'C',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage temp logs" ON public.temperature_logs FOR ALL USING (auth.uid() = user_id);

-- Activity Logs (Actividad extra)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    duration_minutes INT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage activity" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);

-- AI Conversations (Luna Phase 2)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage ai conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);
