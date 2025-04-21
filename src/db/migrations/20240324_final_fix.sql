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

-- Insert test appointments
DO $$
DECLARE
    v_user_id UUID;
    v_service_id INTEGER;
BEGIN
    -- Get the user ID from auth.users table matching the admin email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'vaggelisbobonhs@gmail.com'
    LIMIT 1;

    -- Get the service ID for Classic Haircut
    SELECT id INTO v_service_id
    FROM services
    WHERE name = 'Classic Haircut'
    LIMIT 1;

    -- Insert test appointments if we have both user_id and service_id
    IF v_user_id IS NOT NULL AND v_service_id IS NOT NULL THEN
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
    END IF;
END $$; 