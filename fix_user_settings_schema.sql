-- Tabla para configuraciones persistentes del usuario
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    dashboard_layout TEXT[] DEFAULT '{}',
    luna_icon TEXT,
    luna_profile TEXT DEFAULT 'serena',
    luna_frequency TEXT DEFAULT 'balanced',
    luna_voice TEXT DEFAULT 'soprano',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Seguridad a nivel de fila)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Comentario descriptivo
COMMENT ON TABLE public.user_settings IS 'Almacena configuraciones personalizadas de la interfaz y de Luna para cada usuario.';
