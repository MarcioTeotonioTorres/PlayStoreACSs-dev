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
                        val nomeArquivoParam = parametros.optString("nome_arquivo", "")

                        if (urlDownload.isNotEmpty()) {
                            val ehXapk = nomeArquivoParam.endsWith(".xapk", ignoreCase = true) ||
                                         urlDownload.contains(".xapk", ignoreCase = true)
                            val extensao = if (ehXapk) ".xapk" else ".apk"
                            val arquivoTemporario = File(contexto.cacheDir, "temp_update_${System.currentTimeMillis()}$extensao")
                            val downloadOk = baixar_apk_remoto(urlDownload, arquivoTemporario.absolutePath)
                            if (downloadOk) {
                                val sucesso = instaladorSilencioso.instalar_aplicativo_silencioso(arquivoTemporario.absolutePath, comandoId)
                                // Libera imediatamente o cache temporário para economizar espaço de armazenamento no tablet
                                try {
                                    arquivoTemporario.delete()
                                } catch (e: Exception) {
                                    Log.w(TAG, "Aviso ao limpar cache de instalação: ${e.message}")
                                }

                                if (sucesso) {
                                    clienteMqtt.enviar_resposta_comando(
                                        comandoId,
                                        "processando",
                                        "Download (${if (ehXapk) "XAPK" else "APK"}) concluído com êxito. Sessão de instalação submetida ao SO Android. Aguardando confirmação..."
                                    )
                                } else {
                                    clienteMqtt.enviar_resposta_comando(comandoId, "falha", "Falha ao submeter sessão do instalador Android.")
                                }
                            } else {
                                clienteMqtt.enviar_resposta_comando(comandoId, "falha", "Falha ao baixar pacote da URL fornecida.")
                            }
                        } else if (caminhoLocal.isNotEmpty()) {
                            val sucesso = instaladorSilencioso.instalar_aplicativo_silencioso(caminhoLocal, comandoId)
                            if (sucesso) {
                                clienteMqtt.enviar_resposta_comando(
                                    comandoId,
                                    "processando",
                                    "Sessão de instalação submetida para caminho local. Aguardando confirmação do SO..."
                                )
                            } else {
                                clienteMqtt.enviar_resposta_comando(comandoId, "falha", "Falha ao submeter sessão de instalação local.")
                            }
                        } else {
                            clienteMqtt.enviar_resposta_comando(comandoId, "falha", "Parâmetro url_apk ou caminho_local ausente.")
                        }
                    }

                    "limpar_dados_dispositivo" -> {
                        val incluirSd = parametros.optBoolean("incluir_sd", true)
                        clienteMqtt.enviar_resposta_comando(comandoId, "executado", "Limpeza remota acionada.")
                        gestorPoliticas.limpar_dados_dispositivo(incluirSd)
                    }

                    "aplicar_politica" -> {
                        val pacotesJson = parametros.optJSONArray("pacotes_ocultos")
                        val liberadosJson = parametros.optJSONArray("pacotes_liberados")
                        val urlsJson = parametros.optJSONArray("urls_permitidas")
                        val permitirCamera = parametros.optBoolean("permitir_camera", true)
                        val bloquearUsb = parametros.optBoolean("bloquear_usb", true)

                        val listaPacotes = mutableListOf<String>()
                        if (pacotesJson != null) {
                            for (i in 0 until pacotesJson.length()) {
                                listaPacotes.add(pacotesJson.getString(i))
                            }
                        }

                        val listaLiberados = mutableListOf<String>()
                        if (liberadosJson != null) {
                            for (i in 0 until liberadosJson.length()) {
                                listaLiberados.add(liberadosJson.getString(i))
                            }
                        }

                        val listaUrls = mutableListOf<String>()
                        if (urlsJson != null) {
                            for (i in 0 until urlsJson.length()) {
                                listaUrls.add(urlsJson.getString(i))
                            }
                        }

                        val bloquearInstalacaoApps = parametros.optBoolean("bloquear_instalacao_apps", true)
                        val bloquearBluetooth = parametros.optBoolean("bloquear_bluetooth", false)
                        val permitirResetFabrica = parametros.optBoolean("permitir_reset_fabrica", false)

                        val sucesso = gestorPoliticas.aplicar_politicas_sistema_completas(
                            listaPacotes, 
                            listaLiberados,
                            listaUrls,
                            permitirCamera,
                            bloquearUsb,
                            bloquearInstalacaoApps,
                            bloquearBluetooth,
                            permitirResetFabrica
                        )
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Políticas granulares aplicadas: ${listaPacotes.size} apps ocultos, APKs externos ${if (bloquearInstalacaoApps) "bloqueados" else "liberados"}, Bluetooth ${if (bloquearBluetooth) "bloqueado" else "liberado"}, Reset de Fábrica ${if (permitirResetFabrica) "liberado" else "bloqueado"}."
                        )
                    }

                    "ocultar_aplicativo" -> {
                        val pacote = parametros.optString("nome_pacote", "")
                        val sucesso = gestorPoliticas.ocultar_aplicativo_sistema(pacote)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Aplicativo $pacote ocultado com sucesso."
                        )
                    }

                    "restaurar_aplicativo" -> {
                        val pacote = parametros.optString("nome_pacote", "")
                        val sucesso = gestorPoliticas.restaurar_aplicativo_sistema(pacote)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Aplicativo $pacote restaurado com sucesso."
                        )
                    }

                    "configurar_restricoes_chrome" -> {
                        val urlsJson = parametros.optJSONArray("urls_permitidas")
                        val listaUrls = mutableListOf<String>()
                        if (urlsJson != null) {
                            for (i in 0 until urlsJson.length()) {
                                listaUrls.add(urlsJson.getString(i))
                            }
                        }
                        val sucesso = gestorPoliticas.configurar_restricoes_navegacao_chrome(listaUrls)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Restrições do Chrome configuradas: ${listaUrls.size} URLs na lista branca."
                        )
                    }

                    "bloquear_instalacao_apps" -> {
                        val bloquear = parametros.optBoolean("bloquear", true)
                        val sucesso = gestorPoliticas.definir_bloqueio_instalacao_aplicativos(bloquear)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Instalação de aplicativos ${if (bloquear) "bloqueada" else "liberada"} com sucesso."
                        )
                    }

                    "bloquear_bluetooth" -> {
                        val bloquear = parametros.optBoolean("bloquear", true)
                        val sucesso = gestorPoliticas.definir_bloqueio_bluetooth(bloquear)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            "Bluetooth ${if (bloquear) "bloqueado" else "liberado"} com sucesso."
                        )
                    }

                    "liberar_depuracao_adb" -> {
                        val sucesso = gestorPoliticas.liberar_depuracao_adb()
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            if (sucesso) "executado" else "falha",
                            if (sucesso) "Depuração USB (ADB) liberada e ativada." else "Falha ao liberar ADB."
                        )
                    }

                    "solicitar_telemetria", "atualizar_telemetria", "sincronizar_telemetria" -> {
                        com.mdm.corporativo.servico.ServicoSegundoPlanoMdm.instanciaAtiva?.enviar_telemetria_avulsa_agora()
                            ?: com.mdm.corporativo.servico.ServicoSegundoPlanoMdm.forcar_sincronizacao_imediata(contexto)
                        clienteMqtt.enviar_resposta_comando(
                            comandoId,
                            "executado",
                            "Telemetria atualizada e enviada sob demanda com sucesso."
                        )
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
     * Realiza o download seguro e resiliente do APK/XAPK para um arquivo local temporário.
     * Suporta arquivos grandes (150MB+), conexões lentas (timeout de 5min) e redirecionamentos HTTP/HTTPS.
     */
    fun baixar_apk_remoto(urlApk: String, destinoLocal: String): Boolean {
        var urlAtual = urlApk.trim()
        var redirecionamentos = 0
        val maxRedirecionamentos = 5

        while (redirecionamentos < maxRedirecionamentos) {
            try {
                // Higieniza a URL caso contenha espaços ou caracteres não-ASCII
                val uriValida = try {
                    val rawUri = java.net.URI(urlAtual)
                    if (rawUri.toASCIIString() != urlAtual) rawUri.toASCIIString() else urlAtual
                } catch (_: Exception) {
                    urlAtual.replace(" ", "%20")
                }

                val url = URL(uriValida)
                val conexao = url.openConnection() as HttpURLConnection
                conexao.instanceFollowRedirects = true
                conexao.connectTimeout = 30000 // 30s para handshake
                conexao.readTimeout = 300000   // 5 minutos para pacotes pesados (ex: WhatsApp 147MB, e-SUS 80MB)
                conexao.requestMethod = "GET"
                conexao.setRequestProperty("User-Agent", "MDM-Corporativo-DPC/1.2.2")
                conexao.connect()

                val codigoHttp = conexao.responseCode
                Log.d(TAG, "Download APK: HTTP $codigoHttp de $uriValida")

                // Trata redirecionamentos 301, 302, 303, 307, 308
                if (codigoHttp in 301..308 && codigoHttp != 304 && codigoHttp != 306) {
                    val novaUrl = conexao.getHeaderField("Location")
                    conexao.disconnect()
                    if (!novaUrl.isNullOrEmpty()) {
                        urlAtual = if (novaUrl.startsWith("http://") || novaUrl.startsWith("https://")) {
                            novaUrl
                        } else {
                            val base = URL(uriValida)
                            URL(base, novaUrl).toString()
                        }
                        redirecionamentos++
                        Log.i(TAG, "Seguindo redirecionamento HTTP $codigoHttp para: $urlAtual")
                        continue
                    }
                }

                if (codigoHttp != HttpURLConnection.HTTP_OK) {
                    Log.e(TAG, "Falha no download do pacote. Código HTTP retornado: $codigoHttp")
                    conexao.disconnect()
                    return false
                }

                val totalBytes = conexao.contentLengthLong
                Log.i(TAG, "Iniciando download do pacote (${if (totalBytes > 0) "${totalBytes / (1024 * 1024)} MB" else "tamanho desconhecido"})...")

                val entrada = conexao.inputStream
                val arquivoDestino = File(destinoLocal)
                arquivoDestino.parentFile?.mkdirs()
                val saida = FileOutputStream(arquivoDestino)
                val buffer = ByteArray(65536) // Buffer de 64KB (8x mais rápido)
                var bytesLidos: Int
                var totalGravado = 0L

                while (entrada.read(buffer).also { bytesLidos = it } != -1) {
                    saida.write(buffer, 0, bytesLidos)
                    totalGravado += bytesLidos
                }
                saida.flush()
                saida.close()
                entrada.close()
                conexao.disconnect()

                Log.i(TAG, "Download concluído com êxito! Total gravado em disco: $totalGravado bytes em $destinoLocal")
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Erro durante download do APK ($urlAtual): ${e.message}", e)
                return false
            }
        }

        Log.e(TAG, "Excedido limite de redirecionamentos para a URL: $urlApk")
        return false
    }
}
