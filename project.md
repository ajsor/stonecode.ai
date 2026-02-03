# StoneCode.ai

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
| Hosting | Cloudflare Pages |
| DNS/CDN | Cloudflare |
| Repository | GitHub |

## Project Structure

```
stonecode.ai/
├── public/
│   └── favicon.svg          # Custom logo (code brackets)
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

- [x] Responsive design
- [x] Dark/light mode (auto-detects system preference)
- [x] Theme toggle button
- [x] Custom favicon
- [x] SEO meta tags
- [x] Open Graph tags for social sharing
- [x] SSL/HTTPS

## TODO

- [ ] **Unhide social links** - Update URLs in `src/App.tsx` (line 77)
  - LinkedIn: Replace `YOUR-PROFILE` with actual username
  - GitHub: Replace `YOUR-PROFILE` with actual username
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

*Last updated: 2026-02-03*
