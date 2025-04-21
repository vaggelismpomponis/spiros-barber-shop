-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can create their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON appointments;

-- Create new policies that properly handle admin access
CREATE POLICY "Users can view appointments"
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

CREATE POLICY "Users can create appointments"
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

CREATE POLICY "Users can update appointments"
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

CREATE POLICY "Users can delete appointments"
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

-- Ensure RLS is enabled
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY; 