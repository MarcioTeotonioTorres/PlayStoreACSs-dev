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
import android.app.admin.DevicePolicyManager
import android.os.UserManager
import com.mdm.corporativo.receptor.ReceptorAdministradorDispositivo
import com.mdm.corporativo.servico.ServicoSegundoPlanoMdm
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
     * Garante de forma defensiva que restrições de SO (DISALLOW_INSTALL_APPS e DISALLOW_INSTALL_UNKNOWN_SOURCES)
     * estejam limpas no momento do commit da sessão para não barrar o PackageInstaller.
     */
    private fun garantir_liberacao_instalador() {
        try {
            val dpm = contexto.getSystemService(DevicePolicyManager::class.java)
            val admin = ReceptorAdministradorDispositivo.obter_componente_administrador(contexto)
            if (dpm != null && dpm.isDeviceOwnerApp(contexto.packageName)) {
                dpm.clearUserRestriction(admin, UserManager.DISALLOW_INSTALL_APPS)
                dpm.clearUserRestriction(admin, UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)
                Log.d(TAG, "Garantido: restrições DISALLOW_INSTALL_APPS e DISALLOW_INSTALL_UNKNOWN_SOURCES limpas para PackageInstaller.")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Aviso ao limpar restrição de instalação: ${e.message}")
        }
    }

    /**
     * Instala um pacote (APK individual ou XAPK/Split APKs) silenciosamente sem exigir confirmação do usuário.
     * @param caminhoPacote Caminho do arquivo APK ou XAPK no sistema de arquivos local.
     * @param comandoId Identificador do comando MQTT que disparou a instalação.
     */
    fun instalar_aplicativo_silencioso(caminhoPacote: String, comandoId: String? = null): Boolean {
        garantir_liberacao_instalador()
        val arquivo = File(caminhoPacote)
        if (!arquivo.exists() || !arquivo.isFile) {
            Log.e(TAG, "Arquivo de pacote não encontrado em: $caminhoPacote")
            return false
        }

        val ehPacoteCompactado = arquivo.name.endsWith(".xapk", ignoreCase = true) ||
                                 arquivo.name.endsWith(".apks", ignoreCase = true) ||
                                 arquivo.name.endsWith(".zip", ignoreCase = true)
        return if (ehPacoteCompactado) {
            instalar_xapk_silencioso(arquivo, comandoId)
        } else {
            instalar_apk_padrao_silencioso(arquivo, comandoId)
        }
    }

    /**
     * Instalação silenciosa de APK padrão independente.
     */
    private fun instalar_apk_padrao_silencioso(arquivo: File, comandoId: String? = null): Boolean {
        garantir_liberacao_instalador()
        val instaladorPacotes = contexto.packageManager.packageInstaller
        val parametros = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        
        // No Android 12+ (API 31+), Device Owner pode especificar que nenhuma ação do usuário é necessária
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            parametros.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            parametros.setInstallReason(android.content.pm.PackageManager.INSTALL_REASON_POLICY)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            parametros.setPackageSource(PackageInstaller.PACKAGE_SOURCE_STORE)
        }

        var sessaoId = -1
        return try {
            sessaoId = instaladorPacotes.createSession(parametros)
            val sessao = instaladorPacotes.openSession(sessaoId)

            val entrada: InputStream = FileInputStream(arquivo)
            // O nome do arquivo na sessão DEVE terminar com '.apk' para que o PackageManager do SO não o ignore!
            // O padrão do Android para APK base de instalação completa é "base.apk"
            val saida: OutputStream = sessao.openWrite("base.apk", 0, arquivo.length())

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
        garantir_liberacao_instalador()
        val instaladorPacotes = contexto.packageManager.packageInstaller
        val parametros = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            parametros.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            parametros.setInstallReason(android.content.pm.PackageManager.INSTALL_REASON_POLICY)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            parametros.setPackageSource(PackageInstaller.PACKAGE_SOURCE_STORE)
        }

        var sessaoId = -1
        return try {
            val zip = ZipFile(arquivo)
            sessaoId = instaladorPacotes.createSession(parametros)
            val sessao = instaladorPacotes.openSession(sessaoId)

            var apksEncontrados = 0
            val entries = zip.entries()
            val nomesSessaoUsados = mutableSetOf<String>()

            while (entries.hasMoreElements()) {
                val entry = entries.nextElement()
                val nome = entry.name

                if (nome.endsWith(".apk", ignoreCase = true)) {
                    var nomeSimples = File(nome).name.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
                    if (!nomeSimples.endsWith(".apk", ignoreCase = true)) {
                        nomeSimples += ".apk"
                    }
                    // Previne qualquer colisão de nomes de arquivos dentro da sessão do PackageInstaller
                    var nomeFinalNaSessao = nomeSimples
                    var indiceColisao = 1
                    while (nomesSessaoUsados.contains(nomeFinalNaSessao)) {
                        nomeFinalNaSessao = "${nomeSimples.removeSuffix(".apk")}_$indiceColisao.apk"
                        indiceColisao++
                    }
                    nomesSessaoUsados.add(nomeFinalNaSessao)

                    val entrada = zip.getInputStream(entry)
                    val tamanhoBytes = if (entry.size > 0) entry.size else -1L
                    val saida = sessao.openWrite(nomeFinalNaSessao, 0, tamanhoBytes)

                    val buffer = ByteArray(65536)
                    var bytesLidos: Int
                    while (entrada.read(buffer).also { bytesLidos = it } != -1) {
                        saida.write(buffer, 0, bytesLidos)
                    }

                    sessao.fsync(saida)
                    entrada.close()
                    saida.close()
                    apksEncontrados++
                    Log.i(TAG, "Submetido APK do pacote para a sessão: $nomeFinalNaSessao (${entry.size} bytes)")
                } else if (nome.endsWith(".obb", ignoreCase = true)) {
                    try {
                        val destinoObb = File(Environment.getExternalStorageDirectory(), nome)
                        destinoObb.parentFile?.mkdirs()
                        zip.getInputStream(entry).use { inStream ->
                            FileOutputStream(destinoObb).use { outStream ->
                                inStream.copyTo(outStream)
                            }
                        }
                        Log.i(TAG, "Arquivo OBB do pacote extraído para: ${destinoObb.absolutePath}")
                    } catch (eObb: Exception) {
                        Log.w(TAG, "Aviso ao extrair OBB ($nome): ${eObb.message}")
                    }
                }
            }
            zip.close()

            if (apksEncontrados == 0) {
                Log.e(TAG, "Nenhum arquivo .apk encontrado dentro do pacote: ${arquivo.name}")
                sessao.close()
                instaladorPacotes.abandonSession(sessaoId)
                return false
            }

            val intentSender = criar_intent_sender_callback(sessaoId, comandoId)
            sessao.commit(intentSender)
            sessao.close()

            Log.i(TAG, "Sessão com $apksEncontrados APK(s) submetida com sucesso! Sessão ID: $sessaoId, Comando ID: $comandoId")
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
    private fun criar_intent_sender_callback(sessaoId: Int, comandoId: String? = null): IntentSender {
        // PendingIntent explícito apontando diretamente para ReceptorResultadoInstalacao
        val intent = Intent(contexto, ReceptorResultadoInstalacao::class.java).apply {
            action = ACAO_RESULTADO_INSTALACAO
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
 * Receptor de callback para o resultado da instalação de APK emitida pelo PackageInstaller do Android.
 */
class ReceptorResultadoInstalacao : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        val mensagem = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
        val pacote = intent.getStringExtra(PackageInstaller.EXTRA_PACKAGE_NAME)
            ?: intent.getStringExtra(PackageInstaller.EXTRA_OTHER_PACKAGE_NAME)
        val comandoId = intent.getStringExtra("comando_id")

        Log.i("MDM_Instalador", "Callback de instalação recebido do SO Android: status=$status, pacote=$pacote, msg=$mensagem, comando=$comandoId")

        // Se o SO solicitar confirmação do usuário (ex: em caso de restrição do fabricante), aciona a tela
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            val confirmIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(Intent.EXTRA_INTENT)
            }
            if (confirmIntent != null) {
                confirmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(confirmIntent)
                Log.w("MDM_Instalador", "Ação do usuário requerida pelo SO: diálogo de confirmação disparado.")
            }
            pendingResult.finish()
            return
        }

        // Se a instalação obteve êxito total, desoculta e desuspende o pacote imediatamente para aparecer na gaveta
        if (status == PackageInstaller.STATUS_SUCCESS && !pacote.isNullOrEmpty()) {
            try {
                val dpm = context.getSystemService(DevicePolicyManager::class.java)
                val admin = ReceptorAdministradorDispositivo.obter_componente_administrador(context)
                if (dpm != null && dpm.isDeviceOwnerApp(context.packageName)) {
                    dpm.setApplicationHidden(admin, pacote, false)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        dpm.setPackagesSuspended(admin, arrayOf(pacote), false)
                    }
                    Log.i("MDM_Instalador", "Aplicativo recém-instalado '$pacote' liberado e visível na gaveta de apps!")
                }
            } catch (tUnhide: Throwable) {
                Log.w("MDM_Instalador", "Aviso ao liberar visibilidade do app $pacote: ${tUnhide.message}")
            }
        }

        // Notifica de forma assíncrona e segura via MQTT / HTTP sem violar regras de background service do Android 14/15
        CoroutineScope(Dispatchers.IO).launch {
            try {
                ServicoSegundoPlanoMdm.notificar_resultado_instalacao(
                    context,
                    status,
                    mensagem,
                    pacote,
                    comandoId
                )
            } catch (t: Throwable) {
                Log.e("MDM_Instalador", "Erro ao notificar resultado da instalação: ${t.message}", t)
            } finally {
                pendingResult.finish()
            }
        }
    }
}
