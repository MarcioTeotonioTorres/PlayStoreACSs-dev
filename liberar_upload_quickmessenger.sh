#!/bin/bash
# =========================================================================
# LIBERAÇÃO DE UPLOAD ATÉ 1 GB NO CONTAINER PROXY (QUICKMESSENGER2.0)
# =========================================================================

set -e

echo "=== [1/5] Verificando container QuickMessenger2.0 ==="
if ! docker ps | grep -q "QuickMessenger2.0"; then
  echo "ERRO: Container QuickMessenger2.0 não está em execução!"
  exit 1
fi

echo "=== [2/5] Criando backup das configurações do Nginx ==="
docker exec QuickMessenger2.0 cp /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak.$(date +%s) 2>/dev/null || true
docker exec QuickMessenger2.0 cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak.$(date +%s) 2>/dev/null || true

echo "=== [3/5] Aplicando client_max_body_size 1024M no Nginx do QuickMessenger2.0 ==="
# Remove limites antigos se existirem
docker exec QuickMessenger2.0 sed -i '/client_max_body_size/d' /etc/nginx/conf.d/default.conf 2>/dev/null || true
docker exec QuickMessenger2.0 sed -i '/client_max_body_size/d' /etc/nginx/nginx.conf 2>/dev/null || true

# Injeta limite de 1024M no bloco do mdmplaystoreacs.duckdns.org
docker exec QuickMessenger2.0 sed -i '/server_name mdmplaystoreacs.duckdns.org;/a \    client_max_body_size 1024M;\n    client_body_buffer_size 16M;\n    proxy_read_timeout 600s;\n    proxy_connect_timeout 600s;\n    proxy_send_timeout 600s;' /etc/nginx/conf.d/default.conf

# Injeta limite de 1024M globalmente no nginx.conf
docker exec QuickMessenger2.0 sed -i '/http {/a \    client_max_body_size 1024M;\n    client_body_buffer_size 16M;\n    proxy_read_timeout 600s;\n    proxy_connect_timeout 600s;\n    proxy_send_timeout 600s;' /etc/nginx/nginx.conf 2>/dev/null || true

echo "=== [4/5] Validando sintaxe do Nginx ==="
docker exec QuickMessenger2.0 nginx -t

echo "=== [5/5] Reiniciando containers para aplicar imediatamente ==="
docker restart QuickMessenger2.0
docker compose restart frontend backend

echo "========================================================="
echo "   SUCESSO! LIMITE DE 1 GB LIBERADO NO PROXY SSL         "
echo "========================================================="
echo "Configuração ativa no container QuickMessenger2.0:"
docker exec QuickMessenger2.0 grep -n "client_max_body_size" /etc/nginx/conf.d/default.conf || true
echo "Pronto! Agora pode fazer o upload do WhatsApp Business XAPK."
