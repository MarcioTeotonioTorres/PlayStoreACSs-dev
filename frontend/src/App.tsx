import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProvedorAutenticacao, useAuth } from './contextos/ContextoAutenticacao';
import { PaginaLogin } from './paginas/PaginaLogin';
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
  remover_dispositivo_api,
  MetricasFrotaResposta,
  DispositivoItem,
} from './servicos/api_mdm';

/**
 * Guarda de rota segura: exige autenticação ativa para exibir o conteúdo do painel.
 */
const RotaProtegida: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { estaAutenticado, carregando } = useAuth();

  if (carregando) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
          color: '#94a3b8',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Autenticando sessão segura...
      </div>
    );
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Layout principal do painel MDM com barra lateral e sincronização de telemetria.
 */
const PainelMdmLayout: React.FC = () => {
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

  async function ao_bloquear_dispositivo_rapido(disp: DispositivoItem) {
    try {
      await despachar_comando_api(disp.id, 'bloquear_tela_imediata');
      alert(`Comando de bloqueio enviado para o tablet ${disp.modelo} (SN: ${disp.numero_serie})`);
      carregar_dados_sistema(false);
    } catch (erro) {
      alert('Falha ao bloquear dispositivo.');
    }
  }

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

  function ao_abrir_modal_comandos(disp: DispositivoItem) {
    setDispositivoSelecionado(disp);
  }

  function ao_fechar_modal_comandos() {
    setDispositivoSelecionado(null);
  }

  async function ao_enviar_comando_individual(
    dispositivoId: string,
    tipoComando: string,
    parametros: Record<string, any>
  ) {
    await despachar_comando_api(dispositivoId, tipoComando, parametros);
    carregar_dados_sistema(false);
  }

  async function ao_remover_dispositivo(disp: DispositivoItem) {
    const confirmar = confirm(
      `⚠️ ATENÇÃO: Remover permanentemente o tablet da frota?\n\nModelo: ${disp.modelo}\nSN: ${disp.numero_serie}\n\nEsta ação remove o dispositivo e todo seu histórico de telemetria e comandos. Não pode ser desfeita.`
    );
    if (!confirmar) return;

    try {
      const resp = await remover_dispositivo_api(disp.id || disp.numero_serie);
      alert(`✓ ${resp.mensagem}`);
      carregar_dados_sistema(false);
    } catch (erro) {
      alert('Erro ao remover dispositivo. Verifique a conexão com o servidor.');
    }
  }

  return (
    <div className="layout-com-sidebar">
      {/* Barra Lateral com Informações de Frota e Perfil */}
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
                aoRemoverDispositivo={ao_remover_dispositivo}
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
                aoRemoverDispositivo={ao_remover_dispositivo}
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
  );
};

export const App: React.FC = () => {
  return (
    <ProvedorAutenticacao>
      <BrowserRouter>
        <Routes>
          {/* Rota pública de login */}
          <Route path="/login" element={<PaginaLogin />} />

          {/* Todas as rotas do painel protegidas por autenticação */}
          <Route
            path="/*"
            element={
              <RotaProtegida>
                <PainelMdmLayout />
              </RotaProtegida>
            }
          />
        </Routes>
      </BrowserRouter>
    </ProvedorAutenticacao>
  );
};

export default App;
