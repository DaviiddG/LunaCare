-- Update user_settings table to include Luna preferences
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS luna_icon TEXT,
ADD COLUMN IF NOT EXISTS luna_profile TEXT,
ADD COLUMN IF NOT EXISTS luna_frequency TEXT,
ADD COLUMN IF NOT EXISTS luna_voice TEXT;

-- Ensure RLS is enabled and set (just in case)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to manage their own settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_settings' AND policyname = 'Users can manage their own settings'
    ) THEN
        CREATE POLICY "Users can manage their own settings" ON user_settings
        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
