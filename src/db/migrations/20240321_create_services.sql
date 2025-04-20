-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    duration INTEGER NOT NULL, -- duration in minutes
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view services" ON public.services;
DROP POLICY IF EXISTS "Only admins can manage services" ON public.services;

-- Create RLS policies
CREATE POLICY "Everyone can view services"
    ON public.services FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Only admins can manage services"
    ON public.services FOR ALL
    TO authenticated
    USING (public.is_admin(auth.jwt() ->> 'email'));

-- Create updated_at trigger
DROP TRIGGER IF EXISTS set_services_updated_at ON public.services;
CREATE TRIGGER set_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Insert initial services
INSERT INTO public.services (name, description, duration, price, category) VALUES
    ('Classic Haircut', 'Traditional haircut with clippers and scissors, includes hot towel and styling', 30, 25.00, 'haircut'),
    ('Beard Trim', 'Professional beard trimming and shaping with hot towel treatment', 20, 15.00, 'beard'),
    ('Haircut & Beard Combo', 'Complete grooming package with haircut and beard trim', 45, 35.00, 'combo'),
    ('Premium Fade', 'Precision fade haircut with detailed line-up and styling', 45, 30.00, 'haircut'),
    ('Royal Shave', 'Traditional straight razor shave with hot towel and facial massage', 30, 25.00, 'beard'),
    ('VIP Package', 'Premium haircut, beard trim, facial treatment, and head massage', 60, 50.00, 'combo')
ON CONFLICT (id) DO NOTHING; 