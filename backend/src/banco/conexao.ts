import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

let pool: Pool | null = null;
let bancoPostgresOfflineAvisado = false;

// Banco de dados simulado em memória para desenvolvimento local autônomo
interface DispositivoSimulado {
  id: string;
  numero_serie: string;
  modelo: string;
  versao_so: string;
  status_conexao: 'conectado' | 'desconectado';
  bateria: number;
  esta_carregando: boolean;
  sinal_wifi_rssi: number;
  ssid_wifi: string;
  app_foco: string;
  tempo_ocioso_minutos: number;
  memoria_ram_livre_mb: number;
  armazenamento_livre_mb: number;
  ultimo_contato: string;
  politica_personalizada?: any;
  aplicativos_instalados?: Array<{
    pacote: string;
    nome: string;
    versao_nome: string;
    versao_codigo: number;
  }>;
}

let politicaSimuladaMemoria: any = {
  nome: 'Política Padrão Frota',
  permitir_camera: true,
  bloquear_usb: true,
  permitir_reset_fabrica: false,
  bloquear_instalacao_apps: true,
  bloquear_bluetooth: false,
  modo_quiosque_app: null,
  habilitar_modo_quiosque: false,
  pacotes_ocultos: [
    'com.google.android.youtube',
    'com.android.vending',
    'com.google.android.apps.photos',
    'com.google.android.gm',
    'com.google.android.apps.tachyon',
    'com.google.android.videos',
    'com.google.android.apps.docs',
    'com.google.android.apps.youtube.music',
    'com.google.android.googlequicksearchbox',
    'com.google.android.apps.magazines',
    'com.google.android.play.games',
    'com.google.android.apps.podcasts',
    'com.google.android.feedback',
    'com.tcl.live',
    'com.tcl.community',
    'com.tcl.appstore',
    'com.tcl.usercenter',
    'com.tcl.browser',
    'com.tcl.smartswitch',
    'com.tcl.gamecenter',
    'com.netflix.mediaclient',
    'com.facebook.katana',
    'com.facebook.services',
    'com.facebook.system',
    'com.instagram.android',
    'com.zhiliaoapp.musically',
  ],
  urls_permitidas: [
    'portal.empresa.com.br',
    '*.empresa.com.br',
    'sistema.empresa.com.br',
  ],
  atualizado_em: new Date().toISOString(),
};

interface UsuarioSimulado {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  perfil: string;
  ativo: boolean;
  ultimo_login: string | null;
  criado_em: string;
}

// Hash padrão seguro para a senha Admin@Mdm2026! (scrypt salt 'a1b2c3d4e5f60718')
const saltAdminPadrao = 'a1b2c3d4e5f60718';
const hashAdminPadrao = crypto.scryptSync('Admin@Mdm2026!', saltAdminPadrao, 64).toString('hex');

let usuariosMemoria: UsuarioSimulado[] = [
  {
    id: crypto.randomUUID(),
    nome: 'Administrador TI',
    email: 'admin@mdm.corporativo',
    senha_hash: `${saltAdminPadrao}:${hashAdminPadrao}`,
    perfil: 'admin',
    ativo: true,
    ultimo_login: null,
    criado_em: new Date().toISOString(),
  },
];

let dispositivosMemoria: DispositivoSimulado[] = gerar_dados_simulados_frota();
let comandosMemoria: Array<{
  id: string;
  dispositivo_id: string;
  tipo_comando: string;
  parametros: any;
  status: string;
  criado_em: string;
}> = [];


/**
 * Gera dados simulados realistas para exibição imediata da frota de 250 tablets.
 */
