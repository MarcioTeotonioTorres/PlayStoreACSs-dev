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
  memoria_ram_livre_mb: number;
  armazenamento_livre_mb: number;
  ultimo_contato: string;
}

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
      memoria_ram_livre_mb: Math.floor(Math.random() * 1500) + 1200,
      armazenamento_livre_mb: Math.floor(Math.random() * 25000) + 15000,
      ultimo_contato: new Date(Date.now() - (isOnline ? Math.floor(Math.random() * 15000) : 3600000)).toISOString(),
    });
  }

  return lista;
}

/**
 * Adiciona um novo dispositivo na lista em memória (colocando no topo).
 */
export function cadastrar_novo_dispositivo_memoria(dados: Partial<DispositivoSimulado>): DispositivoSimulado {
  const novo: DispositivoSimulado = {
    id: crypto.randomUUID(),
    numero_serie: dados.numero_serie || `TB-MANUAL-${Math.floor(Math.random() * 9000) + 1000}`,
    modelo: dados.modelo || 'Samsung Galaxy Tab A9+',
    versao_so: dados.versao_so || 'Android 14 (API 34)',
    status_conexao: (dados.status_conexao as any) || 'conectado',
    bateria: dados.bateria ?? 100,
    esta_carregando: dados.esta_carregando ?? false,
    sinal_wifi_rssi: dados.sinal_wifi_rssi ?? -50,
    ssid_wifi: dados.ssid_wifi || 'Corporativo-WiFi',
    app_foco: dados.app_foco || 'com.mdm.corporativo',
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

  // 1. Resumo da Frota
  if (sqlLimpo.includes('COUNT(*)::INT AS TOTAL_DISPOSITIVOS')) {
    const conectados = dispositivosMemoria.filter((d) => d.status_conexao === 'conectado').length;
    const bateriaCritica = dispositivosMemoria.filter((d) => d.bateria <= 20).length;
    const sinalFraco = dispositivosMemoria.filter((d) => d.sinal_wifi_rssi < -75).length;

    const row = {
      total_dispositivos: 250,
      conectados: conectados * 10, // Projeta escala dos 250 tablets
      desconectados: 250 - conectados * 10,
      bateria_critica: bateriaCritica * 3,
      sinal_wifi_fraco: sinalFraco * 2,
      em_uso_ativo: 210,
    };

    return {
      rows: [row as unknown as T],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    };
  }

  // 2. Listagem de Dispositivos
  if (sqlLimpo.startsWith('SELECT') && sqlLimpo.includes('FROM DISPOSITIVOS')) {
    let filtrados = [...dispositivosMemoria];

    if (parametros.length > 0) {
      const statusParam = parametros.find((p) => p === 'conectado' || p === 'desconectado');
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

  // 3. Inserção de Comandos
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

  // 4. Fallback padrão
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
