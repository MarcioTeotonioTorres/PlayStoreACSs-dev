package com.mdm.corporativo.receptor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.mdm.corporativo.servico.ServicoSegundoPlanoMdm

/**
 * Receptor de inicialização do dispositivo e pós-atualização de pacote (OTA)
 * para reativação automática do serviço persistente e reagendamento da rotina diária de 24h.
 */
class ReceptorInicializacaoSistema : BroadcastReceiver() {

    companion object {
        private const val TAG = "MDM_BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val acao = intent.action
        Log.i(TAG, "Receptor acionado pelo SO: $acao")

        if (acao == Intent.ACTION_BOOT_COMPLETED ||
            acao == "android.intent.action.QUICKBOOT_POWERON" ||
            acao == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            Log.i(TAG, "Reativando serviços corporativos MDM e agendador diário...")
            iniciar_servicos_corporativos(context)
        }
    }

    /**
     * Dispara o serviço persistente e arma o agendador de 24h resiliente a Doze Mode.
     */
    fun iniciar_servicos_corporativos(contexto: Context) {
        ServicoSegundoPlanoMdm.iniciar_servico(contexto)
        ServicoSegundoPlanoMdm.agendar_sincronizacao_diaria(contexto)
    }
}
