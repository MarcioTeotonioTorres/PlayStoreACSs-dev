import React, { useState, useEffect } from 'react';
import { Tablet, RefreshCw, QrCode, Layers, Shield, Plus } from 'lucide-react';
import { MetricasFrota } from './componentes/MetricasFrota';
import { TabelaDispositivos } from './componentes/TabelaDispositivos';
import { ModalComandos } from './componentes/ModalComandos';
import { PainelProvisionamentoQr } from './componentes/PainelProvisionamentoQr';
import { PainelComandosLote } from './componentes/PainelComandosLote';
import { ModalAdicionarDispositivo } from './componentes/ModalAdicionarDispositivo';
import {
  obter_resumo_frota_api,
  listar_dispositivos_api,
  despachar_comando_api,
  MetricasFrotaResposta,
  DispositivoItem,
} from './servicos/api_mdm';

export const App: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasFrotaResposta['metricas'] | null>(null);
  const [dispositivos, setDispositivos] = useState<DispositivoItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  // Estados dos modais
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState<DispositivoItem | null>(null);
  const [modalQrVisivel, setModalQrVisivel] = useState<boolean>(false);
  const [modalLoteVisivel, setModalLoteVisivel] = useState<boolean>(false);
  const [modalAdicionarVisivel, setModalAdicionarVisivel] = useState<boolean>(false);

  useEffect(() => {
    carregar_dados_sistema();

    // Atualização contínua de telemetria a cada 10 segundos
    const intervalo = setInterval(() => {
      carregar_dados_sistema(false);
    }, 10000);

    return () => clearInterval(intervalo);
  }, []);

  /**
   * Sincroniza métricas e lista de tablets com o backend.
   */
  async function carregar_dados_sistema(exibirLoader = true) {
    if (exibirLoader) setCarregando(true);
    try {
      const [resMetricas, resDispositivos] = await Promise.all([
        obter_resumo_frota_api(),
        listar_dispositivos_api(),
      ]);
      setMetricas(resMetricas.metricas);
      setDispositivos(resDispositivos.dispositivos);
    } catch (erro) {
      console.error('Erro ao sincronizar dados com a API:', erro);
    } finally {
      if (exibirLoader) setCarregando(false);
    }
  }

  /**
   * Dispara o bloqueio imediato da tela do tablet selecionado.
   */
  async function ao_bloquear_dispositivo_rapido(disp: DispositivoItem) {
    try {
      await despachar_comando_api(disp.id, 'bloquear_tela_imediata');
      alert(`Comando de bloqueio enviado para o tablet ${disp.modelo} (SN: ${disp.numero_serie})`);
      carregar_dados_sistema(false);
    } catch (erro) {
      alert('Falha ao bloquear dispositivo.');
    }
  }

  /**
   * Dispara a reinicialização remota do tablet.
   */
  async function ao_reiniciar_dispositivo_rapido(disp: DispositivoItem) {
    if (confirm(`Deseja reiniciar remotamente o tablet ${disp.modelo} (${disp.numero_serie})?`)) {
      try {
        await despachar_comando_api(disp.id, 'reiniciar_aparelho');
        alert(`Comando de reinicialização enviado com sucesso.`);
        carregar_dados_sistema(false);
      } catch (erro) {
        alert('Falha ao reiniciar dispositivo.');
      }
    }
  }

  /**
   * Abre o modal completo de comandos para um tablet.
   */
  function ao_abrir_modal_comandos(disp: DispositivoItem) {
    setDispositivoSelecionado(disp);
  }

  /**
   * Fecha o modal de comandos.
   */
  function ao_fechar_modal_comandos() {
    setDispositivoSelecionado(null);
  }

  /**
   * Executa comando individual via modal.
   */
  async function ao_enviar_comando_individual(
    dispositivoId: string,
    tipoComando: string,
    parametros: Record<string, any>
  ) {
    await despachar_comando_api(dispositivoId, tipoComando, parametros);
    carregar_dados_sistema(false);
  }

  return (
    <div className="app-container">
      {/* Cabeçalho Principal */}
      <header className="cabecalho-principal">
        <div className="cabecalho-titulo">
          <Shield size={28} color="#3b82f6" />
          <div>
            <h1>MDM Corporativo Privado</h1>
            <div style={{ fontSize: '13px', color: 'var(--texto-secundario)', marginTop: '2px' }}>
              Gestão Autônoma de Dispositivos Android Enterprise (VPS + DuckDNS + MQTTS)
            </div>
          </div>
          <span className="badge-frota">Frota: 250 Tablets</span>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-secundario" onClick={() => carregar_dados_sistema(true)} title="Atualizar">
            <RefreshCw size={15} />
            Sincronizar
          </button>
          <button className="btn btn-secundario" onClick={() => setModalAdicionarVisivel(true)} title="Cadastrar Tablet">
            <Plus size={15} />
            Adicionar Tablet
          </button>
          <button className="btn btn-secundario" onClick={() => setModalLoteVisivel(true)}>
            <Layers size={15} />
            Comandos em Lote
          </button>
          <button className="btn btn-primario" onClick={() => setModalQrVisivel(true)}>
            <QrCode size={15} />
            Provisionar Tablets (QR Code)
          </button>
        </div>
      </header>

      {/* Grid de Métricas Consolidadas */}
      <MetricasFrota dadosMetricas={metricas} capacidadeTotal={250} />

      {/* Tabela de Dispositivos e Telemetria em Tempo Real */}
      <TabelaDispositivos
        dispositivos={dispositivos}
        carregando={carregando}
        aoBloquearDispositivo={ao_bloquear_dispositivo_rapido}
        aoReiniciarDispositivo={ao_reiniciar_dispositivo_rapido}
        aoAbrirComandosCompletos={ao_abrir_modal_comandos}
      />

      {/* Modal de Comandos Individuais */}
      <ModalComandos
        dispositivo={dispositivoSelecionado}
        aoFechar={ao_fechar_modal_comandos}
        aoEnviarComando={ao_enviar_comando_individual}
      />

      {/* Modal de Cadastro Manual de Dispositivo */}
      <ModalAdicionarDispositivo
        visivel={modalAdicionarVisivel}
        aoFechar={() => setModalAdicionarVisivel(false)}
        aoSucesso={() => carregar_dados_sistema(false)}
      />

      {/* Modal de Provisionamento via QR Code (6 Toques no Boot) */}
      <PainelProvisionamentoQr
        visivel={modalQrVisivel}
        aoFechar={() => setModalQrVisivel(false)}
      />

      {/* Modal de Ações Coletivas em Lote */}
      <PainelComandosLote
        visivel={modalLoteVisivel}
        totalConectados={metricas?.conectados || 0}
        aoFechar={() => setModalLoteVisivel(false)}
        aoConcluirComandoLote={() => carregar_dados_sistema(false)}
      />
    </div>
  );
};
export default App;
