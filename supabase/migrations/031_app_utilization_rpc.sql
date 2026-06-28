-- Migration 031: get_admin_app_utilization() — server-side aggregation for
-- the App Utilization admin page.
--
-- Returns a single JSONB object with everything the page needs in one round
-- trip. SECURITY DEFINER + explicit admin check so the RPC can read
-- auth.users.last_sign_in_at (DAU/WAU/MAU) without exposing the table.
--
-- search_path pinned to public, auth, pg_temp to neutralize the standard
-- search-path-hijack vector for SECURITY DEFINER functions.

CREATE OR REPLACE FUNCTION public.get_admin_app_utilization()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_is_admin BOOLEAN;
  v_now             TIMESTAMPTZ := NOW();
  v_result          JSONB;
BEGIN
  -- Admin gate. RPC must not leak to non-admins.
  SELECT (is_admin = TRUE) INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  WITH
  -- ── Active users (portal sign-ins) ──────────────────────────────
  active_users AS (
    SELECT
      COUNT(*) FILTER (WHERE last_sign_in_at > v_now - INTERVAL  '1 day') AS dau,
      COUNT(*) FILTER (WHERE last_sign_in_at > v_now - INTERVAL  '7 day') AS wau,
      COUNT(*) FILTER (WHERE last_sign_in_at > v_now - INTERVAL '30 day') AS mau,
      COUNT(*) AS total_users
    FROM auth.users
  ),

  -- ── Active app users (distinct user_id in app_launches) ────────
  active_app_users AS (
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE launched_at > v_now - INTERVAL  '1 day') AS dau_apps,
      COUNT(DISTINCT user_id) FILTER (WHERE launched_at > v_now - INTERVAL  '7 day') AS wau_apps,
      COUNT(DISTINCT user_id) FILTER (WHERE launched_at > v_now - INTERVAL '30 day') AS mau_apps
    FROM public.app_launches
  ),

  -- ── Launches per app, current vs prior week ────────────────────
  launches_by_app AS (
    SELECT
      app,
      COUNT(*) FILTER (WHERE launched_at > v_now - INTERVAL '7 day')  AS launches_7d,
      COUNT(*) FILTER (WHERE launched_at > v_now - INTERVAL '14 day'
                       AND launched_at <= v_now - INTERVAL '7 day')   AS launches_prev_7d,
      COUNT(*) FILTER (WHERE launched_at > v_now - INTERVAL '30 day') AS launches_30d,
      COUNT(DISTINCT user_id) FILTER (WHERE launched_at > v_now - INTERVAL '30 day') AS users_30d
    FROM public.app_launches
    GROUP BY app
  ),

  -- ── Daily launch counts for last 30 days (sparkline) ───────────
  daily_series AS (
    SELECT
      date_trunc('day', launched_at)::date AS day,
      COUNT(*) AS launches
    FROM public.app_launches
    WHERE launched_at > v_now - INTERVAL '30 day'
    GROUP BY 1
    ORDER BY 1
  ),

  -- ── Adoption funnel per feature flag (= per satellite app) ────
  -- granted = users with user_feature_flags entry where enabled
  -- ever_launched = launched at least once
  -- returning = launched in last 7d AND first launch >7d ago
  flag_apps AS (
    SELECT DISTINCT name AS app
    FROM public.feature_flags
    WHERE name NOT IN ('admin_panel', 'advanced_analytics', 'beta_features')
  ),
  granted_per_app AS (
    SELECT
      f.name AS app,
      COUNT(uff.user_id) AS granted
    FROM public.feature_flags f
    LEFT JOIN public.user_feature_flags uff
      ON uff.feature_id = f.id AND uff.enabled = TRUE
    WHERE f.name IN (SELECT app FROM flag_apps)
    GROUP BY f.name
  ),
  launched_per_app AS (
    SELECT
      app,
      COUNT(DISTINCT user_id) AS ever_launched,
      COUNT(DISTINCT user_id) FILTER (
        WHERE launched_at > v_now - INTERVAL '7 day'
      ) AS active_7d
    FROM public.app_launches
    GROUP BY app
  ),
  returning_per_app AS (
    SELECT
      l.app,
      COUNT(DISTINCT l.user_id) AS returning
    FROM public.app_launches l
    JOIN (
      SELECT app, user_id, MIN(launched_at) AS first_launch
      FROM public.app_launches
      GROUP BY app, user_id
    ) first ON first.app = l.app AND first.user_id = l.user_id
    WHERE l.launched_at > v_now - INTERVAL '7 day'
      AND first.first_launch <= v_now - INTERVAL '7 day'
    GROUP BY l.app
  ),

  -- ── Top users (last 30 days) ──────────────────────────────────
  top_users AS (
    SELECT
      l.user_id,
      COALESCE(p.full_name, p.email, l.user_id::text) AS label,
      COUNT(*) AS launches
    FROM public.app_launches l
    LEFT JOIN public.profiles p ON p.id = l.user_id
    WHERE l.launched_at > v_now - INTERVAL '30 day'
    GROUP BY l.user_id, p.full_name, p.email
    ORDER BY COUNT(*) DESC
    LIMIT 8
  )

  SELECT jsonb_build_object(
    'generated_at',     v_now,
    'active_users',     (SELECT row_to_json(active_users) FROM active_users),
    'active_app_users', (SELECT row_to_json(active_app_users) FROM active_app_users),
    'apps',             COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'app',              fa.app,
        'launches_7d',      COALESCE(lba.launches_7d, 0),
        'launches_prev_7d', COALESCE(lba.launches_prev_7d, 0),
        'launches_30d',     COALESCE(lba.launches_30d, 0),
        'users_30d',        COALESCE(lba.users_30d, 0),
        'granted',          COALESCE(gpa.granted, 0),
        'ever_launched',    COALESCE(lpa.ever_launched, 0),
        'active_7d',        COALESCE(lpa.active_7d, 0),
        'returning',        COALESCE(rpa.returning, 0)
      ) ORDER BY COALESCE(lba.launches_30d, 0) DESC, fa.app)
      FROM flag_apps fa
      LEFT JOIN launches_by_app  lba ON lba.app = fa.app
      LEFT JOIN granted_per_app  gpa ON gpa.app = fa.app
      LEFT JOIN launched_per_app lpa ON lpa.app = fa.app
      LEFT JOIN returning_per_app rpa ON rpa.app = fa.app
    ), '[]'::jsonb),
    'daily_series', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day',      to_char(day, 'YYYY-MM-DD'),
        'launches', launches
      ) ORDER BY day)
      FROM daily_series
    ), '[]'::jsonb),
    'top_users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'user_id',  user_id,
        'label',    label,
        'launches', launches
      ))
      FROM top_users
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_app_utilization() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_app_utilization() TO authenticated;

COMMENT ON FUNCTION public.get_admin_app_utilization() IS
  'Admin-only aggregate for the App Utilization dashboard. Returns DAU/WAU/MAU, per-app launches, adoption funnel, and top users in one JSONB blob.';
