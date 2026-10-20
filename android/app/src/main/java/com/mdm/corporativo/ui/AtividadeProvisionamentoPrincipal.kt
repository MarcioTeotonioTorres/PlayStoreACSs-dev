package com.mdm.corporativo.ui

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.mdm.corporativo.gestores.GestorPoliticasDispositivo
import com.mdm.corporativo.gestores.GestorTelemetria
import com.mdm.corporativo.servico.ServicoSegundoPlanoMdm

/**
 * Atividade principal de diagnóstico e status do DPC no tablet.
 */
class AtividadeProvisionamentoPrincipal : Activity() {

    private lateinit var textoStatusAdmin: TextView
    private lateinit var textoSerial: TextView
    private lateinit var textoTelemetria: TextView
    private lateinit var botaoBloquear: Button
    private lateinit var botaoSincronizar: Button

    private lateinit var gestorPoliticas: GestorPoliticasDispositivo
    private lateinit var gestorTelemetria: GestorTelemetria

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            gestorPoliticas = GestorPoliticasDispositivo(this)
            gestorTelemetria = GestorTelemetria(this)

            // Garante que o ADB nunca seja bloqueado
            gestorPoliticas.liberar_depuracao_adb()

            inicializar_componentes_tela()
            atualizar_status_diagnostico()

            // Garante que o serviço MDM esteja em execução
            ServicoSegundoPlanoMdm.iniciar_servico(this)
        } catch (t: Throwable) {
            android.util.Log.e("MDM_Atividade", "Erro na inicialização da atividade: ${t.message}", t)
        }
    }

    override fun onResume() {
        super.onResume()
        try {
            gestorPoliticas.liberar_depuracao_adb()
            atualizar_status_diagnostico()
        } catch (t: Throwable) {
            android.util.Log.e("MDM_Atividade", "Erro no onResume: ${t.message}", t)
        }
    }

    /**
     * Monta a interface de diagnóstico em tempo de execução.
     */
    fun inicializar_componentes_tela() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }

        val titulo = TextView(this).apply {
            text = "MDM Corporativo - Diagnóstico"
            textSize = 22f
            setPadding(0, 0, 0, 32)
        }

        textoStatusAdmin = TextView(this).apply {
            textSize = 16f
            setPadding(0, 0, 0, 16)
        }

        textoSerial = TextView(this).apply {
            textSize = 16f
            setPadding(0, 0, 0, 16)
        }

        textoTelemetria = TextView(this).apply {
            textSize = 14f
            setPadding(0, 0, 0, 32)
        }

        botaoSincronizar = Button(this).apply {
            text = "Forçar Envio de Telemetria"
            setOnClickListener { disparar_teste_telemetria() }
        }

        botaoBloquear = Button(this).apply {
            text = "Bloquear Tela Agora"
            setOnClickListener { bloquear_dispositivo_manual() }
        }

        layout.addView(titulo)
        layout.addView(textoStatusAdmin)
        layout.addView(textoSerial)
        layout.addView(textoTelemetria)
        layout.addView(botaoSincronizar)
        layout.addView(botaoBloquear)

        setContentView(layout)
    }

    /**
     * Atualiza os textos informativos com o estado atual do tablet.
     */
    fun atualizar_status_diagnostico() {
        try {
            val eDeviceOwner = gestorPoliticas.verificar_se_e_device_owner()
            val statusTexto = if (eDeviceOwner) {
                "Status: ATIVO como Device Owner (Gerenciado pela Empresa)"
            } else {
                "Status: NÃO PROVISIONADO (Requer ativação via QR Code no primeiro boot)"
            }
            textoStatusAdmin.text = statusTexto

            val serial = gestorTelemetria.obter_numero_serie()
            textoSerial.text = "Número de Série: $serial"

            val dados = gestorTelemetria.coletar_telemetria_dispositivo()
            val telemetriaResumo = """
                Bateria: ${dados.nivel_bateria}% (Carregando: ${dados.esta_carregando})
                Rede Wi-Fi: ${dados.ssid_wifi} (Sinal: ${dados.sinal_wifi_rssi} dBm)
                RAM Livre: ${dados.memoria_ram_livre_mb} MB
                Armazenamento Livre: ${dados.armazenamento_livre_mb} MB
                App em Primeiro Plano: ${dados.app_em_foco}
            """.trimIndent()
            textoTelemetria.text = telemetriaResumo
        } catch (t: Throwable) {
            android.util.Log.e("MDM_Atividade", "Erro ao coletar diagnóstico para tela: ${t.message}", t)
        }
    }

    /**
     * Dispara manualmente a coleta e transmissão imediata da telemetria para o servidor.
     */
    fun disparar_teste_telemetria() {
        ServicoSegundoPlanoMdm.iniciar_servico(this)
        ServicoSegundoPlanoMdm.forcar_sincronizacao_imediata(this)
        atualizar_status_diagnostico()
        android.widget.Toast.makeText(this, "Telemetria enviada imediatamente ao servidor!", android.widget.Toast.LENGTH_SHORT).show()
    }

    /**
     * Executa o bloqueio de tela direto pelo DPC.
     */
    fun bloquear_dispositivo_manual() {
        gestorPoliticas.bloquear_tela_imediata()
    }
}
