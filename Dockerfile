# ---- deps ----------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl          # ← added
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts             # ← was: RUN npm ci

# ---- build ------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl          # ← added
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime ------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl          # ← added

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# ...rest unchanged