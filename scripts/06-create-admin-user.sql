-- Create master admin account
-- Run AFTER user signs up via auth (so auth.users entry exists)
-- Then manually run this to promote them to master admin

-- Find the auth.users.id from your email and run:
-- UPDATE users SET is_master_admin = TRUE WHERE email = 'your-email@example.com';

-- Or use this as a function for admin creation (Supabase dashboard):

CREATE OR REPLACE FUNCTION create_master_admin(user_email TEXT)
RETURNS TABLE (user_id TEXT, email TEXT, is_master_admin BOOLEAN) AS $$
DECLARE
  _user_id TEXT;
BEGIN
  -- Check if user exists
  SELECT id INTO _user_id FROM users WHERE email = user_email;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Update to master admin
  UPDATE users SET is_master_admin = TRUE WHERE id = _user_id;

  -- Return result
  RETURN QUERY
  SELECT id, email, is_master_admin FROM users WHERE id = _user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage in Supabase dashboard:
-- SELECT create_master_admin('admin@company.com');
