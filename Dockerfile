FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/anime-site/ ./artifacts/anime-site/
RUN pnpm install --frozen-lockfile

# Build frontend
FROM base AS frontend-build
WORKDIR /app
RUN pnpm --filter @workspace/anime-site run build

# Build API
FROM base AS api-build
WORKDIR /app
RUN pnpm --filter @workspace/api-server run build

# Final image
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app

# Copy API build
COPY --from=api-build /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=api-build /app/artifacts/api-server/package.json ./artifacts/api-server/package.json

# Copy frontend build into public folder (served by API)
COPY --from=frontend-build /app/artifacts/anime-site/dist ./artifacts/api-server/public

# Copy workspace files for production deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/ ./lib/
RUN pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app/artifacts/api-server
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
