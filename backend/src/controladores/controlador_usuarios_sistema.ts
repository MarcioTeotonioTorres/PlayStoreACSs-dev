import { FastifyReply } from 'fastify';
import { executar_consulta } from '../banco/conexao';
import { hash_senha } from '../servicos/servico_autenticacao';
import { RequisicaoAutenticada } from './controlador_autenticacao';

export interface UsuarioSistemaDTO {
  id: string;
  nome: string;
  email: string;
  perfil: 'adm' | 'supervisor';
  ativo: boolean;
  ultimo_login?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

/**
 * Valida se o usuário autenticado detém o perfil de administrador geral ('adm').
 * Se for 'supervisor', bloqueia a requisição retornando 403.
 */
export function verificar_permissao_adm(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): boolean {
  const usuario = requisicao.usuario;
  if (!usuario) {
    resposta.status(401).send({ sucesso: false, mensagem: 'Sessão inválida ou não autenticada.' });
    return false;
  }
  const perfil = usuario.perfil === 'admin' ? 'adm' : usuario.perfil;
  if (perfil !== 'adm') {
    resposta.status(403).send({
      sucesso: false,
      mensagem: 'Acesso negado. Apenas administradores gerais possuem acesso a este recurso.',
    });
    return false;
  }
  return true;
}

/**
 * Normaliza o registro retornado do banco de dados ou da memória.
 */
function normalizarUsuarioSistema(row: any): UsuarioSistemaDTO {
  const perfilRaw = (row.perfil || 'adm').toLowerCase();
  const perfilNormalizado = perfilRaw === 'supervisor' || perfilRaw === 'operador' ? 'supervisor' : 'adm';
  return {
    id: row.id,
    nome: row.nome || '',
    email: (row.email || '').toLowerCase(),
    perfil: perfilNormalizado,
    ativo: row.ativo !== false,
    ultimo_login: row.ultimo_login ? new Date(row.ultimo_login).toISOString() : null,
    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString(),
  };
}

/**
 * Lista todos os operadores do sistema (Admins e Supervisores).
 */
export async function listar_usuarios_sistema(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): Promise<void> {
  try {
    if (!verificar_permissao_adm(requisicao, resposta)) return;

    const sql = `
      SELECT id, nome, email, perfil, ativo, ultimo_login, criado_em, atualizado_em
      FROM usuarios
      ORDER BY criado_em ASC;
    `;
    const res = await executar_consulta(sql);
    const usuarios = (res.rows || []).map(normalizarUsuarioSistema);

    resposta.status(200).send({
      sucesso: true,
      total: usuarios.length,
      usuarios,
    });
  } catch (erro) {
    console.error('Erro em listar_usuarios_sistema:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao listar usuários do sistema.' });
  }
}

/**
 * Obtém os dados de um operador específico pelo ID.
 */
export async function obter_usuario_sistema(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): Promise<void> {
  try {
    if (!verificar_permissao_adm(requisicao, resposta)) return;

    const { id } = requisicao.params as { id: string };
    const sql = `SELECT id, nome, email, perfil, ativo, ultimo_login, criado_em, atualizado_em FROM usuarios WHERE id::text = $1 LIMIT 1;`;
    const res = await executar_consulta(sql, [id]);

    if (!res.rows || res.rows.length === 0) {
      resposta.status(404).send({ sucesso: false, mensagem: 'Usuário do sistema não encontrado.' });
      return;
    }

    resposta.status(200).send({
      sucesso: true,
      usuario: normalizarUsuarioSistema(res.rows[0]),
    });
  } catch (erro) {
    console.error('Erro em obter_usuario_sistema:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao obter dados do usuário do sistema.' });
  }
}

/**
 * Cadastra um novo operador no sistema com perfil 'adm' ou 'supervisor'.
 */
export async function criar_usuario_sistema(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): Promise<void> {
  try {
    if (!verificar_permissao_adm(requisicao, resposta)) return;

    const { nome, email, senha, perfil = 'supervisor', ativo = true } = (requisicao.body as any) || {};

    if (!nome || !email || !senha) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Nome, e-mail e senha são campos obrigatórios.',
      });
      return;
    }

    if (senha.length < 8) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'A senha de acesso deve possuir no mínimo 8 caracteres.',
      });
      return;
    }

    const emailLimpo = email.trim().toLowerCase();
    const perfilNormalizado = perfil === 'adm' ? 'adm' : 'supervisor';

    // Validação de unicidade de e-mail
    const checkSql = `SELECT id FROM usuarios WHERE LOWER(email) = $1 LIMIT 1;`;
    const resCheck = await executar_consulta(checkSql, [emailLimpo]);
    if (resCheck.rows && resCheck.rows.length > 0) {
      resposta.status(409).send({
        sucesso: false,
        mensagem: 'Já existe um operador cadastrado com este endereço de e-mail.',
      });
      return;
    }

    const senhaHash = hash_senha(senha);
    const sqlInsert = `
      INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo, criado_em, atualizado_em)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, nome, email, perfil, ativo, criado_em, atualizado_em;
    `;
    const resInsert = await executar_consulta(sqlInsert, [
      nome.trim(),
      emailLimpo,
      senhaHash,
      perfilNormalizado,
      Boolean(ativo),
    ]);

    const novo = normalizarUsuarioSistema(resInsert.rows[0]);
    resposta.status(201).send({
      sucesso: true,
      mensagem: `Usuário '${novo.nome}' (${novo.perfil}) cadastrado com sucesso!`,
      usuario: novo,
    });
  } catch (erro) {
    console.error('Erro em criar_usuario_sistema:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao cadastrar usuário do sistema.' });
  }
}

