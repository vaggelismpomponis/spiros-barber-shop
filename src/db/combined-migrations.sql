-- Running migration: 20240318_create_profiles.sql
-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Create a trigger to set updated_at on update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at(); 

-- Running migration: 20240320_add_avatar_url.sql
-- Add avatar_url column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create a storage bucket for profile images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to profile images
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images'); 

-- Running migration: 20240321_create_appointments.sql
-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cal_event_uid TEXT NOT NULL,
    service_name TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_start_time_idx ON public.appointments(start_time);
CREATE INDEX IF NOT EXISTS appointments_cal_event_uid_idx ON public.appointments(cal_event_uid);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON public.appointments;

-- Create RLS policies
CREATE POLICY "Users can view their own appointments"
    ON public.appointments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
    ON public.appointments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to set updated_at on update
DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 

-- Running migration: 20240321_create_contact_messages.sql
-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON contact_messages;
DROP POLICY IF EXISTS "Only authenticated users can view contact messages" ON contact_messages;

-- Create policy to allow anyone to insert messages
CREATE POLICY "Anyone can insert contact messages"
ON contact_messages FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow only authenticated users to view messages
CREATE POLICY "Only authenticated users can view contact messages"
ON contact_messages FOR SELECT
TO authenticated
USING (true);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_contact_messages_updated_at ON contact_messages;

-- Create updated_at trigger
CREATE TRIGGER set_contact_messages_updated_at
BEFORE UPDATE ON contact_messages
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); 

-- Running migration: 20240322_create_admins.sql
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

-- Running migration: 20240322_create_migration_function.sql
-- Create a function to apply migrations
CREATE OR REPLACE FUNCTION apply_migration(migration_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE migration_sql;
END;
$$; 

-- Running migration: 20240323_create_services.sql
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

-- Create temporary table to store old appointments data
CREATE TEMP TABLE old_appointments AS
SELECT * FROM public.appointments;

-- Drop and recreate appointments table with proper references
DROP TABLE IF EXISTS public.appointments CASCADE;
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES public.services(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    cal_event_uid TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_profile_id_idx ON public.appointments(profile_id);
CREATE INDEX IF NOT EXISTS appointments_service_id_idx ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON public.appointments(date);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;

-- Create RLS policies
CREATE POLICY "Users can view their own appointments"
    ON public.appointments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
    ON public.appointments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all appointments"
    ON public.appointments FOR SELECT
    USING (public.is_admin(auth.jwt() ->> 'email'));

-- Create a temporary table to log service mapping issues
CREATE TEMP TABLE service_mapping_log (
    service_name TEXT,
    matched_service_id INTEGER,
    matched_service_name TEXT
);

-- Map services and insert data from old appointments
WITH service_mapping AS (
    SELECT DISTINCT ON (a.service_name) 
        a.service_name,
        s.id as service_id,
        s.name as matched_service_name
    FROM old_appointments a
    LEFT JOIN public.services s ON 
        lower(a.service_name) LIKE '%' || lower(s.name) || '%' OR
        lower(s.name) LIKE '%' || lower(a.service_name) || '%'
)
INSERT INTO service_mapping_log
SELECT service_name, service_id, matched_service_name
FROM service_mapping;

-- Log unmapped services
DO $$
DECLARE
    unmapped RECORD;
BEGIN
    FOR unmapped IN 
        SELECT DISTINCT service_name 
        FROM old_appointments a
        WHERE NOT EXISTS (
            SELECT 1 FROM service_mapping_log l
            WHERE l.service_name = a.service_name
            AND l.matched_service_id IS NOT NULL
        )
    LOOP
        RAISE NOTICE 'Unmapped service: %', unmapped.service_name;
    END LOOP;
END $$;

-- Insert data into new appointments table
INSERT INTO public.appointments (
    id,
    user_id,
    profile_id,
    service_id,
    date,
    time,
    cal_event_uid,
    status,
    created_at,
    updated_at
)
SELECT 
    a.id,
    a.user_id,
    a.user_id as profile_id, -- user_id is the same as profile_id
    COALESCE(
        (SELECT s.id 
         FROM public.services s 
         WHERE lower(a.service_name) LIKE '%' || lower(s.name) || '%' 
         LIMIT 1),
        (SELECT id FROM public.services WHERE name = 'Classic Haircut')
    ) as service_id,
    a.start_time::date as date,
    a.start_time::time as time,
    a.cal_event_uid,
    a.status,
    a.created_at,
    a.updated_at
FROM old_appointments a;

-- Drop temporary tables
DROP TABLE IF EXISTS old_appointments;
DROP TABLE IF EXISTS service_mapping_log; 
