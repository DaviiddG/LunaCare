-- Table for baby profiles
CREATE TABLE IF NOT EXISTS public.baby_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    birth_date DATE,
    weight NUMERIC, -- in kg
    height NUMERIC, -- in cm
    gender TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id)
);

-- Table for Luna chat history
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'luna')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS for baby_profiles
ALTER TABLE public.baby_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own baby profiles" 
ON public.baby_profiles FOR ALL 
USING (auth.uid() = user_id);

-- RLS for chat_history
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chat history" 
ON public.chat_history FOR ALL 
USING (auth.uid() = user_id);
