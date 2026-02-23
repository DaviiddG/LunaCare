-- Missing DELETE policies for LunaCare tables
-- This allows users to delete their own records.

-- Allow users to delete their own baby profiles
CREATE POLICY "Users can delete their own baby profiles"
ON public.baby_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own diet logs
CREATE POLICY "Users can delete their own diet logs"
ON public.diets
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own diaper logs
CREATE POLICY "Users can delete their own diaper logs"
ON public.diapers
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own sleep logs
CREATE POLICY "Users can delete their own sleep logs"
ON public.sleep_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own solids logs
CREATE POLICY "Users can delete their own solids logs"
ON public.solids_logs
FOR DELETE
USING (auth.uid() = user_id);

