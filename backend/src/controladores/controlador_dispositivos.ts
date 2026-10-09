import { FastifyRequest, FastifyReply } from 'fastify';
import { executar_consulta } from '../banco/conexao';

/**
 * Retorna as métricas consolidadas da frota de 250 tablets.
 */
export async function obter_resumo_frota(
  requisicao: FastifyRequest,
  resposta: FastifyReply
): Promise<void> {
  try {
    const sqlMetricas = `
      SELECT
        COUNT(*)::int AS total_dispositivos,
        COUNT(*) FILTER (WHERE status_conexao = 'conectado')::int AS conectados,
        COUNT(*) FILTER (WHERE status_conexao = 'desconectado')::int AS desconectados,
        COUNT(*) FILTER (WHERE bateria <= 20)::int AS bateria_critica,
        COUNT(*) FILTER (WHERE sinal_wifi_rssi < -75)::int AS sinal_wifi_fraco,
        COUNT(*) FILTER (WHERE app_foco IS NOT NULL AND app_foco != 'Sistema / Área de Trabalho')::int AS em_uso_ativo
      FROM dispositivos;
    `;

    const resultado = await executar_consulta(sqlMetricas);
    const metricas = resultado.rows[0] || {
      total_dispositivos: 0,
      conectados: 0,
      desconectados: 0,
      bateria_critica: 0,
      sinal_wifi_fraco: 0,
      em_uso_ativo: 0,
    };

    resposta.status(200).send({
      sucesso: true,
      capacidade_frota: 250,
      metricas,
      atualizado_em: new Date().toISOString(),
    });
  } catch (erro) {
    console.error('Erro em obter_resumo_frota:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro interno ao consultar resumo da frota.' });
  }
}

/**
 * Lista todos os tablets gerenciados com suporte a busca e filtros.
 */
export async function listar_dispositivos(
  requisicao: FastifyRequest<{
    Querystring: {
      status?: string;
      busca?: string;
      limite?: string;
      offset?: string;
    };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { status, busca, limite = '50', offset = '0' } = requisicao.query;

    let clausulasWhere: string[] = [];
    let parametros: any[] = [];
    let contador = 1;

    if (status && status !== 'todos') {
      clausulasWhere.push(`status_conexao = $${contador++}`);
      parametros.push(status);
    }

    if (busca && busca.trim().length > 0) {
      clausulasWhere.push(`(numero_serie ILIKE $${contador} OR modelo ILIKE $${contador} OR ssid_wifi ILIKE $${contador})`);
      parametros.push(`%${busca}%`);
      contador++;
    }

    const whereSql = clausulasWhere.length > 0 ? `WHERE ${clausulasWhere.join(' AND ')}` : '';

    const sqlLista = `
      SELECT
        id, numero_serie, modelo, versao_so, status_conexao,
        bateria, esta_carregando, sinal_wifi_rssi, ssid_wifi,
        app_foco, tempo_ocioso_minutos, memoria_ram_livre_mb, armazenamento_livre_mb,
        ultimo_contato, criado_em
      FROM dispositivos
      ${whereSql}
      ORDER BY status_conexao ASC, ultimo_contato DESC
      LIMIT $${contador++} OFFSET $${contador++};
    `;

    parametros.push(Number(limite), Number(offset));

    const resultado = await executar_consulta(sqlLista, parametros);

    resposta.status(200).send({
      sucesso: true,
      total_retornado: resultado.rows.length,
      dispositivos: resultado.rows,
    });
  } catch (erro) {
    console.error('Erro em listar_dispositivos:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao listar dispositivos.' });
  }
}

/**
 * Consulta a telemetria e o histórico recente de um tablet específico.
 */
export async function obter_detalhes_dispositivo(
  requisicao: FastifyRequest<{ Params: { id: string } }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;

    const sqlDispositivo = `SELECT * FROM dispositivos WHERE id = $1 OR numero_serie = $1;`;
    const resDispositivo = await executar_consulta(sqlDispositivo, [id]);

    if (resDispositivo.rows.length === 0) {
      resposta.status(404).send({ sucesso: false, mensagem: 'Dispositivo não encontrado.' });
      return;
    }

    const dispositivo = resDispositivo.rows[0];

    const sqlComandos = `
      SELECT id, tipo_comando, parametros, status, resposta, criado_em, executado_em
      FROM comandos
      WHERE dispositivo_id = $1
      ORDER BY criado_em DESC
      LIMIT 10;
    `;
    const resComandos = await executar_consulta(sqlComandos, [dispositivo.id]);

    const sqlTelemetria = `
      SELECT bateria, sinal_wifi_rssi, memoria_ram_livre_mb, armazenamento_livre_mb, registrado_em
      FROM logs_telemetria
      WHERE dispositivo_id = $1
      ORDER BY registrado_em DESC
      LIMIT 20;
    `;
    const resTelemetria = await executar_consulta(sqlTelemetria, [dispositivo.id]);

    resposta.status(200).send({
      sucesso: true,
      dispositivo,
      ultimos_comandos: resComandos.rows,
      historico_telemetria: resTelemetria.rows,
    });
  } catch (erro) {
    console.error('Erro em obter_detalhes_dispositivo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao obter detalhes do dispositivo.' });
  }
}

