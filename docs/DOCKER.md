# Docker deployment

Run LifePool **online** with Docker: static app (nginx) + grid keeper agents in a loop.

## Quick start (local / VPS)

```bash
cp .env.example .env   # add KEEPER_PRIVATE_KEY + RPC URL
docker compose up -d --build
```

| Service | URL / role |
|---------|------------|
| **web** | http://localhost:8080 |
| **keepers** | Oracle + rewards + grid DCA/harvest every 4h (default) |

Logs:

```bash
docker compose logs -f web
docker compose logs -f keepers
```

Stop:

```bash
docker compose down
```

## Environment

Set in `.env` (used by `keepers` service):

```env
KEEPER_PRIVATE_KEY=0x...
BASE_SEPOLIA_RPC_URL=https://...
VITE_CHAIN_ID=84532
VITE_BASE_SEPOLIA_RPC_URL=https://...
VITE_APP_URL=https://your-domain.com
VITE_B3OS_OPERATOR_ADDRESS=0xaaf620ee9e2a805323BF7363992E33e4412be3FB
KEEPER_INTERVAL_SEC=14400
```

`VITE_*` build args for **web** are taken from `.env` when you run `docker compose up --build`.  
After deploying to a public URL, set `VITE_APP_URL` to that URL and rebuild the web image.

## Run web only or keepers only

```bash
docker compose up -d web --build          # investor UI only
docker compose up -d keepers --build      # agents only
```

## Cloud options

### Railway / Render / Fly.io

1. Connect GitHub repo `Laszlo23/lifepool`
2. Use **Docker Compose** or deploy `Dockerfile` for web
3. Add a second service from `Dockerfile.keepers` for agents
4. Set env vars in the dashboard (same as `.env`)

**Railway:** New Project → Deploy from GitHub → detect `docker-compose.yml`  
**Fly.io:** `fly launch` then `fly deploy` (may split web + keepers into two apps)

### Cheap VPS (Hetzner, DigitalOcean, etc.)

```bash
git clone https://github.com/Laszlo23/lifepool.git
cd lifepool
cp .env.example .env && nano .env
docker compose up -d --build
```

Point a domain at the server IP, set `VITE_APP_URL`, rebuild web.

### What Docker does *not* run

- `/api/*` serverless (Farcaster Frame) — static nginx only
- Foundry / contract deploy — use `npm run contracts:deploy` locally

## Health

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
docker compose exec keepers npm run keeper:grid   # one-off grid cycle
```

See also [KEEPERS.md](./KEEPERS.md) and [4EVERLAND.md](./4EVERLAND.md).
