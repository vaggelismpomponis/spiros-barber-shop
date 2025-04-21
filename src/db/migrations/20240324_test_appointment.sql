-- Insert a test appointment
INSERT INTO appointments (
    user_id,
    service_id,
    date,
    time,
    status
)
SELECT 
    auth.uid(), -- This will be replaced with your user ID
    (SELECT id FROM services WHERE name = 'Haircut' LIMIT 1), -- This will be replaced with an actual service ID
    CURRENT_DATE,
    '10:00',
    'confirmed'
WHERE EXISTS (
    SELECT 1 FROM auth.users LIMIT 1
) AND EXISTS (
    SELECT 1 FROM services LIMIT 1
); 