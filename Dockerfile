FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json ./

# ใช้ npm install แทน npm ci เพื่อหลีกเลี่ยงปัญหาเกี่ยวกับไฟล์ lock
RUN npm install

FROM node:20-alpine AS builder
ARG version="dev-local"

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL=/api/proxy
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ENV NEXT_PUBLIC_APP_VERSION=$version
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage Runner
FROM node:20-alpine AS runner
ARG version="dev-local"
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_APP_VERSION=$version

ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

#COPY --from=builder /app/public ./public

#COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
