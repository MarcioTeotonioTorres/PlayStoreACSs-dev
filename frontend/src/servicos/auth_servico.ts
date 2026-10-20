export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: string;
}

export interface RespostaLogin {
  sucesso: boolean;
  mensagem: string;
  token?: string;
  usuario?: UsuarioAutenticado;
  expira_em_segundos?: number;
}

const CHAVE_TOKEN = 'mdm_auth_token_jwt';
const CHAVE_USUARIO = 'mdm_auth_usuario';

/**
 * Realiza a autenticação segura do operador no backend.
 */
export async function fazer_login_api(email: string, senha: string): Promise<RespostaLogin> {
  const resposta = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, senha }),
  });

  const dados: RespostaLogin = await resposta.json();

  if (resposta.ok && dados.sucesso && dados.token && dados.usuario) {
    salvar_sessao(dados.token, dados.usuario);
  }

  return dados;
}

/**
 * Valida o token e busca o perfil do usuário logado.
 */
export async function obter_perfil_api(): Promise<UsuarioAutenticado | null> {
  const token = obter_token_armazenado();
  if (!token) return null;

  try {
    const resposta = await fetch('/api/auth/perfil', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resposta.ok) {
      limpar_sessao();
      return null;
    }

    const dados = await resposta.json();
    return dados.usuario || null;
  } catch (erro) {
    console.error('Erro ao consultar perfil:', erro);
    return null;
  }
}

/**
 * Armazena as credenciais de sessão localmente.
 */
export function salvar_sessao(token: string, usuario: UsuarioAutenticado): void {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

/**
 * Retorna o token JWT atual para injeção nos cabeçalhos das requisições.
 */
export function obter_token_armazenado(): string | null {
  return localStorage.getItem(CHAVE_TOKEN);
}

/**
 * Retorna o usuário autenticado salvo em cache local.
 */
export function obter_usuario_armazenado(): UsuarioAutenticado | null {
  const str = localStorage.getItem(CHAVE_USUARIO);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Limpa a sessão do usuário (Logout).
 */
export function limpar_sessao(): void {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}
