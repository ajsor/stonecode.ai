# stonecode.ai

Personal landing page and brand website for Andrew Stone.

## Live Site

- **Production:** https://stonecode.ai
- **Preview:** https://a17d88d0-stonecode.ajs-or.workers.dev

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Routing | React Router v6 |
| Backend | Supabase (Auth, Database, Edge Functions) |
| Auth | Supabase Auth + WebAuthn (passkeys) |
| Hosting | Cloudflare Pages |
| CI/CD | GitHub Actions |
| DNS/CDN | Cloudflare |
| Repository | GitHub |

## Project Structure

```
stonecode.ai/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions deployment workflow
├── public/
│   ├── favicon.svg              # Custom logo (code brackets)
│   ├── stone-texture.jpg        # Stone texture for "stone" text fill
│   └── _headers                 # Cloudflare security headers
├── src/
│   ├── components/
│   │   ├── auth/                # Auth components
│   │   ├── features/            # FeatureGate component
│   │   ├── layout/              # PortalLayout, AdminLayout
│   │   └── ui/                  # Shared UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Auth state provider
│   │   └── FeatureFlagContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts           # Auth hook
│   │   └── useFeatureFlags.ts
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   └── webauthn.ts          # WebAuthn utilities
│   ├── pages/
│   │   ├── landing/LandingPage.tsx
│   │   ├── auth/                # Login, AcceptInvite
│   │   └── portal/              # Dashboard, Profile, Admin
│   ├── types/
│   │   ├── database.ts          # Supabase types
│   │   └── index.ts
│   ├── App.tsx                  # Legacy (kept for reference)
│   ├── router.tsx               # React Router config
│   ├── index.css
│   └── main.tsx
├── supabase/
│   ├── migrations/              # Database schema SQL
│   └── functions/               # Edge Functions
├── index.html
├── vite.config.ts
└── project.md
```

## Accounts & Services

| Service | Purpose | Account |
|---------|---------|---------|
| Porkbun | Domain registrar | stonecode.ai registered (2-year) |
| Cloudflare | DNS, CDN, hosting | Free plan |
| GitHub | Source control | github.com/ajsor/stonecode.ai |
| Supabase | Auth, Database, Edge Functions | Free tier (1-50 users) |

## Development

### Prerequisites
- Node.js 18+
- npm

### Local Development
```bash
cd C:\Users\ajs_o\Projects\stonecode.ai
npm install
npm run dev
```
Site runs at http://localhost:5173 (or next available port)

### Build
```bash
npm run build
```
Output goes to `dist/` folder.

### Deploy
Push to `main` branch - GitHub Actions builds and deploys to Cloudflare Pages.

```bash
git add .
git commit -m "Your message"
git push
```

## Deployment (GitHub Actions)

Deployment is handled by `.github/workflows/deploy.yml`:
1. Triggered on push to `main` branch
2. Installs dependencies with `npm ci`
3. Builds with `npm run build`
4. Deploys `dist/` to Cloudflare Pages using wrangler

**Required GitHub Secrets:**
| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Features

### Core
- [x] Responsive design
- [x] Dark/light mode (auto-detects system preference)
- [x] Custom favicon
- [x] SEO meta tags
- [x] Open Graph tags for social sharing
- [x] SSL/HTTPS

### User Portal (Invitation-Only)
- [x] Email invitations with private links + QR codes
- [x] Password authentication
- [x] Magic link authentication
- [x] Passkey/biometric authentication (WebAuthn)
- [x] MFA support (TOTP) - UI ready, needs backend
- [x] Per-user feature toggles
- [x] Admin panel for user/invitation/feature management
- [x] Protected routes with React Router
- [x] Row Level Security on all database tables

### Visual Design
- [x] Glassmorphism UI elements (frosted glass effect)
- [x] Animated gradient background with floating orbs
- [x] Cursor glow effect (follows mouse)
- [x] Scroll progress bar at top

### Typography
- [x] "stone" text filled with real stone/concrete texture
- [x] "code.ai" in light weight font (white in dark mode, black in light mode)
- [x] Letter-by-letter entrance animation

### Animations (Framer Motion)
- [x] Staggered entrance animations for all elements
- [x] Logo icon draws itself on load
- [x] Tagline glow & grow effect (10% scale, pause, shrink) on load and hover
- [x] Theme toggle with glow effect and "Light mode" / "Dark mode" label on hover
- [x] Animated shimmer effects on glassmorphism cards
- [x] Pulsing status indicator on "Coming Soon" badge

## TODO

