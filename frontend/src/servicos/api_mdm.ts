import { obter_token_armazenado, limpar_sessao } from './auth_servico';

export interface AplicativoInstaladoItem {
  pacote: string;
  nome: string;
  versao_nome: string;
  versao_codigo: number;
}

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
    ociosos_moderados?: number;
    ociosos_criticos?: number;
    tempo_ocioso_medio_minutos?: number;
    taxa_utilizacao_percentual?: number;
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
  tempo_ocioso_minutos?: number;
  aplicativos_instalados?: AplicativoInstaladoItem[];
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
 * Cliente HTTP autenticado com injeção de Bearer Token e redirecionamento 401.
 */
async function fetchAutenticado(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = obter_token_armazenado();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const resposta = await fetch(input, {
    ...init,
    headers,
  });

  if (resposta.status === 401 && !window.location.pathname.startsWith('/login')) {
    limpar_sessao();
    window.location.href = '/login';
  }

  return resposta;
}

/**
 * Consulta as métricas consolidadas dos 250 tablets.
 */
export async function obter_resumo_frota_api(): Promise<MetricasFrotaResposta> {
  const resposta = await fetchAutenticado(`${URL_BASE}/frota/resumo`);
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
  ordem?: string;
}): Promise<RespostaListagemDispositivos> {
  const params = new URLSearchParams();
  if (filtros?.status) params.append('status', filtros.status);
  if (filtros?.busca) params.append('busca', filtros.busca);
  if (filtros?.ordem) params.append('ordem', filtros.ordem);

  const resposta = await fetchAutenticado(`${URL_BASE}/dispositivos?${params.toString()}`);
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
  const resposta = await fetchAutenticado(`${URL_BASE}/comandos/despachar`, {
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
  const resposta = await fetchAutenticado(`${URL_BASE}/comandos/lote`, {
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

  const resposta = await fetchAutenticado(`${URL_BASE}/provisionamento/qr?${params.toString()}`);
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
  const resposta = await fetchAutenticado(`${URL_BASE}/dispositivos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    const erroJson = await resposta.json().catch(() => ({}));
    throw new Error(erroJson.mensagem || 'Falha ao cadastrar dispositivo');
  }
  return await resposta.json();
}

export interface DadosPolitica {
  id?: string;
  nome?: string;
  permitir_camera: boolean;
  bloquear_usb: boolean;
  permitir_reset_fabrica: boolean;
  bloquear_instalacao_apps?: boolean;
  bloquear_bluetooth?: boolean;
  modo_quiosque_app?: string;
  habilitar_modo_quiosque: boolean;
  pacotes_ocultos: string[];
  urls_permitidas: string[];
  atualizado_em?: string;
}

export interface ItemCatalogoApk {
  nome_arquivo: string;
  extensao?: string;
  tipo?: 'APK' | 'XAPK';
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
  const resposta = await fetchAutenticado(`${URL_BASE}/politicas`);
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
  const resposta = await fetchAutenticado(`${URL_BASE}/politicas`, {
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
  const resposta = await fetchAutenticado(`${URL_BASE}/politicas/dispositivo/${dispositivoId}`, {
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
 * Consulta as políticas específicas configuradas para um tablet individual.
 */
export async function obter_politicas_dispositivo_api(
  dispositivoId: string
): Promise<{ sucesso: boolean; politica: DadosPolitica; personalizada?: boolean }> {
  const resposta = await fetchAutenticado(`${URL_BASE}/politicas/dispositivo/${dispositivoId}`);
  if (!resposta.ok) {
    throw new Error('Falha ao obter políticas do dispositivo');
  }
  return await resposta.json();
}

export interface PerfilProvisionamentoItem {
  id: string;
  nome: string;
  descricao?: string;
  eh_padrao?: boolean;
  permitir_camera: boolean;
  bloquear_usb: boolean;
  permitir_reset_fabrica: boolean;
  bloquear_instalacao_apps: boolean;
  bloquear_bluetooth: boolean;
  modo_quiosque_app?: string | null;
  habilitar_modo_quiosque: boolean;
  pacotes_ocultos: string[];
  urls_permitidas: string[];
  criado_em?: string;
  atualizado_em?: string;
}

/**
 * Lista todos os perfis de provisionamento e conjuntos de restrições salvos.
 */
export async function listar_perfis_api(): Promise<{
  sucesso: boolean;
  total: number;
  perfis: PerfilProvisionamentoItem[];
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/perfis`);
  if (!resposta.ok) {
    throw new Error('Falha ao listar perfis de provisionamento');
  }
  return await resposta.json();
}

/**
 * Obtém os detalhes de um perfil de provisionamento específico.
 */
export async function obter_perfil_api(id: string): Promise<{
  sucesso: boolean;
  perfil: PerfilProvisionamentoItem;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/perfis/${id}`);
  if (!resposta.ok) {
    throw new Error('Falha ao consultar perfil');
  }
  return await resposta.json();
}

/**
 * Cria e salva um novo perfil de provisionamento personalizado.
 */
export async function criar_perfil_api(
  dados: Partial<PerfilProvisionamentoItem>
): Promise<{
  sucesso: boolean;
  mensagem: string;
  perfil: PerfilProvisionamentoItem;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/perfis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    const err = await resposta.json().catch(() => ({}));
    throw new Error(err.mensagem || 'Falha ao salvar novo perfil');
  }
  return await resposta.json();
}

/**
 * Atualiza um perfil de provisionamento personalizado existente.
 */
export async function atualizar_perfil_api(
  id: string,
  dados: Partial<PerfilProvisionamentoItem>
): Promise<{
  sucesso: boolean;
  mensagem: string;
  perfil: PerfilProvisionamentoItem;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/perfis/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    const err = await resposta.json().catch(() => ({}));
    throw new Error(err.mensagem || 'Falha ao atualizar perfil');
  }
  return await resposta.json();
}

/**
 * Remove um perfil de provisionamento personalizado.
 */
export async function remover_perfil_api(id: string): Promise<{
  sucesso: boolean;
  mensagem: string;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/perfis/${id}`, {
    method: 'DELETE',
  });
  if (!resposta.ok) {
    const err = await resposta.json().catch(() => ({}));
    throw new Error(err.mensagem || 'Falha ao remover perfil');
  }
  return await resposta.json();
}

/**
 * Aplica um perfil de provisionamento instantaneamente a um tablet individual ou a toda a frota.
 */
export async function aplicar_perfil_api(
  id: string,
  alvo: 'todos' | 'dispositivo',
  dispositivo_id?: string
): Promise<{
  sucesso: boolean;
  mensagem: string;
  alvo: string;
  dispositivo_id?: string;
  perfil: PerfilProvisionamentoItem;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/perfis/${id}/aplicar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alvo, dispositivo_id }),
  });
  if (!resposta.ok) {
    const err = await resposta.json().catch(() => ({}));
    throw new Error(err.mensagem || 'Falha ao aplicar perfil');
  }
  return await resposta.json();
}

