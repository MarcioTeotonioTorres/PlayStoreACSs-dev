package com.mdm.corporativo.gestores

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentSender
import android.content.pm.PackageInstaller
import android.os.Build
import android.os.Environment
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.util.zip.ZipFile

/**
 * Gestor responsável por realizar instalações e desinstalações silenciosas de pacotes APK e XAPK
 * sem qualquer intervenção humana, utilizando as prerrogativas de Device Owner.
 */
class GestorInstaladorSilencioso(private val contexto: Context) {

    companion object {
        private const val TAG = "MDM_Instalador"
        const val ACAO_RESULTADO_INSTALACAO = "com.mdm.corporativo.ACAO_RESULTADO_INSTALACAO"
    }

    /**
     * Instala um pacote (APK individual ou XAPK/Split APKs) silenciosamente sem exigir confirmação do usuário.
     * @param caminhoPacote Caminho do arquivo APK ou XAPK no sistema de arquivos local.
     * @param comandoId Identificador do comando MQTT que disparou a instalação.
     */
    fun instalar_aplicativo_silencioso(caminhoPacote: String, comandoId: String? = null): Boolean {
        val arquivo = File(caminhoPacote)
        if (!arquivo.exists() || !arquivo.isFile) {
            Log.e(TAG, "Arquivo de pacote não encontrado em: $caminhoPacote")
            return false
        }

        val ehXapk = arquivo.name.endsWith(".xapk", ignoreCase = true)
        return if (ehXapk) {
            instalar_xapk_silencioso(arquivo, comandoId)
        } else {
            instalar_apk_padrao_silencioso(arquivo, comandoId)
        }
    }

    /**
     * Instalação silenciosa de APK padrão independente.
     */
    private fun instalar_apk_padrao_silencioso(arquivo: File, comandoId: String? = null): Boolean {
        val instaladorPacotes = contexto.packageManager.packageInstaller
        val parametros = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        
        // No Android 12+ (API 31+), Device Owner pode especificar que nenhuma ação do usuário é necessária
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            parametros.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }

