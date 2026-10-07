package com.mdm.corporativo.ui

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.mdm.corporativo.util.DiagnosticoPing

/**
 * Atividade mandatória no Android 10+ (Android Enterprise Device Owner).
 * O Setup Wizard do Android invoca esta atividade com o intent
 * 'android.app.action.ADMIN_POLICY_COMPLIANCE' após o download do DPC.
 *
 * Ao chamar setResult(RESULT_OK) e finish(), o assistente do Android sabe
 * que o aplicativo validou as diretrizes e conclui o provisionamento com sucesso
 * sem exibir a tela "Algo deu errado".
 */
class AtividadeConformidadePolitica : Activity() {

    companion object {
        private const val TAG = "MDM_Conformidade"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(TAG, "ADMIN_POLICY_COMPLIANCE recebido pelo Setup Wizard do Android Enterprise!")
        DiagnosticoPing.disparar(this, "conformidade_recebida")

        val resultIntent = Intent()
        setResult(RESULT_OK, resultIntent)
        DiagnosticoPing.disparar(this, "conformidade_respondida_ok")
        finish()
    }
}