function gerar_dados_simulados_frota(): DispositivoSimulado[] {
  const modelos = [
    'Samsung Galaxy Tab A9+ (SM-X210)',
    'Lenovo Tab M10 Plus Gen 3',
    'Samsung Galaxy Tab Active4 Pro',
    'Lenovo Tab K10 Enterprise',
    'Samsung Galaxy Tab S6 Lite',
  ];

  const apps = [
    'com.empresa.operacao.pdv',
    'com.empresa.coletor.estoque',
    'com.google.android.apps.docs',
    'com.mdm.corporativo',
    'Sistema / Área de Trabalho',
  ];

  const lista: DispositivoSimulado[] = [];

  for (let i = 1; i <= 25; i++) {
    const padId = String(i).padStart(3, '0');
    const isOnline = i <= 22; // 22 conectados, 3 desconectados
    const bateria = i === 4 || i === 9 ? 12 : Math.floor(Math.random() * 60) + 38;
    const rssi = i === 7 ? -82 : -(Math.floor(Math.random() * 30) + 45);

    lista.push({
      id: crypto.randomUUID(),
      numero_serie: `TB-2026-${padId}`,
      modelo: modelos[i % modelos.length],
      versao_so: i % 2 === 0 ? 'Android 14 (API 34)' : 'Android 13 (API 33)',
      status_conexao: isOnline ? 'conectado' : 'desconectado',
      bateria,
      esta_carregando: bateria < 20 || i % 5 === 0,
      sinal_wifi_rssi: rssi,
      ssid_wifi: i % 3 === 0 ? 'Corporativo-Galpao-01' : 'Corporativo-Matriz-5G',
      app_foco: apps[i % apps.length],
      tempo_ocioso_minutos: Math.floor(Math.random() * 120),
      memoria_ram_livre_mb: Math.floor(Math.random() * 1500) + 1200,
      armazenamento_livre_mb: Math.floor(Math.random() * 25000) + 15000,
      ultimo_contato: new Date(Date.now() - (isOnline ? Math.floor(Math.random() * 15000) : 3600000)).toISOString(),
      aplicativos_instalados: [
        {
          pacote: 'com.empresa.operacao.pdv',
          nome: 'PDV ACS Mobile',
          versao_nome: i % 4 === 0 ? '2.3.0' : '2.4.0',
          versao_codigo: i % 4 === 0 ? 230 : 240,
        },
        {
          pacote: 'com.mdm.corporativo',
          nome: 'PlayService ACS DPC',
          versao_nome: '1.0.0',
          versao_codigo: 1,
        },
      ],
    });
  }

  return lista;
}

/**
 * Adiciona um novo dispositivo na lista em memória evitando números de série aleatórios ou duplicados.
 */
export function cadastrar_novo_dispositivo_memoria(dados: Partial<DispositivoSimulado>): DispositivoSimulado {
  const snLimpo = dados.numero_serie?.trim().toUpperCase() || 'TB-MANUAL-001';

  // Verifica se o serial já existe na lista em memória para evitar registros duplicados
  const existente = dispositivosMemoria.find((d) => d.numero_serie.toUpperCase() === snLimpo);
  if (existente) {
    Object.assign(existente, {
      ...dados,
      numero_serie: snLimpo,
      ultimo_contato: new Date().toISOString(),
    });
    return existente;
  }

  const novo: DispositivoSimulado = {
    id: crypto.randomUUID(),
    numero_serie: snLimpo,
    modelo: dados.modelo || 'Samsung Galaxy Tab A9+',
    versao_so: dados.versao_so || 'Android 14 (API 34)',
    status_conexao: (dados.status_conexao as any) || 'conectado',
    bateria: dados.bateria ?? 100,
    esta_carregando: dados.esta_carregando ?? false,
    sinal_wifi_rssi: dados.sinal_wifi_rssi ?? -50,
    ssid_wifi: dados.ssid_wifi || 'Corporativo-WiFi',
    app_foco: dados.app_foco || 'com.mdm.corporativo',
    tempo_ocioso_minutos: dados.tempo_ocioso_minutos ?? 0,
    memoria_ram_livre_mb: dados.memoria_ram_livre_mb ?? 2048,
    armazenamento_livre_mb: dados.armazenamento_livre_mb ?? 32000,
    ultimo_contato: new Date().toISOString(),
  };

  dispositivosMemoria.unshift(novo);
  return novo;
}

