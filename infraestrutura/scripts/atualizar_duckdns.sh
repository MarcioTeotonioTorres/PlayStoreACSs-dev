#!/bin/bash
# =========================================================================
# SCRIPT DE ATUALIZAÇÃO AUTOMÁTICA DE IP NO DUCKDNS
# =========================================================================

# Carregar variáveis do .env caso existam
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi

DOMINIO="${DUCKDNS_SUBDOMINIO:-mdm-corporativo}"
TOKEN="${DUCKDNS_TOKEN:-seu-token-duckdns}"

if [ "$TOKEN" != "seu-token-duckdns" ]; then
  RESPOSTA=$(curl -s "https://www.duckdns.org/update?domains=${DOMINIO}&token=${TOKEN}&ip=")
  if [ "$RESPOSTA" = "OK" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - DuckDNS atualizado com sucesso: ${DOMINIO}.duckdns.org" >> /var/log/duckdns.log
  else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Falha ao atualizar DuckDNS: $RESPOSTA" >> /var/log/duckdns.log
  fi
fi