        var sessaoId = -1
        return try {
            sessaoId = instaladorPacotes.createSession(parametros)
            val sessao = instaladorPacotes.openSession(sessaoId)

            val entrada: InputStream = FileInputStream(arquivo)
            val saida: OutputStream = sessao.openWrite("pacote_mdm", 0, arquivo.length())

            val buffer = ByteArray(65536)
            var bytesLidos: Int
            while (entrada.read(buffer).also { bytesLidos = it } != -1) {
                saida.write(buffer, 0, bytesLidos)
            }

            sessao.fsync(saida)
            entrada.close()
            saida.close()

            val intentSender = criar_intent_sender_callback(sessaoId, comandoId)
            sessao.commit(intentSender)
            sessao.close()

            Log.i(TAG, "Sessão APK silenciosa submetida com sucesso! Sessão ID: $sessaoId, Comando ID: $comandoId")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Falha na instalação silenciosa APK: ${e.message}", e)
            if (sessaoId != -1) {
                try {
                    instaladorPacotes.abandonSession(sessaoId)
                } catch (ignored: Exception) {}
            }
            false
        }
    }

    /**
     * Instalação silenciosa de pacotes XAPK (arquivos compactados contendo múltiplos APKs split/bundle e OBBs).
     */
    private fun instalar_xapk_silencioso(arquivo: File, comandoId: String? = null): Boolean {
        val instaladorPacotes = contexto.packageManager.packageInstaller
        val parametros = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            parametros.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }

        var sessaoId = -1
        return try {
            val zip = ZipFile(arquivo)
            sessaoId = instaladorPacotes.createSession(parametros)
            val sessao = instaladorPacotes.openSession(sessaoId)

            var apksEncontrados = 0
            val entries = zip.entries()

            while (entries.hasMoreElements()) {
                val entry = entries.nextElement()
                val nome = entry.name

                if (nome.endsWith(".apk", ignoreCase = true)) {
                    val nomeSimples = File(nome).name
                    val entrada = zip.getInputStream(entry)
                    val saida = sessao.openWrite(nomeSimples, 0, entry.size)

                    val buffer = ByteArray(65536)
                    var bytesLidos: Int
                    while (entrada.read(buffer).also { bytesLidos = it } != -1) {
                        saida.write(buffer, 0, bytesLidos)
                    }

                    sessao.fsync(saida)
                    entrada.close()
                    saida.close()
                    apksEncontrados++
                    Log.i(TAG, "Submetido APK do pacote XAPK para a sessão: $nomeSimples (${entry.size} bytes)")
                } else if (nome.endsWith(".obb", ignoreCase = true)) {
                    try {
                        val destinoObb = File(Environment.getExternalStorageDirectory(), nome)
                        destinoObb.parentFile?.mkdirs()
                        zip.getInputStream(entry).use { inStream ->
                            FileOutputStream(destinoObb).use { outStream ->
                                inStream.copyTo(outStream)
                            }
                        }
                        Log.i(TAG, "Arquivo OBB do pacote XAPK extraído para: ${destinoObb.absolutePath}")
                    } catch (eObb: Exception) {
                        Log.w(TAG, "Aviso ao extrair OBB ($nome): ${eObb.message}")
                    }
                }
            }
            zip.close()

            if (apksEncontrados == 0) {
                Log.e(TAG, "Nenhum arquivo .apk encontrado dentro do pacote XAPK: ${arquivo.name}")
                sessao.close()
                instaladorPacotes.abandonSession(sessaoId)
                return false
            }

            val intentSender = criar_intent_sender_callback(sessaoId, comandoId)
            sessao.commit(intentSender)
            sessao.close()

            Log.i(TAG, "Sessão XAPK com $apksEncontrados APK(s) submetida com sucesso! Sessão ID: $sessaoId, Comando ID: $comandoId")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Falha na instalação silenciosa XAPK: ${e.message}", e)
            if (sessaoId != -1) {
                try {
                    instaladorPacotes.abandonSession(sessaoId)
                } catch (ignored: Exception) {}
            }
            false
        }
    }

    /**
     * Desinstala silenciosamente um aplicativo pelo nome do seu pacote.
     */
    fun desinstalar_aplicativo_silencioso(nomePacote: String): Boolean {
        return try {
            val instaladorPacotes = contexto.packageManager.packageInstaller
            val intentSender = criar_intent_sender_callback(-1)
            instaladorPacotes.uninstall(nomePacote, intentSender)
            Log.i(TAG, "Solicitação de desinstalação silenciosa para $nomePacote enviada.")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao desinstalar silenciosamente: ${e.message}", e)
            false
        }
    }

    /**
     * Cria o IntentSender necessário para receber o status da operação do PackageInstaller.
     */
    private fun criar_intent_sender_callback(sessaoId: Int, comandoId: String? = null): IntentSender {
        val intent = Intent(ACAO_RESULTADO_INSTALACAO).apply {
            setPackage(contexto.packageName)
            putExtra("sessao_id", sessaoId)
            if (!comandoId.isNullOrEmpty()) {
                putExtra("comando_id", comandoId)
            }
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getBroadcast(contexto, sessaoId, intent, flags)
        return pendingIntent.intentSender
    }
}

/**
 * Receptor de callback para o resultado da instalação de APK.
 */
class ReceptorResultadoInstalacao : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        val mensagem = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        val pacote = intent.getStringExtra(PackageInstaller.EXTRA_OTHER_PACKAGE_NAME)
        val comandoId = intent.getStringExtra("comando_id")

        processar_resultado_instalacao(context, status, mensagem, pacote, comandoId)
    }

    fun processar_resultado_instalacao(
        contexto: Context,
        status: Int,
        mensagem: String?,
        pacote: String?,
        comandoId: String?
    ) {
        when (status) {
            PackageInstaller.STATUS_SUCCESS -> {
                Log.i("MDM_Instalador", "Sucesso: Aplicativo instalado com êxito! Pacote: $pacote (Comando: $comandoId)")
            }
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                Log.w("MDM_Instalador", "Aviso: Ação do usuário requisitada inesperadamente.")
            }
            else -> {
                Log.e("MDM_Instalador", "Falha na instalação ($status): $mensagem (Comando: $comandoId)")
            }
        }

        // Repassa o resultado com comandoId para o serviço em segundo plano notificar o broker MQTT
        try {
            val intentServico = Intent(contexto, com.mdm.corporativo.servico.ServicoSegundoPlanoMdm::class.java).apply {
                action = com.mdm.corporativo.servico.ServicoSegundoPlanoMdm.ACAO_RESULTADO_INSTALACAO_NOTIFICAR
                putExtra("comando_id", comandoId)
                putExtra("status", status)
                putExtra("mensagem", mensagem)
                putExtra("pacote", pacote)
            }
            contexto.startService(intentServico)
        } catch (e: Exception) {
            Log.e("MDM_Instalador", "Erro ao repassar status de instalação ao serviço MDM: ${e.message}", e)
        }
    }
}
