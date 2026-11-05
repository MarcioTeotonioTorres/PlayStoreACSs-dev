import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tablet,
  ShieldCheck,
  QrCode,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Lock,
  RotateCcw,
  MoreVertical,
  Trash2,
  Users,
  Smartphone,
  Battery,
  Wifi,
  AlertTriangle,
  Building,
  CreditCard,
  Phone,
  Clock,
  Shield,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contextos/ContextoAutenticacao';
import { MetricasFrotaResposta, DispositivoItem } from '../servicos/api_mdm';
import { ModalDetalhesDispositivo } from '../componentes/ModalDetalhesDispositivo';

type FiltroDashboard =
  | 'todos'
  | 'online'
  | 'offline'
  | 'em_campo'
  | 'em_estoque'
  | 'bateria_baixa'
  | 'ocioso_critico';

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
  aoRemoverDispositivo?: (disp: DispositivoItem) => void;
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
  aoRemoverDispositivo,
}) => {
  const navegar = useNavigate();
  const { ehSupervisor, ehAdmin, usuario } = useAuth();

  // Estados de Filtro e Busca da Tabela Refinada
  const [busca, setBusca] = useState<string>('');
  const [filtro, setFiltro] = useState<FiltroDashboard>('todos');
  const [dispositivoParaDetalhes, setDispositivoParaDetalhes] = useState<DispositivoItem | null>(null);

  // Cálculos Avançados dos KPIs da Frota
  const totalFrota = dispositivos.length;
  const totalOnline = dispositivos.filter((d) => d.status_conexao === 'conectado').length;
  const percOnline = totalFrota > 0 ? Math.round((totalOnline / totalFrota) * 100) : 0;

  const tabletsEmCampo = dispositivos.filter((d) => Boolean(d.usuario_nome)).length;
  const percEmCampo = totalFrota > 0 ? Math.round((tabletsEmCampo / totalFrota) * 100) : 0;

  const tabletsEstoque = Math.max(0, totalFrota - tabletsEmCampo);

  const bateriaMedia =
    totalFrota > 0
      ? Math.round(dispositivos.reduce((acc, d) => acc + (d.bateria || 0), 0) / totalFrota)
      : 100;

  const tabletsCarregando = dispositivos.filter((d) => d.carregando).length;
  const tabletsBateriaCritica = dispositivos.filter((d) => (d.bateria || 0) <= 20).length;

  const tabletsOciososCriticos = dispositivos.filter((d) => {
    let minutos = d.tempo_ocioso_minutos || 0;
    if (d.ultimo_contato) {
      const ms = Date.now() - new Date(d.ultimo_contato).getTime();
      const minContato = Math.floor(ms / 60000);
      if (minContato > 3) minutos = Math.max(minutos, minContato);
    }
    return minutos >= 1440; // Mais de 24 horas sem atividade
  }).length;

  /**
   * Formatação elegante de ociosidade e tempo sem contato
   */
  function formatarOciosidade(minutos?: number, ultimoContato?: string, online?: boolean): {
    texto: string;
    critico: boolean;
    emUso: boolean;
  } {
    let min = minutos ?? 0;
    if (ultimoContato) {
      const ms = Date.now() - new Date(ultimoContato).getTime();
      const minSemContato = Math.floor(ms / 60000);
      if (minSemContato > 3) min = Math.max(min, minSemContato);
    }

    if (!online) {
      if (min < 60) return { texto: `${min} min`, critico: false, emUso: false };
      if (min < 1440) return { texto: `${Math.round(min / 60)}h`, critico: false, emUso: false };
      return { texto: `${Math.floor(min / 1440)}d`, critico: true, emUso: false };
    }

    if (min <= 1) {
      return { texto: 'Em uso agora', critico: false, emUso: true };
    }
    if (min < 60) {
      return { texto: `${min} min`, critico: false, emUso: false };
    }
    if (min < 1440) {
      const h = Math.round(min / 60);
      return { texto: `${h}h`, critico: false, emUso: false };
    }
    const d = Math.floor(min / 1440);
    return { texto: `${d}d sem contato`, critico: true, emUso: false };
  }

  function formatarVersaoAndroid(versaoBruta?: string): string {
    if (!versaoBruta || versaoBruta.trim() === '' || versaoBruta === 'Android') {
      return 'Android 13';
    }
    const limpa = versaoBruta.trim();
    if (limpa.toLowerCase().startsWith('android')) {
      return limpa;
    }
    return `Android ${limpa}`;
  }

  // Filtragem Dinâmica
  const dispositivosFiltrados = useMemo(() => {
    return dispositivos.filter((d) => {
      const termo = busca.toLowerCase();
      const matchBusca =
        d.numero_serie.toLowerCase().includes(termo) ||
        d.modelo.toLowerCase().includes(termo) ||
        (d.usuario_nome && d.usuario_nome.toLowerCase().includes(termo)) ||
        (d.usuario_unidade_basica && d.usuario_unidade_basica.toLowerCase().includes(termo)) ||
        (d.usuario_cpf && d.usuario_cpf.toLowerCase().includes(termo)) ||
        (d.ssid_wifi && d.ssid_wifi.toLowerCase().includes(termo));

      if (!matchBusca) return false;

      if (filtro === 'online') return d.status_conexao === 'conectado';
      if (filtro === 'offline') return d.status_conexao !== 'conectado';
      if (filtro === 'em_campo') return Boolean(d.usuario_nome);
      if (filtro === 'em_estoque') return !d.usuario_nome;
      if (filtro === 'bateria_baixa') return (d.bateria || 0) <= 20;
      if (filtro === 'ocioso_critico') {
        const ocioso = formatarOciosidade(d.tempo_ocioso_minutos, d.ultimo_contato);
        return ocioso.critico;
      }

      return true;
    });
  }, [dispositivos, busca, filtro]);

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho do Painel */}
      <div className="pagina-cabecalho">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 className="pagina-titulo" style={{ margin: 0 }}>
              Dashboard de Monitoramento da Frota
            </h2>
            {ehSupervisor && (
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Eye size={12} /> Perfil Supervisor (Monitoração & Alocação de Agentes)
              </span>
            )}
            {ehAdmin && (
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                Perfil Administrador
              </span>
            )}
          </div>
          <p className="pagina-subtitulo">
            {ehSupervisor
              ? 'Painel executivo de acompanhamento: telemetria em tempo real, status de conexão, bateria e agentes vinculados aos 250 tablets'
              : 'Visão executiva em tempo real dos 250 tablets Android corporativos (MQTTS Seguro + Device Owner)'}
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button
            className="btn btn-secundario"
            onClick={aoAtualizar}
            disabled={carregando}
            title="Sincronizar telemetria via broker MQTTS em tempo real"
          >
            <RefreshCw size={14} className={carregando ? 'anim-spin' : ''} />
            {carregando ? 'Sincronizando...' : 'Sincronizar Frota'}
          </button>

          {/* Ações específicas por perfil */}
          {ehSupervisor && (
            <button
              className="btn btn-primario"
              onClick={() => navegar('/usuarios')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0284c7',
                borderColor: '#0369a1',
              }}
            >
              <Users size={14} />
              Usuários & Termos de Entrega
            </button>
          )}

          {ehAdmin && (
            <>
              <button className="btn btn-secundario" onClick={aoAbrirAdicionar}>
                <Plus size={14} />
                Cadastrar Tablet
              </button>
              <button className="btn btn-primario" onClick={() => navegar('/provisionamento')}>
                <QrCode size={14} />
                Provisionar (QR Code)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid de KPIs Caprichados da Frota */}
      <div
        className="grid-metricas"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '26px',
        }}
      >
        {/* KPI 1: Total da Frota */}
        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Tablet size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Frota Total Monitorada</div>
            <div className="card-metrica-valor">
              {totalFrota} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>/ 250</span>
            </div>
            <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '3px' }}>
              Tablets com Device Owner Ativo
            </div>
          </div>
        </div>

        {/* KPI 2: Tablets Online */}
        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Wifi size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Tablets Online em Tempo Real</div>
            <div className="card-metrica-valor" style={{ color: '#34d399' }}>
              {totalOnline}{' '}
              <span style={{ fontSize: '13px', color: '#34d399', fontWeight: 600 }}>({percOnline}%)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
              Conexão MQTTS ativa
            </div>
          </div>
        </div>

        {/* KPI 3: Tablets em Campo com ACS */}
        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Em Campo com Agentes (ACS)</div>
            <div className="card-metrica-valor" style={{ color: '#38bdf8' }}>
              {tabletsEmCampo}{' '}
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>({percEmCampo}%)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '3px' }}>
              Com Termo Oficial Assinado
            </div>
          </div>
        </div>

        {/* KPI 4: Tablets em Estoque */}
        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Smartphone size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Tablets Livres em Estoque</div>
            <div className="card-metrica-valor" style={{ color: '#fbbf24' }}>
              {tabletsEstoque}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
              Disponíveis para Entrega
            </div>
          </div>
        </div>

        {/* KPI 5: Bateria Média da Frota */}
        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <Battery size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Bateria Média da Frota</div>
            <div className="card-metrica-valor" style={{ color: '#c084fc' }}>
              {bateriaMedia}%
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
              {tabletsCarregando > 0 ? `⚡ ${tabletsCarregando} carregando` : 'Monitoramento de carga'}
            </div>
          </div>
        </div>

        {/* KPI 6: Alertas / Ociosidade Crítica */}
        <div className="card-metrica">
          <div
            className="card-metrica-icone"
            style={{
              background: tabletsOciososCriticos > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: tabletsOciososCriticos > 0 ? '#f87171' : '#34d399',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Alertas & Ociosidade &gt; 24h</div>
            <div className="card-metrica-valor" style={{ color: tabletsOciososCriticos > 0 ? '#f87171' : '#34d399' }}>
              {tabletsOciososCriticos}
            </div>
            <div style={{ fontSize: '11px', color: tabletsOciososCriticos > 0 ? '#f87171' : '#94a3b8', marginTop: '3px' }}>
              {tabletsOciososCriticos > 0 ? 'Possível abandono ou reset' : 'Todos reportando regularmente'}
            </div>
          </div>
        </div>
      </div>

      {/* Atalhos Rápidos da Operação */}
      {ehAdmin && (
        <div
          className="grid-atalhos"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '26px',
          }}
        >
          <div className="card-atalho" onClick={() => navegar('/politicas')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                className="icone-atalho"
                style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '10px', color: '#60a5fa' }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Políticas & Perfis Salvos</div>
                <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>Editor e aplicação na frota</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--texto-fraco)', margin: 0 }}>
              Gerencie perfis com 26 apps bloqueados, lista branca do Chrome e diretrizes de hardware.
            </p>
          </div>

          <div className="card-atalho" onClick={() => navegar('/usuarios')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                className="icone-atalho"
                style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '10px', color: '#34d399' }}
              >
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Usuários & Termos de Entrega</div>
                <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>Vínculo de agentes e impressão A4</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--texto-fraco)', margin: 0 }}>
              Cadastro com unidade básica, CPF e botão de emissão imediata do termo de responsabilidade.
            </p>
          </div>

          <div className="card-atalho" onClick={aoAbrirComandosLote} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                className="icone-atalho"
                style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '10px', borderRadius: '10px', color: '#fbbf24' }}
              >
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Comandos em Lote</div>
                <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>Ações coletivas para os 250 tablets</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--texto-fraco)', margin: 0 }}>
              Bloqueio simultâneo, reinicialização ou atualização de parâmetros operacionais.
            </p>
          </div>
        </div>
      )}

      {ehSupervisor && (
        <div
          className="grid-atalhos"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '26px',
          }}
        >
          <div className="card-atalho" onClick={() => navegar('/usuarios')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                className="icone-atalho"
                style={{ background: 'rgba(14, 165, 233, 0.15)', padding: '10px', borderRadius: '10px', color: '#38bdf8' }}
              >
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Cadastro de Usuários & Termos de Entrega</div>
                <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>Alocação de agentes aos tablets livres</div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--texto-fraco)', margin: 0 }}>
              Vincule agentes comunitários (ACS) aos tablets disponíveis em estoque e imprima o Termo Oficial em folha A4 para assinatura imediata.
            </p>
          </div>
        </div>
      )}

      {/* Tabela Refinada de Monitoramento: Dados do Tablet + Usuário */}
      <div className="card-tabela" style={{ overflow: 'hidden' }}>
        {/* Barra de Filtros e Busca */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--borda-suave)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por tablet (SN, modelo), agente, UBS, CPF ou rede Wi-Fi..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Chips de Filtragem Rápida */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`filtro-chip ${filtro === 'todos' ? 'ativo' : ''}`}
              onClick={() => setFiltro('todos')}
            >
              Todos ({totalFrota})
            </button>
            <button
              className={`filtro-chip ${filtro === 'online' ? 'ativo' : ''}`}
              onClick={() => setFiltro('online')}
              style={filtro === 'online' ? { borderColor: '#10b981', color: '#34d399' } : {}}
            >
              Online ({totalOnline})
            </button>
            <button
              className={`filtro-chip ${filtro === 'em_campo' ? 'ativo' : ''}`}
              onClick={() => setFiltro('em_campo')}
              style={filtro === 'em_campo' ? { borderColor: '#0284c7', color: '#38bdf8' } : {}}
            >
              Em Campo ({tabletsEmCampo})
            </button>
            <button
              className={`filtro-chip ${filtro === 'em_estoque' ? 'ativo' : ''}`}
              onClick={() => setFiltro('em_estoque')}
              style={filtro === 'em_estoque' ? { borderColor: '#f59e0b', color: '#fbbf24' } : {}}
            >
              Estoque ({tabletsEstoque})
            </button>
            {tabletsBateriaCritica > 0 && (
              <button
                className={`filtro-chip ${filtro === 'bateria_baixa' ? 'ativo' : ''}`}
                onClick={() => setFiltro('bateria_baixa')}
                style={{ borderColor: '#ef4444', color: '#f87171' }}
              >
                Bateria &le; 20% ({tabletsBateriaCritica})
              </button>
            )}
            {tabletsOciososCriticos > 0 && (
              <button
                className={`filtro-chip ${filtro === 'ocioso_critico' ? 'ativo' : ''}`}
                onClick={() => setFiltro('ocioso_critico')}
                style={{ borderColor: '#ef4444', color: '#f87171' }}
              >
                Ocioso &gt; 24h ({tabletsOciososCriticos})
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Dispositivos e Usuários */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--borda-suave)', background: 'var(--fundo-elevado)', color: 'var(--texto-secundario)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Tablet Corporativo</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Agente Responsável (ACS)</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Perfil de Políticas</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status & Bateria</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>App em Foco / Atividade</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>
                  {ehSupervisor ? 'Monitoramento' : 'Ações Rápidas'}
                </th>
              </tr>
            </thead>
            <tbody>
              {dispositivosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                    {busca || filtro !== 'todos'
                      ? 'Nenhum tablet localizado com os critérios informados.'
                      : 'Nenhum dispositivo encontrado na base de dados.'}
                  </td>
                </tr>
              ) : (
                dispositivosFiltrados.map((disp) => {
                  const online = disp.status_conexao === 'conectado';
                  const temUsuario = Boolean(disp.usuario_nome);
                  const ocioso = formatarOciosidade(disp.tempo_ocioso_minutos, disp.ultimo_contato, online);

                  return (
                    <tr
                      key={disp.id}
                      style={{
                        borderBottom: '1px solid var(--borda-suave)',
                        transition: 'background 0.15s ease',
                      }}
                      className="linha-tabela-hover"
                    >
                      {/* Coluna 1: Dados do Tablet */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: online ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                              color: online ? '#34d399' : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Tablet size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '13.5px' }}>
                              {disp.modelo}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  color: '#38bdf8',
                                  fontWeight: 600,
                                }}
                              >
                                SN: {disp.numero_serie}
                              </span>
                              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                                {formatarVersaoAndroid(disp.versao_so || disp.versao_android)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 2: Dados do Usuário / Agente */}
                      <td style={{ padding: '14px 20px' }}>
                        {temUsuario ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: '#fff', fontSize: '13px' }}>{disp.usuario_nome}</strong>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Building size={10} /> {disp.usuario_unidade_basica || 'UBS'}
                              </span>
                              {disp.usuario_cpf && (
                                <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#cbd5e1' }}>
                                  {disp.usuario_cpf}
                                </span>
                              )}
                              {disp.usuario_telefone && (
                                <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#34d399' }}>
                                  {disp.usuario_telefone}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Smartphone size={12} /> Livre no Estoque
                          </span>
                        )}
                      </td>

                      {/* Coluna 3: Perfil de Políticas Ativo */}
                      <td style={{ padding: '14px 20px' }}>
                        <div
                          style={{
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.25)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          <span style={{ fontSize: '11.5px', color: '#c084fc', fontWeight: 700 }}>
                            {disp.perfil_ativo_nome || 'Perfil Padrão ACS'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#34d399', fontWeight: 600 }}>
                            ✓ 26 Apps Bloqueados
                          </span>
                        </div>
                      </td>

                      {/* Coluna 4: Status de Conectividade e Bateria */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: online ? '#34d399' : '#94a3b8',
                              }}
                            >
                              <span
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  background: online ? '#34d399' : '#94a3b8',
                                }}
                              />
                              {online ? 'Online' : 'Offline'}
                            </span>

                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                              <Battery size={13} color={(disp.bateria || 0) <= 20 ? '#f87171' : '#34d399'} />
                              <span style={{ fontWeight: 700, color: '#fff' }}>{disp.bateria || 0}%</span>
                              {disp.carregando && <Zap size={11} color="#fbbf24" />}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--texto-secundario)' }}>
                            <Wifi size={11} color="#60a5fa" />
                            <span>{disp.ssid_wifi || 'Sem Wi-Fi'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 5: App Ativo em Foco e Ociosidade */}
                      <td style={{ padding: '14px 20px' }}>
                        {online ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
                              {disp.app_foco || disp.aplicativo_ativo || 'Área de Trabalho'}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: ocioso.critico ? '#f87171' : ocioso.emUso ? '#34d399' : '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Clock size={11} />
                              <span>{ocioso.texto}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                              Aparelho Desligado
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: ocioso.critico ? '#f87171' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title={disp.app_foco ? `Último app registrado antes de desligar: ${disp.app_foco}` : undefined}
                            >
                              <Clock size={11} />
                              <span>Sem sinal há: {ocioso.texto}</span>
                              {ocioso.critico && (
                                <span
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#f87171',
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  CRÍTICO
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Coluna 6: Ações (Supervisor = Somente Leitura | Admin = Ações Remotas) */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {ehSupervisor ? (
                          /* Supervisor: APENAS botão de visualizar telemetria. SEM comandos remotos e SEM exclusão */
                          <button
                            className="btn btn-secundario"
                            onClick={() => setDispositivoParaDetalhes(disp)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              borderColor: '#38bdf8',
                              color: '#38bdf8',
                            }}
                            title="Ver telemetria completa, diagnóstico e dados do agente"
                          >
                            <Eye size={13} />
                            Ver Telemetria
                          </button>
                        ) : (
                          /* Administrador: Ações de comando remoto */
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secundario btn-acao-rapida"
                              title="Ver Telemetria Detalhada"
                              onClick={() => setDispositivoParaDetalhes(disp)}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              className="btn btn-secundario btn-acao-rapida"
                              title="Bloquear Tela Imediatamente"
                              onClick={() => aoBloquearDispositivo(disp)}
                            >
                              <Lock size={13} />
                            </button>
                            <button
                              className="btn btn-secundario btn-acao-rapida"
                              title="Reiniciar Tablet Remotamente"
                              onClick={() => aoReiniciarDispositivo(disp)}
                            >
                              <RotateCcw size={13} />
                            </button>
                            <button
                              className="btn btn-secundario btn-acao-rapida"
                              title="Painel de Comandos Completos"
                              onClick={() => aoAbrirComandosCompletos(disp)}
                            >
                              <MoreVertical size={13} />
                            </button>
                            {aoRemoverDispositivo && (
                              <button
                                className="btn btn-acao-rapida"
                                title="Remover Dispositivo da Frota"
                                onClick={() => aoRemoverDispositivo(disp)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  color: '#f87171',
                                  borderRadius: '8px',
                                  padding: '6px 8px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes e Telemetria em Somente-Leitura */}
      <ModalDetalhesDispositivo
        visivel={Boolean(dispositivoParaDetalhes)}
        dispositivo={dispositivoParaDetalhes}
        aoFechar={() => setDispositivoParaDetalhes(null)}
      />
    </div>
  );
};
