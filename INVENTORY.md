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
| Bulk upload items / download the template | ✔ | ✔ | ✔ |
| Create invoices | ✘ | ✔ | ✘ |
| View invoices, mark paid / pending, flag as error | ✔ | ✔ | ✘ |
| Delete invoices | ✔ | ✘ | ✘ |
| Publish items to the store, see selling prices & margins | ✔ | ✔ | ✘ |
| Exchange rate & default margin (Settings) | ✔ | ✘ | ✘ |
| Manage all accounts (roles, passwords, disable) | ✔ | ✘ | ✘ |

## Bulk upload (all staff)
**Inventory → Bulk upload**: download the template, fill one item per row, upload. Columns: part number, English
and Chinese name, category, description, unit, quantity, low-stock alert, cost (¥), price (₦), profit margin %,
can-be-invoiced, **engine numbers** (comma-separated), and optional **linked-to** + link quantity. Each new item is
logged in the stock log as "Bulk upload". Existing part numbers are skipped, or — with *Update existing items* ticked —
have their details refreshed (blank cells never wipe data, and quantity is never changed). Price and margin columns are
ignored for Yuchai staff. Limits: 1,000 rows and 5 MB per file; every row is saved independently so one bad row can't
block the rest, and problems are listed per row.

## Pricing: yuan → naira with margins
Admin sets the **exchange rate** (₦ per ¥1) and a **default profit margin** under *Settings*.
Store price = cost (¥) × rate × (1 + margin %), rounded to the naira; an item's own margin overrides the default.
Items with no cost use their manual ₦ price. If the rate is unset, cost-priced items are skipped on publish (not priced at ₦0).
Saving new settings marks cost-priced items "Changed" so they can be re-published. Yuchai staff see costs and stock only.

## Linked items
Tick **This is a linked item**, pick the item it is linked with and the quantity needed per unit. The item only counts
as in stock when the linked item can cover it: sellable = min(own stock, ⌊linked stock ÷ needed⌋). If the requirement
isn't met, a new item is **not** created on the store, and one already there is updated as out of stock. Links are one
level deep (no chains), an item that others link to can't be deleted, and selling a linked item does not automatically
consume the linked item's stock — record that with a normal stock-out.

## Invoices
Two styles, chosen per invoice: **ATOZEE logo only** (letterhead with address on the right) and
**ATOZEE + YUCHAI logos** (YC Diesel logo, address underneath, "RECEIVED" box). Both follow the
existing paper format: customer, address, job description, TIN, ref no., items, subtotal, VAT 7.5%,
grand total, amount in words, bank details, signatory. Numbers are `yyyymmdd-NNN` in Lagos time
(`20260929-001`, `-002`, ...), allocated atomically so they never collide or skip. Lines can come
from inventory (optionally deducting stock, logged as "Invoice <no>") or be custom lines such as
delivery / lump sums. Print with the **Print** button (Save as PDF in the print dialog).
Invoices have a **payment status** (Pending/Paid — click the badge in the list or use the buttons on the invoice) and
can be **flagged as an error** with a reason. Only the global admin can delete, optionally returning the stock the invoice
took (logged as "Invoice <no> deleted"; invoices made before this feature can't return stock). The list filters by status,
style, text (number / customer / job) and date range.
Letterhead, bank and signatory text live in `lib/inv-company.ts`; logos in `public/invoice/`.
The signature itself is left blank above the printed name, to be signed by hand.

## Publishing to the store
On the inventory table, tick items and press **Publish selected**, or **Publish all matching**
(respects the current search/category/low-stock filter; optionally only items never published or
changed since). A preview shows what will be created / updated / skipped before anything is written.
Items are matched to store products by **part number**. New ones are created (active, no images);
existing ones get name, category, description, price, in-stock (and engine numbers, when the item has any) overwritten —
**images, URL slug and the hidden/active switch are never touched**. Items with no price are skipped.
The *Store* column shows Not on store / On store / Changed (edited since last publish). Max 500 per run.

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

## Note on the Excel library
Bulk upload uses the `xlsx` package. The 0.18.5 build on the public npm registry has known advisories fixed in later
SheetJS releases that are only distributed from cdn.sheetjs.com. Since every staff role can now upload, upgrade with
`npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (check cdn.sheetjs.com for the newest version) and commit
the lockfile. Uploads are already limited to 5 MB / 1,000 rows, parsed without formulas, and capped while parsing.
