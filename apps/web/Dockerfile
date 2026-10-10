# apps/web/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time environment variable for Next.js public API endpoint
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/

RUN npm ci

COPY apps/web ./apps/web

RUN npm run web:build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/web/package*.json ./apps/web/
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/next.config.mjs ./apps/web/

EXPOSE 3000

CMD ["npm", "run", "web:start"]
