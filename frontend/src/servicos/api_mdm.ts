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

export interface DadosPolitica {
  id?: string;
  nome?: string;
  permitir_camera: boolean;
  bloquear_usb: boolean;
  permitir_reset_fabrica: boolean;
  modo_quiosque_app?: string;
  habilitar_modo_quiosque: boolean;
  pacotes_ocultos: string[];
  urls_permitidas: string[];
  atualizado_em?: string;
}

export interface ItemCatalogoApk {
  nome_arquivo: string;
  tamanho_bytes: number;
  tamanho_mb: string;
  checksum_sha256: string;
  url_download: string;
  data_modificacao: string;
}

/**
 * Consulta as políticas e restrições configuradas para a frota.
 */
export async function obter_politicas_api(): Promise<{ sucesso: boolean; politica: DadosPolitica }> {
  const resposta = await fetch(`${URL_BASE}/politicas`);
  if (!resposta.ok) {
    throw new Error('Falha ao obter políticas');
  }
  return await resposta.json();
}

/**
 * Atualiza e aplica as diretrizes de políticas e restrições a todos os tablets da frota.
 */
export async function salvar_politicas_frota_api(
  politica: Partial<DadosPolitica>
): Promise<{ sucesso: boolean; mensagem: string; politica: DadosPolitica }> {
  const resposta = await fetch(`${URL_BASE}/politicas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(politica),
  });
  if (!resposta.ok) {
    throw new Error('Falha ao salvar políticas da frota');
  }
  return await resposta.json();
}

/**
 * Aplica uma política customizada a um tablet individual.
 */
export async function salvar_politicas_dispositivo_api(
  dispositivoId: string,
  politica: Partial<DadosPolitica>
): Promise<{ sucesso: boolean; mensagem: string; comando_id: string }> {
  const resposta = await fetch(`${URL_BASE}/politicas/dispositivo/${dispositivoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(politica),
  });
  if (!resposta.ok) {
    throw new Error('Falha ao aplicar política no dispositivo');
  }
  return await resposta.json();
}

/**
 * Retorna os pacotes APK disponíveis no catálogo do servidor.
 */
export async function listar_catalogo_aplicativos_api(): Promise<{
  sucesso: boolean;
  total_aplicativos: number;
  aplicativos: ItemCatalogoApk[];
}> {
  const resposta = await fetch(`${URL_BASE}/aplicativos`);
  if (!resposta.ok) {
    throw new Error('Falha ao obter catálogo de aplicativos');
  }
  return await resposta.json();
}

/**
 * Realiza upload de um novo APK corporativo para o servidor.
 */
export async function fazer_upload_aplicativo_api(
  arquivo: File
): Promise<{ sucesso: boolean; mensagem: string; aplicativo: any }> {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  const resposta = await fetch(`${URL_BASE}/aplicativos/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!resposta.ok) {
    throw new Error('Falha ao enviar arquivo APK');
  }
  return await resposta.json();
}

/**
 * Dispara a instalação silenciosa de um APK do catálogo para a frota ou um tablet.
 */
export async function disparar_instalacao_catalogo_api(
  nomeArquivo: string,
  dispositivoId?: string
): Promise<{ sucesso: boolean; mensagem: string; comando_id: string }> {
  const resposta = await fetch(`${URL_BASE}/aplicativos/instalar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome_arquivo: nomeArquivo,
      dispositivo_id: dispositivoId,
    }),
  });
  if (!resposta.ok) {
    throw new Error('Falha ao disparar instalação do APK');
  }
  return await resposta.json();
}


