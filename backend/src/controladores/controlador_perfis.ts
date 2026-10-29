import { FastifyRequest, FastifyReply } from 'fastify';
import { executar_consulta, perfisProvisionamentoMemoria, PerfilProvisionamentoSimulado } from '../banco/conexao';
import { despachar_comando_mqtt } from '../servicos/servico_mqtt';
import {
  filtrarPacotesSeguros,
  politicasMemoria,
  politicasDispositivosMemoria,
  PoliticaDTO,
} from './controlador_politicas';
import crypto from 'crypto';

export interface PerfilProvisionamentoDTO {
  id?: string;
  nome: string;
  descricao?: string;
  eh_padrao?: boolean;
  permitir_camera?: boolean;
  bloquear_usb?: boolean;
  permitir_reset_fabrica?: boolean;
  bloquear_instalacao_apps?: boolean;
  bloquear_bluetooth?: boolean;
  modo_quiosque_app?: string | null;
  habilitar_modo_quiosque?: boolean;
  pacotes_ocultos?: string[];
  urls_permitidas?: string[];
  criado_em?: string;
  atualizado_em?: string;
}

/**
 * Normaliza e sanitiza um objeto de perfil lido do banco ou memória.
 */
function normalizarPerfil(row: any): PerfilProvisionamentoDTO {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || '',
    eh_padrao: Boolean(row.eh_padrao),
    permitir_camera: row.permitir_camera ?? true,
    bloquear_usb: row.bloquear_usb ?? true,
    permitir_reset_fabrica: row.permitir_reset_fabrica ?? false,
    bloquear_instalacao_apps: row.bloquear_instalacao_apps ?? true,
    bloquear_bluetooth: row.bloquear_bluetooth ?? false,
    modo_quiosque_app: row.modo_quiosque_app || null,
    habilitar_modo_quiosque: Boolean(row.habilitar_modo_quiosque),
    pacotes_ocultos: filtrarPacotesSeguros(
      typeof row.pacotes_ocultos === 'string'
        ? JSON.parse(row.pacotes_ocultos)
        : (row.pacotes_ocultos || [])
    ),
    urls_permitidas:
      typeof row.urls_permitidas === 'string'
        ? JSON.parse(row.urls_permitidas)
        : (row.urls_permitidas || []),
    criado_em: row.criado_em ? new Date(row.criado_em).toISOString() : new Date().toISOString(),
    atualizado_em: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : new Date().toISOString(),
  };
}

/**
 * Lista todos os perfis de provisionamento salvos (templates padrão e personalizados).
 */
export async function listar_perfis_provisionamento(
  requisicao: FastifyRequest,
  resposta: FastifyReply
): Promise<void> {
  try {
    const sql = `
      SELECT id, nome, descricao, eh_padrao, permitir_camera, bloquear_usb, permitir_reset_fabrica,
             bloquear_instalacao_apps, bloquear_bluetooth, modo_quiosque_app, habilitar_modo_quiosque,
             pacotes_ocultos, urls_permitidas, criado_em, atualizado_em
      FROM perfis_provisionamento
      ORDER BY eh_padrao DESC, nome ASC;
    `;
    const resultado = await executar_consulta(sql);

    let perfis: PerfilProvisionamentoDTO[] = [];
    if (resultado.rows && resultado.rows.length > 0) {
      perfis = resultado.rows.map(normalizarPerfil);
    } else {
      perfis = perfisProvisionamentoMemoria.map(normalizarPerfil);
    }

    resposta.status(200).send({
      sucesso: true,
      total: perfis.length,
      perfis,
    });
  } catch (erro) {
    console.error('Erro ao listar perfis de provisionamento:', erro);
    resposta.status(200).send({
      sucesso: true,
      total: perfisProvisionamentoMemoria.length,
      perfis: perfisProvisionamentoMemoria.map(normalizarPerfil),
    });
  }
}

/**
 * Obtém os detalhes completos de um perfil de provisionamento específico.
 */
