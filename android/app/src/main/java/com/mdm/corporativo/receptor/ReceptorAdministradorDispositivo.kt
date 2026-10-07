package com.mdm.corporativo.receptor

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import com.mdm.corporativo.gestores.GestorPoliticasDispositivo
import com.mdm.corporativo.servico.ServicoSegundoPlanoMdm

/**
 * Receptor do Administrador do Dispositivo (DPC Device Owner).
 * Intercepta eventos de ciclo de vida do Android Enterprise.
 */
class ReceptorAdministradorDispositivo : DeviceAdminReceiver() {

    companion object {
        private const val TAG = "MDM_AdminReceiver"

        /**
         * Retorna o ComponentName referente a este receptor de administração.
         */
        fun obter_componente_administrador(contexto: Context): ComponentName {
            return ComponentName(contexto, ReceptorAdministradorDispositivo::class.java)
        }
    }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        super.onProfileProvisioningComplete(context, intent)
        com.mdm.corporativo.util.DiagnosticoPing.disparar(context, "receiver_provisioning_complete")
        try {
            Log.i(TAG, "Provisionamento de Device Owner concluído com sucesso!")
            ao_concluir_provisionamento(context, intent)
        } catch (e: Throwable) {
            Log.e(TAG, "Erro não-fatal ao concluir provisionamento: ${e.message}", e)
            com.mdm.corporativo.util.DiagnosticoPing.disparar(context, "erro_ao_concluir", e.message ?: "erro")
        }
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        com.mdm.corporativo.util.DiagnosticoPing.disparar(context, "receiver_on_enabled")
        try {
            Log.i(TAG, "Administrador de Dispositivo ativado com sucesso.")
            ao_habilitar_administrador(context, intent)
        } catch (e: Throwable) {
            Log.e(TAG, "Erro ao habilitar administrador: ${e.message}", e)
        }
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(TAG, "Alerta: Administrador de Dispositivo foi desabilitado.")
        ao_desabilitar_administrador(context, intent)
    }

    override fun onLockTaskModeEntering(context: Context, intent: Intent, pkg: String) {
        super.onLockTaskModeEntering(context, intent, pkg)
        Log.i(TAG, "Modo Quiosque (Lock Task) iniciado para o pacote: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        super.onLockTaskModeExiting(context, intent)
        Log.i(TAG, "Modo Quiosque (Lock Task) finalizado.")
    }

    /**
     * Trata o evento de finalização do provisionamento QR Code no primeiro boot.
     */
    fun ao_concluir_provisionamento(contexto: Context, intent: Intent) {
        try {
            // Extrai parâmetros do QR Code (servidor_api, broker_mqtt_host, broker_mqtt_porta)
            val extrasBundle = try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(
                        DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE,
                        android.os.PersistableBundle::class.java
                    )
                } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE)
                } else null
            } catch (eBundle: Throwable) {
                Log.w(TAG, "Aviso ao extrair extrasBundle: ${eBundle.message}")
                null
            }

            val prefs = contexto.getSharedPreferences("config_mdm", Context.MODE_PRIVATE)
            val editor = prefs.edit()

            if (extrasBundle != null) {
                extrasBundle.getString("servidor_api")?.let { editor.putString("servidor_api", it) }
                extrasBundle.getString("broker_mqtt_host")?.let { editor.putString("broker_mqtt_host", it) }
                val porta = extrasBundle.getInt("broker_mqtt_porta", 8883)
                editor.putInt("broker_mqtt_porta", porta)
                Log.i(TAG, "Configurações do QR salvas: api=${extrasBundle.getString("servidor_api")}, broker=${extrasBundle.getString("broker_mqtt_host")}:$porta")
            } else {
                if (!prefs.contains("servidor_api")) {
                    editor.putString("servidor_api", "https://mdmplaystoreacs.duckdns.org/api")
                }
                if (!prefs.contains("broker_mqtt_host")) {
                    editor.putString("broker_mqtt_host", "31.97.86.253")
                }
                if (!prefs.contains("broker_mqtt_porta")) {
                    editor.putInt("broker_mqtt_porta", 1883)
                }
            }
            editor.apply()
            Log.i(TAG, "Configurações de provisionamento gravadas com sucesso. Aguardando inicialização do sistema.")
        } catch (eGeral: Throwable) {
            Log.e(TAG, "Erro em ao_concluir_provisionamento: ${eGeral.message}", eGeral)
        }
    }

    /**
     * Callback invocado quando as permissões de administração são concedidas.
     */
    fun ao_habilitar_administrador(contexto: Context, intent: Intent) {
        Log.i(TAG, "Administrador de Dispositivo ativo. Aguardando conclusão do Setup Wizard.")
    }

    /**
     * Callback invocado em caso de remoção de privilégios.
     */
    fun ao_desabilitar_administrador(contexto: Context, intent: Intent) {
        Log.w(TAG, "Privilégios de administração foram revogados.")
    }
}
