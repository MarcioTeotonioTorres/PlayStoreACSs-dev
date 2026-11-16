# =========================================================================
# DOCKERFILE MULTI-STAGE: FRONTEND PAINEL WEB MDM (REACT + VITE)
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Servidor leve Nginx para distribuir os arquivos estáticos do dashboard
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