/**
 * Cadastra um novo tablet na frota imediatamente.
 */
export async function cadastrar_dispositivo_manual(
  requisicao: FastifyRequest<{
    Body: {
      numero_serie: string;
      modelo?: string;
      versao_so?: string;
      bateria?: number;
      sinal_wifi_rssi?: number;
      ssid_wifi?: string;
      app_foco?: string;
    };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { numero_serie, modelo, versao_so, bateria, sinal_wifi_rssi, ssid_wifi, app_foco } = requisicao.body;

    if (!numero_serie || numero_serie.trim().length === 0) {
      resposta.status(400).send({ sucesso: false, mensagem: 'O número de série é obrigatório.' });
      return;
    }

    // Validação de duplicidade no banco
    const checkSql = 'SELECT id FROM dispositivos WHERE numero_serie = $1';
    const checkRes = await executar_consulta(checkSql, [numero_serie.trim().toUpperCase()]);
    if (checkRes.rows.length > 0) {
      resposta.status(409).send({ sucesso: false, mensagem: 'Este número de série já está cadastrado na frota.' });
      return;
    }

    const sqlInsert = `
      INSERT INTO dispositivos (
        numero_serie, modelo, versao_so, status_conexao, bateria, esta_carregando,
        sinal_wifi_rssi, ssid_wifi, app_foco, ultimo_contato, atualizado_em
      ) VALUES (
        $1, $2, $3, 'desconectado', $4, false, $5, $6, $7, NOW(), NOW()
      ) RETURNING *;
    `;

    const res = await executar_consulta(sqlInsert, [
      numero_serie.trim().toUpperCase(),
      modelo?.trim() || 'Samsung Galaxy Tab A9+',
      versao_so?.trim() || 'Android 14 (API 34)',
      bateria ?? 100,
      sinal_wifi_rssi ?? -50,
      ssid_wifi?.trim() || 'Corporativo-WiFi',
      app_foco?.trim() || 'com.mdm.corporativo',
    ]);

    resposta.status(201).send({
      sucesso: true,
      mensagem: `Dispositivo ${res.rows[0].numero_serie} cadastrado com sucesso na frota!`,
      dispositivo: res.rows[0],
    });
  } catch (erro) {
    console.error('Erro em cadastrar_dispositivo_manual:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao cadastrar dispositivo.' });
  }
}

/**
 * Endpoint HTTP REST para recepção de telemetria periódica direta de tablets Android.
 */
export async function receber_telemetria_http(
  requisicao: FastifyRequest<{
    Body: {
      numero_serie: string;
      modelo?: string;
      versao_so?: string;
      nivel_bateria?: number;
      esta_carregando?: boolean;
      sinal_wifi_rssi?: number;
      ssid_wifi?: string;
      app_em_foco?: string;
      armazenamento_livre_mb?: number;
      memoria_ram_livre_mb?: number;
    };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const dados = requisicao.body;
    if (!dados || !dados.numero_serie) {
      resposta.status(400).send({ sucesso: false, mensagem: 'Número de série é obrigatório.' });
      return;
    }
    const { processar_mensagem_telemetria } = await import('../servicos/servico_mqtt');
    await processar_mensagem_telemetria(dados.numero_serie, dados);
    resposta.status(200).send({ sucesso: true, mensagem: 'Telemetria registrada com sucesso.' });
  } catch (erro) {
    console.error('Erro em receber_telemetria_http:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao processar telemetria HTTP.' });
  }
}

/**
 * Remove um tablet do inventário permanentemente (exclui telemetria e comandos associados).
 */
export async function remover_dispositivo(
  requisicao: FastifyRequest<{ Params: { id: string } }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;

    // Verifica se o dispositivo existe
    const sqlBusca = `SELECT id, numero_serie, modelo FROM dispositivos WHERE id::text = $1 OR numero_serie = $1;`;
    const resDispositivo = await executar_consulta(sqlBusca, [id]);

    if (resDispositivo.rows.length === 0) {
      resposta.status(404).send({ sucesso: false, mensagem: 'Dispositivo não encontrado no inventário.' });
      return;
    }

    const dispositivo = resDispositivo.rows[0];

    // Remove registros dependentes (cascata manual para compatibilidade)
    await executar_consulta(`DELETE FROM logs_telemetria WHERE dispositivo_id = $1;`, [dispositivo.id]);
    await executar_consulta(`DELETE FROM comandos WHERE dispositivo_id = $1;`, [dispositivo.id]);

    // Remove o dispositivo
    await executar_consulta(`DELETE FROM dispositivos WHERE id = $1;`, [dispositivo.id]);

    resposta.status(200).send({
      sucesso: true,
      mensagem: `Tablet ${dispositivo.modelo} (SN: ${dispositivo.numero_serie}) removido do inventário com sucesso.`,
      dispositivo_removido: {
        id: dispositivo.id,
        numero_serie: dispositivo.numero_serie,
        modelo: dispositivo.modelo,
      },
    });
  } catch (erro) {
    console.error('Erro em remover_dispositivo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao remover dispositivo do inventário.' });
  }
}
