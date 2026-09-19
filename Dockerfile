# ---- deps ----------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
# openssl is needed by Prisma's engines — without it Alpine falls back to a
# guessed libssl version, which can silently mismatch at runtime.
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
# --ignore-scripts: skip the postinstall (`prisma generate`) here — this
# stage only has package.json copied in yet, not prisma/schema.prisma, so
# postinstall fails outright. Generation happens explicitly in the builder
# stage below, once the full source is present.
RUN npm ci --ignore-scripts

# ---- build ------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime ------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Required at runtime too — this is the process that actually executes
# Prisma queries against Postgres once the app is serving traffic.
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# The Prisma CLI itself (not just the generated @prisma/client, which is
# already copied above) — needed so the entrypoint below can run
# `prisma migrate deploy` against the production database on container
# startup, using the exact same internal DATABASE_URL the app already
# connects with. This avoids needing a direct connection from outside
# Dokploy's network (e.g. an SSH tunnel from a developer's machine) just to
# apply migrations.
RUN npm install --no-save prisma@5.22.0

COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Defends against Windows line endings sneaking in via git on commit —
# a shell script with CRLF endings fails with "bad interpreter" in Linux.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod 755 docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