export interface UsuarioTabletItem {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  dispositivo_id: string | null;
  dispositivo_numero_serie?: string | null;
  dispositivo_modelo?: string | null;
  dispositivo_status?: 'conectado' | 'desconectado' | null;
  dispositivo_bateria?: number | null;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Consulta a listagem de usuários responsáveis pelos tablets corporativos.
 */
export async function listar_usuarios_tablets_api(busca?: string): Promise<{
  sucesso: boolean;
  total: number;
  usuarios: UsuarioTabletItem[];
}> {
  const query = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  const resposta = await fetchAutenticado(`${URL_BASE}/usuarios-tablets${query}`);
  if (!resposta.ok) {
    throw new Error('Falha ao listar usuários dos tablets');
  }
  return await resposta.json();
}

/**
 * Consulta os detalhes de um usuário de tablet específico pelo ID.
 */
export async function obter_usuario_tablet_api(id: string): Promise<{
  sucesso: boolean;
  usuario: UsuarioTabletItem;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/usuarios-tablets/${id}`);
  if (!resposta.ok) {
    throw new Error('Falha ao consultar usuário do tablet');
  }
  return await resposta.json();
}

/**
 * Cadastra um novo usuário e vincula ao tablet da frota.
 */
export async function cadastrar_usuario_tablet_api(dados: {
  nome_completo: string;
  email: string;
  telefone: string;
  dispositivo_id?: string | null;
}): Promise<{
  sucesso: boolean;
  mensagem: string;
  usuario: UsuarioTabletItem;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/usuarios-tablets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    const err = await resposta.json().catch(() => ({}));
    throw new Error(err.mensagem || 'Falha ao cadastrar usuário');
  }
  return await resposta.json();
}

/**
 * Atualiza os dados de um usuário e/ou seu tablet vinculado.
 */
export async function atualizar_usuario_tablet_api(
  id: string,
  dados: {
    nome_completo?: string;
    email?: string;
    telefone?: string;
    dispositivo_id?: string | null;
  }
): Promise<{
  sucesso: boolean;
  mensagem: string;
  usuario: UsuarioTabletItem;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/usuarios-tablets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) {
    const err = await resposta.json().catch(() => ({}));
    throw new Error(err.mensagem || 'Falha ao atualizar usuário');
  }
  return await resposta.json();
}

/**
 * Remove o cadastro de um usuário de tablet.
 */
export async function remover_usuario_tablet_api(id: string): Promise<{
  sucesso: boolean;
  mensagem: string;
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/usuarios-tablets/${id}`, {
    method: 'DELETE',
  });
  if (!resposta.ok) {
    const err = await resposta.json().catch(() => ({}));
    throw new Error(err.mensagem || 'Falha ao remover usuário');
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
  const resposta = await fetchAutenticado(`${URL_BASE}/aplicativos`);
  if (!resposta.ok) {
    throw new Error('Falha ao obter catálogo de aplicativos');
  }
  return await resposta.json();
}

/**
/**
 * Realiza upload de um novo APK corporativo para o servidor com monitoramento de progresso real.
 */
export function fazer_upload_aplicativo_api(
  arquivo: File,
  onProgresso?: (porcentagem: number) => void
): Promise<{ sucesso: boolean; mensagem: string; aplicativo: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = obter_token_armazenado();

    xhr.open('POST', `${URL_BASE}/aplicativos/upload`);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgresso) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const porcentagem = Math.round((e.loaded / e.total) * 100);
          onProgresso(porcentagem);
        }
      };
    }

    xhr.onload = () => {
      try {
        const dados = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && dados.sucesso) {
          resolve(dados);
        } else {
          reject(new Error(dados.mensagem || `Erro no upload (${xhr.status})`));
        }
      } catch (_) {
        reject(new Error(`Falha no processamento da resposta do servidor: status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Erro de conexão ao enviar o arquivo para o servidor.'));
    xhr.ontimeout = () => reject(new Error('Tempo limite de upload esgotado pelo servidor.'));

    const formData = new FormData();
    formData.append('arquivo', arquivo);
    xhr.send(formData);
  });
}

/**
 * Dispara a instalação silenciosa de um APK do catálogo para a frota ou um tablet.
 */
export async function disparar_instalacao_catalogo_api(
  nomeArquivo: string,
  dispositivoId?: string
): Promise<{ sucesso: boolean; mensagem: string; comando_id: string }> {
  const resposta = await fetchAutenticado(`${URL_BASE}/aplicativos/instalar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome_arquivo: nomeArquivo,
      dispositivo_id: dispositivoId,
    }),
  });
  if (!resposta.ok) {
    throw new Error('Falha ao disparar instalação do pacote');
  }
  return await resposta.json();
}

