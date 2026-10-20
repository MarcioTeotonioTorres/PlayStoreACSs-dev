import crypto from 'crypto';
import dotenv from 'dotenv';
import { executar_consulta } from '../banco/conexao';

dotenv.config();

const SEGREDO_JWT = process.env.JWT_SECRET || 'mdm_segredo_super_seguro_jwt_2026_frota_tablets_acss';
const TEMPO_EXPIRACAO_SEGUNDOS = 8 * 60 * 60; // 8 horas

export interface PayloadUsuarioJwt {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  exp: number;
  iat: number;
}

/**
 * Codifica uma string ou buffer no formato Base64URL (RFC 7515).
 */
function base64UrlEncode(dado: string | Buffer): string {
  const buf = Buffer.isBuffer(dado) ? dado : Buffer.from(dado, 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Decodifica uma string Base64URL.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Gera um hash criptográfico seguro (scrypt com salt aleatório de 16 bytes).
 */
export function hash_senha(senha: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const bufferHash = crypto.scryptSync(senha, salt, 64);
  return `${salt}:${bufferHash.toString('hex')}`;
}

/**
 * Valida a senha contra o hash armazenado de forma imune a timing attacks (tempo constante).
 */
export function verificar_senha(senha: string, hashArmazenado: string): boolean {
  try {
    const partes = hashArmazenado.split(':');
    if (partes.length !== 2) return false;
    const [salt, hashOriginal] = partes;
    const bufferHashCalculado = crypto.scryptSync(senha, salt, 64);
    const bufferHashOriginal = Buffer.from(hashOriginal, 'hex');

    if (bufferHashCalculado.length !== bufferHashOriginal.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufferHashCalculado, bufferHashOriginal);
  } catch (erro) {
    console.error('[Segurança] Erro ao verificar senha:', erro);
    return false;
  }
}

/**
 * Emite um token JWT (JSON Web Token) assinado com HMAC-SHA256.
 */
export function gerar_token_jwt(usuario: { id: string; nome: string; email: string; perfil: string }): string {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = { alg: 'HS256', typ: 'JWT' };
  const payload: PayloadUsuarioJwt = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    iat: agora,
    exp: agora + TEMPO_EXPIRACAO_SEGUNDOS,
  };

  const parte1 = base64UrlEncode(JSON.stringify(cabecalho));
  const parte2 = base64UrlEncode(JSON.stringify(payload));
  const assinatura = crypto
    .createHmac('sha256', SEGREDO_JWT)
    .update(`${parte1}.${parte2}`)
    .digest();

  const parte3 = base64UrlEncode(assinatura);
  return `${parte1}.${parte2}.${parte3}`;
}

/**
 * Valida a autenticidade e expiração de um token JWT.
 */
export function verificar_token_jwt(token: string): PayloadUsuarioJwt | null {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;

    const [cabecalhoB64, payloadB64, assinaturaB64] = partes;
    const conteudoAssinado = `${cabecalhoB64}.${payloadB64}`;

    const assinaturaEsperada = crypto
      .createHmac('sha256', SEGREDO_JWT)
      .update(conteudoAssinado)
      .digest();

    let assinaturaRecebidaBase64 = assinaturaB64.replace(/-/g, '+').replace(/_/g, '/');
    while (assinaturaRecebidaBase64.length % 4) {
      assinaturaRecebidaBase64 += '=';
    }
    const bufferAssinaturaRecebida = Buffer.from(assinaturaRecebidaBase64, 'base64');

    if (assinaturaEsperada.length !== bufferAssinaturaRecebida.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(assinaturaEsperada, bufferAssinaturaRecebida)) {
      return null;
    }

    const payloadJson = base64UrlDecode(payloadB64);
    const payload: PayloadUsuarioJwt = JSON.parse(payloadJson);

    // Valida expiração
    const agora = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < agora) {
      return null;
    }

    return payload;
  } catch (erro) {
    return null;
  }
}

/**
 * Inicializa e assegura o cadastro do usuário administrador padrão com credenciais sincronizadas.
 */
export async function garantir_usuario_admin_inicial(): Promise<void> {
  try {
    const emailAdmin = (process.env.ADMIN_EMAIL || 'admin@mdm.corporativo').trim().toLowerCase();
    const senhaAdmin = process.env.ADMIN_SENHA || 'Admin@Mdm2026!';
    const hash = hash_senha(senhaAdmin);

    await executar_consulta(
      `INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
       VALUES ($1, $2, $3, 'admin', TRUE)
       ON CONFLICT (email) DO UPDATE 
       SET senha_hash = EXCLUDED.senha_hash,
           ativo = TRUE,
           atualizado_em = NOW();`,
      ['Administrador TI', emailAdmin, hash]
    );
    console.log(`[MDM Auth] Usuário administrador inicial sincronizado e ativo: ${emailAdmin}`);
  } catch (erro: any) {
    console.error('[MDM Auth] Falha ao registrar usuário admin inicial:', erro?.message || erro);
  }
}
