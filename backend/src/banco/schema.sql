-- =========================================================================
-- ESQUEMA DO BANCO DE DADOS: MDM CORPORATIVO (250 TABLETS ANDROID)
-- PostgreSQL 14+
-- =========================================================================

-- Extensões úteis para identificadores únicos e funções criptográficas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de Políticas Globais e Grupos de Dispositivos
CREATE TABLE IF NOT EXISTS politicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL DEFAULT 'Política Padrão Frota',
    permitir_camera BOOLEAN NOT NULL DEFAULT TRUE,
    bloquear_usb BOOLEAN NOT NULL DEFAULT FALSE,
    permitir_reset_fabrica BOOLEAN NOT NULL DEFAULT FALSE,
    modo_quiosque_app VARCHAR(255) DEFAULT NULL,
    habilitar_modo_quiosque BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserção de política inicial
INSERT INTO politicas (nome, permitir_camera, bloquear_usb, permitir_reset_fabrica, habilitar_modo_quiosque)
VALUES ('Política Padrão Tablets', TRUE, TRUE, FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- Tabela Principal de Dispositivos da Frota
CREATE TABLE IF NOT EXISTS dispositivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_serie VARCHAR(100) UNIQUE NOT NULL,
    mac VARCHAR(50) DEFAULT NULL,
    modelo VARCHAR(100) DEFAULT 'Tablet Android',
    versao_so VARCHAR(50) DEFAULT 'Android',
    status_conexao VARCHAR(20) NOT NULL DEFAULT 'desconectado', -- 'conectado' | 'desconectado'
    bateria INT DEFAULT 100,
    esta_carregando BOOLEAN DEFAULT FALSE,
    sinal_wifi_rssi INT DEFAULT -50,
    ssid_wifi VARCHAR(100) DEFAULT NULL,
    app_foco VARCHAR(255) DEFAULT NULL,
    memoria_ram_livre_mb BIGINT DEFAULT 0,
    armazenamento_livre_mb BIGINT DEFAULT 0,
    politica_id UUID REFERENCES politicas(id) ON DELETE SET NULL,
    ultimo_contato TIMESTAMPTZ DEFAULT NOW(),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Fila e Histórico de Comandos Remotos
CREATE TABLE IF NOT EXISTS comandos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    tipo_comando VARCHAR(80) NOT NULL, -- 'bloquear_tela_imediata', 'reiniciar_aparelho', 'modo_quiosque', etc.
    parametros JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente', -- 'pendente', 'enviado', 'executado', 'falha', 'rejeitado'
    resposta JSONB DEFAULT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executado_em TIMESTAMPTZ DEFAULT NULL
);

-- Tabela de Histórico Contínuo de Telemetria (Time-Series)
CREATE TABLE IF NOT EXISTS logs_telemetria (
    id BIGSERIAL PRIMARY KEY,
    dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    bateria INT NOT NULL,
    sinal_wifi_rssi INT NOT NULL,
    memoria_ram_livre_mb BIGINT NOT NULL,
    armazenamento_livre_mb BIGINT NOT NULL,
    app_foco VARCHAR(255) DEFAULT NULL,
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Otimização para Consultas em Tempo Real
CREATE INDEX IF NOT EXISTS idx_dispositivos_numero_serie ON dispositivos(numero_serie);
CREATE INDEX IF NOT EXISTS idx_dispositivos_status ON dispositivos(status_conexao);
CREATE INDEX IF NOT EXISTS idx_dispositivos_ultimo_contato ON dispositivos(ultimo_contato DESC);
CREATE INDEX IF NOT EXISTS idx_comandos_dispositivo_status ON comandos(dispositivo_id, status);
CREATE INDEX IF NOT EXISTS idx_comandos_criado_em ON comandos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_telemetria_dispositivo_data ON logs_telemetria(dispositivo_id, registrado_em DESC);