/**
 * Remove permanentemente um pacote (APK ou XAPK) do servidor, liberando espaço em disco na VPS.
 */
export async function remover_aplicativo_catalogo_api(
  nomeArquivo: string
): Promise<{ sucesso: boolean; mensagem: string; mb_liberados?: string; bytes_liberados?: number }> {
  const resposta = await fetchAutenticado(`${URL_BASE}/aplicativos/${encodeURIComponent(nomeArquivo)}`, {
    method: 'DELETE',
  });
  if (!resposta.ok) {
    const dadosErro = await resposta.json().catch(() => ({}));
    throw new Error(dadosErro.mensagem || 'Falha ao remover pacote do catálogo.');
  }
  return await resposta.json();
}

/**
 * Remove permanentemente um tablet do inventário da frota.
 */
export async function remover_dispositivo_api(
  dispositivoId: string
): Promise<{ sucesso: boolean; mensagem: string; dispositivo_removido?: { id: string; numero_serie: string; modelo: string } }> {
  const resposta = await fetchAutenticado(`${URL_BASE}/dispositivos/${dispositivoId}`, {
    method: 'DELETE',
  });
  if (!resposta.ok) {
    throw new Error('Falha ao remover dispositivo');
  }
  return await resposta.json();
}

/**
 * Consulta o status em tempo real de um comando despachado para a frota ou tablet.
 */
export async function consultar_status_comando_api(
  comandoId: string
): Promise<{
  sucesso: boolean;
  comando: {
    id: string;
    tipo_comando: string;
    status: 'pendente' | 'enviado' | 'processando' | 'executado' | 'falha' | 'rejeitado';
    resposta?: { status: string; mensagem: string };
    criado_em: string;
    executado_em?: string;
    numero_serie?: string;
    modelo?: string;
  };
}> {
  const resposta = await fetchAutenticado(`${URL_BASE}/comandos/${comandoId}`);
  if (!resposta.ok) {
    throw new Error('Falha ao consultar status do comando.');
  }
  return await resposta.json();
}

/**
 * Solicita a transmissão imediata de telemetria para todos os tablets conectados via MQTT.
 */
export async function solicitar_sincronizacao_frota_api(): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    const resposta = await fetchAutenticado(`${URL_BASE}/dispositivos/sincronizar`, {
      method: 'POST',
    });
    if (!resposta.ok) {
      return { sucesso: false, mensagem: 'Falha ao solicitar telemetria' };
    }
    return await resposta.json();
  } catch {
    return { sucesso: false, mensagem: 'Falha de comunicação com o servidor' };
  }
}


