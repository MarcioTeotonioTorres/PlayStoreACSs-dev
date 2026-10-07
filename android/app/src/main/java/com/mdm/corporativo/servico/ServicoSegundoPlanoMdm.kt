package com.mdm.corporativo.servico

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.content.pm.ServiceInfo
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.mdm.corporativo.R
import com.mdm.corporativo.gestores.GestorComandosMdm
import com.mdm.corporativo.gestores.GestorInstaladorSilencioso
import com.mdm.corporativo.gestores.GestorPoliticasDispositivo
import com.mdm.corporativo.gestores.GestorTelemetria
import com.mdm.corporativo.mqtt.ClienteMqttSeguro
import com.mdm.corporativo.ui.AtividadeProvisionamentoPrincipal
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Serviço em primeiro plano (Foreground Service) persistente para manutenção
 * do canal de comunicação MQTT e envio periódico de telemetria.
 */
class ServicoSegundoPlanoMdm : Service() {

    companion object {
        private const val TAG = "MDM_ServicoSegundoPlano"
        private const val ID_NOTIFICACAO = 1001
        private const val ID_CANAL = "canal_mdm_servico_permanente"
        private const val INTERVALO_TELEMETRIA_MS = 30000L // 30 segundos

        /**
         * Inicializa o serviço persistente de forma segura e compatível com todas as versões do Android.
         */
        fun iniciar_servico(contexto: Context) {
            try {
                val intent = Intent(contexto, ServicoSegundoPlanoMdm::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    contexto.startForegroundService(intent)
                } else {
                    contexto.startService(intent)
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Não foi possível iniciar o serviço de background no momento: ${t.message}")
            }
        }
    }

    private val escopoServico = CoroutineScope(Dispatchers.IO + Job())
    private var jobTelemetria: Job? = null

    private lateinit var gestorPoliticas: GestorPoliticasDispositivo
    private lateinit var instaladorSilencioso: GestorInstaladorSilencioso
    private lateinit var gestorTelemetria: GestorTelemetria
    private lateinit var clienteMqtt: ClienteMqttSeguro
    private lateinit var gestorComandos: GestorComandosMdm

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Inicializando Serviço MDM Persistente...")

        try {
            criar_canal_notificacao()
            val notificacao = construir_notificacao_persistente()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(
                    this,
                    ID_NOTIFICACAO,
                    notificacao,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(ID_NOTIFICACAO, notificacao)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Aviso ao iniciar startForeground: ${t.message}", t)
        }

        try {
            gestorPoliticas = GestorPoliticasDispositivo(this)
            instaladorSilencioso = GestorInstaladorSilencioso(this)
            gestorTelemetria = GestorTelemetria(this)

            configurar_cliente_mqtt()
            iniciar_ciclo_telemetria()
        } catch (t: Throwable) {
            Log.e(TAG, "Aviso ao inicializar componentes do serviço MDM: ${t.message}", t)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Assegura reconexão se o sistema reiniciar o processo
        try {
            if (::clienteMqtt.isInitialized) {
                clienteMqtt.conectar_broker_mqtt()
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Aviso ao reconectar MQTT: ${t.message}")
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        parar_ciclo_telemetria()
        clienteMqtt.desconectar_broker_mqtt()
        Log.w(TAG, "Serviço MDM finalizado. Tentando restaurar...")
        iniciar_servico(this)
    }

    /**
     * Instancia o cliente MQTT e o gestor de comandos associado.
     */
    fun configurar_cliente_mqtt() {
        val numeroSerie = gestorTelemetria.obter_numero_serie()

        val prefs = getSharedPreferences("config_mdm", Context.MODE_PRIVATE)
        val brokerHost = prefs.getString("broker_mqtt_host", "31.97.86.253") ?: "31.97.86.253"
        val brokerPort = prefs.getInt("broker_mqtt_porta", 1883)

        clienteMqtt = ClienteMqttSeguro(
            contexto = this,
            numeroSerie = numeroSerie,
            brokerHost = brokerHost,
            brokerPort = brokerPort
        ) { payloadJson ->
            gestorComandos.processar_e_executar_comando(payloadJson)
        }

        gestorComandos = GestorComandosMdm(
            contexto = this,
            gestorPoliticas = gestorPoliticas,
            instaladorSilencioso = instaladorSilencioso,
            clienteMqtt = clienteMqtt
        )

        clienteMqtt.conectar_broker_mqtt()
    }

    /**
     * Inicia a coleta e transmissão periódica de telemetria via coroutines.
     */
    fun iniciar_ciclo_telemetria() {
        jobTelemetria?.cancel()
        jobTelemetria = escopoServico.launch {
            while (isActive) {
                try {
                    val telemetria = gestorTelemetria.coletar_telemetria_dispositivo()
                    val telemetriaJson = gestorTelemetria.converter_telemetria_para_json(telemetria)
                    
                    // 1. Envio via MQTT em tempo real
                    try {
                        clienteMqtt.publicar_telemetria(telemetriaJson)
                    } catch (eMqtt: Exception) {
                        Log.w(TAG, "Aviso ao publicar MQTT: ${eMqtt.message}")
                    }

                    // 2. Envio via HTTP REST API (garante telemetria mesmo sem broker MQTT/SSL)
                    enviar_telemetria_http(telemetriaJson)

                } catch (e: Exception) {
                    Log.e(TAG, "Erro no envio de telemetria periódica: ${e.message}")
                }
                delay(INTERVALO_TELEMETRIA_MS)
            }
        }
    }

    /**
     * Envia telemetria diretamente via HTTP REST para a VPS.
     */
    fun enviar_telemetria_http(telemetriaJson: String) {
        try {
            val prefs = getSharedPreferences("config_mdm", Context.MODE_PRIVATE)
            val servidorApi = prefs.getString("servidor_api", "https://mdmplaystoreacs.duckdns.org/api") ?: "https://mdmplaystoreacs.duckdns.org/api"
            val url = java.net.URL("$servidorApi/telemetria")
            val conexao = url.openConnection() as java.net.HttpURLConnection
            conexao.requestMethod = "POST"
            conexao.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conexao.connectTimeout = 5000
            conexao.readTimeout = 5000
            conexao.doOutput = true
            conexao.outputStream.use { os ->
                os.write(telemetriaJson.toByteArray(Charsets.UTF_8))
            }
            val codigo = conexao.responseCode
            Log.d(TAG, "Telemetria HTTP enviada com status: $codigo")
            conexao.disconnect()
        } catch (e: Exception) {
            Log.w(TAG, "Aviso no envio de telemetria HTTP: ${e.message}")
        }
    }

    /**
     * Interrompe o ciclo de envio de telemetria.
     */
    fun parar_ciclo_telemetria() {
        jobTelemetria?.cancel()
        jobTelemetria = null
    }

    /**
     * Cria o canal de notificação para o Android 8.0+.
     */
    fun criar_canal_notificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val canal = NotificationChannel(
                ID_CANAL,
                getString(R.string.canal_notificacao_nome),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.canal_notificacao_descricao)
                setShowBadge(false)
            }
            val gestorNotificacoes = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            gestorNotificacoes.createNotificationChannel(canal)
        }
    }

    /**
     * Constrói a notificação fixa necessária para a execução contínua em Foreground.
     */
    fun construir_notificacao_persistente(): Notification {
        val intent = Intent(this, AtividadeProvisionamentoPrincipal::class.java)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, flags)

        return NotificationCompat.Builder(this, ID_CANAL)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.servico_ativo_texto))
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
