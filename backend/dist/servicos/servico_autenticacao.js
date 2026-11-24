"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hash_senha = hash_senha;
exports.verificar_senha = verificar_senha;
exports.gerar_token_jwt = gerar_token_jwt;
exports.verificar_token_jwt = verificar_token_jwt;
exports.garantir_usuario_admin_inicial = garantir_usuario_admin_inicial;
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const conexao_1 = require("../banco/conexao");
dotenv_1.default.config();
const SEGREDO_JWT = process.env.JWT_SECRET || 'mdm_segredo_super_seguro_jwt_2026_frota_tablets_acss';
const TEMPO_EXPIRACAO_SEGUNDOS = 8 * 60 * 60; // 8 horas
/**
 * Codifica uma string ou buffer no formato Base64URL (RFC 7515).
 */
function base64UrlEncode(dado) {
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
function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
}
/**
 * Gera um hash criptográfico seguro (scrypt com salt aleatório de 16 bytes).
 */
function hash_senha(senha) {
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const bufferHash = crypto_1.default.scryptSync(senha, salt, 64);
    return `${salt}:${bufferHash.toString('hex')}`;
}
/**
 * Valida a senha contra o hash armazenado de forma imune a timing attacks (tempo constante).
 */
function verificar_senha(senha, hashArmazenado) {
    try {
        const partes = hashArmazenado.split(':');
        if (partes.length !== 2)
            return false;
        const [salt, hashOriginal] = partes;
        const bufferHashCalculado = crypto_1.default.scryptSync(senha, salt, 64);
        const bufferHashOriginal = Buffer.from(hashOriginal, 'hex');
        if (bufferHashCalculado.length !== bufferHashOriginal.length) {
            return false;
        }
        return crypto_1.default.timingSafeEqual(bufferHashCalculado, bufferHashOriginal);
    }
    catch (erro) {
        console.error('[Segurança] Erro ao verificar senha:', erro);
        return false;
    }
}
/**
 * Emite um token JWT (JSON Web Token) assinado com HMAC-SHA256.
 */
function gerar_token_jwt(usuario) {
    const agora = Math.floor(Date.now() / 1000);
    const cabecalho = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        iat: agora,
        exp: agora + TEMPO_EXPIRACAO_SEGUNDOS,
    };
    const parte1 = base64UrlEncode(JSON.stringify(cabecalho));
    const parte2 = base64UrlEncode(JSON.stringify(payload));
    const assinatura = crypto_1.default
        .createHmac('sha256', SEGREDO_JWT)
        .update(`${parte1}.${parte2}`)
        .digest();
    const parte3 = base64UrlEncode(assinatura);
    return `${parte1}.${parte2}.${parte3}`;
}
/**
 * Valida a autenticidade e expiração de um token JWT.
 */
function verificar_token_jwt(token) {
    try {
        const partes = token.split('.');
        if (partes.length !== 3)
            return null;
        const [cabecalhoB64, payloadB64, assinaturaB64] = partes;
        const conteudoAssinado = `${cabecalhoB64}.${payloadB64}`;
        const assinaturaEsperada = crypto_1.default
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
        if (!crypto_1.default.timingSafeEqual(assinaturaEsperada, bufferAssinaturaRecebida)) {
            return null;
        }
        const payloadJson = base64UrlDecode(payloadB64);
        const payload = JSON.parse(payloadJson);
        // Valida expiração
        const agora = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < agora) {
            return null;
        }
        return payload;
    }
    catch (erro) {
        return null;
    }
}
/**
 * Inicializa e assegura o cadastro do usuário administrador padrão com credenciais sincronizadas.
 */
async function garantir_usuario_admin_inicial() {
    try {
        const emailAdmin = (process.env.ADMIN_EMAIL || 'admin@mdm.corporativo').trim().toLowerCase();
        const senhaAdmin = process.env.ADMIN_SENHA || 'Admin@Mdm2026!';
        const hash = hash_senha(senhaAdmin);
        await (0, conexao_1.executar_consulta)(`INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
       VALUES ($1, $2, $3, 'adm', TRUE)
       ON CONFLICT (email) DO UPDATE 
       SET senha_hash = EXCLUDED.senha_hash,
           perfil = 'adm',
           ativo = TRUE,
           atualizado_em = NOW();`, ['Administrador Geral', emailAdmin, hash]);
        console.log(`[MDM Auth] Usuário administrador inicial sincronizado e ativo: ${emailAdmin}`);
        // Sincroniza também o usuário supervisor inicial
        const emailSuperv = (process.env.SUPERVISOR_EMAIL || 'supervisor@mdm.corporativo').trim().toLowerCase();
        const senhaSuperv = process.env.SUPERVISOR_SENHA || 'Supervisor@Mdm2026!';
        const hashSuperv = hash_senha(senhaSuperv);
        await (0, conexao_1.executar_consulta)(`INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
       VALUES ($1, $2, $3, 'supervisor', TRUE)
       ON CONFLICT (email) DO UPDATE 
       SET senha_hash = EXCLUDED.senha_hash,
           perfil = 'supervisor',
           ativo = TRUE,
           atualizado_em = NOW();`, ['Supervisor Operacional', emailSuperv, hashSuperv]);
        console.log(`[MDM Auth] Usuário supervisor inicial sincronizado e ativo: ${emailSuperv}`);
    }
    catch (erro) {
        console.error('[MDM Auth] Falha ao registrar usuário admin inicial:', erro?.message || erro);
    }
}
