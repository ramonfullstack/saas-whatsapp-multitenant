FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install
# Rebuild bcrypt for Alpine's native arch
RUN npm rebuild bcrypt --build-from-source

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json ./tsconfig.json
USER nestjs
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
