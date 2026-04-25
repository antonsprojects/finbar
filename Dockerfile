# syntax=docker/dockerfile:1
# Multi-stage: Vite build + Fastify + Prisma; één container serveert / + /api

FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim AS backend-build
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
# postinstall = prisma generate — schema moet al bestaan
COPY backend/prisma ./prisma
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build
# Prune devDependencies; houd @prisma/client, voeg Prisma CLI toe voor migraties
RUN npm prune --omit=dev && npm install prisma@6.19.3
RUN npx prisma generate

FROM node:20-bookworm-slim AS runtime
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV STATIC_DIR=/app/static
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/package.json ./
COPY --from=frontend-build /app/frontend/dist /app/static

EXPOSE 3001

# Migraties bij elke start; daarna API + SPA
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
