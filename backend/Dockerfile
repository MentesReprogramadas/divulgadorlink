FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json tsup.config.ts ./
COPY prisma ./prisma
COPY src ./src
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
  sh -c "npm ci --omit=dev && npx prisma generate" \
  && chown -R app:nodejs /app
COPY --from=build --chown=app:nodejs /app/build ./build
USER app
ENV NODE_ENV=production
CMD ["node", "build/server.js"]
