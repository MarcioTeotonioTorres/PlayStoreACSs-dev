#!/bin/bash
# =========================================================================
# LIBERAÇÃO DE UPLOAD ATÉ 1 GB NO NGINX (SEM ERRO DE DIRETIVA DUPLICADA)
# =========================================================================

set -e

echo "=== [1/5] Restaurando/Limpando diretivas duplicadas em conf.d/default.conf ==="
docker exec QuickMessenger2.0 sed -i '/client_max_body_size/d; /client_body_buffer_size/d; /proxy_read_timeout/d; /proxy_connect_timeout/d; /proxy_send_timeout/d' /etc/nginx/conf.d/default.conf
docker exec QuickMessenger2.0 sed -i '/client_max_body_size/d; /client_body_buffer_size/d; /proxy_read_timeout/d; /proxy_connect_timeout/d; /proxy_send_timeout/d' /etc/nginx/nginx.conf

echo "=== [2/5] Injetando limites globais de 1 GB no http { } do nginx.conf ==="
docker exec QuickMessenger2.0 sed -i '/http {/a \    proxy_send_timeout 600s;' /etc/nginx/nginx.conf
docker exec QuickMessenger2.0 sed -i '/http {/a \    proxy_connect_timeout 600s;' /etc/nginx/nginx.conf
docker exec QuickMessenger2.0 sed -i '/http {/a \    proxy_read_timeout 600s;' /etc/nginx/nginx.conf
docker exec QuickMessenger2.0 sed -i '/http {/a \    client_body_buffer_size 16M;' /etc/nginx/nginx.conf
docker exec QuickMessenger2.0 sed -i '/http {/a \    client_max_body_size 1024M;' /etc/nginx/nginx.conf

echo "=== [3/5] Validando e ajustando mdm_frontend_prod ==="
docker exec mdm_frontend_prod sed -i '/client_max_body_size/d' /etc/nginx/conf.d/default.conf 2>/dev/null || true
docker exec mdm_frontend_prod sed -i '/server_name localhost;/a \    client_max_body_size 1024M;' /etc/nginx/conf.d/default.conf 2>/dev/null || true

echo "=== [4/5] Testando sintaxe do Nginx em ambos os containers ==="
docker exec QuickMessenger2.0 nginx -t
docker exec mdm_frontend_prod nginx -t

echo "=== [5/5] Reiniciando containers para aplicar 100% ==="
docker restart QuickMessenger2.0
docker compose restart frontend backend

echo "=========================================================="
echo "   SUCESSO! LIMITE DE 1024 MB APLICADO COM SINTAXE OK!   "
echo "=========================================================="
