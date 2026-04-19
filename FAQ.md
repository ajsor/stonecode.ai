# stonecode.ai — FAQ

Answers to the questions most likely to come up when touching this codebase.

## General

**What is stonecode.ai?**
A personal brand site and a private, invitation-only portal for Andrew Stone. The portal hosts a customizable widget dashboard plus launchers for satellite apps (RELAiTE, Aether, ADAM, MB Dashboard).

**Live URL:** https://stonecode.ai

**Why monorepo-adjacent layout (3 separate repos + a shared SDK)?**
Each satellite (aether, relaite) is deployed independently to its own Cloudflare Pages project, needs its own build pipeline, and has its own DB tables. A shared npm package (`@stonecode/portal-sdk`) holds the cross-cutting code — auth handoff, Supabase client factory, theme tokens, launch-URL builder.

## Auth & Access

**Who can log in?**
Only invited users. Admins create invitations on `/portal/admin/users` → Invitations tab. The invite email contains a one-time link to `/accept-invite?token=…`.

**How does the portal launch a satellite app?**
`PortalLayout.tsx` calls `buildPortalLaunchUrl(app, session)` from the SDK — this returns a URL with the caller's Supabase access + refresh tokens in the URL hash (`#access_token=…&refresh_token=…&type=portal`). The satellite's `AuthLandingPage` runs `bootstrapSessionFromHash(supabase)` to swap those tokens into its own Supabase client, scrubs the hash from the address bar, and routes the user into the app.

**Why not share `localStorage` across satellites?**
Each app uses a unique `storageKey` (`stonecode-auth`, `aether-auth`, `relaite-auth`) so tabs on different subdomains don't clobber each other's session. The hash-handoff is the intentional handoff path.

**How does the handle_new_user trigger work?**
See `supabase/migrations/001_initial_schema.sql`. On `auth.users` INSERT, Postgres fires `handle_new_user()` which upserts a `profiles` row using `raw_user_meta_data.full_name`. **Do not** insert into `profiles` manually after signup — it races the trigger.

**What does `create-invitation` do?**
Edge function at `supabase/functions/create-invitation`. Verifies the caller is an admin, creates an `invitations` row with a 7-day expiry, then sends a branded HTML email via Resend (requires `RESEND_API_KEY` secret in Supabase). Returns `{ email_sent, email_error, invitation: { invite_url, … } }` so the admin UI can surface status.

## Feature Flags

**How are flags evaluated?**
Two-layer system in `feature_flags` (defaults) and `user_feature_flags` (per-user overrides). The SDK exports `fetchUserFeatureFlags(supabase, userId)` which merges both. In the portal, `useFeatureFlags()` hook wraps this.

**How do I add a new flag?**
Create a migration that inserts into `feature_flags`, e.g. `supabase/migrations/008_aether_feature_flag.sql`. Wrap gated UI in `<FeatureGate feature="flag_name">…</FeatureGate>` or call `hasFeature('flag_name')`.

## Widgets

**Where is the widget layout stored?**
Per-user rows in the `widget_preferences` table. `WidgetContext` handles read/write. Writes are debounced 500ms to avoid spamming the DB during drag/resize; config toggles flush immediately.

**Widget is broken / render loop?**
Common causes: unstable callbacks (wrap in `useCallback`), config objects rebuilt on every render (wrap in `useMemo`). See the 2026-02-13 changelog entry for the original fix.

## Theming / Dark Mode

**Why `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css`?**
Tailwind v4 defaults `dark:` variants to `prefers-color-scheme` media queries — not the `.dark` class. This line restores class-based dark mode so the JS toggle works.

**Which hook manages dark mode?**
`src/hooks/useDarkMode.ts` — returns `[darkMode, setDarkMode]`, defaults to dark, persists to `localStorage['stonecode-dark-mode']`, and toggles the `.dark` class on `<html>`.

## Deployment

**How do I deploy?**
Push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to Cloudflare Pages via Wrangler.

**Why did my env var not make it to production?**
`VITE_*` vars must be in the GitHub Actions **build step** `env` block — Cloudflare Pages dashboard env vars alone are not enough when deploying via Wrangler from CI.

**How do I roll back?**
Each refactor session creates a rollback tag on the main branch (e.g. `rollback-20260418-170835`). Reset main to that tag if something goes wrong in prod: `git reset --hard <tag>` then force-push — **confirm with user first** since force-push is destructive.

## Local Development

**Setup:**
```bash
npm install
cp .env.local.example .env.local  # fill in Supabase keys + VITE_OPENWEATHER_API_KEY
npm run dev
```

**Why is my Supabase edge function call 401-ing locally?**
You need to run `supabase login` + `supabase link --project-ref <ref>` and then `supabase functions serve` if testing locally, or simply deploy the function and hit it over HTTPS. Check that the function secrets (`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are set in the Supabase project dashboard.

**I added a new migration, what now?**
Run it manually in the Supabase SQL editor (the project doesn't use `supabase db push` in CI). Update `project.md` with a changelog entry.

## Shared SDK

**What lives in `@stonecode/portal-sdk`?**
- `bootstrapSessionFromHash(supabase)` — consume hash tokens on satellite entry
- `buildPortalLaunchUrl(app, session)` — portal builds handoff URLs
- `createPortalSupabaseClient({ url, anonKey, storageKey })` — standardized Supabase client config
- `fetchUserFeatureFlags(supabase, userId)` — feature flag merge logic
- `tokens` + `theme.css` — color/radius/font tokens so satellites look like the portal

**How do I bump the SDK?**
Edit `C:/Users/ajs_o/Projects/stonecode-portal-sdk`, rebuild (`npm run build`), commit dist/, tag a new version (`git tag v0.2.0`), push tags. Then update the `#v0.X.Y` suffix in each consumer's `package.json` and `npm install`.

## Troubleshooting

**Portal → satellite launch keeps booting me to the login page.**
The satellite's `AuthLandingPage` couldn't consume the hash. Check: (a) tokens are present in the URL (b) satellite's Supabase project URL matches the portal's (c) the satellite's Supabase client has `detectSessionInUrl: false` so it doesn't try to parse the hash itself before we do.

**"Invitation link is invalid" on a fresh invite.**
Most common cause: invite was revoked or already accepted. Check `invitations.accepted_at` and `invitations.expires_at` in Supabase.

**Build warning: "dynamic import will not move module into another chunk."**
`googleAuth.ts` is both static- and dynamic-imported by `useGoogleCalendar.ts`. Harmless — the file ends up in the main chunk.
