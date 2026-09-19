# AToZEE v2

Self-hosted rebuild of the AToZEE catalog/quote/checkout app: Dokploy + Postgres + MinIO,
real user accounts, delivery-vs-pickup pricing, red/blue rebrand, and engine-number catalog search.

## Stack

- Next.js 14 (App Router), TypeScript
- Prisma → self-hosted Postgres
- MinIO (S3-compatible) for file storage
- Custom auth: bcrypt + JWT session cookies (`jose`)
- Resend for email, Paystack for payments
- Deployed via Dokploy on a Hostinger VPS

## Local development

```bash
cp .env.local.example .env.local
# fill in AUTH_JWT_SECRET, ADMIN_SESSION_SECRET, ADMIN_PASSWORD, MINIO_ACCESS_KEY/SECRET_KEY
# at minimum to run locally. Paystack/Resend keys are only needed to exercise those flows.

# Prisma only auto-loads a file literally named `.env` — copy your filled-in
# .env.local over so both Prisma and Next see the same values:
cp .env.local .env          # mac/linux
# Copy-Item .env.local .env # PowerShell

docker compose up -d postgres minio
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Visit `http://localhost:3000`. Staff area is at `/admin/login` (uses `ADMIN_PASSWORD`, not a
regular user account).

### Generating secrets

`AUTH_JWT_SECRET` and `ADMIN_SESSION_SECRET` aren't issued by anyone — they're random strings you
generate yourself, used only to sign cookies:

```bash
openssl rand -hex 32
```

Run it twice, once for each. `ADMIN_PASSWORD` is different: it's a real password you choose,
typed by staff at `/admin/login`.

### Resetting a broken local Postgres/MinIO

Postgres and MinIO only apply their root credentials the *first* time they initialize an empty
data volume. If you've changed `.env` credentials after already running `docker compose up` once,
the old credentials are still what's on disk. Fix:

```bash
docker compose down -v   # -v removes the volumes, forcing a clean re-init
docker compose up -d postgres minio
```

## Deploying to Dokploy

1. Push this repo to GitHub.
2. In Dokploy, create two **services** first (not part of `docker-compose.yml`, which is dev-only):
   - **Postgres** (Dokploy's managed Postgres service) → gives you a `DATABASE_URL`.
   - **MinIO** (Dokploy's managed MinIO/S3-compatible service, or a generic Docker service using
     the `quay.io/minio/minio` image) → gives you an endpoint + access/secret keys.
3. Create an **application** in Dokploy pointing at this GitHub repo. Dokploy builds using the
   included `Dockerfile` on every push.
4. Set all environment variables from `.env.local.example` in the Dokploy app's env settings,
   pointing `DATABASE_URL` and the `MINIO_*` vars at the services created in step 2.
5. Run migrations against the production database once:
   ```bash
   DATABASE_URL="<prod-url>" npx prisma migrate deploy
   ```
6. Point your domain/DNS at the Dokploy app; Dokploy handles TLS via Traefik/Let's Encrypt.

## Assets still needed (see project breakdown)

- `public/logo.png` — the AToZEE wordmark (A/ZEE red, To blue). Until supplied, the header renders
  a text-based fallback (`components/SiteHeader.tsx`), and `lib/site-config.ts` has placeholder
  hex values to swap once the PNG is sampled.
- `public/engine-plate-example.png` — reference photo/diagram of a Yuchai engine data plate.
  Until supplied, `components/EnginePlateHelpModal.tsx` shows a text placeholder.
- Real delivery rate table — seed data only has Lagos/Ogun; add the rest via `/admin/delivery`.

## Open decisions carried over from the breakdown

- **Auth approach**: implemented as custom bcrypt+JWT per the recommendation.
- **Delivery granularity**: state-level (`delivery_rates.state` is unique) — move to a
  state+city composite key if city-level pricing is needed later.
- **File storage**: MinIO is wired up in `lib/storage.ts` but there's no admin product-image
  upload UI yet — manage `Product.images` via Prisma Studio or the seed script for now.

## What's not built yet

- Product-image upload UI in an admin products page (use `npx prisma studio` to manage products).
- Automated tests.
- Final red/blue hex values and typography once the logo is in hand.
