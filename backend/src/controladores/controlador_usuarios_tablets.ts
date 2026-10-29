import { FastifyRequest, FastifyReply } from 'fastify';
import {
  executar_consulta,
  usuariosTabletsMemoria,
  UsuarioTabletSimulado,
} from '../banco/conexao';
import crypto from 'crypto';

export interface UsuarioTabletDTO {
  id?: string;
  nome_completo: string;
  email: string;
  telefone: string;
  dispositivo_id?: string | null;
  dispositivo_numero_serie?: string | null;
  dispositivo_modelo?: string | null;
  dispositivo_status?: 'conectado' | 'desconectado' | null;
  dispositivo_bateria?: number | null;
  criado_em?: string;
  atualizado_em?: string;
}

/**
 * Normaliza um registro retornado do banco ou da memória.
 */
function normalizarUsuarioTablet(row: any): UsuarioTabletDTO {
  return {
    id: row.id,
    nome_completo: row.nome_completo || '',
    email: (row.email || '').toLowerCase(),
    telefone: row.telefone || '',
    dispositivo_id: row.dispositivo_id || null,
    dispositivo_numero_serie: row.dispositivo_numero_serie || null,
    dispositivo_modelo: row.dispositivo_modelo || null,
    dispositivo_status: row.dispositivo_status || null,
    dispositivo_bateria: row.dispositivo_bateria !== undefined && row.dispositivo_bateria !== null ? Number(row.dispositivo_bateria) : null,
    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString(),
  };
}

/**
 * Lista todos os usuários cadastrados e vinculados aos tablets.
 */
export async function listar_usuarios_tablets(
  requisicao: FastifyRequest<{ Querystring: { busca?: string } }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const busca = requisicao.query.busca?.trim().toLowerCase();

    const sql = `
      SELECT ut.id, ut.nome_completo, ut.email, ut.telefone, ut.dispositivo_id,
             ut.criado_em, ut.atualizado_em,
             d.numero_serie AS dispositivo_numero_serie,
             d.modelo AS dispositivo_modelo,
             d.status_conexao AS dispositivo_status,
             d.bateria AS dispositivo_bateria
      FROM usuarios_tablets ut
      LEFT JOIN dispositivos d ON ut.dispositivo_id = d.id
      ORDER BY ut.criado_em DESC;
    `;

    const resultado = await executar_consulta(sql);

    let usuarios: UsuarioTabletDTO[] = [];
    if (resultado.rows && resultado.rows.length > 0) {
      usuarios = resultado.rows.map(normalizarUsuarioTablet);
    } else {
      usuarios = usuariosTabletsMemoria.map(normalizarUsuarioTablet);
    }

    if (busca) {
      usuarios = usuarios.filter((u) => {
        return (
          u.nome_completo.toLowerCase().includes(busca) ||
          u.email.toLowerCase().includes(busca) ||
          u.telefone.toLowerCase().includes(busca) ||
          (u.dispositivo_numero_serie && u.dispositivo_numero_serie.toLowerCase().includes(busca)) ||
          (u.dispositivo_modelo && u.dispositivo_modelo.toLowerCase().includes(busca))
        );
      });
    }

    resposta.status(200).send({
      sucesso: true,
      total: usuarios.length,
      usuarios,
    });
  } catch (erro) {
    console.error('Erro ao listar usuários dos tablets:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao consultar cadastro de usuários dos tablets.',
    });
  }
}

/**
 * Obtém os detalhes de um usuário específico pelo ID.
 */
