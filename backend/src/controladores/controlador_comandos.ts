import { FastifyRequest, FastifyReply } from 'fastify';
import { executar_consulta } from '../banco/conexao';
import { despachar_comando_mqtt } from '../servicos/servico_mqtt';

export interface CorpoComando {
  dispositivo_id: string; // UUID ou número de série
  tipo_comando:
    | 'bloquear_tela_imediata'
    | 'reiniciar_aparelho'
    | 'definir_bloqueio_reset_fabrica'
    | 'definir_bloqueio_camera'
    | 'definir_bloqueio_usb'
    | 'modo_quiosque'
    | 'instalar_aplicativo_silencioso'
    | 'limpar_dados_dispositivo';
  parametros?: Record<string, any>;
}

/**
 * Registra o comando no banco de dados e dispara a publicação via MQTT para o tablet.
 */
export async function despachar_comando_dispositivo(
  requisicao: FastifyRequest<{ Body: CorpoComando }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { dispositivo_id, tipo_comando, parametros = {} } = requisicao.body;

    if (!dispositivo_id || !tipo_comando) {
      resposta.status(400).send({ sucesso: false, mensagem: 'dispositivo_id e tipo_comando são obrigatórios.' });
      return;
    }

    // Localiza o dispositivo para obter ID e número de série exato
    const sqlDisp = `SELECT id, numero_serie, status_conexao FROM dispositivos WHERE id::text = $1 OR numero_serie = $1;`;
    const resDisp = await executar_consulta(sqlDisp, [dispositivo_id]);

    if (resDisp.rows.length === 0) {
      resposta.status(404).send({ sucesso: false, mensagem: 'Dispositivo alvo não encontrado.' });
      return;
    }

    const { id: dispUuid, numero_serie, status_conexao } = resDisp.rows[0];

    // Registra o comando no banco de dados como 'pendente'
    const sqlInsert = `
      INSERT INTO comandos (dispositivo_id, tipo_comando, parametros, status, criado_em)
      VALUES ($1, $2, $3, 'pendente', NOW())
      RETURNING id, criado_em;
    `;
    const resInsert = await executar_consulta(sqlInsert, [
      dispUuid,
      tipo_comando,
      JSON.stringify(parametros),
    ]);

    const comandoId = resInsert.rows[0].id;

    // Publica no tópico MQTT
    const enviadoMqtt = await despachar_comando_mqtt(numero_serie, {
      id: comandoId,
      tipo_comando,
      parametros,
    });

    // Se despachado para o broker, atualiza para 'enviado'
    if (enviadoMqtt) {
      await executar_consulta(`UPDATE comandos SET status = 'enviado' WHERE id = $1;`, [comandoId]);
    }

    resposta.status(200).send({
      sucesso: true,
      comando_id: comandoId,
      dispositivo_numero_serie: numero_serie,
      tipo_comando,
      status: enviadoMqtt ? 'enviado' : 'pendente',
      tablet_conectado: status_conexao === 'conectado',
      mensagem: enviadoMqtt
        ? 'Comando transmitido com sucesso via MQTTS.'
        : 'Comando armazenado na fila; aguardando conexão do dispositivo.',
    });
  } catch (erro) {
    console.error('Erro em despachar_comando_dispositivo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro interno ao despachar comando.' });
  }
}

/**
 * Envia um comando em lote para múltiplos tablets ou para toda a frota conectada.
 */
export async function despachar_comando_em_lote(
  requisicao: FastifyRequest<{
    Body: {
      tipo_comando: CorpoComando['tipo_comando'];
      parametros?: Record<string, any>;
      apenas_conectados?: boolean;
    };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { tipo_comando, parametros = {}, apenas_conectados = true } = requisicao.body;

    const sqlAlvos = apenas_conectados
      ? `SELECT id, numero_serie FROM dispositivos WHERE status_conexao = 'conectado';`
      : `SELECT id, numero_serie FROM dispositivos;`;

    const resAlvos = await executar_consulta(sqlAlvos);
    const dispositivos = resAlvos.rows;

    let totalDespachados = 0;

    for (const d of dispositivos) {
      const sqlInsert = `
        INSERT INTO comandos (dispositivo_id, tipo_comando, parametros, status, criado_em)
        VALUES ($1, $2, $3, 'enviado', NOW())
        RETURNING id;
      `;
      const resCmd = await executar_consulta(sqlInsert, [d.id, tipo_comando, JSON.stringify(parametros)]);
      const comandoId = resCmd.rows[0].id;

      await despachar_comando_mqtt(d.numero_serie, {
        id: comandoId,
        tipo_comando,
        parametros,
      });

      totalDespachados++;
    }

    resposta.status(200).send({
      sucesso: true,
      mensagem: `Comando '${tipo_comando}' transmitido em lote para ${totalDespachados} tablets.`,
      total_afetados: totalDespachados,
    });
  } catch (erro) {
    console.error('Erro em despachar_comando_em_lote:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao despachar comando em lote.' });
  }
}
