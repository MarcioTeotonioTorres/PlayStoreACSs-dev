package com.mdm.corporativo.receptor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.mdm.corporativo.servico.ServicoSegundoPlanoMdm

/**
 * Receptor de inicialização do dispositivo para reativação automática
 * do serviço de telemetria e recepção de comandos MDM após o boot.
 */
class ReceptorInicializacaoSistema : BroadcastReceiver() {

    companion object {
        private const val TAG = "MDM_BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            Log.i(TAG, "Dispositivo inicializado. Iniciando serviços MDM...")
            ao_receber_inicializacao(context, intent)
        }
    }

    /**
     * Trata o evento de boot do sistema operacional.
     */
    fun ao_receber_inicializacao(contexto: Context, intent: Intent) {
        iniciar_servicos_corporativos(contexto)
    }

    /**
     * Dispara a execução do serviço persistente em primeiro plano.
     */
    fun iniciar_servicos_corporativos(contexto: Context) {
        ServicoSegundoPlanoMdm.iniciar_servico(contexto)
    }
}