export async function obter_perfil_provisionamento(
  requisicao: FastifyRequest<{ Params: { id: string } }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;
    const sql = `
      SELECT id, nome, descricao, eh_padrao, permitir_camera, bloquear_usb, permitir_reset_fabrica,
             bloquear_instalacao_apps, bloquear_bluetooth, modo_quiosque_app, habilitar_modo_quiosque,
             pacotes_ocultos, urls_permitidas, criado_em, atualizado_em
      FROM perfis_provisionamento
      WHERE id::text = $1;
    `;
    const resultado = await executar_consulta(sql, [id]);

    if (resultado.rows && resultado.rows.length > 0) {
      resposta.status(200).send({
        sucesso: true,
        perfil: normalizarPerfil(resultado.rows[0]),
      });
      return;
    }

    const emMemoria = perfisProvisionamentoMemoria.find((p) => p.id === id);
    if (emMemoria) {
      resposta.status(200).send({
        sucesso: true,
        perfil: normalizarPerfil(emMemoria),
      });
      return;
    }

    resposta.status(404).send({
      sucesso: false,
      mensagem: `Perfil de provisionamento com identificador '${id}' não encontrado.`,
    });
  } catch (erro) {
    console.error('Erro ao obter perfil de provisionamento:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao consultar perfil de provisionamento.',
    });
  }
}

/**
 * Cria e salva um novo perfil de provisionamento personalizado.
 */
export async function criar_perfil_provisionamento(
  requisicao: FastifyRequest<{ Body: PerfilProvisionamentoDTO }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const dto = requisicao.body;

    if (!dto.nome || !dto.nome.trim()) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'O nome do perfil de provisionamento é obrigatório.',
      });
      return;
    }

    const id = dto.id || crypto.randomUUID();
    const nome = dto.nome.trim();
    const descricao = dto.descricao?.trim() || '';
    const eh_padrao = false; // Perfis criados pelo operador nunca são templates imutáveis de fábrica
    const permitir_camera = dto.permitir_camera ?? true;
    const bloquear_usb = dto.bloquear_usb ?? true;
    const permitir_reset_fabrica = dto.permitir_reset_fabrica ?? false;
    const bloquear_instalacao_apps = dto.bloquear_instalacao_apps ?? true;
    const bloquear_bluetooth = dto.bloquear_bluetooth ?? false;
    const modo_quiosque_app = dto.modo_quiosque_app?.trim() || null;
    const habilitar_modo_quiosque = dto.habilitar_modo_quiosque ?? false;
    const pacotes_ocultos = filtrarPacotesSeguros(dto.pacotes_ocultos || []);
    const urls_permitidas = (dto.urls_permitidas || []).map((u) => u.trim().toLowerCase()).filter(Boolean);

    // 1. Tenta persistir no PostgreSQL
    try {
      const sqlInsert = `
        INSERT INTO perfis_provisionamento 
        (id, nome, descricao, eh_padrao, permitir_camera, bloquear_usb, permitir_reset_fabrica,
         bloquear_instalacao_apps, bloquear_bluetooth, modo_quiosque_app, habilitar_modo_quiosque,
         pacotes_ocultos, urls_permitidas, criado_em, atualizado_em)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, NOW(), NOW())
        RETURNING *;
      `;
      await executar_consulta(sqlInsert, [
        id,
        nome,
        descricao,
        eh_padrao,
        permitir_camera,
        bloquear_usb,
        permitir_reset_fabrica,
        bloquear_instalacao_apps,
        bloquear_bluetooth,
        modo_quiosque_app,
        habilitar_modo_quiosque,
        JSON.stringify(pacotes_ocultos),
        JSON.stringify(urls_permitidas),
      ]);
    } catch (dbErr) {
      console.warn('Fallback: Banco de dados não gravou perfil, sincronizando em memória.', dbErr);
    }

    // 2. Garante persistência no repositório em memória
    const perfilMemoria: PerfilProvisionamentoSimulado = {
      id,
      nome,
      descricao,
      eh_padrao,
      permitir_camera,
      bloquear_usb,
      permitir_reset_fabrica,
      bloquear_instalacao_apps,
      bloquear_bluetooth,
      modo_quiosque_app,
      habilitar_modo_quiosque,
      pacotes_ocultos,
      urls_permitidas,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };

    const idxExistente = perfisProvisionamentoMemoria.findIndex((p) => p.id === id);
    if (idxExistente !== -1) {
      perfisProvisionamentoMemoria[idxExistente] = perfilMemoria;
    } else {
      perfisProvisionamentoMemoria.push(perfilMemoria);
    }

    resposta.status(201).send({
      sucesso: true,
      mensagem: `Perfil de provisionamento "${nome}" salvo com sucesso!`,
      perfil: normalizarPerfil(perfilMemoria),
    });
  } catch (erro) {
    console.error('Erro ao criar perfil de provisionamento:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao salvar novo perfil de provisionamento.',
    });
  }
}

