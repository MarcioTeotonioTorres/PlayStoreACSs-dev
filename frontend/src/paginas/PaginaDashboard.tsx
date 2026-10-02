import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tablet, ShieldCheck, QrCode, Layers, Package, Plus, RefreshCw } from 'lucide-react';
import { MetricasFrota } from '../componentes/MetricasFrota';
import { TabelaDispositivos } from '../componentes/TabelaDispositivos';
import { MetricasFrotaResposta, DispositivoItem } from '../servicos/api_mdm';

interface PropriedadesDashboard {
  metricas: MetricasFrotaResposta['metricas'] | null;
  dispositivos: DispositivoItem[];
  carregando: boolean;
  aoAtualizar: () => void;
  aoAbrirAdicionar: () => void;
  aoAbrirComandosLote: () => void;
  aoBloquearDispositivo: (disp: DispositivoItem) => void;
  aoReiniciarDispositivo: (disp: DispositivoItem) => void;
  aoAbrirComandosCompletos: (disp: DispositivoItem) => void;
}

export const PaginaDashboard: React.FC<PropriedadesDashboard> = ({
  metricas,
  dispositivos,
  carregando,
  aoAtualizar,
  aoAbrirAdicionar,
  aoAbrirComandosLote,
  aoBloquearDispositivo,
  aoReiniciarDispositivo,
  aoAbrirComandosCompletos,
}) => {
  const navegar = useNavigate();

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho da Página */}
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Visão Geral da Frota</h2>
          <p className="pagina-subtitulo">
            Monitoramento em tempo real dos 250 tablets Android corporativos (MQTTS + Device Owner)
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-secundario" onClick={aoAtualizar} title="Recarregar dados">
            <RefreshCw size={14} />
            Sincronizar
          </button>
          <button className="btn btn-secundario" onClick={aoAbrirAdicionar}>
            <Plus size={14} />
            Cadastrar Tablet
          </button>
          <button className="btn btn-primario" onClick={() => navegar('/provisionamento')}>
            <QrCode size={14} />
            Provisionar (QR Code)
          </button>
        </div>
      </div>

      {/* Grid de Métricas Consolidadas */}
      <MetricasFrota dadosMetricas={metricas} capacidadeTotal={250} />

      {/* Atalhos Rápidos da Operação */}
      <div className="grid-atalhos" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card-atalho" onClick={() => navegar('/politicas')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="icone-atalho" style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '10px', color: '#60a5fa' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Políticas & Restrições</div>
              <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>Controle de YouTube, Play Store e Chrome</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--texto-fraco)', margin: 0 }}>
            Configurar lista branca de navegação e bloqueio de apps nativos da frota.
          </p>
        </div>

        <div className="card-atalho" onClick={() => navegar('/aplicativos')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="icone-atalho" style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '10px', color: '#34d399' }}>
              <Package size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Catálogo de Aplicativos</div>
              <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>Distribuição silenciosa de APKs</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--texto-fraco)', margin: 0 }}>
            Fazer upload de APKs e disparar instalação remota nos 250 tablets.
          </p>
        </div>

        <div className="card-atalho" onClick={aoAbrirComandosLote} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="icone-atalho" style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '10px', borderRadius: '10px', color: '#fbbf24' }}>
              <Layers size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Comandos em Lote</div>
              <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>Ações coletivas para toda a frota</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--texto-fraco)', margin: 0 }}>
            Bloqueio simultâneo, reinicialização ou ativação de Modo Quiosque.
          </p>
        </div>
      </div>

      {/* Tabela de Dispositivos com Amostragem */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Inventário de Tablets da Frota</h3>
          <button className="btn btn-secundario" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => navegar('/dispositivos')}>
            Ver Todos os Dispositivos &rarr;
          </button>
        </div>

        <TabelaDispositivos
          dispositivos={dispositivos.slice(0, 10)}
          carregando={carregando}
          aoBloquearDispositivo={aoBloquearDispositivo}
          aoReiniciarDispositivo={aoReiniciarDispositivo}
          aoAbrirComandosCompletos={aoAbrirComandosCompletos}
        />
      </div>
    </div>
  );
};