export async function obter_usuario_tablet(
  requisicao: FastifyRequest<{ Params: { id: string } }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;

    const sql = `
      SELECT ut.id, ut.nome_completo, ut.email, ut.telefone, ut.dispositivo_id,
             ut.criado_em, ut.atualizado_em,
             d.numero_serie AS dispositivo_numero_serie,
             d.modelo AS dispositivo_modelo,
             d.status_conexao AS dispositivo_status,
             d.bateria AS dispositivo_bateria
      FROM usuarios_tablets ut
      LEFT JOIN dispositivos d ON ut.dispositivo_id = d.id
      WHERE ut.id::text = $1
      LIMIT 1;
    `;

    const resultado = await executar_consulta(sql, [id]);

    if (resultado.rows && resultado.rows.length > 0) {
      resposta.status(200).send({
        sucesso: true,
        usuario: normalizarUsuarioTablet(resultado.rows[0]),
      });
      return;
    }

    const emMemoria = usuariosTabletsMemoria.find((u) => u.id === id);
    if (emMemoria) {
      resposta.status(200).send({
        sucesso: true,
        usuario: normalizarUsuarioTablet(emMemoria),
      });
      return;
    }

    resposta.status(404).send({
      sucesso: false,
      mensagem: `Usuário com identificador '${id}' não encontrado.`,
    });
  } catch (erro) {
    console.error('Erro ao obter usuário de tablet:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao consultar dados do usuário.',
    });
  }
}

/**
 * Cadastra um novo usuário e vincula ao tablet corporativo correspondente.
 */
export async function cadastrar_usuario_tablet(
  requisicao: FastifyRequest<{ Body: UsuarioTabletDTO }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { nome_completo, email, telefone, dispositivo_id } = requisicao.body;

    if (!nome_completo || nome_completo.trim().length < 3) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'O nome completo é obrigatório (mínimo de 3 caracteres).',
      });
      return;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Informe um endereço de e-mail válido.',
      });
      return;
    }

    if (!telefone || telefone.trim().length < 8) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Informe um telefone de contato válido (com DDD).',
      });
      return;
    }

    const dispIdLimpo = dispositivo_id && dispositivo_id.trim() ? dispositivo_id.trim() : null;

    // Se informou dispositivo, verifica se já existe outro usuário vinculado a este mesmo tablet
    if (dispIdLimpo) {
      try {
        const resExistente = await executar_consulta(
          'SELECT id, nome_completo FROM usuarios_tablets WHERE dispositivo_id::text = $1 LIMIT 1;',
          [dispIdLimpo]
        );
        if (resExistente.rows && resExistente.rows.length > 0) {
          resposta.status(409).send({
            sucesso: false,
            mensagem: `Este tablet já está atualmente atribuído a "${resExistente.rows[0].nome_completo}". Desvincule-o primeiro antes de associar a outro usuário.`,
          });
          return;
        }
      } catch (_) {}
    }

    const id = crypto.randomUUID();
    const nomeLimpo = nome_completo.trim();
    const emailLimpo = email.trim().toLowerCase();
    const telLimpo = telefone.trim();

    // 1. Tenta gravar no PostgreSQL
    let usuarioCriado: any = null;
    try {
      const sqlInsert = `
        INSERT INTO usuarios_tablets (id, nome_completo, email, telefone, dispositivo_id, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *;
      `;
      const resInsert = await executar_consulta(sqlInsert, [id, nomeLimpo, emailLimpo, telLimpo, dispIdLimpo]);
      if (resInsert.rows && resInsert.rows.length > 0) {
        usuarioCriado = resInsert.rows[0];
      }
    } catch (errDb) {
      console.warn('Fallback: Erro ao inserir no BD, mantendo em memória.', errDb);
    }

    // 2. Garante persistência no repositório simulado em memória
    const usuarioMem: UsuarioTabletSimulado = {
      id,
      nome_completo: nomeLimpo,
      email: emailLimpo,
      telefone: telLimpo,
      dispositivo_id: dispIdLimpo,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    const idxExistente = usuariosTabletsMemoria.findIndex((u) => u.id === id);
    if (idxExistente !== -1) {
      usuariosTabletsMemoria[idxExistente] = usuarioMem;
    } else {
      usuariosTabletsMemoria.unshift(usuarioMem);
    }

    resposta.status(201).send({
      sucesso: true,
      mensagem: `Usuário "${nomeLimpo}" cadastrado com sucesso!`,
      usuario: normalizarUsuarioTablet(usuarioCriado || usuarioMem),
    });
  } catch (erro) {
    console.error('Erro ao cadastrar usuário do tablet:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao cadastrar novo usuário do tablet.',
    });
  }
}

/**
 * Atualiza os dados de um usuário existente e/ou seu tablet vinculado.
 */