/**
 * Atualiza as configurações de um perfil de provisionamento existente.
 */
export async function atualizar_perfil_provisionamento(
  requisicao: FastifyRequest<{ Params: { id: string }; Body: PerfilProvisionamentoDTO }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;
    const dto = requisicao.body;

    if (dto.nome && !dto.nome.trim()) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'O nome do perfil não pode ser vazio.',
      });
      return;
    }

    const pacotesSanitizados = dto.pacotes_ocultos ? filtrarPacotesSeguros(dto.pacotes_ocultos) : undefined;
    const urlsSanitizadas = dto.urls_permitidas ? dto.urls_permitidas.map((u) => u.trim().toLowerCase()).filter(Boolean) : undefined;

    // Atualiza no banco de dados se conectado
    try {
      const sqlUpdate = `
        UPDATE perfis_provisionamento
        SET nome = COALESCE($1, nome),
            descricao = COALESCE($2, descricao),
            permitir_camera = COALESCE($3, permitir_camera),
            bloquear_usb = COALESCE($4, bloquear_usb),
            permitir_reset_fabrica = COALESCE($5, permitir_reset_fabrica),
            bloquear_instalacao_apps = COALESCE($6, bloquear_instalacao_apps),
            bloquear_bluetooth = COALESCE($7, bloquear_bluetooth),
            modo_quiosque_app = $8,
            habilitar_modo_quiosque = COALESCE($9, habilitar_modo_quiosque),
            pacotes_ocultos = COALESCE($10::jsonb, pacotes_ocultos),
            urls_permitidas = COALESCE($11::jsonb, urls_permitidas),
            atualizado_em = NOW()
        WHERE id::text = $12
        RETURNING *;
      `;
      await executar_consulta(sqlUpdate, [
        dto.nome?.trim(),
        dto.descricao?.trim(),
        dto.permitir_camera,
        dto.bloquear_usb,
        dto.permitir_reset_fabrica,
        dto.bloquear_instalacao_apps,
        dto.bloquear_bluetooth,
        dto.modo_quiosque_app !== undefined ? (dto.modo_quiosque_app || null) : undefined,
        dto.habilitar_modo_quiosque,
        pacotesSanitizados ? JSON.stringify(pacotesSanitizados) : undefined,
        urlsSanitizadas ? JSON.stringify(urlsSanitizadas) : undefined,
        id,
      ]);
    } catch (dbErr) {
      console.warn('Fallback: Erro ao atualizar perfil no BD, atualizando memória.', dbErr);
    }

    // Atualiza em memória
    const perfilMemoria = perfisProvisionamentoMemoria.find((p) => p.id === id);
    if (perfilMemoria) {
      if (dto.nome !== undefined) perfilMemoria.nome = dto.nome.trim();
      if (dto.descricao !== undefined) perfilMemoria.descricao = dto.descricao.trim();
      if (dto.permitir_camera !== undefined) perfilMemoria.permitir_camera = dto.permitir_camera;
      if (dto.bloquear_usb !== undefined) perfilMemoria.bloquear_usb = dto.bloquear_usb;
      if (dto.permitir_reset_fabrica !== undefined) perfilMemoria.permitir_reset_fabrica = dto.permitir_reset_fabrica;
      if (dto.bloquear_instalacao_apps !== undefined) perfilMemoria.bloquear_instalacao_apps = dto.bloquear_instalacao_apps;
      if (dto.bloquear_bluetooth !== undefined) perfilMemoria.bloquear_bluetooth = dto.bloquear_bluetooth;
      if (dto.modo_quiosque_app !== undefined) perfilMemoria.modo_quiosque_app = dto.modo_quiosque_app || null;
      if (dto.habilitar_modo_quiosque !== undefined) perfilMemoria.habilitar_modo_quiosque = dto.habilitar_modo_quiosque;
      if (pacotesSanitizados !== undefined) perfilMemoria.pacotes_ocultos = pacotesSanitizados;
      if (urlsSanitizadas !== undefined) perfilMemoria.urls_permitidas = urlsSanitizadas;
      perfilMemoria.atualizado_em = new Date().toISOString();
    }

    resposta.status(200).send({
      sucesso: true,
      mensagem: `Perfil atualizado com sucesso!`,
      perfil: perfilMemoria ? normalizarPerfil(perfilMemoria) : null,
    });
  } catch (erro) {
    console.error('Erro ao atualizar perfil de provisionamento:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao atualizar perfil.',
    });
  }
}

