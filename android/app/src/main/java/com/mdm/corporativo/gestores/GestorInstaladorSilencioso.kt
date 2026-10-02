package com.mdm.corporativo.gestores

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentSender
import android.content.pm.PackageInstaller
import android.os.Build
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.io.OutputStream

/**
 * Gestor responsável por realizar instalações e desinstalações silenciosas de APKs
 * sem qualquer intervenção humana, utilizando as prerrogativas de Device Owner.
 */
class GestorInstaladorSilencioso(private val contexto: Context) {

    companion object {
        private const val TAG = "MDM_Instalador"
        const val ACAO_RESULTADO_INSTALACAO = "com.mdm.corporativo.ACAO_RESULTADO_INSTALACAO"
    }

    /**
     * Instala um pacote APK silenciosamente sem exigir confirmação do usuário.
     * @param caminhoApk Caminho do arquivo APK no sistema de arquivos local.
     */
    fun instalar_aplicativo_silencioso(caminhoApk: String): Boolean {
        val arquivo = File(caminhoApk)
        if (!arquivo.exists() || !arquivo.isFile) {
            Log.e(TAG, "Arquivo APK não encontrado em: $caminhoApk")
            return false
        }

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

            val intentSender = criar_intent_sender_callback(sessaoId)
            sessao.commit(intentSender)
            sessao.close()

            Log.i(TAG, "Sessão de instalação silenciosa submetida com sucesso! Sessão ID: $sessaoId")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Falha na instalação silenciosa: ${e.message}", e)
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
    private fun criar_intent_sender_callback(sessaoId: Int): IntentSender {
        val intent = Intent(ACAO_RESULTADO_INSTALACAO).apply {
            setPackage(contexto.packageName)
            putExtra("sessao_id", sessaoId)
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

        processar_resultado_instalacao(context, status, mensagem, pacote)
    }

    fun processar_resultado_instalacao(contexto: Context, status: Int, mensagem: String?, pacote: String?) {
        when (status) {
            PackageInstaller.STATUS_SUCCESS -> {
                Log.i("MDM_Instalador", "Sucesso: Aplicativo instalado com êxito! Pacote: $pacote")
            }
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                Log.w("MDM_Instalador", "Aviso: Ação do usuário requisitada inesperadamente.")
            }
            else -> {
                Log.e("MDM_Instalador", "Falha na instalação ($status): $mensagem")
            }
        }
    }
}
