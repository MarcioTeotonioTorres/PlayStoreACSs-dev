package com.mdm.corporativo.mqtt

import android.content.Context
import android.util.Log
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended
import org.eclipse.paho.client.mqttv3.MqttClient
import org.eclipse.paho.client.mqttv3.MqttConnectOptions
import org.eclipse.paho.client.mqttv3.MqttMessage
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import org.json.JSONObject
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManagerFactory

/**
 * Cliente MQTT com suporte a TLS/MQTTS seguro para conexão à VPS DuckDNS.
 */
class ClienteMqttSeguro(
    private val contexto: Context,
    private val numeroSerie: String,
    private val brokerHost: String = "seu-dominio.duckdns.org",
    private val brokerPort: Int = 8883,
    private val aoReceberComando: (payloadJson: String) -> Unit
) {

    companion object {
        private const val TAG = "MDM_Mqtt"
    }

    private var clienteMqtt: MqttClient? = null
    private val topicoComandos = "mdm/dispositivos/$numeroSerie/comandos"
    private val topicoTelemetria = "mdm/dispositivos/$numeroSerie/telemetria"
    private val topicoStatus = "mdm/dispositivos/$numeroSerie/status"
    private val topicoRespostaComando = "mdm/dispositivos/$numeroSerie/comandos/resposta"

    /**
     * Inicializa a instância do cliente MQTT com persistência em memória.
     */
    fun inicializar_cliente_mqtt() {
        try {
            val protocolo = if (brokerPort == 1883) "tcp" else "ssl"
            val serverUri = "$protocolo://$brokerHost:$brokerPort"
            val clientId = "tablet_$numeroSerie"
            clienteMqtt = MqttClient(serverUri, clientId, MemoryPersistence())

            clienteMqtt?.setCallback(object : MqttCallbackExtended {
                override fun connectComplete(reconnect: Boolean, serverURI: String?) {
                    Log.i(TAG, "Conexão MQTT estabelecida com sucesso! Reconexão: $reconnect")
                    assinar_topico_comandos()
                    publicar_status_conexao(true)
                }

                override fun connectionLost(cause: Throwable?) {
                    Log.w(TAG, "Conexão MQTT perdida: ${cause?.message}")
                }

                override fun messageArrived(topic: String?, message: MqttMessage?) {
                    if (topic == topicoComandos && message != null) {
                        val payload = String(message.payload)
                        Log.i(TAG, "Comando recebido no tópico $topic: $payload")
                        aoReceberComando(payload)
                    }
                }

                override fun deliveryComplete(token: IMqttDeliveryToken?) {}
            })
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao inicializar cliente MQTT: ${e.message}", e)
        }
    }

    /**
     * Estabelece conexão com o broker MQTT via TLS seguro.
     */
    fun conectar_broker_mqtt() {
        if (clienteMqtt == null) {
            inicializar_cliente_mqtt()
        }

        try {
            if (clienteMqtt?.isConnected == true) return

            val opcoes = MqttConnectOptions().apply {
                isAutomaticReconnect = true
                isCleanSession = false
                connectionTimeout = 15
                keepAliveInterval = 30

                // Last Will and Testament (LWT) para sinalizar desconexão imediata ao servidor
                val lwtJson = JSONObject().apply {
                    put("numero_serie", numeroSerie)
                    put("status", "desconectado")
                    put("timestamp", System.currentTimeMillis())
                }
                setWill(topicoStatus, lwtJson.toString().toByteArray(), 1, true)

                // Configuração SSL/TLS para certificado Let's Encrypt / DuckDNS quando em porta segura
                if (brokerPort != 1883) {
                    try {
                        socketFactory = obter_fabrica_soquetes_tls()
                    } catch (sslEx: Exception) {
                        Log.w(TAG, "Aviso ao carregar certificados customizados, usando SSL padrão: ${sslEx.message}")
                    }
                }
            }

            Log.i(TAG, "Iniciando conexão MQTT com $brokerHost:$brokerPort...")
            clienteMqtt?.connect(opcoes)
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao conectar ao broker MQTT: ${e.message}", e)
        }
    }

    /**
     * Encerra a conexão com o broker de forma limpa.
     */
    fun desconectar_broker_mqtt() {
        try {
            if (clienteMqtt?.isConnected == true) {
                publicar_status_conexao(false)
                clienteMqtt?.disconnect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao desconectar MQTT: ${e.message}", e)
        }
    }

    /**
     * Assina o canal exclusivo de comandos remotos deste dispositivo.
     */
    fun assinar_topico_comandos() {
        try {
            if (clienteMqtt?.isConnected == true) {
                clienteMqtt?.subscribe(topicoComandos, 1)
                Log.i(TAG, "Tópico assinado com sucesso: $topicoComandos")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao assinar tópico de comandos: ${e.message}", e)
        }
    }

    /**
     * Publica pacote de telemetria periódico com QoS 1.
     */
    fun publicar_telemetria(telemetriaJson: String) {
        publicar_mensagem(topicoTelemetria, telemetriaJson, qos = 1, retido = false)
    }

    /**
     * Publica o estado online/offline deste dispositivo.
     */
    fun publicar_status_conexao(online: Boolean) {
        val json = JSONObject().apply {
            put("numero_serie", numeroSerie)
            put("status", if (online) "conectado" else "desconectado")
            put("timestamp", System.currentTimeMillis())
        }
        publicar_mensagem(topicoStatus, json.toString(), qos = 1, retido = true)
    }

    /**
     * Devolve ao backend a confirmação e resultado da execução do comando.
     */
    fun enviar_resposta_comando(comandoId: String, status: String, mensagem: String) {
        val resposta = JSONObject().apply {
            put("comando_id", comandoId)
            put("numero_serie", numeroSerie)
            put("status", status)
            put("mensagem", mensagem)
            put("timestamp", System.currentTimeMillis())
        }
        publicar_mensagem(topicoRespostaComando, resposta.toString(), qos = 1, retido = false)
    }

    /**
     * Função utilitária para envio de mensagens MQTT.
     */
    private fun publicar_mensagem(topico: String, conteudo: String, qos: Int, retido: Boolean) {
        try {
            if (clienteMqtt?.isConnected == true) {
                val mensagem = MqttMessage(conteudo.toByteArray()).apply {
                    this.qos = qos
                    isRetained = retido
                }
                clienteMqtt?.publish(topico, mensagem)
                Log.d(TAG, "Mensagem publicada em $topico")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao publicar no tópico $topico: ${e.message}", e)
        }
    }

    /**
     * Configura SocketFactory TLS para validação de certificados Let's Encrypt padrão.
     */
    private fun obter_fabrica_soquetes_tls(): SSLSocketFactory {
        val trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        trustManagerFactory.init(null as KeyStore?)
        val sslContext = SSLContext.getInstance("TLSv1.3")
        sslContext.init(null, trustManagerFactory.trustManagers, null)
        return sslContext.socketFactory
    }
}
