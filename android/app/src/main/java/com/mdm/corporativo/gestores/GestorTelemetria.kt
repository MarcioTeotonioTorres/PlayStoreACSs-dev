package com.mdm.corporativo.gestores

import android.app.ActivityManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.app.admin.DevicePolicyManager
import android.os.StatFs
import com.mdm.corporativo.receptor.ReceptorAdministradorDispositivo
import org.json.JSONObject

/**
 * Modelo de dados com a telemetria consolidada do dispositivo.
 */
data class DadosTelemetria(
    val numero_serie: String,
    val modelo: String,
    val versao_so: String,
    val nivel_bateria: Int,
    val esta_carregando: Boolean,
    val sinal_wifi_rssi: Int,
    val ssid_wifi: String,
    val app_em_foco: String,
    val tempo_ocioso_minutos: Long,
    val armazenamento_livre_mb: Long,
    val memoria_ram_livre_mb: Long,
    val timestamp: Long
)

/**
 * Coletor contínuo de telemetria dos tablets corporativos.
 */
class GestorTelemetria(private val contexto: Context) {

    /**
     * Coleta o pacote completo de telemetria do dispositivo.
     */
    fun coletar_telemetria_dispositivo(): DadosTelemetria {
        return DadosTelemetria(
            numero_serie = obter_numero_serie(),
            modelo = "${Build.MANUFACTURER} ${Build.MODEL}",
            versao_so = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
            nivel_bateria = obter_nivel_bateria(),
            esta_carregando = obter_status_carregando(),
            sinal_wifi_rssi = obter_nivel_sinal_wifi(),
            ssid_wifi = obter_ssid_wifi(),
            app_em_foco = obter_aplicativo_em_foco(),
            tempo_ocioso_minutos = obter_tempo_ocioso_minutos(),
            armazenamento_livre_mb = obter_armazenamento_livre_mb(),
            memoria_ram_livre_mb = obter_memoria_ram_livre_mb(),
            timestamp = System.currentTimeMillis()
        )
    }

    /**
     * Serializa o objeto de telemetria para JSON pronto para transmissão MQTT.
     */
    fun converter_telemetria_para_json(dados: DadosTelemetria): String {
        val json = JSONObject()
        json.put("numero_serie", dados.numero_serie)
        json.put("modelo", dados.modelo)
        json.put("versao_so", dados.versao_so)
        json.put("nivel_bateria", dados.nivel_bateria)
        json.put("esta_carregando", dados.esta_carregando)
        json.put("sinal_wifi_rssi", dados.sinal_wifi_rssi)
        json.put("ssid_wifi", dados.ssid_wifi)
        json.put("app_em_foco", dados.app_em_foco)
        json.put("tempo_ocioso_minutos", dados.tempo_ocioso_minutos)
        json.put("armazenamento_livre_mb", dados.armazenamento_livre_mb)
        json.put("memoria_ram_livre_mb", dados.memoria_ram_livre_mb)
        json.put("timestamp", dados.timestamp)
        return json.toString()
    }

    /**
     * Obtém o nível percentual de carga da bateria (0 a 100).
     */
    fun obter_nivel_bateria(): Int {
        return try {
            val filtroBateria = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val statusBateria: Intent? = contexto.registerReceiver(null, filtroBateria)
            val nivel = statusBateria?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val escala = statusBateria?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            if (nivel >= 0 && escala > 0) {
                (nivel * 100 / escala.toFloat()).toInt()
            } else {
                0
            }
        } catch (_: Throwable) {
            0
        }
    }

    /**
     * Verifica se o tablet está conectado à fonte de alimentação.
     */
    fun obter_status_carregando(): Boolean {
        return try {
            val filtroBateria = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val statusBateria: Intent? = contexto.registerReceiver(null, filtroBateria)
            val status = statusBateria?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL
        } catch (_: Throwable) {
            false
        }
    }

    /**
     * Obtém o nível do sinal Wi-Fi (RSSI em dBm).
     */
    fun obter_nivel_sinal_wifi(): Int {
        return try {
            val gestorWifi = contexto.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val info = gestorWifi?.connectionInfo
            info?.rssi ?: -127
        } catch (_: Throwable) {
            -127
        }
    }

