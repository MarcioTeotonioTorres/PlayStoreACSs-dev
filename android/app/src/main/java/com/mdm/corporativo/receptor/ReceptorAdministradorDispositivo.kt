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
        Log.i(TAG, "Provisionamento de Device Owner concluído com sucesso!")
        ao_concluir_provisionamento(context, intent)
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Administrador de Dispositivo ativado com sucesso.")
        ao_habilitar_administrador(context, intent)
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
        // Inicializa o gestor e aplica políticas fundamentais imediatamente
        val gestorPoliticas = GestorPoliticasDispositivo(contexto)
        gestorPoliticas.aplicar_politicas_sistema()

        // Inicia o serviço persistente de comunicação e telemetria MQTT
        ServicoSegundoPlanoMdm.iniciar_servico(contexto)
    }

    /**
     * Callback invocado quando as permissões de administração são concedidas.
     */
    fun ao_habilitar_administrador(contexto: Context, intent: Intent) {
        ServicoSegundoPlanoMdm.iniciar_servico(contexto)
    }

    /**
     * Callback invocado em caso de remoção de privilégios.
     */
    fun ao_desabilitar_administrador(contexto: Context, intent: Intent) {
        Log.w(TAG, "Privilégios de administração foram revogados.")
    }
}
