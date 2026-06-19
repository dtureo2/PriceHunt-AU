# PriceHunt AU — Baby Product Price Comparison

A fast, single-page web app that compares prices on baby products across major
Australian retailers. Live prices are pulled from Woolworths and Coles via their
public JSON APIs, normalised to unit prices, and presented with store toggles,
sorting, and a screenshot preview modal.

> **Live demo (current deployment):** http://192.168.1.104:8001

---

## Features

- **Live pricing** — fetches current prices from Woolworths & Coles on demand via the `/api/prices` route (1-hour cache).
- **Unit-price normalisation** — compares per-100g / per-100ml so different pack sizes are fairly ranked.
- **Multi-store** — Woolworths, Coles, ALDI, Amazon AU, Chemist Warehouse (the latter three are maintained manually).
- **Store toggles & sorting** — by best price, unit price, savings, or name.
- **Screenshot modal** — preview a product's source listing without leaving the page.
- **Polished UI** — Tailwind styling with `fadeUp` card animations, pixel-faithful to the design handoff.
- **Self-contained deploy** — Next.js standalone output runs as a single `node server.js` process under systemd.

---

## Tech stack

| Layer       | Choice                                   |
|-------------|------------------------------------------|
| Framework   | Next.js 16.2 (App Router, `output: 'standalone'`) |
| UI          | React 18, Tailwind CSS 3.4               |
| Language    | TypeScript 5.6                           |
| Runtime     | Node.js 18+ (20 recommended)             |
| Process mgr | systemd                                  |

---

## Project structure

```
pricehunt-au/
├── app/
│   ├── api/prices/route.ts   # Live price fetcher (Woolworths + Coles)
│   ├── layout.tsx            # Root layout & metadata
│   ├── page.tsx              # Main comparison page
│   └── globals.css           # Tailwind + animations
├── components/
│   ├── Header.tsx
│   ├── ProductCard.tsx
│   └── ScreenshotModal.tsx
├── lib/
│   ├── products.ts           # Product catalogue (manual + auto-updated prices)
│   ├── types.ts              # Shared TypeScript types
│   └── utils.ts              # Unit-price / formatting helpers
├── scripts/
│   ├── update-prices.mjs     # Refresh Woolworths/Coles prices in products.ts
│   ├── weekly-update.ps1     # Windows: update → rebuild → redeploy
│   └── register-task.ps1     # Windows Task Scheduler registration
├── install.sh                # Portable Linux installer (any distro)
├── deploy.ps1                # Windows → Raspberry Pi deploy
├── pricehunt-au.service      # Reference systemd unit
└── next.config.ts            # Standalone output + image host allowlist
```

---

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # Production build (standalone output)
npm run start        # Run the built standalone server
npm run lint
```

---

## Deploying to a Linux server

The easiest path is the bundled installer, which is distro-agnostic
(detects apt / dnf / yum / pacman / zypper), installs Node.js if needed,
builds, and registers a systemd service.

```bash
# copy the project to the server
scp -r pricehunt-au user@SERVER:~/

# on the server
cd ~/pricehunt-au
chmod +x install.sh
sudo ./install.sh
```

When it finishes it prints the live URL (default `http://<server-ip>:8001`).

**Common options:**

```bash
sudo ./install.sh --port 3000 --user www-data --app-dir /srv/pricehunt
sudo ./install.sh --no-build      # use a prebuilt .next/standalone
sudo ./install.sh --help
```

**Manage the service:**

```bash
sudo systemctl status  pricehunt-au
sudo systemctl restart pricehunt-au
sudo journalctl -u pricehunt-au -f
```

### Deploying to the Raspberry Pi (from Windows)

```powershell
cd "e:\Dan\Claude\Price Comparison Platform\pricehunt-au"
.\deploy.ps1            # builds, packages, ships to 192.168.1.104, restarts service
```

---

## Updating prices

Woolworths and Coles prices can be refreshed automatically; ALDI, Amazon AU,
and Chemist Warehouse are maintained manually in `lib/products.ts`.

```bash
node scripts/update-prices.mjs
```

Exit codes: `0` = no changes, `1` = prices updated (rebuild/redeploy needed),
`2` = fatal error.

On Windows this is automated end-to-end (fetch → rebuild → redeploy) via
`scripts/weekly-update.ps1`, schedulable with `scripts/register-task.ps1`.

---

## Configuration

| Env var    | Default     | Purpose                          |
|------------|-------------|----------------------------------|
| `PORT`     | `8001`      | HTTP listen port                 |
| `HOSTNAME` | `0.0.0.0`   | Bind address (all interfaces)    |
| `NODE_ENV` | `production`| Runtime mode                     |

Allowed remote image hosts are configured in `next.config.ts`
(Woolworths and Coles CDNs).

---

## License

Licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE) for the full text.
