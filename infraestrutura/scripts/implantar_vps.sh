#!/bin/bash
# =========================================================================
# SCRIPT DE IMPLANTAÇÃO AUTOMATIZADA DO MDM NA VPS (UBUNTU / DEBIAN)
# =========================================================================

set -e

echo "========================================================="
echo "   INICIANDO IMPLANTAÇÃO: MDM CORPORATIVO (250 TABLETS)  "
echo "========================================================="

# 1. Verificar permissões de root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor, execute este script como root ou com sudo."
  exit 1
fi

# 2. Atualizar pacotes do sistema
echo "[1/6] Atualizando pacotes do sistema..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git cron ca-certificates gnupg lsb-release

# 3. Instalar Docker e Docker Compose (se não estiver instalado)
if ! command -v docker &> /dev/null; then
  echo "[2/6] Instalando Docker Engine..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
  echo "[2/6] Docker já instalado no sistema."
fi

# 4. Configurar variáveis de ambiente
echo "[3/6] Configurando variáveis de ambiente..."
if [ ! -f .env ]; then
  cp .env.exemplo .env
  echo "Arquivo .env criado com base em .env.exemplo."
fi

# 5. Configurar atualização periódica do DuckDNS no Cron
echo "[4/6] Configurando renovação automática de IP do DuckDNS..."
chmod +x scripts/atualizar_duckdns.sh
(crontab -l 2>/dev/null | grep -v "atualizar_duckdns.sh"; echo "*/5 * * * * $(pwd)/scripts/atualizar_duckdns.sh >/dev/null 2>&1") | crontab -

# 6. Compilar o APK do Android se necessário
echo "[5/6] Verificando compilação do APK corporativo..."
mkdir -p ../backend/public/apk
if [ ! -s ../backend/public/apk/mdm-dpc.apk ] || grep -q "PLACEHOLDER" ../backend/public/apk/mdm-dpc.apk 2>/dev/null; then
  echo "Compilando o APK Android real através do container Android Builder..."
  docker compose -f docker-compose.yml run --rm compilador_apk
fi

# 7. Inicializar os containers com Docker Compose
echo "[6/6] Subindo serviços no Docker Compose (PostgreSQL, Mosquitto, Backend, Frontend, Caddy)..."
docker compose -f docker-compose.yml up -d --build

echo "========================================================="
echo "   IMPLANTAÇÃO CONCLUÍDA COM SUCESSO!                    "
echo "========================================================="
echo "Painel Web e API disponíveis através do seu domínio DuckDNS:"
echo "https://$(grep DOMINIO_DUCKDNS .env | cut -d '=' -f2)"
echo "Porta MQTTS (TLS 8883) liberada para os 250 Tablets Android."
echo "========================================================="
