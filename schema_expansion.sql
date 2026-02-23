-- New tables for expanded logging and customization

-- 1. Solids Logs
CREATE TABLE IF NOT EXISTS public.solids_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    foods TEXT[] NOT NULL,
    amount TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Medicine Logs
CREATE TABLE IF NOT EXISTS public.medicine_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Growth Logs
CREATE TABLE IF NOT EXISTS public.growth_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    weight NUMERIC, -- in kg
    height NUMERIC, -- in cm
    head_circumference NUMERIC, -- in cm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Temperature Logs
CREATE TABLE IF NOT EXISTS public.temperature_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    temperature NUMERIC NOT NULL,
    unit TEXT DEFAULT 'C',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    baby_id UUID NOT NULL REFERENCES public.baby_profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. User Settings (Dashboard Customization)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_layout JSONB DEFAULT '["sleep", "nursing", "bottle", "solids", "diaper", "pumping", "medicine", "growth", "temperature", "activity"]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for all new tables
ALTER TABLE public.solids_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own solids logs" ON public.solids_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own medicine logs" ON public.medicine_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own growth logs" ON public.growth_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own temperature logs" ON public.temperature_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own activity logs" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
