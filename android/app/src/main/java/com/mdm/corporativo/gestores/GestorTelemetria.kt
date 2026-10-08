package com.mdm.corporativo.gestores

import android.app.ActivityManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
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
        val filtroBateria = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val statusBateria: Intent? = contexto.registerReceiver(null, filtroBateria)
        val nivel = statusBateria?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val escala = statusBateria?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (nivel >= 0 && escala > 0) {
            (nivel * 100 / escala.toFloat()).toInt()
        } else {
            0
        }
    }

    /**
     * Verifica se o tablet está conectado à fonte de alimentação.
     */
    fun obter_status_carregando(): Boolean {
        val filtroBateria = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val statusBateria: Intent? = contexto.registerReceiver(null, filtroBateria)
        val status = statusBateria?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL
    }

    /**
     * Obtém o nível do sinal Wi-Fi (RSSI em dBm).
     */
    fun obter_nivel_sinal_wifi(): Int {
        val gestorWifi = contexto.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val info = gestorWifi.connectionInfo
        return info?.rssi ?: -127
    }

    /**
     * Obtém o nome da rede Wi-Fi conectada (SSID).
     */
    fun obter_ssid_wifi(): String {
        val gestorWifi = contexto.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val info = gestorWifi.connectionInfo
        val ssid = info?.ssid ?: "<Desconectado>"
        return ssid.replace("\"", "")
    }

    /**
     * Identifica o aplicativo atualmente visível na tela em primeiro plano.
     */
    fun obter_aplicativo_em_foco(): String {
        try {
            val usageStatsManager = contexto.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val tempoFim = System.currentTimeMillis()
            val tempoInicio = tempoFim - 1000 * 60 * 60 * 24 // Últimas 24 horas

            val eventos = usageStatsManager.queryEvents(tempoInicio, tempoFim)
            val eventoAtual = UsageEvents.Event()
            var pacoteEmFoco = ""

            while (eventos.hasNextEvent()) {
                eventos.getNextEvent(eventoAtual)
                if (eventoAtual.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                    pacoteEmFoco = eventoAtual.packageName
                }
            }

            return if (pacoteEmFoco.isNotEmpty()) pacoteEmFoco else "Sistema / Área de Trabalho"
        } catch (e: Exception) {
            return "Desconhecido"
        }
    }

    /**
     * Retorna os minutos em que o tablet esteve ocioso (sem interação ou troca de app).
     */
    fun obter_tempo_ocioso_minutos(): Long {
        try {
            val usageStatsManager = contexto.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val tempoFim = System.currentTimeMillis()
            val tempoInicio = tempoFim - 1000 * 60 * 60 * 24 // 24h

            val eventos = usageStatsManager.queryEvents(tempoInicio, tempoFim)
            val eventoAtual = UsageEvents.Event()
            var ultimoTempoAtivo = tempoInicio

            while (eventos.hasNextEvent()) {
                eventos.getNextEvent(eventoAtual)
                // USER_INTERACTION é API 28+, ACTIVITY_RESUMED funciona em antigas tbm
                if (eventoAtual.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
                    eventoAtual.eventType == 7 /* USER_INTERACTION */) {
                    ultimoTempoAtivo = eventoAtual.timeStamp
                }
            }
            
            val tempoOciosoMs = System.currentTimeMillis() - ultimoTempoAtivo
            return (tempoOciosoMs / (1000 * 60)).coerceAtLeast(0)
        } catch (e: Exception) {
            return 0L
        }
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
     * Obtém o número de série único do tablet (Device Owner tem acesso total ao Build.getSerial()).
     */
    fun obter_numero_serie(): String {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Build.getSerial()
            } else {
                Build.SERIAL
            }
        } catch (e: SecurityException) {
            // Fallback para ANDROID_ID se permissão de leitura não concedida no momento
            android.provider.Settings.Secure.getString(
                contexto.contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            ) ?: "TABLET-DESCONHECIDO"
        }
    }
}
