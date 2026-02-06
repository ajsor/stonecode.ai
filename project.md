# stonecode.ai

Personal landing page and brand website for Andrew Stone.

## Live Site

- **Production:** https://stonecode.ai
- **Preview:** https://a17d88d0-stonecode.ajs-or.workers.dev

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Hosting | Cloudflare Pages |
| DNS/CDN | Cloudflare |
| Repository | GitHub |

## Project Structure

```
stonecode.ai/
├── public/
│   ├── favicon.svg          # Custom logo (code brackets)
│   └── stone-texture.jpg    # Stone texture for "stone" text fill
├── src/
│   ├── App.tsx              # Main landing page component
│   ├── index.css            # Tailwind imports
│   └── main.tsx             # React entry point
├── index.html               # HTML template with SEO meta tags
├── wrangler.toml            # Cloudflare Pages config
├── vite.config.ts           # Vite + Tailwind config
└── project.md               # This file
```

## Accounts & Services

| Service | Purpose | Account |
|---------|---------|---------|
| Porkbun | Domain registrar | stonecode.ai registered (2-year) |
| Cloudflare | DNS, CDN, hosting | Free plan |
| GitHub | Source control | github.com/ajsor/stonecode.ai |

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
Push to `main` branch - Cloudflare Pages auto-deploys.

```bash
git add .
git commit -m "Your message"
git push
```

## Cloudflare Pages Settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Deploy command | `echo "Deploy complete"` |
| Build output | `dist` (via wrangler.toml) |

## Features

### Core
- [x] Responsive design
- [x] Dark/light mode (auto-detects system preference)
- [x] Custom favicon
- [x] SEO meta tags
- [x] Open Graph tags for social sharing
- [x] SSL/HTTPS

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

- [ ] **Unhide social links** - Uncomment in `src/App.tsx` and update URLs
  - LinkedIn: Replace `YOUR-PROFILE` with actual username
  - GitHub: Replace `YOUR-PROFILE` with actual username
- [ ] **Unhide "Get in Touch" button** - Uncomment in `src/App.tsx`
- [ ] Design custom logo
- [ ] Add more content sections (About, Projects, Contact)
- [ ] Set up Cloudflare Analytics
- [ ] Consider registering stonecode.com and stonecode.net for brand protection

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

## Changelog

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

*Last updated: 2026-02-05*