export async function atualizar_usuario_tablet(
  requisicao: FastifyRequest<{ Params: { id: string }; Body: UsuarioTabletDTO }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;
    const { nome_completo, email, telefone, dispositivo_id } = requisicao.body;

    if (nome_completo !== undefined && nome_completo.trim().length < 3) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'O nome completo deve conter no mínimo 3 caracteres.',
      });
      return;
    }

    if (email !== undefined && (!email.includes('@') || !email.includes('.'))) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Informe um endereço de e-mail válido.',
      });
      return;
    }

    if (telefone !== undefined && telefone.trim().length < 8) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Informe um telefone de contato válido.',
      });
      return;
    }

    const dispIdLimpo = dispositivo_id !== undefined ? (dispositivo_id && dispositivo_id.trim() ? dispositivo_id.trim() : null) : undefined;

    // Se alterou dispositivo, checa se outro usuário já possui este tablet
    if (dispIdLimpo) {
      try {
        const resExistente = await executar_consulta(
          'SELECT id, nome_completo FROM usuarios_tablets WHERE dispositivo_id::text = $1 AND id::text != $2 LIMIT 1;',
          [dispIdLimpo, id]
        );
        if (resExistente.rows && resExistente.rows.length > 0) {
          resposta.status(409).send({
            sucesso: false,
            mensagem: `Este tablet já está atualmente atribuído a "${resExistente.rows[0].nome_completo}". Desvincule-o primeiro antes de associar a outro usuário.`,
          });
          return;
        }
      } catch (_) {}
    }

    let usuarioAtualizado: any = null;
    try {
      const sqlUpdate = `
        UPDATE usuarios_tablets
        SET nome_completo = COALESCE($1, nome_completo),
            email = COALESCE($2, email),
            telefone = COALESCE($3, telefone),
            dispositivo_id = $4,
            atualizado_em = NOW()
        WHERE id::text = $5
        RETURNING *;
      `;
      const resUp = await executar_consulta(sqlUpdate, [
        nome_completo?.trim(),
        email ? email.trim().toLowerCase() : undefined,
        telefone?.trim(),
        dispIdLimpo,
        id,
      ]);
      if (resUp.rows && resUp.rows.length > 0) {
        usuarioAtualizado = resUp.rows[0];
      }
    } catch (errDb) {
      console.warn('Fallback: Erro ao atualizar usuário no BD, atualizando memória.', errDb);
    }

    const usuarioMem = usuariosTabletsMemoria.find((u) => u.id === id);
    if (usuarioMem) {
      if (nome_completo !== undefined) usuarioMem.nome_completo = nome_completo.trim();
      if (email !== undefined) usuarioMem.email = email.trim().toLowerCase();
      if (telefone !== undefined) usuarioMem.telefone = telefone.trim();
      if (dispIdLimpo !== undefined) usuarioMem.dispositivo_id = dispIdLimpo;
      usuarioMem.atualizado_em = new Date().toISOString();
    }

    resposta.status(200).send({
      sucesso: true,
      mensagem: 'Cadastro do usuário atualizado com sucesso!',
      usuario: normalizarUsuarioTablet(usuarioAtualizado || usuarioMem),
    });
  } catch (erro) {
    console.error('Erro ao atualizar usuário do tablet:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao atualizar cadastro do usuário.',
    });
  }
}

/**
 * Remove o cadastro de um usuário de tablet.
 */
export async function remover_usuario_tablet(
  requisicao: FastifyRequest<{ Params: { id: string } }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;

    try {
      await executar_consulta('DELETE FROM usuarios_tablets WHERE id::text = $1;', [id]);
    } catch (_) {}

    const idx = usuariosTabletsMemoria.findIndex((u) => u.id === id);
    if (idx !== -1) {
      usuariosTabletsMemoria.splice(idx, 1);
    }

    resposta.status(200).send({
      sucesso: true,
      mensagem: 'Cadastro do usuário removido com sucesso.',
    });
  } catch (erro) {
    console.error('Erro ao remover usuário do tablet:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao remover usuário do tablet.',
    });
  }
}

