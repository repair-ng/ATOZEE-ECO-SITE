# Inventory system (`/inventory`)

Web-based, login-protected inventory for Yuchai and Atozee staff. Runs inside
this Next.js app and uses the same Postgres database as the store.

## Setup
1. Add to `.env` / `.env.local` (see `.env.local.example`):
   - `INVENTORY_SESSION_SECRET` — `openssl rand -hex 32` (required)
   - `INVENTORY_BOOTSTRAP_ADMIN_USERNAME` / `INVENTORY_BOOTSTRAP_ADMIN_PASSWORD` (password 10+ chars)
2. `npm run db:migrate` (applies `20261011090000_inventory_system`).
3. Open `/inventory/login` and sign in with the bootstrap credentials — this creates the
   first Global Admin (only works while there are zero inventory users). Then remove the
   two bootstrap variables.
4. Go to **Users** and create staff accounts. Yuchai accounts start in Chinese.

## Roles
| | Global admin | Atozee staff | Yuchai staff |
|---|:-:|:-:|:-:|
| View / add / edit inventory, stock in & out, delete | ✔ | ✔ | ✔ |
| View stock log (filter by type, user, date, text) | ✔ | ✔ | ✔ |
| Create / view invoices | ✔ | ✔ | ✘ |
| Manage all accounts (roles, passwords, disable) | ✔ | ✘ | ✘ |

## Rules built in
- Quantity only changes via **Stock in / Stock out**, each with a required reason; every
  change (and item creation/deletion) is written to the log with who, when, and the balance after.
- Stock can never go below zero (checked atomically in the database).
- Deleting an item is a soft delete + a REMOVED log entry, so history is never lost.
- Language: **中文 / EN** switch in the header and on the login page; saved per account.

## Security notes
- No new npm packages. Passwords use Node's built-in scrypt; sessions are HMAC-signed,
  httpOnly, SameSite=Lax cookies (12h) tied to a per-user `sessionVersion`, so disabling an
  account or changing its password/role signs it out immediately.
- All DB access is through Prisma (parameterised). All input is validated with zod
  (types, lengths, ranges); request bodies are size-capped; lists are paginated (max 100).
- Mutating requests must come from the same origin (CSRF); login is rate-limited per IP and
  per username (in-memory, single instance — move to Redis if you scale out).
- Behind a reverse proxy, make sure it forwards `Host`/`X-Forwarded-Host` and `X-Forwarded-For`
  (or set `INVENTORY_ALLOWED_ORIGINS`).
