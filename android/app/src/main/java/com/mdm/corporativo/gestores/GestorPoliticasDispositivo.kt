package com.mdm.corporativo.gestores

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.UserManager
import android.util.Log
import com.mdm.corporativo.receptor.ReceptorAdministradorDispositivo

/**
 * Gestor central de políticas de segurança e ações de controle de hardware
 * executadas pelo DPC na condição de Device Owner.
 */
class GestorPoliticasDispositivo(private val contexto: Context) {

    private val gestorPoliticas: DevicePolicyManager =
        contexto.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponente: ComponentName =
        ReceptorAdministradorDispositivo.obter_componente_administrador(contexto)

    companion object {
        private const val TAG = "MDM_GestorPoliticas"
    }

    /**
     * Verifica se o aplicativo atual detém o status de Device Owner no Android.
     */
    fun verificar_se_e_device_owner(): Boolean {
        return gestorPoliticas.isDeviceOwnerApp(contexto.packageName)
    }

    /**
     * Bloqueia a tela do dispositivo imediatamente.
     */
    fun bloquear_tela_imediata(): Boolean {
        return try {
            gestorPoliticas.lockNow()
            Log.i(TAG, "Comando executado: bloquear_tela_imediata()")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao bloquear tela imediata: ${e.message}", e)
            false
        }
    }

