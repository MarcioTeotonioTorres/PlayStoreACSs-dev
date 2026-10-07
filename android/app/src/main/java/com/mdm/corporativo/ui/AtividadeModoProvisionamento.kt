package com.mdm.corporativo.ui

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PersistableBundle
import android.util.Log
import com.mdm.corporativo.util.DiagnosticoPing

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
        DiagnosticoPing.disparar(this, "modo_provisionamento_recebido")

        val resultIntent = Intent()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val allowedModes = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                intent.getIntegerArrayListExtra(DevicePolicyManager.EXTRA_PROVISIONING_ALLOWED_PROVISIONING_MODES)
            } else null

            val targetMode = if (allowedModes != null && allowedModes.isNotEmpty()) {
                if (allowedModes.contains(DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE)) {
                    DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE
                } else {
                    allowedModes[0]
                }
            } else {
                DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE
            }

            // Repassa o PersistableBundle recebido de volta ao assistente conforme exigido pelo Google
            val extras = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(
                    DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE,
                    PersistableBundle::class.java
                )
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE)
            }

            if (extras != null) {
                resultIntent.putExtra(DevicePolicyManager.EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE, extras)
            }

            Log.i(TAG, "Modo de provisionamento selecionado: $targetMode (Permitidos: $allowedModes)")
            resultIntent.putExtra(DevicePolicyManager.EXTRA_PROVISIONING_MODE, targetMode)
        }

        DiagnosticoPing.disparar(this, "modo_provisionamento_respondido")
        setResult(RESULT_OK, resultIntent)
        finish()
    }
}