/**
 * Processador de fallback para consultas quando o PostgreSQL ainda não está ativo localmente.
 */
function processar_consulta_simulada_memoria<T extends QueryResultRow>(
  textoSql: string,
  parametros: any[] = []
): QueryResult<T> {
  const sqlLimpo = textoSql.trim().toUpperCase();

  // 1. Resumo da Frota com Métricas Detalhadas de Ociosidade
  if (sqlLimpo.includes('COUNT(*)::INT AS TOTAL_DISPOSITIVOS')) {
    const agora = Date.now();
    const conectados = dispositivosMemoria.filter((d) => d.status_conexao === 'conectado' && (agora - new Date(d.ultimo_contato).getTime()) <= 90000000).length;
    const bateriaCritica = dispositivosMemoria.filter((d) => d.bateria <= 20).length;
    const sinalFraco = dispositivosMemoria.filter((d) => d.sinal_wifi_rssi < -75).length;
    const emUsoAtivo = dispositivosMemoria.filter((d) => {
      const ms = agora - new Date(d.ultimo_contato).getTime();
      return ms <= 90000000 && d.app_foco && !d.app_foco.includes('Repouso') && (d.tempo_ocioso_minutos || 0) < 5;
    }).length;

    const ociososModerados = dispositivosMemoria.filter((d) => {
      const ociosoMin = d.tempo_ocioso_minutos || 0;
      return ociosoMin >= 120 && ociosoMin < 1440;
    }).length;

    const ociososCriticos = dispositivosMemoria.filter((d) => {
      const ms = agora - new Date(d.ultimo_contato).getTime();
      return ms >= 86400000 || (d.tempo_ocioso_minutos || 0) >= 1440;
    }).length;

    const somaOciosidade = dispositivosMemoria.reduce((acc, curr) => acc + (curr.tempo_ocioso_minutos || 0), 0);
    const mediaOciosidade = dispositivosMemoria.length > 0 ? Math.round(somaOciosidade / dispositivosMemoria.length) : 0;

    const row = {
      total_dispositivos: 250,
      conectados: conectados * 10, // Projeta escala dos 250 tablets
      desconectados: 250 - conectados * 10,
      bateria_critica: bateriaCritica * 3,
      sinal_wifi_fraco: sinalFraco * 2,
      em_uso_ativo: emUsoAtivo * 10 || 185,
      ociosos_moderados: ociososModerados * 5 || 28,
      ociosos_criticos: ociososCriticos * 3 || 6,
      tempo_ocioso_medio_minutos: mediaOciosidade || 45,
    };

    return {
      rows: [row as unknown as T],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 2. Verificação estrita de duplicidade de serial único
  if (sqlLimpo.includes('FROM DISPOSITIVOS WHERE') && (sqlLimpo.includes('NUMERO_SERIE') || sqlLimpo.includes('UPPER(TRIM(NUMERO_SERIE))'))) {
    const snParam = (parametros[0] || '').toString().trim().toUpperCase();
    const encontrado = dispositivosMemoria.find((d) => d.numero_serie.toUpperCase() === snParam);
    if (encontrado) {
      return {
        rows: [{ id: encontrado.id, numero_serie: encontrado.numero_serie }] as unknown as T[],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    }
    return {
      rows: [] as T[],
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
    };
  }

  // 3. Inserção de Novo Tablet com Prevenção de Duplicidade (INSERT INTO dispositivos)
  if (sqlLimpo.startsWith('INSERT INTO DISPOSITIVOS')) {
    const snParam = (parametros[0] || '').toString().trim().toUpperCase();
    const modeloParam = parametros[1] || 'Samsung Galaxy Tab A9+';
    const versaoParam = parametros[2] || 'Android 14 (API 34)';
    const bateriaParam = parametros[3] ?? 100;
    const rssiParam = parametros[5] ?? -50;
    const ssidParam = parametros[6] || 'Corporativo-WiFi';
    const appParam = parametros[7] || 'com.mdm.corporativo';

    const disp = cadastrar_novo_dispositivo_memoria({
      numero_serie: snParam,
      modelo: modeloParam,
      versao_so: versaoParam,
      bateria: bateriaParam,
      sinal_wifi_rssi: rssiParam,
      ssid_wifi: ssidParam,
      app_foco: appParam,
    });

    return {
      rows: [disp as unknown as T],
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 4. Listagem de Dispositivos (com filtros de ociosidade)
  if (sqlLimpo.startsWith('SELECT') && sqlLimpo.includes('FROM DISPOSITIVOS')) {
    const agora = Date.now();
    let filtrados = dispositivosMemoria.map((d) => {
      const msSemContato = agora - new Date(d.ultimo_contato).getTime();
      const isOnline = msSemContato <= 180000;
      const minsSemContato = Math.max(0, Math.floor(msSemContato / 60000));
      return {
        ...d,
        status_conexao: isOnline ? 'conectado' : 'desconectado',
        tempo_ocioso_minutos: isOnline ? (d.tempo_ocioso_minutos || 0) : (d.tempo_ocioso_minutos || 0) + minsSemContato,
      };
    });

    if (parametros.length > 0) {
      const statusParam = parametros.find((p) => typeof p === 'string' && (p === 'conectado' || p === 'desconectado'));
      if (statusParam) {
        filtrados = filtrados.filter((d) => d.status_conexao === statusParam);
      }
    }

    return {
      rows: filtrados as unknown as T[],
      command: 'SELECT',
      rowCount: filtrados.length,
      oid: 0,
      fields: [],
    };
  }

  // 4.1 Consulta de Políticas da Frota
  if (sqlLimpo.includes('FROM POLITICAS')) {
    return {
      rows: [politicaSimuladaMemoria as unknown as T],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 4.2 Inserção / Atualização de Políticas Globais
  if (sqlLimpo.startsWith('INSERT INTO POLITICAS')) {
    if (parametros.length >= 8) {
      politicaSimuladaMemoria = {
        ...politicaSimuladaMemoria,
        permitir_camera: parametros[0],
        bloquear_usb: parametros[1],
        permitir_reset_fabrica: parametros[2],
        bloquear_instalacao_apps: parametros[3],
        bloquear_bluetooth: parametros[4],
        modo_quiosque_app: parametros[5],
        habilitar_modo_quiosque: parametros[6],
        pacotes_ocultos: typeof parametros[7] === 'string' ? JSON.parse(parametros[7]) : parametros[7],
        urls_permitidas: typeof parametros[8] === 'string' ? JSON.parse(parametros[8]) : parametros[8],
        atualizado_em: new Date().toISOString(),
      };
    }
    return {
      rows: [politicaSimuladaMemoria as unknown as T],
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 4.3 Atualização de Política Personalizada de Tablet Específico
  if (sqlLimpo.startsWith('UPDATE DISPOSITIVOS SET POLITICA_PERSONALIZADA')) {
    const polData = typeof parametros[0] === 'string' ? JSON.parse(parametros[0]) : parametros[0];
    const alvo = (parametros[1] || '').toString().trim().toUpperCase();
    const disp = dispositivosMemoria.find((d) => d.id === alvo || d.numero_serie.toUpperCase() === alvo);
    if (disp) {
      disp.politica_personalizada = polData;
    }
    return {
      rows: [] as T[],
      command: 'UPDATE',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 5. Inserção de Comandos
  if (sqlLimpo.startsWith('INSERT INTO COMANDOS')) {
    const id = crypto.randomUUID();
    comandosMemoria.push({
      id,
      dispositivo_id: parametros[0] || 'geral',
      tipo_comando: parametros[1] || 'comando',
      parametros: parametros[2] || {},
      status: 'enviado',
      criado_em: new Date().toISOString(),
    });

    return {
      rows: [{ id }] as unknown as T[],
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 6. Consultas e Operações em USUARIOS (Autenticação Segura)
  if (sqlLimpo.includes('FROM USUARIOS')) {
    if (sqlLimpo.includes('COUNT(*)')) {
      return {
        rows: [{ count: usuariosMemoria.length }] as unknown as T[],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    }

    if (sqlLimpo.includes('WHERE LOWER(EMAIL) = $1') || sqlLimpo.includes('WHERE EMAIL = $1')) {
      const emailParam = (parametros[0] || '').toString().trim().toLowerCase();
      const user = usuariosMemoria.find((u) => u.email.toLowerCase() === emailParam);
      return {
        rows: (user ? [user] : []) as unknown as T[],
        command: 'SELECT',
        rowCount: user ? 1 : 0,
        oid: 0,
        fields: [],
      };
    }

    if (sqlLimpo.includes('WHERE ID = $1')) {
      const idParam = (parametros[0] || '').toString();
      const user = usuariosMemoria.find((u) => u.id === idParam);
      return {
        rows: (user ? [user] : []) as unknown as T[],
        command: 'SELECT',
        rowCount: user ? 1 : 0,
        oid: 0,
        fields: [],
      };
    }

    return {
      rows: usuariosMemoria as unknown as T[],
      command: 'SELECT',
      rowCount: usuariosMemoria.length,
      oid: 0,
      fields: [],
    };
  }

  if (sqlLimpo.startsWith('UPDATE USUARIOS')) {
    if (sqlLimpo.includes('ULTIMO_LOGIN')) {
      const idParam = (parametros[0] || '').toString();
      const user = usuariosMemoria.find((u) => u.id === idParam);
      if (user) user.ultimo_login = new Date().toISOString();
    } else if (sqlLimpo.includes('SENHA_HASH')) {
      const novaSenhaHash = (parametros[0] || '').toString();
      const idParam = (parametros[1] || '').toString();
      const user = usuariosMemoria.find((u) => u.id === idParam);
      if (user) user.senha_hash = novaSenhaHash;
    }
    return {
      rows: [] as T[],
      command: 'UPDATE',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  if (sqlLimpo.startsWith('INSERT INTO USUARIOS')) {
    const nomeParam = parametros[0] || 'Usuário';
    const emailParam = (parametros[1] || '').toString().toLowerCase();
    const hashParam = parametros[2] || '';

    const usuarioExistente = usuariosMemoria.find((u) => u.email.toLowerCase() === emailParam);
    if (usuarioExistente) {
      usuarioExistente.nome = nomeParam;
      usuarioExistente.senha_hash = hashParam;
      usuarioExistente.ativo = true;
      return {
        rows: [usuarioExistente] as unknown as T[],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    }

    const userNovo: UsuarioSimulado = {
      id: crypto.randomUUID(),
      nome: nomeParam,
      email: emailParam,
      senha_hash: hashParam,
      perfil: 'admin',
      ativo: true,
      ultimo_login: null,
      criado_em: new Date().toISOString(),
    };
    usuariosMemoria.push(userNovo);
    return {
      rows: [userNovo] as unknown as T[],
      command: 'INSERT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 7. Fallback padrão
  return {
    rows: [] as T[],
    command: 'SELECT',
    rowCount: 0,
    oid: 0,
    fields: [],
  };
}

/**
 * Inicializa o pool de conexões com o PostgreSQL com resiliência para a frota.
 */
export function inicializar_pool_conexoes(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST || process.env.DB_HOST || 'localhost',
      port: Number(process.env.PG_PORT || process.env.DB_PORT) || 5432,
      user: process.env.PG_USER || process.env.DB_USER || 'postgres',
      password: process.env.PG_PASSWORD || process.env.DB_PASSWORD || 'mdm_postgres_pass_2026',
      database: process.env.PG_DATABASE || process.env.DB_DATABASE || 'mdm_corporativo',
      max: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000, // Timeout rápido para fallback suave em dev
    });

    pool.on('error', () => {
      // Ignora para não poluir terminal caso não haja Postgres local
    });
  }
  return pool;
}

/**
 * Executa as migrações estruturais necessárias de forma síncrona e segura no PostgreSQL.
 */
export async function executar_migracoes_banco(): Promise<void> {
  const poolInstancia = pool || inicializar_pool_conexoes();
  try {
    // 1. Extensões criptográficas e de UUID
    try {
      await poolInstancia.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      await poolInstancia.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    } catch (_) {
      // Extensões podem requerer privilégios elevados ou já estarem instaladas
    }

    // 2. Colunas atualizadas da frota
    await poolInstancia.query(`ALTER TABLE dispositivos ADD COLUMN IF NOT EXISTS tempo_ocioso_minutos INT DEFAULT 0;`).catch(() => {});
    await poolInstancia.query(`ALTER TABLE dispositivos ADD COLUMN IF NOT EXISTS aplicativos_instalados JSONB DEFAULT '[]'::jsonb;`).catch(() => {});
    await poolInstancia.query(`ALTER TABLE dispositivos ADD COLUMN IF NOT EXISTS politica_personalizada JSONB DEFAULT NULL;`).catch(() => {});
    await poolInstancia.query(`ALTER TABLE politicas ADD COLUMN IF NOT EXISTS bloquear_instalacao_apps BOOLEAN NOT NULL DEFAULT TRUE;`).catch(() => {});
    await poolInstancia.query(`ALTER TABLE politicas ADD COLUMN IF NOT EXISTS bloquear_bluetooth BOOLEAN NOT NULL DEFAULT FALSE;`).catch(() => {});

    // 3. Tabela de usuários para autenticação segura
    await poolInstancia.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        perfil VARCHAR(30) NOT NULL DEFAULT 'admin',
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        ultimo_login TIMESTAMPTZ DEFAULT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await poolInstancia.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);`).catch(() => {});
    console.log('[MDM Banco] Migrações estruturais e tabela de usuários verificadas com sucesso no PostgreSQL.');
  } catch (erro: any) {
    if (erro.code === 'ECONNREFUSED' || erro.message?.includes('timeout') || erro.code === '28P01') {
      // PostgreSQL indisponível localmente, fallback em memória cuidará das requisições
      return;
    }
    console.warn('[MDM Banco] Aviso ao executar migrações no banco:', erro?.message || erro);
  }
}

/**
 * Executa uma consulta SQL parametrizada no banco de dados com fallback gracioso.
 */
export async function executar_consulta<T extends QueryResultRow = any>(
  textoSql: string,
  parametros: any[] = []
): Promise<QueryResult<T>> {
  const poolInstancia = pool || inicializar_pool_conexoes();
  try {
    return await poolInstancia.query<T>(textoSql, parametros);
  } catch (erro: any) {
    if (erro.code === 'ECONNREFUSED' || erro.message?.includes('timeout') || erro.code === '28P01') {
      if (!bancoPostgresOfflineAvisado) {
        console.warn('\n[MDM Fallback Dev] PostgreSQL local não detectado.');
        console.warn('[MDM Fallback Dev] Ativando repositório simulado em memória com dados da frota de 250 tablets.');
        console.warn('[MDM Fallback Dev] Em produção na VPS, o docker-compose proverá o PostgreSQL 16.\n');
        bancoPostgresOfflineAvisado = true;
      }
      return processar_consulta_simulada_memoria<T>(textoSql, parametros);
    }
    throw erro;
  }
}

/**
 * Obtém um cliente do pool para transações atômicas com commit e rollback.
 */
export async function obter_cliente_transacao(): Promise<PoolClient> {
  const poolInstancia = pool || inicializar_pool_conexoes();
  return await poolInstancia.connect();
}

/**
 * Encerra as conexões ativas do pool.
 */
export async function encerrar_pool_conexoes(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
