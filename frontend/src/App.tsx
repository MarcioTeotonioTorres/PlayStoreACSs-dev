import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BarraLateral } from './componentes/BarraLateral';
import { PaginaDashboard } from './paginas/PaginaDashboard';
import { PaginaDispositivos } from './paginas/PaginaDispositivos';
import { PaginaAplicativos } from './paginas/PaginaAplicativos';
import { PaginaPoliticas } from './paginas/PaginaPoliticas';
import { PaginaProvisionamento } from './paginas/PaginaProvisionamento';
import { ModalComandos } from './componentes/ModalComandos';
import { ModalAdicionarDispositivo } from './componentes/ModalAdicionarDispositivo';
import { PainelComandosLote } from './componentes/PainelComandosLote';
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

  // Estados dos Modais Globais
  const [dispositivoSelecionado, setDispositivoSelecionado] = useState<DispositivoItem | null>(null);
  const [modalLoteVisivel, setModalLoteVisivel] = useState<boolean>(false);
  const [modalAdicionarVisivel, setModalAdicionarVisivel] = useState<boolean>(false);

  useEffect(() => {
    carregar_dados_sistema();

    // Sincronização periódica da telemetria a cada 10 segundos
    const intervalo = setInterval(() => {
      carregar_dados_sistema(false);
    }, 10000);

    return () => clearInterval(intervalo);
  }, []);

  /**
   * Sincroniza métricas consolidadas e inventário com a API REST.
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
      console.error('Erro ao sincronizar dados com o backend:', erro);
    } finally {
      if (exibirLoader) setCarregando(false);
    }
  }

  /**
   * Bloqueia a tela de um tablet imediatamente via MQTTS.
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
   * Reinicia o tablet remotamente via comando Device Owner.
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
   * Abre o modal completo de comandos para um tablet específico.
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
   * Executa comandos individuais pelo modal.
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
    <BrowserRouter>
      <div className="layout-com-sidebar">
        {/* Barra Lateral com os 5 menus requeridos */}
        <BarraLateral
          totalTablets={metricas?.total_dispositivos || 250}
          onlineTablets={metricas?.conectados || 0}
        />

        {/* Área Principal de Conteúdo */}
        <main className="conteudo-principal">
          <Routes>
            <Route
              path="/"
              element={
                <PaginaDashboard
                  metricas={metricas}
                  dispositivos={dispositivos}
                  carregando={carregando}
                  aoAtualizar={() => carregar_dados_sistema(true)}
                  aoAbrirAdicionar={() => setModalAdicionarVisivel(true)}
                  aoAbrirComandosLote={() => setModalLoteVisivel(true)}
                  aoBloquearDispositivo={ao_bloquear_dispositivo_rapido}
                  aoReiniciarDispositivo={ao_reiniciar_dispositivo_rapido}
                  aoAbrirComandosCompletos={ao_abrir_modal_comandos}
                />
              }
            />

            <Route
              path="/dispositivos"
              element={
                <PaginaDispositivos
                  dispositivos={dispositivos}
                  carregando={carregando}
                  aoAtualizar={() => carregar_dados_sistema(true)}
                  aoAbrirAdicionar={() => setModalAdicionarVisivel(true)}
                  aoAbrirComandosLote={() => setModalLoteVisivel(true)}
                  aoBloquearDispositivo={ao_bloquear_dispositivo_rapido}
                  aoReiniciarDispositivo={ao_reiniciar_dispositivo_rapido}
                  aoAbrirComandosCompletos={ao_abrir_modal_comandos}
                />
              }
            />

            <Route
              path="/aplicativos"
              element={<PaginaAplicativos dispositivos={dispositivos} />}
            />

            <Route
              path="/politicas"
              element={<PaginaPoliticas dispositivos={dispositivos} />}
            />

            <Route
              path="/provisionamento"
              element={<PaginaProvisionamento />}
            />

            {/* Redirecionamento padrão para rota inicial */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Modais Globais */}
        <ModalComandos
          dispositivo={dispositivoSelecionado}
          aoFechar={ao_fechar_modal_comandos}
          aoEnviarComando={ao_enviar_comando_individual}
        />

        <ModalAdicionarDispositivo
          visivel={modalAdicionarVisivel}
          aoFechar={() => setModalAdicionarVisivel(false)}
          aoSucesso={() => carregar_dados_sistema(false)}
        />

        <PainelComandosLote
          visivel={modalLoteVisivel}
          totalConectados={metricas?.conectados || 0}
          aoFechar={() => setModalLoteVisivel(false)}
          aoConcluirComandoLote={() => carregar_dados_sistema(false)}
        />
      </div>
    </BrowserRouter>
  );
};

export default App;
