import { FastifyRequest, FastifyReply } from 'fastify';
import { executar_consulta } from '../banco/conexao';
import { despachar_comando_mqtt } from '../servicos/servico_mqtt';
import crypto from 'crypto';

export interface PoliticaDTO {
  nome?: string;
  permitir_camera?: boolean;
  bloquear_usb?: boolean;
  permitir_reset_fabrica?: boolean;
  bloquear_instalacao_apps?: boolean;
  bloquear_bluetooth?: boolean;
  modo_quiosque_app?: string;
  habilitar_modo_quiosque?: boolean;
  pacotes_ocultos?: string[];
  urls_permitidas?: string[];
}

export const PACOTES_VITAIS_IMUNES = new Set([
  'com.android.settings',
  'com.android.systemui',
  'android',
  'com.android.launcher',
  'com.android.launcher3',
  'com.tcl.launcher',
  'com.sec.android.app.launcher',
  'com.google.android.apps.nexuslauncher',
  'com.android.packageinstaller',
  'com.google.android.packageinstaller',
  'com.android.permissioncontroller',
  'com.google.android.permissioncontroller',
  'com.android.inputmethod.latin',
  'com.google.android.inputmethod.latin',
  'com.google.android.webview',
  'com.android.webview',
  'com.android.providers.media',
  'com.android.providers.media.module',
  'com.android.providers.settings',
  'com.android.documentsui',
  'com.mdm.corporativo',
  'com.google.android.gms',
]);

export function filtrarPacotesSeguros(pacotes?: string[]): string[] {
  if (!pacotes || !Array.isArray(pacotes)) return [];
  return pacotes.filter(
    (p) => !PACOTES_VITAIS_IMUNES.has(p.trim().toLowerCase()) && !p.trim().toLowerCase().startsWith('com.android.providers.')
  );
}

