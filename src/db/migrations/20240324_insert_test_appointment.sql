-- Get the user ID for the admin user
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the user ID from auth.users table matching the admin email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'vaggelisbobonhs@gmail.com'
    LIMIT 1;

    -- Insert the appointment using the found user ID
    IF v_user_id IS NOT NULL THEN
        INSERT INTO appointments (
            user_id,
            service_id,
            date,
            time,
            status
        )
        SELECT 
            v_user_id,
            id,
            CURRENT_DATE,
            '10:00',
            'confirmed'
        FROM services 
        WHERE name = 'Classic Haircut'
        LIMIT 1;
    END IF;
END $$; 