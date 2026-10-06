package com.mdm.corporativo.ui

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log

/**
 * Atividade mandatória no Android 10+ para responder ao Setup Wizard
 * qual é o modo de gestão pretendido (Dispositivo Totalmente Gerenciado / Device Owner).
 *
 * Responde ao intent 'android.app.action.GET_PROVISIONING_MODE' definindo
 * PROVISIONING_MODE_FULLY_MANAGED_DEVICE para que o Android configure o tablet
 * como Device Owner corporativo completo.
 */
class AtividadeModoProvisionamento : Activity() {

    companion object {
        private const val TAG = "MDM_ModoProvisionamento"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(TAG, "GET_PROVISIONING_MODE recebido pelo Setup Wizard do Android Enterprise!")

        val resultIntent = Intent().apply {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                putExtra(
                    DevicePolicyManager.EXTRA_PROVISIONING_MODE,
                    DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE
                )
            }
        }

        setResult(RESULT_OK, resultIntent)
        finish()
    }
}
