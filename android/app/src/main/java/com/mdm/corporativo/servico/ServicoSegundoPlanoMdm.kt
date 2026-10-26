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
        const val ACAO_FORCAR_SINCRONIZACAO = "com.mdm.corporativo.FORCAR_SINCRONIZACAO"
        const val ACAO_RESULTADO_INSTALACAO_NOTIFICAR = "com.mdm.corporativo.ACAO_RESULTADO_INSTALACAO_NOTIFICAR"

        @Volatile
        var instanciaAtiva: ServicoSegundoPlanoMdm? = null

        /**
         * Notifica o resultado final de instalação via MQTT e HTTP sem depender de startService em background.
         */
        fun notificar_resultado_instalacao(
            contexto: Context,
            status: Int,
            mensagem: String?,
            pacote: String?,
            comandoId: String?
        ) {
            val sucesso = (status == android.content.pm.PackageInstaller.STATUS_SUCCESS)
            val statusComando = if (sucesso) "executado" else "falha"
            val descricao = if (sucesso) {
                "Aplicativo ${pacote ?: "desconhecido"} instalado e confirmado com êxito pelo sistema operacional Android!"
            } else {
                "Falha na instalação ($status): ${mensagem ?: "Erro desconhecido durante validação/gravação do pacote pelo SO"}"
            }

            Log.i(TAG, "Notificando resultado de instalação: comando=$comandoId, status=$statusComando, msg=$descricao")

            instanciaAtiva?.let { servico ->
                servico.escopoServico.launch(Dispatchers.IO) {
                    if (!comandoId.isNullOrEmpty() && servico::clienteMqtt.isInitialized) {
                        servico.clienteMqtt.enviar_resposta_comando(comandoId, statusComando, descricao)
                    }
                    if (sucesso) {
                        delay(1500)
                        servico.enviar_telemetria_avulsa_agora()
                    }
                }
            } ?: run {
                // Fallback autônomo via HTTP direto caso o serviço tenha sido reciclado
                if (!comandoId.isNullOrEmpty()) {
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val prefs = contexto.getSharedPreferences("telemetria_mdm", Context.MODE_PRIVATE)
                            val servidorApi = prefs.getString("servidor_api", "https://mdmplaystoreacs.duckdns.org/api") ?: "https://mdmplaystoreacs.duckdns.org/api"
                            val sn = GestorTelemetria(contexto).obter_numero_serie()
                            val url = java.net.URL("$servidorApi/dispositivos/$sn/comandos/$comandoId/resposta")
                            val conexao = url.openConnection() as java.net.HttpURLConnection
                            conexao.requestMethod = "POST"
                            conexao.setRequestProperty("Content-Type", "application/json")
                            conexao.doOutput = true
                            val jsonCorpo = org.json.JSONObject().apply {
                                put("status", statusComando)
                                put("mensagem", descricao)
                            }
                            conexao.outputStream.use { os ->
                                os.write(jsonCorpo.toString().toByteArray())
                            }
                            conexao.responseCode
                        } catch (t: Throwable) {
                            Log.e(TAG, "Aviso no fallback HTTP de resposta de comando: ${t.message}")
                        }
                    }
                }
            }
        }

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

        /**
         * Força a coleta e transmissão imediata de telemetria sem aguardar o intervalo periódico.
         */
        fun forcar_sincronizacao_imediata(contexto: Context) {
            try {
                val intent = Intent(contexto, ServicoSegundoPlanoMdm::class.java).apply {
                    action = ACAO_FORCAR_SINCRONIZACAO
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    contexto.startForegroundService(intent)
                } else {
                    contexto.startService(intent)
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Falha ao disparar sincronização imediata: ${t.message}")
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
        instanciaAtiva = this
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
            gestorPoliticas.liberar_depuracao_adb()
            gestorPoliticas.definir_bloqueio_instalacao_aplicativos(true)
            instaladorSilencioso = GestorInstaladorSilencioso(this)
            gestorTelemetria = GestorTelemetria(this)

            configurar_cliente_mqtt()
            iniciar_ciclo_telemetria()
        } catch (t: Throwable) {
            Log.e(TAG, "Aviso ao inicializar componentes do serviço MDM: ${t.message}", t)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Trata requisição avulsa de sincronização imediata disparada pelo usuário na tela
        if (intent?.action == ACAO_FORCAR_SINCRONIZACAO) {
            Log.i(TAG, "Solicitação de sincronização avulsa recebida. Enviando telemetria agora...")
            enviar_telemetria_avulsa_agora()
        }

        // Trata resultado definitivo assíncrono emitido pelo PackageInstaller do Android
        if (intent?.action == ACAO_RESULTADO_INSTALACAO_NOTIFICAR) {
            val comandoId = intent.getStringExtra("comando_id")
            val status = intent.getIntExtra("status", android.content.pm.PackageInstaller.STATUS_FAILURE)
            val mensagem = intent.getStringExtra("mensagem")
            val pacote = intent.getStringExtra("pacote")

            val sucesso = (status == android.content.pm.PackageInstaller.STATUS_SUCCESS)
            val statusComando = if (sucesso) "executado" else "falha"
            val descricao = if (sucesso) {
                "Aplicativo $pacote instalado e confirmado com êxito pelo sistema operacional Android!"
            } else {
                "Falha na instalação ($status): ${mensagem ?: "Erro desconhecido durante validação/gravação do pacote"}"
            }

            Log.i(TAG, "Notificando resultado de instalação via MQTT: comando=$comandoId, status=$statusComando, msg=$descricao")

            escopoServico.launch(Dispatchers.IO) {
                if (!comandoId.isNullOrEmpty() && ::clienteMqtt.isInitialized) {
                    clienteMqtt.enviar_resposta_comando(comandoId, statusComando, descricao)
                }

                if (sucesso) {
                    // Aguarda o SO registrar o novo pacote e envia telemetria atualizada
                    kotlinx.coroutines.delay(1500)
                    enviar_telemetria_avulsa_agora()
                }
            }
        }

        // Assegura reconexão se o sistema reiniciar o processo (em background IO)
        escopoServico.launch(Dispatchers.IO) {
            try {
                if (::clienteMqtt.isInitialized) {
                    clienteMqtt.conectar_broker_mqtt()
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Aviso ao reconectar MQTT: ${t.message}")
            }
        }
        return START_STICKY
    }

    /**
     * Coleta e despacha a telemetria pontual imediatamente em background.
     */
    fun enviar_telemetria_avulsa_agora() {
        escopoServico.launch {
            try {
                if (!::gestorTelemetria.isInitialized) {
                    gestorTelemetria = GestorTelemetria(this@ServicoSegundoPlanoMdm)
                }
                val telemetria = gestorTelemetria.coletar_telemetria_dispositivo()
                val telemetriaJson = gestorTelemetria.converter_telemetria_para_json(telemetria)

                // 1. MQTT
                try {
                    if (::clienteMqtt.isInitialized) {
                        clienteMqtt.publicar_telemetria(telemetriaJson)
                    }
                } catch (eMqtt: Exception) {
                    Log.w(TAG, "Aviso ao publicar MQTT avulso: ${eMqtt.message}")
                }

                // 2. HTTP REST
                enviar_telemetria_http(telemetriaJson)
                Log.i(TAG, "Telemetria avulsa despachada com sucesso!")
            } catch (e: Exception) {
                Log.e(TAG, "Erro no envio de telemetria avulsa: ${e.message}", e)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        if (instanciaAtiva == this) {
            instanciaAtiva = null
        }
        super.onDestroy()
        try {
            parar_ciclo_telemetria()
            if (::clienteMqtt.isInitialized) {
                clienteMqtt.desconectar_broker_mqtt()
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Aviso ao finalizar serviço: ${t.message}")
        }
        Log.w(TAG, "Serviço MDM finalizado.")
    }

    /**
     * Instancia o cliente MQTT e o gestor de comandos associado.
     */
    fun configurar_cliente_mqtt() {
        val numeroSerie = gestorTelemetria.obter_numero_serie()

        val prefs = getSharedPreferences("config_mdm", Context.MODE_PRIVATE)
        val brokerHost = prefs.getString("broker_mqtt_host", "mdmplaystoreacs.duckdns.org") ?: "mdmplaystoreacs.duckdns.org"
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

        // Conecta ao broker em segundo plano para nunca bloquear a thread principal (evita ANR e NetworkOnMainThreadException)
        escopoServico.launch(Dispatchers.IO) {
            try {
                clienteMqtt.conectar_broker_mqtt()
            } catch (t: Throwable) {
                Log.w(TAG, "Aviso ao conectar MQTT inicial: ${t.message}")
            }
        }
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
     * Envia telemetria via HTTP REST para a VPS e sincroniza políticas e comandos pendentes.
     */
    fun enviar_telemetria_http(telemetriaJson: String) {
        try {
            val prefs = getSharedPreferences("config_mdm", Context.MODE_PRIVATE)
            val servidorApi = prefs.getString("servidor_api", "https://mdmplaystoreacs.duckdns.org/api") ?: "https://mdmplaystoreacs.duckdns.org/api"
            val url = java.net.URL("$servidorApi/telemetria")
            val conexao = url.openConnection() as java.net.HttpURLConnection
            conexao.requestMethod = "POST"
            conexao.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            conexao.connectTimeout = 7000
            conexao.readTimeout = 7000
            conexao.doOutput = true
            conexao.outputStream.use { os ->
                os.write(telemetriaJson.toByteArray(Charsets.UTF_8))
            }
            val codigo = conexao.responseCode
            Log.d(TAG, "Telemetria HTTP enviada com status: $codigo")

            if (codigo == 200) {
                val respostaStr = conexao.inputStream.bufferedReader().use { it.readText() }
                val jsonResp = org.json.JSONObject(respostaStr)

                // 1. Sincronização automática das políticas corporativas
                if (jsonResp.has("politica") && !jsonResp.isNull("politica")) {
                    val polJson = jsonResp.getJSONObject("politica")
                    aplicar_politicas_recebidas_http(polJson)
                }

                // 2. Execução de comandos pendentes recebidos pelo canal HTTP
                if (jsonResp.has("comandos_pendentes") && !jsonResp.isNull("comandos_pendentes")) {
                    val cmds = jsonResp.getJSONArray("comandos_pendentes")
                    for (i in 0 until cmds.length()) {
                        val cmdObj = cmds.getJSONObject(i)
                        Log.i(TAG, "Executando comando pendente via HTTP: ${cmdObj.optString("tipo_comando")}")
                        gestorComandos.processar_e_executar_comando(cmdObj.toString())
                    }
                }
            }

            conexao.disconnect()
        } catch (e: Exception) {
            Log.w(TAG, "Aviso no envio de telemetria HTTP: ${e.message}")
        }
    }

    /**
     * Aplica o pacote de políticas recebido via HTTP na camada de Device Owner.
     */
    private fun aplicar_politicas_recebidas_http(polJson: org.json.JSONObject) {
        try {
            val permitirCamera = polJson.optBoolean("permitir_camera", true)
            val bloquearUsb = polJson.optBoolean("bloquear_usb", true)
            val permitirReset = polJson.optBoolean("permitir_reset_fabrica", false)
            val bloquearInstalacao = polJson.optBoolean("bloquear_instalacao_apps", true)
            val bloquearBluetooth = polJson.optBoolean("bloquear_bluetooth", false)

            val pacotesJson = polJson.optJSONArray("pacotes_ocultos")
            val listaPacotes = mutableListOf<String>()
            if (pacotesJson != null) {
                for (i in 0 until pacotesJson.length()) {
                    listaPacotes.add(pacotesJson.getString(i))
                }
            }

            val urlsJson = polJson.optJSONArray("urls_permitidas")
            val listaUrls = mutableListOf<String>()
            if (urlsJson != null) {
                for (i in 0 until urlsJson.length()) {
                    listaUrls.add(urlsJson.getString(i))
                }
            }

            gestorPoliticas.aplicar_politicas_sistema_completas(
                pacotesOcultos = listaPacotes,
                pacotesLiberados = emptyList<String>(),
                dominiosAutorizados = listaUrls,
                permitirCamera = permitirCamera,
                bloquearUsb = bloquearUsb,
                bloquearInstalacaoApps = bloquearInstalacao,
                bloquearBluetooth = bloquearBluetooth
            )
            gestorPoliticas.definir_bloqueio_reset_fabrica(!permitirReset)
            Log.i(TAG, "Políticas de bloqueio aplicadas com sucesso pelo canal HTTP!")
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao aplicar políticas via HTTP: ${e.message}", e)
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
            .setSmallIcon(R.drawable.ic_mdm_notificacao)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
