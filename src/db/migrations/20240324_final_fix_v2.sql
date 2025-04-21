-- Drop the old appointments table
DROP TABLE IF EXISTS appointments CASCADE;

-- Create the appointments table with the correct structure
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    cal_event_uid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create new unified policies
CREATE POLICY "appointments_select_policy"
ON appointments FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1
        FROM admins
        WHERE admins.email = auth.jwt()->>'email'
    )
);

CREATE POLICY "appointments_insert_policy"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1
        FROM admins
        WHERE admins.email = auth.jwt()->>'email'
    )
);

CREATE POLICY "appointments_update_policy"
ON appointments FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1
        FROM admins
        WHERE admins.email = auth.jwt()->>'email'
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1
        FROM admins
        WHERE admins.email = auth.jwt()->>'email'
    )
);

CREATE POLICY "appointments_delete_policy"
ON appointments FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1
        FROM admins
        WHERE admins.email = auth.jwt()->>'email'
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_service_id_idx ON appointments(service_id);
CREATE INDEX IF NOT EXISTS appointments_date_time_idx ON appointments(date, time);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON appointments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Create a function to get user ID by email with elevated privileges
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

-- Insert test appointments
DO $$
DECLARE
    v_user_id UUID;
    v_service_id INTEGER;
BEGIN
    -- Get the user ID using our privileged function
    v_user_id := get_user_id_by_email('vaggelisbobonhs@gmail.com');

    -- Get the service ID for Classic Haircut
    SELECT id INTO v_service_id
    FROM services
    WHERE name = 'Classic Haircut'
    LIMIT 1;

    -- Insert test appointments if we have both user_id and service_id
    IF v_user_id IS NOT NULL AND v_service_id IS NOT NULL THEN
        RAISE NOTICE 'Inserting appointments for user_id: %, service_id: %', v_user_id, v_service_id;
        
        -- Insert an appointment for today
        INSERT INTO appointments (
            user_id,
            service_id,
            date,
            time,
            status
        ) VALUES (
            v_user_id,
            v_service_id,
            CURRENT_DATE,
            '10:00',
            'confirmed'
        );

        -- Insert an appointment for tomorrow
        INSERT INTO appointments (
            user_id,
            service_id,
            date,
            time,
            status
        ) VALUES (
            v_user_id,
            v_service_id,
            CURRENT_DATE + 1,
            '14:00',
            'pending'
        );
    ELSE
        RAISE NOTICE 'Could not find user_id or service_id. user_id: %, service_id: %', v_user_id, v_service_id;
    END IF;
END $$; 