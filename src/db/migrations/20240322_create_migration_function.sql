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