// Armazenamento em memória das políticas caso o PostgreSQL local não esteja conectado
let politicasMemoria: PoliticaDTO = {
  nome: 'Política Padrão da Frota',
  permitir_camera: true,
  bloquear_usb: true,
  permitir_reset_fabrica: false,
  bloquear_instalacao_apps: true,
  bloquear_bluetooth: true,
  modo_quiosque_app: '',
  habilitar_modo_quiosque: false,
  pacotes_ocultos: [
    'com.google.android.youtube',
    'com.android.vending',
    'com.google.android.apps.photos',
    'com.google.android.gm',
    'com.google.android.apps.tachyon',
    'com.google.android.videos',
    'com.google.android.apps.docs',
    'com.google.android.apps.youtube.music',
    'com.google.android.googlequicksearchbox',
    'com.google.android.apps.magazines',
    'com.google.android.play.games',
    'com.google.android.apps.podcasts',
    'com.google.android.feedback',
    'com.tcl.live',
    'com.tcl.community',
    'com.tcl.appstore',
    'com.tcl.usercenter',
    'com.tcl.browser',
    'com.tcl.smartswitch',
    'com.tcl.gamecenter',
    'com.netflix.mediaclient',
    'com.facebook.katana',
    'com.facebook.services',
    'com.facebook.system',
    'com.instagram.android',
    'com.zhiliaoapp.musically',
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
             bloquear_instalacao_apps, bloquear_bluetooth,
             modo_quiosque_app, habilitar_modo_quiosque, pacotes_ocultos, urls_permitidas, atualizado_em
      FROM politicas
      ORDER BY atualizado_em DESC
      LIMIT 1;
    `;
    const resultado = await executar_consulta(sql);

    const dados = resultado.rows.length > 0 ? resultado.rows[0] : politicasMemoria;

    if (dados && dados.pacotes_ocultos) {
      dados.pacotes_ocultos = filtrarPacotesSeguros(dados.pacotes_ocultos);
    }

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

    // Sanitiza pacotes ocultos: NUNCA permite que pacotes vitais do sistema operacional sejam bloqueados
    const pacotesNovosBrutos = dto.pacotes_ocultos ?? (politicasMemoria.pacotes_ocultos || []);
    const pacotesNovos = filtrarPacotesSeguros(pacotesNovosBrutos);

    // Calcula quais pacotes foram removidos da lista de ocultos para enviar explicitamente como liberados
    const pacotesAntigos = politicasMemoria.pacotes_ocultos || [];
    const pacotesLiberados = pacotesAntigos.filter(p => !pacotesNovos.includes(p));

    // Atualiza cópia em memória
    politicasMemoria = {
      ...politicasMemoria,
      ...dto,
      pacotes_ocultos: pacotesNovos,
      urls_permitidas: dto.urls_permitidas ?? politicasMemoria.urls_permitidas,
    };

    // Tenta atualizar no PostgreSQL caso conectado
    try {
      // Deleta qualquer política existente e insere a nova para garantir persistência 100%
      await executar_consulta('DELETE FROM politicas;');
      const sqlInsert = `
        INSERT INTO politicas (nome, permitir_camera, bloquear_usb, permitir_reset_fabrica, bloquear_instalacao_apps, bloquear_bluetooth, modo_quiosque_app, habilitar_modo_quiosque, pacotes_ocultos, urls_permitidas, atualizado_em)
        VALUES ('Política Padrão Frota', $1::boolean, $2::boolean, $3::boolean, $4::boolean, $5::boolean, $6::varchar, $7::boolean, $8::jsonb, $9::jsonb, NOW());
      `;
      await executar_consulta(sqlInsert, [
        politicasMemoria.permitir_camera,
        politicasMemoria.bloquear_usb,
        politicasMemoria.permitir_reset_fabrica,
        politicasMemoria.bloquear_instalacao_apps,
        politicasMemoria.bloquear_bluetooth,
        politicasMemoria.modo_quiosque_app || null,
        politicasMemoria.habilitar_modo_quiosque,
        JSON.stringify(politicasMemoria.pacotes_ocultos),
        JSON.stringify(politicasMemoria.urls_permitidas),
      ]);
    } catch (dbErr) {
      console.warn('Fallback: Banco de dados não disponível para salvar políticas. Mantendo em memória.', dbErr);
    }

    // Despacho MQTT e persistência na fila de comandos para sincronização HTTP dual-channel
    try {
      const resDisp = await executar_consulta("SELECT id, numero_serie FROM dispositivos;");
      for (const disp of resDisp.rows) {
        const comandoId = crypto.randomUUID();
        const payloadComando = {
          id: comandoId,
          tipo_comando: 'aplicar_politica',
          parametros: {
            permitir_camera: politicasMemoria.permitir_camera,
            bloquear_usb: politicasMemoria.bloquear_usb,
            permitir_reset_fabrica: politicasMemoria.permitir_reset_fabrica,
            bloquear_instalacao_apps: politicasMemoria.bloquear_instalacao_apps,
            bloquear_bluetooth: politicasMemoria.bloquear_bluetooth,
            pacotes_ocultos: politicasMemoria.pacotes_ocultos,
            pacotes_liberados: pacotesLiberados,
            urls_permitidas: politicasMemoria.urls_permitidas,
          },
        };

        // Grava na fila de comandos para resgate imediato via polling HTTP de telemetria
        try {
          await executar_consulta(
            `INSERT INTO comandos (id, dispositivo_id, tipo_comando, parametros, status) VALUES ($1, $2, $3, $4, 'pendente');`,
            [comandoId, disp.id, 'aplicar_politica', JSON.stringify(payloadComando.parametros)]
          );
        } catch (_) {}

        // Despacha instantaneamente via MQTT para os tablets conectados
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

    const pacotesSeguros = filtrarPacotesSeguros(dto.pacotes_ocultos);

    const comandoId = crypto.randomUUID();
    const payloadComando = {
      id: comandoId,
      tipo_comando: 'aplicar_politica',
      parametros: {
        permitir_camera: dto.permitir_camera ?? true,
        bloquear_usb: dto.bloquear_usb ?? true,
        permitir_reset_fabrica: dto.permitir_reset_fabrica ?? false,
        bloquear_instalacao_apps: dto.bloquear_instalacao_apps ?? true,
        bloquear_bluetooth: dto.bloquear_bluetooth ?? false,
        pacotes_ocultos: pacotesSeguros,
        urls_permitidas: dto.urls_permitidas || [],
      },
    };

    if (resDisp.rows.length > 0) {
      try {
        await executar_consulta(
          `INSERT INTO comandos (id, dispositivo_id, tipo_comando, parametros, status) VALUES ($1, $2, $3, $4, 'pendente');`,
          [comandoId, resDisp.rows[0].id, 'aplicar_politica', JSON.stringify(payloadComando.parametros)]
        );
      } catch (_) {}
    }

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
