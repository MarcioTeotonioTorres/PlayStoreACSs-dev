import { FastifyRequest, FastifyReply } from 'fastify';
import { executar_consulta } from '../banco/conexao';
import {
  hash_senha,
  verificar_senha,
  gerar_token_jwt,
  PayloadUsuarioJwt,
} from '../servicos/servico_autenticacao';

// Interface estendida do FastifyRequest para carregar os dados autenticados
export interface RequisicaoAutenticada extends FastifyRequest {
  usuario?: PayloadUsuarioJwt;
}

/**
 * Realiza o login do operador/administrador no painel web.
 */
export async function login_usuario(
  requisicao: FastifyRequest<{
    Body: {
      email?: string;
      senha?: string;
    };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { email, senha } = requisicao.body || {};

    if (!email || !senha) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'E-mail e senha são obrigatórios.',
      });
      return;
    }

    const emailLimpo = email.trim().toLowerCase();

    // Busca usuário pelo e-mail
    const sql = `SELECT id, nome, email, senha_hash, perfil, ativo FROM usuarios WHERE LOWER(email) = $1 LIMIT 1;`;
    const res = await executar_consulta(sql, [emailLimpo]);

    if (res.rows.length === 0) {
      // Retorna mensagem genérica para não vazar existência de contas
      resposta.status(401).send({
        sucesso: false,
        mensagem: 'Credenciais de acesso incorretas.',
      });
      return;
    }

    const usuario = res.rows[0];

    if (!usuario.ativo) {
      resposta.status(403).send({
        sucesso: false,
        mensagem: 'Conta de usuário desativada. Contate o administrador de TI.',
      });
      return;
    }

    // Validação criptográfica resistente a timing attacks
    const senhaValida = verificar_senha(senha, usuario.senha_hash);
    if (!senhaValida) {
      resposta.status(401).send({
        sucesso: false,
        mensagem: 'Credenciais de acesso incorretas.',
      });
      return;
    }

    // Atualiza data do último login
    await executar_consulta('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1;', [usuario.id]);

    // Emite token JWT
    const token = gerar_token_jwt({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    });

    resposta.status(200).send({
      sucesso: true,
      mensagem: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
      expira_em_segundos: 8 * 60 * 60,
    });
  } catch (erro) {
    console.error('Erro em login_usuario:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao processar autenticação.',
    });
  }
}

/**
 * Retorna os dados do perfil do usuário autenticado a partir do token.
 */
export async function obter_perfil_usuario(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): Promise<void> {
  try {
    const usuarioJwt = requisicao.usuario;
    if (!usuarioJwt) {
      resposta.status(401).send({ sucesso: false, mensagem: 'Não autenticado.' });
      return;
    }

    const sql = `SELECT id, nome, email, perfil, ativo, ultimo_login, criado_em FROM usuarios WHERE id = $1 LIMIT 1;`;
    const res = await executar_consulta(sql, [usuarioJwt.id]);

    if (res.rows.length === 0) {
      resposta.status(404).send({ sucesso: false, mensagem: 'Usuário não localizado.' });
      return;
    }

    resposta.status(200).send({
      sucesso: true,
      usuario: res.rows[0],
    });
  } catch (erro) {
    console.error('Erro em obter_perfil_usuario:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao carregar perfil do usuário.' });
  }
}

/**
 * Permite que o operador altere sua senha de acesso.
 */
export async function alterar_senha_usuario(
  requisicao: RequisicaoAutenticada,
  resposta: FastifyReply
): Promise<void> {
  try {
    const usuarioJwt = requisicao.usuario;
    if (!usuarioJwt) {
      resposta.status(401).send({ sucesso: false, mensagem: 'Não autenticado.' });
      return;
    }

    const { senha_atual, nova_senha } = (requisicao.body as any) || {};
    if (!senha_atual || !nova_senha || nova_senha.length < 8) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'A nova senha deve possuir no mínimo 8 caracteres.',
      });
      return;
    }

    const res = await executar_consulta('SELECT senha_hash FROM usuarios WHERE id = $1;', [usuarioJwt.id]);
    if (res.rows.length === 0) {
      resposta.status(404).send({ sucesso: false, mensagem: 'Usuário não encontrado.' });
      return;
    }

    const valida = verificar_senha(senha_atual, res.rows[0].senha_hash);
    if (!valida) {
      resposta.status(400).send({ sucesso: false, mensagem: 'Senha atual informada é inválida.' });
      return;
    }

    const novoHash = hash_senha(nova_senha);
    await executar_consulta('UPDATE usuarios SET senha_hash = $1, atualizado_em = NOW() WHERE id = $2;', [
      novoHash,
      usuarioJwt.id,
    ]);

    resposta.status(200).send({ sucesso: true, mensagem: 'Senha atualizada com êxito!' });
  } catch (erro) {
    console.error('Erro em alterar_senha_usuario:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao alterar senha.' });
  }
}
