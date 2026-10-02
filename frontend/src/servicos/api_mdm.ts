export interface MetricasFrotaResposta {
  sucesso: boolean;
  capacidade_frota: number;
  metricas: {
    total_dispositivos: number;
    conectados: number;
    desconectados: number;
    bateria_critica: number;
    sinal_wifi_fraco: number;
    em_uso_ativo: number;
  };
  atualizado_em: string;
}

export interface DispositivoItem {
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

export interface RespostaListagemDispositivos {
  sucesso: boolean;
  total_retornado: number;
  dispositivos: DispositivoItem[];
}

export interface RespostaProvisionamentoQr {
  sucesso: boolean;
  instrucoes: string[];
  payload_android_enterprise: Record<string, any>;
  qr_code_imagem_base64: string;
  gerado_em: string;
}

const URL_BASE = '/api';

/**
 * Consulta as métricas consolidadas dos 250 tablets.
 */
export async function obter_resumo_frota_api(): Promise<MetricasFrotaResposta> {
  const resposta = await fetch(`${URL_BASE}/frota/resumo`);
  if (!resposta.ok) {
    throw new Error('Falha ao obter resumo da frota');
  }
  return await resposta.json();
}

/**
 * Lista os dispositivos gerenciados com filtros opcionais.
 */
export async function listar_dispositivos_api(filtros?: {
  status?: string;
  busca?: string;
}): Promise<RespostaListagemDispositivos> {
  const params = new URLSearchParams();
  if (filtros?.status) params.append('status', filtros.status);
  if (filtros?.busca) params.append('busca', filtros.busca);

  const resposta = await fetch(`${URL_BASE}/dispositivos?${params.toString()}`);
  if (!resposta.ok) {
    throw new Error('Falha ao listar dispositivos');
  }
  return await resposta.json();
}

/**
 * Despacha um comando remoto para um tablet individual.
 */
export async function despachar_comando_api(
  dispositivoId: string,
  tipoComando: string,
  parametros: Record<string, any> = {}
): Promise<{ sucesso: boolean; mensagem: string }> {
  const resposta = await fetch(`${URL_BASE}/comandos/despachar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dispositivo_id: dispositivoId,
      tipo_comando: tipoComando,
      parametros,
    }),
  });
  return await resposta.json();
}

/**
 * Despacha um comando corporativo para todos os tablets da frota em lote.
 */
export async function despachar_comando_lote_api(
  tipoComando: string,
  parametros: Record<string, any> = {},
  apenasConectados: boolean = true
): Promise<{ sucesso: boolean; mensagem: string; total_afetados: number }> {
  const resposta = await fetch(`${URL_BASE}/comandos/lote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo_comando: tipoComando,
      parametros,
      apenas_conectados: apenasConectados,
    }),
  });
  return await resposta.json();
}

/**
 * Solicita ao backend a geração do QR Code oficial de provisionamento Android Enterprise.
 */
export async function obter_dados_provisionamento_qr_api(
  parametros: {
    dominioDuckDns?: string;
    wifiSsid?: string;
    wifiSenha?: string;
  } = {}
): Promise<RespostaProvisionamentoQr> {
  const params = new URLSearchParams();
  if (parametros.dominioDuckDns) params.append('dominioDuckDns', parametros.dominioDuckDns);
  if (parametros.wifiSsid) params.append('wifiSsid', parametros.wifiSsid);
  if (parametros.wifiSenha) params.append('wifiSenha', parametros.wifiSenha);

  const resposta = await fetch(`${URL_BASE}/provisionamento/qr?${params.toString()}`);
  if (!resposta.ok) {
    throw new Error('Falha ao obter QR code de provisionamento');
  }
  return await resposta.json();
}

/**
 * Cadastra manualmente um novo tablet na lista da frota.
 */
export async function cadastrar_dispositivo_api(dados: {
  numero_serie: string;
  modelo?: string;
  versao_so?: string;
  bateria?: number;
  ssid_wifi?: string;
  app_foco?: string;
}): Promise<{ sucesso: boolean; mensagem: string; dispositivo: DispositivoItem }> {
  const resposta = await fetch(`${URL_BASE}/dispositivos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    throw new Error('Falha ao cadastrar dispositivo');
  }
  return await resposta.json();
}

