#!/bin/bash
# =========================================================================
# SCRIPT DE AJUSTE DE LIMITE DE UPLOAD NO NGINX DO HOST (VPS)
# Corrige o erro "Status 413: Payload Too Large" para pacotes de até 1 GB
# =========================================================================

set -e

echo "========================================================="
echo "   AJUSTANDO LIMITE DE UPLOAD DO NGINX HOST (1024 MB)    "
echo "========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute este script como root ou com sudo:"
  echo "sudo bash $0"
  exit 1
fi

NGINX_CONF="/etc/nginx/nginx.conf"

if [ ! -f "$NGINX_CONF" ]; then
  echo "ERRO: Arquivo $NGINX_CONF não encontrado. O Nginx está instalado na VPS?"
  exit 1
fi

echo "[1/4] Ajustando /etc/nginx/nginx.conf..."
# Remove qualquer configuração antiga de client_max_body_size no nginx.conf
sed -i '/client_max_body_size/d' "$NGINX_CONF"

# Insere client_max_body_size 1024M dentro do bloco http {
sed -i '/http {/a \    client_max_body_size 1024M;\n    client_body_buffer_size 16M;\n    proxy_read_timeout 600s;\n    proxy_connect_timeout 600s;\n    proxy_send_timeout 600s;' "$NGINX_CONF"

echo "[2/4] Atualizando arquivos em sites-available e sites-enabled..."
# Se houver limite específico nos sites configurados, atualiza para 1024M
for site in /etc/nginx/sites-available/* /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
  if [ -f "$site" ]; then
    sed -i 's/client_max_body_size [0-9]\+[kKmMgG]\?;/client_max_body_size 1024M;/g' "$site"
  fi
done

echo "[3/4] Testando sintaxe da configuração do Nginx..."
nginx -t

echo "[4/4] Recarregando o serviço Nginx..."
systemctl reload nginx || service nginx reload

echo "========================================================="
echo "   SUCESSO! NGINX HOST CONFIGURADO PARA 1024 MB (1 GB)   "
echo "========================================================="
echo "Agora você pode fazer o upload do WhatsApp Business / XAPK no painel."