    /**
     * Obtém o nome da rede Wi-Fi conectada (SSID).
     */
    fun obter_ssid_wifi(): String {
        return try {
            val gestorWifi = contexto.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val info = gestorWifi?.connectionInfo
            val ssid = info?.ssid ?: "<Desconectado>"
            ssid.replace("\"", "")
        } catch (_: Throwable) {
            "<Desconectado>"
        }
    }

    companion object {
        private const val PREFS_NOME = "telemetria_mdm"
        private const val CHAVE_ULTIMO_ATIVO = "ultimo_momento_ativo_ms"
        private const val CHAVE_NUMERO_SERIE = "numero_serie_definitivo"

        private var ultimoMomentoAtivoMs: Long = 0L
        private var receptorTelaRegistrado: Boolean = false

        /**
         * Atualiza o timestamp do último momento ativo do usuário e persiste no disco.
         */
        fun atualizar_momento_ativo(contexto: Context, timestampMs: Long = System.currentTimeMillis()) {
            ultimoMomentoAtivoMs = timestampMs
            try {
                val prefs = contexto.applicationContext.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)
                prefs.edit().putLong(CHAVE_ULTIMO_ATIVO, ultimoMomentoAtivoMs).apply()
            } catch (_: Throwable) {
            }
        }

        /**
         * Registra dinamicamente um ouvinte para estados de tela e desbloqueio do tablet.
         */
        fun registrar_monitor_tela(contexto: Context) {
            if (receptorTelaRegistrado) return
            try {
                val prefs = contexto.applicationContext.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)
                if (ultimoMomentoAtivoMs == 0L) {
                    ultimoMomentoAtivoMs = prefs.getLong(CHAVE_ULTIMO_ATIVO, System.currentTimeMillis())
                }

                val filtro = IntentFilter().apply {
                    addAction(Intent.ACTION_SCREEN_ON)
                    addAction(Intent.ACTION_SCREEN_OFF)
                    addAction(Intent.ACTION_USER_PRESENT)
                }
                contexto.applicationContext.registerReceiver(object : BroadcastReceiver() {
                    override fun onReceive(c: Context?, intent: Intent?) {
                        when (intent?.action) {
                            Intent.ACTION_SCREEN_ON, Intent.ACTION_USER_PRESENT -> {
                                atualizar_momento_ativo(contexto)
                            }
                            Intent.ACTION_SCREEN_OFF -> {
                                atualizar_momento_ativo(contexto)
                            }
                        }
                    }
                }, filtro)
                receptorTelaRegistrado = true
            } catch (_: Throwable) {
            }
        }
    }

    /**
     * Identifica o aplicativo atualmente visível na tela em primeiro plano.
     */
    fun obter_aplicativo_em_foco(): String {
        registrar_monitor_tela(contexto)
        val powerManager = contexto.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val estaInterativo = powerManager?.isInteractive ?: true

        // Se a tela estiver apagada/bloqueada, reporta estado de repouso
        if (!estaInterativo) {
            return "Tela Bloqueada / Repouso"
        }

        try {
            val usageStatsManager = contexto.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            if (usageStatsManager != null) {
                val tempoFim = System.currentTimeMillis()
                val tempoInicio = tempoFim - 1000 * 60 * 15 // Últimos 15 minutos

                val estatisticas = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_BEST,
                    tempoInicio,
                    tempoFim
                )

                if (!estatisticas.isNullOrEmpty()) {
                    val appMaisRecente = estatisticas
                        .filter { it.lastTimeUsed > 0 && it.packageName != contexto.packageName }
                        .maxByOrNull { it.lastTimeUsed }

                    if (appMaisRecente != null && (tempoFim - appMaisRecente.lastTimeUsed) < 1000 * 60 * 5) {
                        atualizar_momento_ativo(contexto, appMaisRecente.lastTimeUsed)
                        return appMaisRecente.packageName
                    }
                }

                // Fallback para leitura de eventos de transição recentes
                val eventos = usageStatsManager.queryEvents(tempoFim - 1000 * 60 * 10, tempoFim)
                val eventoAtual = UsageEvents.Event()
                var pacoteEmFoco = ""

                while (eventos.hasNextEvent()) {
                    eventos.getNextEvent(eventoAtual)
                    if (eventoAtual.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                        pacoteEmFoco = eventoAtual.packageName
                        if (eventoAtual.timeStamp > 0) {
                            atualizar_momento_ativo(contexto, eventoAtual.timeStamp)
                        }
                    }
                }

                if (pacoteEmFoco.isNotEmpty() && pacoteEmFoco != contexto.packageName) {
                    return pacoteEmFoco
                }
            }
        } catch (_: Throwable) {
        }

        return "Sistema / Área de Trabalho"
    }

    /**
     * Retorna os minutos em que o tablet esteve ocioso (sem interação ou tela desligada).
     * O valor é persistente entre reinicializações de serviços e processos em background.
     */
    fun obter_tempo_ocioso_minutos(): Long {
        registrar_monitor_tela(contexto)

        if (ultimoMomentoAtivoMs == 0L) {
            val prefs = contexto.applicationContext.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)
            ultimoMomentoAtivoMs = prefs.getLong(CHAVE_ULTIMO_ATIVO, System.currentTimeMillis())
        }

        val powerManager = contexto.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val estaInterativo = powerManager?.isInteractive ?: true

        // Se o usuário está com o tablet ativo e tela ligada:
        if (estaInterativo) {
            // Verifica se houve uso de app recente via UsageStatsManager
            try {
                val usage = contexto.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
                if (usage != null) {
                    val fim = System.currentTimeMillis()
                    val stats = usage.queryUsageStats(UsageStatsManager.INTERVAL_BEST, fim - 1000 * 60 * 10, fim)
                    val maisRecente = stats?.filter { it.lastTimeUsed > 0 && it.packageName != contexto.packageName }?.maxByOrNull { it.lastTimeUsed }
                    if (maisRecente != null && maisRecente.lastTimeUsed > ultimoMomentoAtivoMs && maisRecente.lastTimeUsed <= fim) {
                        atualizar_momento_ativo(contexto, maisRecente.lastTimeUsed)
                    } else if (fim - ultimoMomentoAtivoMs > 1000 * 60 * 5) {
                        // Tela ligada sem app ativo por mais de 5 minutos: considera ocioso o tempo sem interação
                        val decorridoMs = fim - ultimoMomentoAtivoMs
                        return (decorridoMs / (1000 * 60)).coerceAtLeast(0)
                    }
                }
            } catch (_: Throwable) {
            }

            atualizar_momento_ativo(contexto)
            return 0L
        }

        // Se a tela estiver apagada, calcula os minutos desde a última atividade real gravada
        val decorridoMs = System.currentTimeMillis() - ultimoMomentoAtivoMs
        return (decorridoMs / (1000 * 60)).coerceAtLeast(0)
    }

    /**
     * Retorna o espaço de armazenamento interno livre em Megabytes.
     */
    fun obter_armazenamento_livre_mb(): Long {
        return try {
            val caminho = Environment.getDataDirectory()
            val stat = StatFs(caminho.path)
            val bytesLivres = stat.availableBlocksLong * stat.blockSizeLong
            bytesLivres / (1024 * 1024)
        } catch (e: Exception) {
            0L
        }
    }

    /**
     * Retorna a quantidade de memória RAM disponível em Megabytes.
     */
    fun obter_memoria_ram_livre_mb(): Long {
        return try {
            val activityManager = contexto.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val infoMemoria = ActivityManager.MemoryInfo()
            activityManager.getMemoryInfo(infoMemoria)
            infoMemoria.availMem / (1024 * 1024)
        } catch (e: Exception) {
            0L
        }
    }

    /**
     * Obtém o número de série único do tablet de forma definitiva.
     * Prioriza a leitura do número de série real do hardware (impresso no tablet e ro.serialno).
     * Evita duplicidade e oscilação de ID persistindo o identificador no SharedPreferences.
     */
    fun obter_numero_serie(): String {
        val prefs = contexto.applicationContext.getSharedPreferences(PREFS_NOME, Context.MODE_PRIVATE)
        val serialSalvo = prefs.getString(CHAVE_NUMERO_SERIE, null)
        if (!serialSalvo.isNullOrBlank() && serialSalvo != Build.UNKNOWN && !serialSalvo.startsWith("TABLET-")) {
            return serialSalvo
        }

        // 1. Tentar auto-conceder permissão de leitura de telefone caso seja Device Owner
        try {
            val dpm = contexto.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val admin = ReceptorAdministradorDispositivo.obter_componente_administrador(contexto)
            if (dpm != null && dpm.isDeviceOwnerApp(contexto.packageName)) {
                if (contexto.checkSelfPermission(android.Manifest.permission.READ_PHONE_STATE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    dpm.setPermissionGrantState(
                        admin,
                        contexto.packageName,
                        android.Manifest.permission.READ_PHONE_STATE,
                        DevicePolicyManager.PERMISSION_GRANT_STATE_GRANTED
                    )
                }
            }
        } catch (_: Throwable) {
        }

        // 2. Extração de serial via Build.getSerial() oficial
        var serialResolvido: String? = null
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val sn = Build.getSerial()
                if (!sn.isNullOrBlank() && sn != Build.UNKNOWN && sn != "0") {
                    serialResolvido = sn.trim().uppercase()
                }
            } else {
                @Suppress("DEPRECATION")
                val sn = Build.SERIAL
                if (!sn.isNullOrBlank() && sn != Build.UNKNOWN && sn != "0") {
                    serialResolvido = sn.trim().uppercase()
                }
            }
        } catch (_: Throwable) {
        }

        // 3. Extração avançada via reflexão do hardware (ro.serialno) - contorna restrições do Android 14 e 15 em tablets Samsung/Lenovo
        if (serialResolvido.isNullOrBlank()) {
            serialResolvido = obter_serial_propriedades_sistema()
        }

        // 4. Identificador corporativo Android Enterprise (DevicePolicyManager)
        if (serialResolvido.isNullOrBlank()) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val dpm = contexto.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
                    val enrollmentId = dpm?.enrollmentSpecificId
                    if (!enrollmentId.isNullOrBlank()) {
                        serialResolvido = enrollmentId.trim().uppercase()
                    }
                }
            } catch (_: Throwable) {
            }
        }

        // 5. Fallback estável para ANDROID_ID (persistido para nunca mudar)
        if (serialResolvido.isNullOrBlank()) {
            val androidId = android.provider.Settings.Secure.getString(
                contexto.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            )
            serialResolvido = if (!androidId.isNullOrBlank()) {
                androidId.trim().uppercase()
            } else {
                "TB-${Build.MODEL.replace(" ", "").uppercase()}"
            }
        }

        // Persiste o serial definitivo para garantir integridade e unicidade do tablet
        prefs.edit().putString(CHAVE_NUMERO_SERIE, serialResolvido).apply()
        return serialResolvido
    }

    /**
     * Extrai o número de série gravado no hardware pelo fabricante via SystemProperties (bypass Android 14/15).
     */
    private fun obter_serial_propriedades_sistema(): String? {
        val chavesPropriedades = arrayOf(
            "ro.serialno",
            "ro.boot.serialno",
            "ril.serialnumber",
            "sys.serialnumber",
            "ro.ril.oem.nosim.sn",
            "gsm.sn1"
        )
        return try {
            val systemPropertiesClass = Class.forName("android.os.SystemProperties")
            val getMethod = systemPropertiesClass.getMethod("get", String::class.java)
            for (chave in chavesPropriedades) {
                val valor = getMethod.invoke(null, chave) as? String
                if (!valor.isNullOrBlank() && valor != "unknown" && valor != "0" && valor.length >= 4) {
                    return valor.trim().uppercase()
                }
            }
            null
        } catch (_: Throwable) {
            null
        }
    }
}
