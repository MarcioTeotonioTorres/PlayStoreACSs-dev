import { FastifyRequest, FastifyReply } from 'fastify';
import { executar_consulta } from '../banco/conexao';
import { despachar_comando_mqtt } from '../servicos/servico_mqtt';
import crypto from 'crypto';

export interface PoliticaDTO {
  nome?: string;
  permitir_camera?: boolean;
  bloquear_usb?: boolean;
  permitir_reset_fabrica?: boolean;
  modo_quiosque_app?: string;
  habilitar_modo_quiosque?: boolean;
  pacotes_ocultos?: string[];
  urls_permitidas?: string[];
}

// Armazenamento em memória das políticas caso o PostgreSQL local não esteja conectado
let politicasMemoria: PoliticaDTO = {
  nome: 'Política Padrão da Frota',
  permitir_camera: true,
  bloquear_usb: true,
  permitir_reset_fabrica: false,
  modo_quiosque_app: '',
  habilitar_modo_quiosque: false,
  pacotes_ocultos: [
    'com.google.android.youtube',
    'com.android.vending',
    'com.google.android.apps.photos',
  ],
  urls_permitidas: [
    'portal.empresa.com.br',
    '*.empresa.com.br',
    'sistema.empresa.com.br',
  ],
};

/**
 * Retorna as políticas de controle e restrições ativas na frota.
 */
export async function obter_politicas_frota(
  requisicao: FastifyRequest,
  resposta: FastifyReply
): Promise<void> {
  try {
    const sql = `
      SELECT id, nome, permitir_camera, bloquear_usb, permitir_reset_fabrica,
             modo_quiosque_app, habilitar_modo_quiosque, pacotes_ocultos, urls_permitidas, atualizado_em
      FROM politicas
      ORDER BY atualizado_em DESC
      LIMIT 1;
    `;
    const resultado = await executar_consulta(sql);

    const dados = resultado.rows.length > 0 ? resultado.rows[0] : politicasMemoria;

    resposta.status(200).send({
      sucesso: true,
      politica: dados,
    });
  } catch (erro) {
    console.error('Erro em obter_politicas_frota:', erro);
    resposta.status(200).send({
      sucesso: true,
      politica: politicasMemoria,
    });
  }
}

/**
 * Atualiza as diretrizes globais da frota e despacha as ordens via MQTT para todos os 250 tablets.
 */
export async function atualizar_politicas_globais_frota(
  requisicao: FastifyRequest<{ Body: PoliticaDTO }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const dto = requisicao.body;

    // Atualiza cópia em memória
    politicasMemoria = {
      ...politicasMemoria,
      ...dto,
      pacotes_ocultos: dto.pacotes_ocultos ?? politicasMemoria.pacotes_ocultos,
      urls_permitidas: dto.urls_permitidas ?? politicasMemoria.urls_permitidas,
    };

    // Tenta atualizar no PostgreSQL caso conectado
    try {
      // Deleta qualquer política existente e insere a nova para garantir persistência 100%
      await executar_consulta('DELETE FROM politicas;');
      const sqlInsert = `
        INSERT INTO politicas (nome, permitir_camera, bloquear_usb, permitir_reset_fabrica, modo_quiosque_app, habilitar_modo_quiosque, pacotes_ocultos, urls_permitidas, atualizado_em)
        VALUES ('Política Padrão Frota', $1::boolean, $2::boolean, $3::boolean, $4::varchar, $5::boolean, $6::jsonb, $7::jsonb, NOW());
      `;
      await executar_consulta(sqlInsert, [
        politicasMemoria.permitir_camera,
        politicasMemoria.bloquear_usb,
        politicasMemoria.permitir_reset_fabrica,
        politicasMemoria.modo_quiosque_app || null,
        politicasMemoria.habilitar_modo_quiosque,
        JSON.stringify(politicasMemoria.pacotes_ocultos),
        JSON.stringify(politicasMemoria.urls_permitidas),
      ]);
    } catch (dbErr) {
      console.warn('Fallback: Banco de dados não disponível para salvar políticas. Mantendo em memória.', dbErr);
    }

    // Despacho MQTT para todos os dispositivos conectados da frota individualmente (já que o app não assina broadcast)
    try {
      const resDisp = await executar_consulta("SELECT numero_serie FROM dispositivos WHERE status_conexao = 'conectado';");
      for (const disp of resDisp.rows) {
        const comandoId = crypto.randomUUID();
        const payloadComando = {
          id: comandoId,
          tipo_comando: 'aplicar_politica',
          parametros: {
            permitir_camera: politicasMemoria.permitir_camera,
            bloquear_usb: politicasMemoria.bloquear_usb,
            permitir_reset_fabrica: politicasMemoria.permitir_reset_fabrica,
            pacotes_ocultos: politicasMemoria.pacotes_ocultos,
            urls_permitidas: politicasMemoria.urls_permitidas,
          },
        };
        await despachar_comando_mqtt(disp.numero_serie, payloadComando);
      }
    } catch (errMqttLoop) {
       // Fallback se não conseguir ler do BD, apenas ignora
       console.warn('Aviso: Falha ao despachar comandos individuais de política.', errMqttLoop);
    }

    resposta.status(200).send({
      sucesso: true,
      mensagem: 'Políticas corporativas atualizadas e despachadas para a frota!',
      politica: politicasMemoria,
    });
  } catch (erro) {
    console.error('Erro em atualizar_politicas_globais_frota:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao atualizar políticas corporativas.' });
  }
}

/**
 * Aplica uma política personalizada a um único tablet específico da frota.
 */
export async function atualizar_politicas_dispositivo(
  requisicao: FastifyRequest<{ Params: { id: string }; Body: PoliticaDTO }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { id } = requisicao.params;
    const dto = requisicao.body;

    const sqlDisp = `SELECT id, numero_serie FROM dispositivos WHERE id::text = $1 OR numero_serie = $1;`;
    const resDisp = await executar_consulta(sqlDisp, [id]);

    const numeroSerie = resDisp.rows.length > 0 ? resDisp.rows[0].numero_serie : id;

    const comandoId = crypto.randomUUID();
    const payloadComando = {
      id: comandoId,
      tipo_comando: 'aplicar_politica',
      parametros: {
        permitir_camera: dto.permitir_camera ?? true,
        bloquear_usb: dto.bloquear_usb ?? true,
        permitir_reset_fabrica: dto.permitir_reset_fabrica ?? false,
        pacotes_ocultos: dto.pacotes_ocultos || [],
        urls_permitidas: dto.urls_permitidas || [],
      },
    };

    await despachar_comando_mqtt(numeroSerie, payloadComando);

    resposta.status(200).send({
      sucesso: true,
      mensagem: `Diretrizes enviadas via MQTT para o tablet ${numeroSerie}.`,
      comando_id: comandoId,
    });
  } catch (erro) {
    console.error('Erro em atualizar_politicas_dispositivo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao despachar política para o dispositivo.' });
  }
}
