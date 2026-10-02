package com.mdm.corporativo.gestores

import android.content.Context
import android.util.Log
import com.mdm.corporativo.mqtt.ClienteMqttSeguro
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Interpretador e executor de comandos remotos recebidos via MQTT.
 */
class GestorComandosMdm(
    private val contexto: Context,
    private val gestorPoliticas: GestorPoliticasDispositivo,
    private val instaladorSilencioso: GestorInstaladorSilencioso,
    private val clienteMqtt: ClienteMqttSeguro
) {

    companion object {
        private const val TAG = "MDM_ExecutorComandos"
    }

    /**
     * Decodifica a mensagem de comando recebida em JSON e despacha a execução.
     */
    fun processar_e_executar_comando(payloadJson: String) {
        try {
            val json = JSONObject(payloadJson)
            val comandoId = json.optString("id", System.currentTimeMillis().toString())
            val tipoComando = json.getString("tipo_comando")
            val parametros = json.optJSONObject("parametros") ?: JSONObject()

            Log.i(TAG, "Processando comando: $tipoComando (ID: $comandoId)")

            thread {
                when (tipoComando) {
                    "bloquear_tela_imediata" -> {
                        val sucesso = gestorPoliticas.bloquear_tela_imediata()
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            if (sucesso) "Tela bloqueada imediatamente." else "Falha ao bloquear tela."
                        )
                    }

                    "reiniciar_aparelho" -> {
                        val sucesso = gestorPoliticas.reiniciar_aparelho()
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            if (sucesso) "Reinicialização do tablet disparada." else "Falha ao reiniciar aparelho."
                        )
                    }

                    "definir_bloqueio_reset_fabrica" -> {
                        val habilitar = parametros.optBoolean("habilitar", true)
                        val sucesso = gestorPoliticas.definir_bloqueio_reset_fabrica(habilitar)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Bloqueio de reset de fábrica definido como $habilitar."
                        )
                    }

                    "definir_bloqueio_camera" -> {
                        val bloquear = parametros.optBoolean("bloquear", true)
                        val sucesso = gestorPoliticas.definir_bloqueio_camera(bloquear)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Bloqueio de câmera definido como $bloquear."
                        )
                    }

                    "definir_bloqueio_usb" -> {
                        val bloquear = parametros.optBoolean("bloquear", true)
                        val sucesso = gestorPoliticas.definir_bloqueio_usb(bloquear)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Bloqueio de transferência USB definido como $bloquear."
                        )
                    }

                    "modo_quiosque" -> {
                        val pacote = parametros.optString("pacote_app", "")
                        val habilitar = parametros.optBoolean("habilitar", true)
                        val sucesso = gestorPoliticas.configurar_modo_quiosque(pacote, habilitar)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Modo quiosque para $pacote configurado: $habilitar."
                        )
                    }

                    "instalar_aplicativo_silencioso" -> {
                        val urlDownload = parametros.optString("url_apk", "")
                        val caminhoLocal = parametros.optString("caminho_local", "")

                        if (urlDownload.isNotEmpty()) {
                            val arquivoTemporario = File(contexto.cacheDir, "update_temporario.apk")
                            val downloadOk = baixar_apk_remoto(urlDownload, arquivoTemporario.absolutePath)
                            if (downloadOk) {
                                val sucesso = instaladorSilencioso.instalar_aplicativo_silencioso(arquivoTemporario.absolutePath)
                                clienteMqtt.enviar_resposta_comando(
                                    comandoId,
                                    if (sucesso) "executado" else "falha",
                                    "Instalação silenciosa iniciada para APK baixado da URL."
                                )
                            } else {
                                clienteMqtt.enviar_resposta_comando(comandoId, "falha", "Falha ao baixar APK da URL fornecida.")
                            }
                        } else if (caminhoLocal.isNotEmpty()) {
                            val sucesso = instaladorSilencioso.instalar_aplicativo_silencioso(caminhoLocal)
                            clienteMqtt.enviar_resposta_comando(
                                comandoId,
                                if (sucesso) "executado" else "falha",
                                "Instalação silenciosa submetida para caminho local."
                            )
                        } else {
                            clienteMqtt.enviar_resposta_comando(comandoId, "falha", "Parâmetro url_apk ou caminho_local ausente.")
                        }
                    }

                    "limpar_dados_dispositivo" -> {
                        val incluirSd = parametros.optBoolean("incluir_sd", true)
                        clienteMqtt.enviar_resposta_comando(comandoId, "executado", "Limpeza remota acionada.")
                        gestorPoliticas.limpar_dados_dispositivo(incluirSd)
                    }

                    else -> {
                        Log.w(TAG, "Comando desconhecido: $tipoComando")
                        clienteMqtt.enviar_resposta_comando(comandoId, "rejeitado", "Tipo de comando desconhecido: $tipoComando")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao processar comando recebido: ${e.message}", e)
        }
    }

    /**
     * Realiza o download seguro do APK para um arquivo local temporário.
     */
    fun baixar_apk_remoto(urlApk: String, destinoLocal: String): Boolean {
        return try {
            val url = URL(urlApk)
            val conexao = url.openConnection() as HttpURLConnection
            conexao.connectTimeout = 15000
            conexao.readTimeout = 30000
            conexao.requestMethod = "GET"
            conexao.connect()

            if (conexao.responseCode != HttpURLConnection.HTTP_OK) {
                Log.e(TAG, "Falha no download do APK. Código HTTP: ${conexao.responseCode}")
                return false
            }

            val entrada = conexao.inputStream
            val saida = FileOutputStream(destinoLocal)
            val buffer = ByteArray(8192)
            var bytesLidos: Int
            while (entrada.read(buffer).also { bytesLidos = it } != -1) {
                saida.write(buffer, 0, bytesLidos)
            }
            saida.flush()
            saida.close()
            entrada.close()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Erro durante download do APK: ${e.message}", e)
            false
        }
    }
}
