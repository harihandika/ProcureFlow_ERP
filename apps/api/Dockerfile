# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency resolution
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY prisma ./prisma

# Install all dependencies
RUN npm ci

# Copy source code
COPY apps/api ./apps/api

# Generate Prisma Client & Build NestJS
RUN npm run prisma:generate -w @procureflow/api
RUN npm run api:build

# Runtime stage keeps the Prisma CLI for one-off production migrations.
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/web/package*.json ./apps/web/
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
