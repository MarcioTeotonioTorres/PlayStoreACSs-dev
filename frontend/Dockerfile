# =========================================================================
# DOCKERFILE MULTI-STAGE: FRONTEND PAINEL WEB MDM (REACT + VITE)
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Servidor leve Nginx para distribuir os arquivos estáticos do dashboard
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