### Landing Page
- [ ] **Unhide social links** - Uncomment in `src/pages/landing/LandingPage.tsx` and update URLs
  - LinkedIn: Replace `YOUR-PROFILE` with actual username
  - GitHub: Replace `YOUR-PROFILE` with actual username
- [ ] **Unhide "Get in Touch" button** - Uncomment in LandingPage
- [ ] Design custom logo
- [ ] Add more content sections (About, Projects, Contact)
- [ ] Set up Cloudflare Analytics
- [ ] Consider registering stonecode.com and stonecode.net for brand protection

### User Portal
- [ ] **Set up Supabase project** - Create project at supabase.com
- [ ] **Run database migrations** - Execute SQL in `supabase/migrations/`
- [ ] **Deploy Edge Functions** - Deploy functions in `supabase/functions/`
- [ ] **Configure environment variables** - Add Supabase keys to GitHub Secrets
- [ ] **Create first admin user** - Manually set `is_admin=true` in profiles table
- [ ] Implement TOTP MFA backend
- [ ] Add email sending for invitations (Resend/SendGrid)
- [ ] Add user avatar upload

## Domain Details

| Domain | Registrar | Registered | Expires |
|--------|-----------|------------|---------|
| stonecode.ai | Porkbun | Feb 2026 | Feb 2028 |

**Nameservers:** Cloudflare (configured in Porkbun)

## Costs

| Item | Cost | Frequency |
|------|------|-----------|
| stonecode.ai domain | ~$72 | Per year |
| Cloudflare Pages | Free | - |
| Cloudflare DNS | Free | - |

**Total:** ~$72/year (domain only)

## Portal Routes

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Landing page | Public |
| `/login` | Login page | Public |
| `/accept-invite?token=x` | Invitation acceptance | Public (with valid token) |
| `/portal` | Portal root (redirects to dashboard) | Authenticated |
| `/portal/dashboard` | Main dashboard | Authenticated |
| `/portal/profile` | User profile settings | Authenticated |
| `/portal/profile/security` | MFA, passkeys, password | Authenticated |
| `/portal/admin/users` | User management | Admin only |
| `/portal/admin/invitations` | Create/manage invitations | Admin only |
| `/portal/admin/features` | Feature flag management | Admin only |

## Database Schema

### Tables (Supabase PostgreSQL)
- **profiles** - Extended user data (links to auth.users)
- **invitations** - Invitation tokens with 7-day expiry
- **feature_flags** - Available features
- **user_feature_flags** - Per-user feature overrides
- **passkeys** - WebAuthn credentials
- **audit_log** - Security event tracking
- **mfa_factors** - TOTP MFA factors
- **webauthn_challenges** - Temporary challenge storage

All tables use Row Level Security (RLS).

## Changelog

### 2026-02-08
- Added user portal with invitation-only access
- Implemented auth with password, magic link, and passkey support
- Added React Router for client-side routing
- Refactored App.tsx to LandingPage component
- Created AuthContext and FeatureFlagContext
- Built portal layout with sidebar navigation
- Created admin panel for users, invitations, and features
- Added QR code generation for invitations
- Created Supabase database schema with RLS
- Created Supabase Edge Functions for WebAuthn
- Added security headers via Cloudflare _headers file

### 2026-02-06
- Improved mobile experience with responsive design
- Added touch device detection (disables cursor effects on mobile)
- Made background orbs smaller on mobile for better performance
- Added responsive sizing for logo, title, and icons
- Switched from Cloudflare CI/CD to GitHub Actions for deployment
- Removed wrangler.toml (no longer needed)

### 2026-02-05
- Added Framer Motion for animations
- Implemented glassmorphism design system
- Added animated gradient background with floating orbs
- Added cursor glow effect
- Added scroll progress bar
- Implemented "stone" text with real stone texture fill (stone-texture.jpg)
- Made "code.ai" light weight font (white/black based on mode)
- Added tagline glow & grow animation (on load and hover)
- Enhanced theme toggle with hover glow and mode label
- Added letter-by-letter entrance animations
- Added shimmer effects on cards
- Hidden social links and "Get in Touch" button (ready to enable)
- Renamed "StoneCode.ai" to "stonecode.ai" (lowercase branding)

### 2026-02-03
- Initial project setup
- Created Vite + React + TypeScript project
- Added Tailwind CSS
- Built landing page with dark/light mode
- Created custom favicon
- Set up GitHub repository
- Deployed to Cloudflare Pages
- Connected stonecode.ai custom domain
- SSL certificate active

---

*Last updated: 2026-02-08*
