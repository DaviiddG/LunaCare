-- Tablas para LunaCare

-- 1. Tabla de Alimentación (Diets)
CREATE TABLE diets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'breast', 'formula', 'solids'
  amount NUMERIC,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Pañales (Diapers)
CREATE TABLE diapers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'wet', 'dirty'
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Sueño (Sleep Logs)
CREATE TABLE sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE diets ENABLE ROW LEVEL SECURITY;
ALTER TABLE diapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para que los usuarios solo vean sus propios datos
CREATE POLICY "Users can only see their own diets" ON diets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own diapers" ON diapers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own sleep logs" ON sleep_logs FOR ALL USING (auth.uid() = user_id);
