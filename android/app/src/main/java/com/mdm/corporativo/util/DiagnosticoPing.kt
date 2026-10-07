package com.mdm.corporativo.util

import android.content.Context
import android.util.Log
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Utilitário leve de telemetria diagnóstica que envia requisições HTTP rápidas
 * ao servidor MDM para reportar o andamento do provisionamento em tempo real.
 */
object DiagnosticoPing {
    private const val TAG = "MDM_DiagnosticoPing"

    fun disparar(contexto: Context, etapa: String, detalhe: String = "") {
        Thread {
            try {
                val prefs = contexto.getSharedPreferences("config_mdm", Context.MODE_PRIVATE)
                val baseApi = prefs.getString("servidor_api", "https://mdmplaystoreacs.duckdns.org/api") 
                    ?: "https://mdmplaystoreacs.duckdns.org/api"

                val urlFormatada = if (baseApi.endsWith("/api")) baseApi else "$baseApi/api"
                val detalheCodificado = URLEncoder.encode(detalhe, "UTF-8")
                val urlCompleta = "$urlFormatada/debug/ping?etapa=$etapa&detalhe=$detalheCodificado"

                Log.i(TAG, "Disparando ping diagnóstico: $urlCompleta")

                val conexao = URL(urlCompleta).openConnection() as HttpURLConnection
                conexao.connectTimeout = 4000
                conexao.readTimeout = 4000
                conexao.requestMethod = "GET"
                val codigoResposta = conexao.responseCode
                Log.i(TAG, "Ping diagnóstico [$etapa] entregue com status: $codigoResposta")
                conexao.disconnect()
            } catch (t: Throwable) {
                Log.w(TAG, "Aviso no ping diagnóstico [$etapa]: ${t.message}")
            }
        }.start()
    }
}
