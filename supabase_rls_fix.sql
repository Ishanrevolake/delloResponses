-- Fix the RLS policies to allow the Next.js backend (using Anon key) to insert submissions
-- and verify foreign keys on the websites table.

-- 1. Explicitly allow public/anon inserts on submissions
DROP POLICY IF EXISTS "Enable insert for authenticated and anon users" ON public.submissions;
CREATE POLICY "Enable public inserts on submissions" ON public.submissions 
    FOR INSERT 
    TO public 
    WITH CHECK (true);

-- 2. Allow public/anon to look up the website ID so the foreign key constraint works during insert!
DROP POLICY IF EXISTS "Enable public view of websites" ON public.websites;
CREATE POLICY "Enable public view of websites" ON public.websites 
    FOR SELECT 
    TO public 
    USING (true);
