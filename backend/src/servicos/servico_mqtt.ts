import mqtt, { MqttClient } from 'mqtt';
import { executar_consulta } from '../banco/conexao';
import dotenv from 'dotenv';

dotenv.config();

let clienteMqtt: MqttClient | null = null;

/**
 * Inicializa a conexão com o broker MQTT (Mosquitto) e assina os tópicos da frota.
 */
export function inicializar_servico_mqtt(): MqttClient {
  const urlBroker = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const opcoesConexao: mqtt.IClientOptions = {
    clientId: `mdm_backend_${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    username: process.env.MQTT_USER || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
  };

  console.log(`Conectando ao Broker MQTT em: ${urlBroker}`);
  clienteMqtt = mqtt.connect(urlBroker, opcoesConexao);

  clienteMqtt.on('connect', () => {
    console.log('Conexão MQTT com o broker estabelecida com sucesso.');

    // Assina tópicos de telemetria, presença e respostas de comandos para todos os tablets
    clienteMqtt?.subscribe('mdm/dispositivos/+/telemetria', { qos: 1 });
    clienteMqtt?.subscribe('mdm/dispositivos/+/status', { qos: 1 });
    clienteMqtt?.subscribe('mdm/dispositivos/+/comandos/resposta', { qos: 1 });
  });

  clienteMqtt.on('message', async (topico: string, payloadBuffer: Buffer) => {
    try {
      const conteudoStr = payloadBuffer.toString();
      const partesTopico = topico.split('/');
      const numeroSerie = partesTopico[2];
      const tipoMensagem = partesTopico[3];

      const dados = JSON.parse(conteudoStr);

      if (tipoMensagem === 'telemetria') {
        await processar_mensagem_telemetria(numeroSerie, dados);
      } else if (tipoMensagem === 'status') {
        await processar_status_presenca(numeroSerie, dados);
      } else if (tipoMensagem === 'comandos' && partesTopico[4] === 'resposta') {
        await processar_resposta_comando(numeroSerie, dados);
      }
    } catch (erro) {
      console.error(`Erro ao processar mensagem MQTT no tópico ${topico}:`, erro);
    }
  });

  clienteMqtt.on('error', (erro) => {
    console.error('Erro de conexão no cliente MQTT:', erro);
  });

  return clienteMqtt;
}

/**
 * Persiste a telemetria recebida no cadastro do dispositivo e no histórico.
 */
export async function processar_mensagem_telemetria(
  numeroSerie: string,
  telemetria: {
    modelo?: string;
    versao_so?: string;
    nivel_bateria?: number;
    esta_carregando?: boolean;
    sinal_wifi_rssi?: number;
    ssid_wifi?: string;
    app_em_foco?: string;
    armazenamento_livre_mb?: number;
    memoria_ram_livre_mb?: number;
  }
): Promise<void> {
  // Upsert do dispositivo no banco de dados
  const sqlUpsert = `
    INSERT INTO dispositivos (
      numero_serie, modelo, versao_so, status_conexao, bateria, esta_carregando,
      sinal_wifi_rssi, ssid_wifi, app_foco, armazenamento_livre_mb, memoria_ram_livre_mb,
      ultimo_contato, atualizado_em
    ) VALUES (
      $1, $2, $3, 'conectado', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
    )
    ON CONFLICT (numero_serie) DO UPDATE SET
      modelo = COALESCE(EXCLUDED.modelo, dispositivos.modelo),
      versao_so = COALESCE(EXCLUDED.versao_so, dispositivos.versao_so),
      status_conexao = 'conectado',
      bateria = EXCLUDED.bateria,
      esta_carregando = EXCLUDED.esta_carregando,
      sinal_wifi_rssi = EXCLUDED.sinal_wifi_rssi,
      ssid_wifi = EXCLUDED.ssid_wifi,
      app_foco = EXCLUDED.app_foco,
      armazenamento_livre_mb = EXCLUDED.armazenamento_livre_mb,
      memoria_ram_livre_mb = EXCLUDED.memoria_ram_livre_mb,
      ultimo_contato = NOW(),
      atualizado_em = NOW()
    RETURNING id;
  `;

  const res = await executar_consulta(sqlUpsert, [
    numeroSerie,
    telemetria.modelo || 'Tablet Android',
    telemetria.versao_so || 'Android',
    telemetria.nivel_bateria ?? 100,
    telemetria.esta_carregando ?? false,
    telemetria.sinal_wifi_rssi ?? -50,
    telemetria.ssid_wifi || 'Corporativo-WiFi',
    telemetria.app_em_foco || 'Sistema',
    telemetria.armazenamento_livre_mb ?? 0,
    telemetria.memoria_ram_livre_mb ?? 0,
  ]);

  const dispositivoId = res.rows[0]?.id;

  if (dispositivoId) {
    // Insere no log histórico de telemetria
    const sqlLog = `
      INSERT INTO logs_telemetria (
        dispositivo_id, bateria, sinal_wifi_rssi, memoria_ram_livre_mb,
        armazenamento_livre_mb, app_foco, registrado_em
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW());
    `;
    await executar_consulta(sqlLog, [
      dispositivoId,
      telemetria.nivel_bateria ?? 100,
      telemetria.sinal_wifi_rssi ?? -50,
      telemetria.memoria_ram_livre_mb ?? 0,
      telemetria.armazenamento_livre_mb ?? 0,
      telemetria.app_em_foco || 'Sistema',
    ]);
  }
}

/**
 * Processa a atualização de status (online/offline) enviada pelo LWT ou heartbeat.
 */
export async function processar_status_presenca(
  numeroSerie: string,
  dadosStatus: { status: string }
): Promise<void> {
  const statusFormatado = dadosStatus.status === 'conectado' ? 'conectado' : 'desconectado';
  const sql = `
    UPDATE dispositivos
    SET status_conexao = $1, ultimo_contato = NOW(), atualizado_em = NOW()
    WHERE numero_serie = $2;
  `;
  await executar_consulta(sql, [statusFormatado, numeroSerie]);
}

/**
 * Atualiza o status e resposta da execução do comando no banco de dados.
 */
export async function processar_resposta_comando(
  numeroSerie: string,
  resposta: { comando_id: string; status: string; mensagem: string }
): Promise<void> {
  const sql = `
    UPDATE comandos
    SET status = $1, resposta = $2::jsonb, executado_em = NOW()
    WHERE id = $3;
  `;
  await executar_consulta(sql, [
    resposta.status,
    JSON.stringify(resposta),
    resposta.comando_id,
  ]);
  console.log(`Comando ${resposta.comando_id} atualizado para status '${resposta.status}' no tablet ${numeroSerie}`);
}

/**
 * Publica um comando imediatamente no tópico MQTT do dispositivo.
 */
export async function despachar_comando_mqtt(
  numeroSerie: string,
  comandoPayload: {
    id: string;
    tipo_comando: string;
    parametros: Record<string, any>;
  }
): Promise<boolean> {
  if (!clienteMqtt || !clienteMqtt.connected) {
    console.warn('Cliente MQTT não conectado. Tentando reconectar antes do envio...');
    clienteMqtt = inicializar_servico_mqtt();
  }

  const topico = `mdm/dispositivos/${numeroSerie}/comandos`;
  const payloadStr = JSON.stringify(comandoPayload);

  return new Promise<boolean>((resolve) => {
    clienteMqtt?.publish(topico, payloadStr, { qos: 1 }, (erro) => {
      if (erro) {
        console.error(`Erro ao despachar comando para ${topico}:`, erro);
        resolve(false);
      } else {
        console.log(`Comando ${comandoPayload.tipo_comando} despachado com sucesso para ${topico}`);
        resolve(true);
      }
    });
  });
}

/**
 * Encerra a conexão com o broker MQTT.
 */
export function encerrar_servico_mqtt(): void {
  if (clienteMqtt) {
    clienteMqtt.end();
    clienteMqtt = null;
  }
}