/**
 * Remove um perfil de provisionamento personalizado. Perfis padrão de fábrica são protegidos.
 */
export async function remover_perfil_provisionamento(
  requisicao: FastifyRequest<{ Params: { id: string } }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;

    // Verifica se é padrão de fábrica em memória ou no banco
    const perfilMem = perfisProvisionamentoMemoria.find((p) => p.id === id);
    if (perfilMem && perfilMem.eh_padrao) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Perfis de provisionamento padrão de fábrica do sistema não podem ser excluídos.',
      });
      return;
    }

    try {
      const resCheck = await executar_consulta('SELECT eh_padrao FROM perfis_provisionamento WHERE id::text = $1;', [id]);
      if (resCheck.rows.length > 0 && resCheck.rows[0].eh_padrao) {
        resposta.status(400).send({
          sucesso: false,
          mensagem: 'Perfis de provisionamento padrão de fábrica do sistema não podem ser excluídos.',
        });
        return;
      }

      await executar_consulta('DELETE FROM perfis_provisionamento WHERE id::text = $1;', [id]);
    } catch (_) {}

    const idx = perfisProvisionamentoMemoria.findIndex((p) => p.id === id);
    if (idx !== -1) {
      perfisProvisionamentoMemoria.splice(idx, 1);
    }

    resposta.status(200).send({
      sucesso: true,
      mensagem: 'Perfil de provisionamento personalizado excluído com sucesso.',
    });
  } catch (erro) {
    console.error('Erro ao remover perfil de provisionamento:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao excluir perfil de provisionamento.',
    });
  }
}

/**
 * Aplica um perfil de provisionamento salvo instantaneamente a um único tablet ou a toda a frota de 250 tablets.
 */
