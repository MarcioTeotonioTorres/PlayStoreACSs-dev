"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.despachar_comando_dispositivo = despachar_comando_dispositivo;
exports.despachar_comando_em_lote = despachar_comando_em_lote;
const conexao_1 = require("../banco/conexao");
const servico_mqtt_1 = require("../servicos/servico_mqtt");
/**
 * Registra o comando no banco de dados e dispara a publicação via MQTT para o tablet.
 */
async function despachar_comando_dispositivo(requisicao, resposta) {
    try {
        const { dispositivo_id, tipo_comando, parametros = {} } = requisicao.body;
        if (!dispositivo_id || !tipo_comando) {
            resposta.status(400).send({ sucesso: false, mensagem: 'dispositivo_id e tipo_comando são obrigatórios.' });
            return;
        }
        // Localiza o dispositivo para obter ID e número de série exato
        const sqlDisp = `SELECT id, numero_serie, status_conexao FROM dispositivos WHERE id::text = $1 OR numero_serie = $1;`;
        const resDisp = await (0, conexao_1.executar_consulta)(sqlDisp, [dispositivo_id]);
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
        const resInsert = await (0, conexao_1.executar_consulta)(sqlInsert, [
            dispUuid,
            tipo_comando,
            JSON.stringify(parametros),
        ]);
        const comandoId = resInsert.rows[0].id;
        // Publica no tópico MQTT
        const enviadoMqtt = await (0, servico_mqtt_1.despachar_comando_mqtt)(numero_serie, {
            id: comandoId,
            tipo_comando,
            parametros,
        });
        // Se despachado para o broker, atualiza para 'enviado'
        if (enviadoMqtt) {
            await (0, conexao_1.executar_consulta)(`UPDATE comandos SET status = 'enviado' WHERE id = $1;`, [comandoId]);
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
    }
    catch (erro) {
        console.error('Erro em despachar_comando_dispositivo:', erro);
        resposta.status(500).send({ sucesso: false, mensagem: 'Erro interno ao despachar comando.' });
    }
}
/**
 * Envia um comando em lote para múltiplos tablets ou para toda a frota conectada.
 */
async function despachar_comando_em_lote(requisicao, resposta) {
    try {
        const { tipo_comando, parametros = {}, apenas_conectados = true } = requisicao.body;
        const sqlAlvos = apenas_conectados
            ? `SELECT id, numero_serie FROM dispositivos WHERE status_conexao = 'conectado';`
            : `SELECT id, numero_serie FROM dispositivos;`;
        const resAlvos = await (0, conexao_1.executar_consulta)(sqlAlvos);
        const dispositivos = resAlvos.rows;
        let totalDespachados = 0;
        for (const d of dispositivos) {
            const sqlInsert = `
        INSERT INTO comandos (dispositivo_id, tipo_comando, parametros, status, criado_em)
        VALUES ($1, $2, $3, 'enviado', NOW())
        RETURNING id;
      `;
            const resCmd = await (0, conexao_1.executar_consulta)(sqlInsert, [d.id, tipo_comando, JSON.stringify(parametros)]);
            const comandoId = resCmd.rows[0].id;
            await (0, servico_mqtt_1.despachar_comando_mqtt)(d.numero_serie, {
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
    }
    catch (erro) {
        console.error('Erro em despachar_comando_em_lote:', erro);
        resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao despachar comando em lote.' });
    }
}
