-- Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins
        WHERE email = user_email
    );
$$;

-- Enable RLS if not already enabled
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all admin records" ON public.admins;
DROP POLICY IF EXISTS "Admins can manage admin records" ON public.admins;

-- Create RLS policies using the function
CREATE POLICY "Admins can view all admin records"
    ON public.admins FOR SELECT
    USING (public.is_admin(auth.jwt() ->> 'email'));

CREATE POLICY "Admins can manage admin records"
    ON public.admins FOR ALL
    USING (public.is_admin(auth.jwt() ->> 'email'));

-- Insert initial admin emails if they don't exist
INSERT INTO public.admins (email) VALUES
    ('ebomponis@gmail.com'),
    ('vaggelisbobonhs@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_admins_updated_at ON public.admins;

-- Create updated_at trigger
CREATE TRIGGER set_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 