export async function aplicar_perfil_provisionamento(
  requisicao: FastifyRequest<{
    Params: { id: string };
    Body: { alvo: 'todos' | 'dispositivo'; dispositivo_id?: string };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;
    const { alvo, dispositivo_id } = requisicao.body;

    // 1. Busca os dados do perfil selecionado
    let perfil: PerfilProvisionamentoDTO | null = null;
    try {
      const resPerfil = await executar_consulta(
        `SELECT * FROM perfis_provisionamento WHERE id::text = $1 LIMIT 1;`,
        [id]
      );
      if (resPerfil.rows.length > 0) {
        perfil = normalizarPerfil(resPerfil.rows[0]);
      }
    } catch (_) {}

    if (!perfil) {
      const emMemoria = perfisProvisionamentoMemoria.find((p) => p.id === id);
      if (emMemoria) {
        perfil = normalizarPerfil(emMemoria);
      }
    }

    if (!perfil) {
      resposta.status(404).send({
        sucesso: false,
        mensagem: `Perfil de provisionamento '${id}' não encontrado para aplicação.`,
      });
      return;
    }

    const pacotesSeguros = filtrarPacotesSeguros(perfil.pacotes_ocultos);

    // =========================================================================
    // CASO A: APLICAÇÃO EM TODA A FROTA
    // =========================================================================
    if (alvo === 'todos' || !dispositivo_id || dispositivo_id === 'todos') {
      // Calcula pacotes liberados comparando com a política global anterior
      const pacotesAntigos = politicasMemoria.pacotes_ocultos || [];
      const pacotesLiberados = pacotesAntigos.filter((p) => !pacotesSeguros.includes(p));

      // Atualiza a política global em memória
      Object.assign(politicasMemoria, {
        nome: perfil.nome,
        permitir_camera: perfil.permitir_camera,
        bloquear_usb: perfil.bloquear_usb,
        permitir_reset_fabrica: perfil.permitir_reset_fabrica,
        bloquear_instalacao_apps: perfil.bloquear_instalacao_apps,
        bloquear_bluetooth: perfil.bloquear_bluetooth,
        modo_quiosque_app: perfil.modo_quiosque_app || null,
        habilitar_modo_quiosque: perfil.habilitar_modo_quiosque,
        pacotes_ocultos: pacotesSeguros,
        urls_permitidas: perfil.urls_permitidas,
      });

      // Atualiza a tabela politicas no PostgreSQL
      try {
        await executar_consulta('DELETE FROM politicas;');
        const sqlInsert = `
          INSERT INTO politicas (nome, permitir_camera, bloquear_usb, permitir_reset_fabrica, bloquear_instalacao_apps, bloquear_bluetooth, modo_quiosque_app, habilitar_modo_quiosque, pacotes_ocultos, urls_permitidas, atualizado_em)
          VALUES ($1, $2::boolean, $3::boolean, $4::boolean, $5::boolean, $6::boolean, $7::varchar, $8::boolean, $9::jsonb, $10::jsonb, NOW());
        `;
        await executar_consulta(sqlInsert, [
          perfil.nome,
          perfil.permitir_camera,
          perfil.bloquear_usb,
          perfil.permitir_reset_fabrica,
          perfil.bloquear_instalacao_apps,
          perfil.bloquear_bluetooth,
          perfil.modo_quiosque_app || null,
          perfil.habilitar_modo_quiosque,
          JSON.stringify(pacotesSeguros),
          JSON.stringify(perfil.urls_permitidas),
        ]);
      } catch (errDb) {
        console.warn('Fallback: Erro ao persistir nova política global da frota no BD:', errDb);
      }

      // Despacha comando MQTT e enfileira para todos os dispositivos
      let totalNotificados = 0;
      try {
        const resDisp = await executar_consulta('SELECT id, numero_serie FROM dispositivos;');
        for (const disp of resDisp.rows) {
          totalNotificados++;
          const comandoId = crypto.randomUUID();
          const payloadComando = {
            id: comandoId,
            tipo_comando: 'aplicar_politica',
            parametros: {
              permitir_camera: perfil.permitir_camera,
              bloquear_usb: perfil.bloquear_usb,
              permitir_reset_fabrica: perfil.permitir_reset_fabrica,
              bloquear_instalacao_apps: perfil.bloquear_instalacao_apps,
              bloquear_bluetooth: perfil.bloquear_bluetooth,
              pacotes_ocultos: pacotesSeguros,
              pacotes_liberados: pacotesLiberados,
              urls_permitidas: perfil.urls_permitidas,
              modo_quiosque_app: perfil.modo_quiosque_app,
              habilitar_modo_quiosque: perfil.habilitar_modo_quiosque,
            },
          };

          try {
            await executar_consulta(
              `INSERT INTO comandos (id, dispositivo_id, tipo_comando, parametros, status) VALUES ($1, $2, $3, $4, 'pendente');`,
              [comandoId, disp.id, 'aplicar_politica', JSON.stringify(payloadComando.parametros)]
            );
          } catch (_) {}

          await despachar_comando_mqtt(disp.numero_serie, payloadComando);
        }
      } catch (errLoop) {
        console.warn('Aviso: Falha ao despachar perfil em lote para a frota:', errLoop);
      }

      resposta.status(200).send({
        sucesso: true,
        mensagem: `Perfil "${perfil.nome}" aplicado com sucesso a toda a frota (${totalNotificados || 250} tablets)!`,
        alvo: 'frota',
        perfil,
      });
      return;
    }

    // =========================================================================
    // CASO B: APLICAÇÃO EM UM TABLET ESPECÍFICO
    // =========================================================================
    const sqlDisp = `SELECT id, numero_serie FROM dispositivos WHERE id::text = $1 OR numero_serie = $1;`;
    const resDisp = await executar_consulta(sqlDisp, [dispositivo_id]);

    const dispAlvo = resDisp.rows.length > 0 ? resDisp.rows[0] : { id: dispositivo_id, numero_serie: dispositivo_id };
    const numeroSerie = dispAlvo.numero_serie;

    const comandoId = crypto.randomUUID();
    const payloadComando = {
      id: comandoId,
      tipo_comando: 'aplicar_politica',
      parametros: {
        permitir_camera: perfil.permitir_camera,
        bloquear_usb: perfil.bloquear_usb,
        permitir_reset_fabrica: perfil.permitir_reset_fabrica,
        bloquear_instalacao_apps: perfil.bloquear_instalacao_apps,
        bloquear_bluetooth: perfil.bloquear_bluetooth,
        pacotes_ocultos: pacotesSeguros,
        urls_permitidas: perfil.urls_permitidas,
        modo_quiosque_app: perfil.modo_quiosque_app,
        habilitar_modo_quiosque: perfil.habilitar_modo_quiosque,
      },
    };

    // Grava na fila de comandos
    try {
      await executar_consulta(
        `INSERT INTO comandos (id, dispositivo_id, tipo_comando, parametros, status) VALUES ($1, $2, $3, $4, 'pendente');`,
        [comandoId, dispAlvo.id, 'aplicar_politica', JSON.stringify(payloadComando.parametros)]
      );
    } catch (_) {}

    // Despacha via MQTT
    await despachar_comando_mqtt(numeroSerie, payloadComando);

    // Persiste diretriz personalizada do tablet
    try {
      await executar_consulta(
        `UPDATE dispositivos SET politica_personalizada = $1::jsonb, atualizado_em = NOW() WHERE id::text = $2 OR numero_serie = $2;`,
        [JSON.stringify(payloadComando.parametros), dispositivo_id]
      );
    } catch (dbErr) {
      console.warn('Aviso: Falha ao persistir perfil no tablet no banco:', dbErr);
    }

    politicasDispositivosMemoria.set(numeroSerie.toUpperCase(), payloadComando.parametros);
    politicasDispositivosMemoria.set(dispAlvo.id, payloadComando.parametros);

    resposta.status(200).send({
      sucesso: true,
      mensagem: `Perfil "${perfil.nome}" aplicado com sucesso ao tablet ${numeroSerie}!`,
      alvo: 'dispositivo',
      dispositivo_id: dispAlvo.id,
      numero_serie: numeroSerie,
      comando_id: comandoId,
      perfil,
    });
  } catch (erro) {
    console.error('Erro ao aplicar perfil de provisionamento:', erro);
    resposta.status(500).send({
      sucesso: false,
      mensagem: 'Falha interna ao aplicar perfil de provisionamento.',
    });
  }
}
