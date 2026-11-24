# =========================================================================
# DOCKERFILE ULTRA-LEVE: BACKEND FASTIFY API
# Build pre-compilado localmente (Zero compilacao TypeScript na VPS)
# =========================================================================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY dist/ ./dist/
COPY public/ ./public/

EXPOSE 3000

CMD ["node", "dist/servidor.js"]
