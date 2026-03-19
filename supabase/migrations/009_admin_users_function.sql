-- Security definer function to expose auth.users data (last_sign_in_at) to admins.
-- Regular clients cannot query auth.users directly; this function runs as the
-- defining role and enforces admin-only access in code.

CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id              uuid,
  email           text,
  full_name       text,
  is_admin        boolean,
  created_at      timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.is_admin,
    p.created_at,
    u.last_sign_in_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;
