# =========================================================================
# DOCKERFILE ULTRA-LEVE: FRONTEND PAINEL WEB MDM
# Build estatico pre-compilado localmente (Zero consumo de CPU/RAM/Disco na VPS)
# =========================================================================
FROM nginx:alpine

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
