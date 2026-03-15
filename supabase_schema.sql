-- 1. Create a table to register websites
CREATE TABLE public.websites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID, -- Will link to auth.users later for dashboard access
    name TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create a table to register distinct forms per website (Optional but good for organization)
CREATE TABLE public.forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id UUID REFERENCES public.websites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create a table for the actual form submissions
CREATE TABLE public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    website_id UUID REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
    form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE, -- Optional relation
    data JSONB NOT NULL, -- Flexible JSON object to hold any form fields (name, email, message, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional: Enable Row Level Security (RLS) for future user-based access control
-- ALREADY PREPPING for when you want site owners to only see their data!
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for insertions (Anonymous submissions from external websites)
-- Important: You'll want to allow inserts from anyone (publicly) for submissions
CREATE POLICY "Enable insert for authenticated and anon users" ON public.submissions
    FOR INSERT 
    WITH CHECK (true);

-- (We will add SELECT policies later when we implement Supabase Auth for dashboard owners)