/**
 * Atualiza os dados de um operador do sistema.
 */
export async function atualizar_usuario_sistema(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): Promise<void> {
  try {
    if (!verificar_permissao_adm(requisicao, resposta)) return;

    const { id } = requisicao.params as { id: string };
    const { nome, email, perfil, ativo, nova_senha } = (requisicao.body as any) || {};

    if (!nome || !email) {
      resposta.status(400).send({ sucesso: false, mensagem: 'Nome e e-mail são obrigatórios.' });
      return;
    }

    const emailLimpo = email.trim().toLowerCase();
    const perfilNormalizado = perfil === 'adm' ? 'adm' : 'supervisor';

    // Verifica se outro usuário já usa esse e-mail
    const checkSql = `SELECT id FROM usuarios WHERE LOWER(email) = $1 AND id::text != $2 LIMIT 1;`;
    const resCheck = await executar_consulta(checkSql, [emailLimpo, id]);
    if (resCheck.rows && resCheck.rows.length > 0) {
      resposta.status(409).send({
        sucesso: false,
        mensagem: 'Este e-mail já pertence a outro operador.',
      });
      return;
    }

    // Se informou nova senha, atualiza também a hash
    if (nova_senha && nova_senha.trim().length > 0) {
      if (nova_senha.length < 8) {
        resposta.status(400).send({
          sucesso: false,
          mensagem: 'A nova senha deve possuir no mínimo 8 caracteres.',
        });
        return;
      }
      const hash = hash_senha(nova_senha);
      const sqlUpdateComSenha = `
        UPDATE usuarios
        SET nome = $1, email = $2, perfil = $3, ativo = $4, senha_hash = $5, atualizado_em = NOW()
        WHERE id::text = $6
        RETURNING id, nome, email, perfil, ativo, ultimo_login, criado_em, atualizado_em;
      `;
      const res = await executar_consulta(sqlUpdateComSenha, [
        nome.trim(),
        emailLimpo,
        perfilNormalizado,
        Boolean(ativo),
        hash,
        id,
      ]);
      const atualizado = normalizarUsuarioSistema(res.rows[0]);
      resposta.status(200).send({
        sucesso: true,
        mensagem: 'Usuário e senha atualizados com sucesso!',
        usuario: atualizado,
      });
      return;
    }

    const sqlUpdate = `
      UPDATE usuarios
      SET nome = $1, email = $2, perfil = $3, ativo = $4, atualizado_em = NOW()
      WHERE id::text = $5
      RETURNING id, nome, email, perfil, ativo, ultimo_login, criado_em, atualizado_em;
    `;
    const res = await executar_consulta(sqlUpdate, [
      nome.trim(),
      emailLimpo,
      perfilNormalizado,
      Boolean(ativo),
      id,
    ]);

    const atualizado = normalizarUsuarioSistema(res.rows[0]);
    resposta.status(200).send({
      sucesso: true,
      mensagem: 'Dados do operador atualizados com êxito!',
      usuario: atualizado,
    });
  } catch (erro) {
    console.error('Erro em atualizar_usuario_sistema:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao atualizar dados do usuário.' });
  }
}

/**
 * Remove um operador do sistema. Impede que o próprio admin logado se exclua.
 */
export async function remover_usuario_sistema(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): Promise<void> {
  try {
    if (!verificar_permissao_adm(requisicao, resposta)) return;

    const { id } = requisicao.params as { id: string };
    const usuarioAutenticado = requisicao.usuario;

    if (usuarioAutenticado && usuarioAutenticado.id === id) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Você não pode excluir sua própria conta enquanto estiver conectado.',
      });
      return;
    }

    const sqlDelete = `DELETE FROM usuarios WHERE id::text = $1 RETURNING id;`;
    const res = await executar_consulta(sqlDelete, [id]);

    resposta.status(200).send({
      sucesso: true,
      mensagem: 'Operador removido do sistema com sucesso.',
    });
  } catch (erro) {
    console.error('Erro em remover_usuario_sistema:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao remover usuário do sistema.' });
  }
}

