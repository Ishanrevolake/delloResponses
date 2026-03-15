-- Re-enable RLS on the submissions table since we confirmed the payload is working.
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- The key issue was likely the role name mapping. Next.js uses the 'anon' key via the supabase-js client.
-- Let's create an airtight policy allowing INSERTS from the anon role.

DROP POLICY IF EXISTS "Enable insert for authenticated and anon users" ON public.submissions;
DROP POLICY IF EXISTS "Enable public inserts on submissions" ON public.submissions;

CREATE POLICY "Allow anon and service_role inserts" 
ON public.submissions 
FOR INSERT 
TO public, anon, service_role 
WITH CHECK (true);