    /**
     * Reinicia o aparelho (requer Device Owner no Android 7.0+).
     */
    fun reiniciar_aparelho(): Boolean {
        return try {
            if (verificar_se_e_device_owner()) {
                gestorPoliticas.reboot(adminComponente)
                Log.i(TAG, "Comando executado: reiniciar_aparelho()")
                true
            } else {
                Log.w(TAG, "Permissão negada: App não é Device Owner para reiniciar aparelho.")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao reiniciar aparelho: ${e.message}", e)
            false
        }
    }

    /**
     * Habilita ou desabilita o bloqueio de restauração aos padrões de fábrica (FRP / Factory Reset).
     * Quando habilitar for true, impede que usuários restaurem o tablet pelas configurações ou bootloader.
     */
    fun definir_bloqueio_reset_fabrica(habilitar: Boolean): Boolean {
        return try {
            if (verificar_se_e_device_owner()) {
                if (habilitar) {
                    gestorPoliticas.addUserRestriction(adminComponente, UserManager.DISALLOW_FACTORY_RESET)
                } else {
                    gestorPoliticas.clearUserRestriction(adminComponente, UserManager.DISALLOW_FACTORY_RESET)
                }
                Log.i(TAG, "definir_bloqueio_reset_fabrica: restrição definida como $habilitar")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao definir bloqueio de reset de fábrica: ${e.message}", e)
            false
        }
    }

    /**
     * Bloqueia ou libera o uso de todas as câmeras dos tablets.
     */
    fun definir_bloqueio_camera(bloquear: Boolean): Boolean {
        return try {
            gestorPoliticas.setCameraDisabled(adminComponente, bloquear)
            Log.i(TAG, "definir_bloqueio_camera: câmeras bloqueadas = $bloquear")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao definir bloqueio de câmera: ${e.message}", e)
            false
        }
    }

    /**
     * Impede transferência de arquivos via USB ou conexão como dispositivo de mídia.
     */
    fun definir_bloqueio_usb(bloquear: Boolean): Boolean {
        return try {
            if (verificar_se_e_device_owner()) {
                if (bloquear) {
                    gestorPoliticas.addUserRestriction(adminComponente, UserManager.DISALLOW_USB_FILE_TRANSFER)
                    gestorPoliticas.addUserRestriction(adminComponente, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
                } else {
                    gestorPoliticas.clearUserRestriction(adminComponente, UserManager.DISALLOW_USB_FILE_TRANSFER)
                    gestorPoliticas.clearUserRestriction(adminComponente, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
                }
                Log.i(TAG, "definir_bloqueio_usb: restrições USB definidas como $bloquear")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao configurar bloqueio de USB: ${e.message}", e)
            false
        }
    }

    /**
     * Configura o Modo Quiosque Corporativo (Lock Task Mode) para travar o tablet em um aplicativo específico.
     */
    fun configurar_modo_quiosque(pacoteApp: String, habilitar: Boolean): Boolean {
        return try {
            if (verificar_se_e_device_owner()) {
                if (habilitar) {
                    gestorPoliticas.setLockTaskPackages(adminComponente, arrayOf(pacoteApp, contexto.packageName))
                } else {
                    gestorPoliticas.setLockTaskPackages(adminComponente, arrayOf())
                }
                Log.i(TAG, "configurar_modo_quiosque: pacote=$pacoteApp habilitado=$habilitar")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao configurar modo quiosque: ${e.message}", e)
            false
        }
    }

    /**
     * Realiza a limpeza remota de dados (Wipe / Reset Corporativo).
     */
    fun limpar_dados_dispositivo(incluirCartaoSd: Boolean = true): Boolean {
        return try {
            var flags = 0
            if (incluirCartaoSd) {
                flags = flags or DevicePolicyManager.WIPE_EXTERNAL_STORAGE
            }
            gestorPoliticas.wipeData(flags)
            Log.w(TAG, "Comando executado: limpar_dados_dispositivo()")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao executar limpeza de dados: ${e.message}", e)
            false
        }
    }

    /**
     * Aplica o pacote de políticas corporativas padrão após o provisionamento ou na inicialização.
     */
    fun aplicar_politicas_sistema() {
        if (!verificar_se_e_device_owner()) {
            Log.w(TAG, "Dispositivo não é Device Owner. Políticas avançadas não serão aplicadas.")
            return
        }

        try {
            // Proibir desinstalação de aplicativos do sistema ou do próprio DPC
            gestorPoliticas.setUninstallBlocked(adminComponente, contexto.packageName, true)

            // Restrição de reset de fábrica por padrão
            definir_bloqueio_reset_fabrica(true)

            // Proibir adição de novos usuários secundários no tablet
            gestorPoliticas.addUserRestriction(adminComponente, UserManager.DISALLOW_ADD_USER)

            // Proibir depuração USB (ADB) não autorizada se necessário
            gestorPoliticas.addUserRestriction(adminComponente, UserManager.DISALLOW_DEBUGGING_FEATURES)

            Log.i(TAG, "aplicar_politicas_sistema: Políticas corporativas aplicadas com sucesso.")
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao aplicar políticas do sistema: ${e.message}", e)
        }
    }

    /**
     * Oculta e desativa um aplicativo nativo indesejado (ex: YouTube, Galeria, Loja)
     * fazendo com que o app desapareça da gaveta e não possa ser executado.
     */
    fun ocultar_aplicativo_sistema(nomePacote: String): Boolean {
        return try {
            if (verificar_se_e_device_owner()) {
                // Tenta ocultar completamente da gaveta
                val oculto = gestorPoliticas.setApplicationHidden(adminComponente, nomePacote, true)
                
                // Como reforço (especialmente para a Play Store que às vezes resiste a ser ocultada),
                // aplicamos a suspensão do pacote (API 24+) que bloqueia a execução e deixa o ícone cinza.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    gestorPoliticas.setPackagesSuspended(adminComponente, arrayOf(nomePacote), true)
                }
                
                Log.i(TAG, "ocultar_aplicativo_sistema: Pacote $nomePacote bloqueado (Oculto: $oculto).")
                true
            } else {
                Log.w(TAG, "Permissão negada: Aplicativo não é Device Owner.")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao ocultar aplicativo $nomePacote: ${e.message}", e)
            false
        }
    }

    /**
     * Restaura o estado de visibilidade e execução de um aplicativo nativo do sistema.
     */
    fun restaurar_aplicativo_sistema(nomePacote: String): Boolean {
        return try {
            if (verificar_se_e_device_owner()) {
                gestorPoliticas.setApplicationHidden(adminComponente, nomePacote, false)
                
                try {
                    gestorPoliticas.enableSystemApp(adminComponente, nomePacote)
                } catch (e: Exception) {
                    Log.d(TAG, "enableSystemApp não aplicável (talvez não seja um app do sistema): $nomePacote")
                }
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    gestorPoliticas.setPackagesSuspended(adminComponente, arrayOf(nomePacote), false)
                }
                
                Log.i(TAG, "restaurar_aplicativo_sistema: Pacote $nomePacote restaurado com sucesso.")
                true
            } else {
                Log.w(TAG, "Permissão negada: Aplicativo não é Device Owner.")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao restaurar aplicativo $nomePacote: ${e.message}", e)
            false
        }
    }

    /**
     * Configura políticas granulares de navegação corporativa no Google Chrome ("com.android.chrome"):
     * - Bloqueia qualquer URL fora da lista ("URLBlocklist" = ["*"])
     * - Libera estritamente os domínios corporativos recebidos ("URLAllowlist")
     * - Desativa o modo anônimo ("IncognitoModeAvailability" = 1)
     */
    fun configurar_restricoes_navegacao_chrome(dominiosAutorizados: List<String>): Boolean {
        return try {
            if (verificar_se_e_device_owner()) {
                val pacoteChrome = "com.android.chrome"
                val restricoes = Bundle().apply {
                    // Chrome Moderno (v86+)
                    putStringArray("URLBlocklist", arrayOf("*"))
                    putStringArray("URLAllowlist", dominiosAutorizados.toTypedArray())
                    // Chrome Legado (pre-v86)
                    putStringArray("URLBlacklist", arrayOf("*"))
                    putStringArray("URLWhitelist", dominiosAutorizados.toTypedArray())
                    
                    putInt("IncognitoModeAvailability", 1)
                }

                gestorPoliticas.setApplicationRestrictions(adminComponente, pacoteChrome, restricoes)
                Log.i(TAG, "configurar_restricoes_navegacao_chrome: Restrições aplicadas ao Chrome com ${dominiosAutorizados.size} domínios.")
                true
            } else {
                Log.w(TAG, "Permissão negada: Não é Device Owner.")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao aplicar restrições ao Google Chrome: ${e.message}", e)
            false
        }
    }

    /**
     * Aplica o conjunto completo de diretrizes de segurança, aplicativos ocultos e restrições de navegação.
     */
    fun aplicar_politicas_sistema_completas(
        pacotesOcultos: List<String>, 
        pacotesLiberados: List<String>,
        dominiosAutorizados: List<String>,
        permitirCamera: Boolean,
        bloquearUsb: Boolean
    ): Boolean {
        return try {
            aplicar_politicas_sistema()

            // Lista de aplicativos comuns do MDM que devem ser restaurados se não estiverem na lista de ocultos
            val aplicativosComuns = listOf(
                "com.google.android.youtube",
                "com.android.vending",
                "com.google.android.apps.photos",
                "com.android.settings",
                "com.android.camera2"
            )

            // Restaura apps comuns que NÃO estão na lista de ocultos
            for (app in aplicativosComuns) {
                if (!pacotesOcultos.contains(app)) {
                    restaurar_aplicativo_sistema(app)
                }
            }

            // Restaura todos os apps que o backend enviou explicitamente na lista de liberados (para apps customizados)
            for (pacoteLiberado in pacotesLiberados) {
                restaurar_aplicativo_sistema(pacoteLiberado)
            }

            // Oculta todos os pacotes da lista
            for (pacote in pacotesOcultos) {
                ocultar_aplicativo_sistema(pacote)
            }

            // Aplicar politicas de hardware passadas
            definir_bloqueio_camera(!permitirCamera)
            definir_bloqueio_usb(bloquearUsb)

            if (dominiosAutorizados.isNotEmpty()) {
                configurar_restricoes_navegacao_chrome(dominiosAutorizados)
            }

            true
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao aplicar políticas completas: ${e.message}", e)
            false
        }
    }
}
