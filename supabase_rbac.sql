-- Run this in the Supabase SQL Editor to enable Role-Based Access Control

-- 1. Create the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 2. Set up basic RLS (Row Level Security) for the new table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own role
CREATE POLICY "Users can read own role" 
    ON public.user_roles 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- (Optional) If you want the Next.js API/Server to read roles seamlessly based on the 
-- service role key or if you want to allow authenticated users to be verified
CREATE POLICY "Allow authenticated read" 
    ON public.user_roles 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- 3. Insert yourself as the first admin!
-- Replace the UUID below with your actual auth.users ID
   INSERT INTO public.user_roles (user_id, role) 
   VALUES ('04afe09a-9ac5-4aa6-9b55-e68d3d0a6955', 'admin');
