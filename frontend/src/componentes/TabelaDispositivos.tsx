import React, { useState } from 'react';
import {
  Search,
  Lock,
  RotateCcw,
  MoreVertical,
  Wifi,
  Battery,
  Zap,
  Trash2,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  Building,
  Smartphone,
  Shield,
  User,
} from 'lucide-react';
import { DispositivoItem } from '../servicos/api_mdm';

type FiltroStatus =
  | 'todos'
  | 'em_uso_ativo'
  | 'ocioso_moderado'
  | 'ocioso_critico'
  | 'conectado'
  | 'desconectado'
  | 'bateria_baixa';
type OrdemOciosidade = 'padrao' | 'maior_ociosidade';

interface PropriedadesTabela {
  dispositivos: DispositivoItem[];
  carregando: boolean;
  aoBloquearDispositivo: (dispositivo: DispositivoItem) => void;
  aoReiniciarDispositivo: (dispositivo: DispositivoItem) => void;
  aoAbrirComandosCompletos: (dispositivo: DispositivoItem) => void;
  aoRemoverDispositivo?: (dispositivo: DispositivoItem) => void;
}

export const TabelaDispositivos: React.FC<PropriedadesTabela> = ({
  dispositivos,
  carregando,
  aoBloquearDispositivo,
  aoReiniciarDispositivo,
  aoAbrirComandosCompletos,
  aoRemoverDispositivo,
}) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [ordemOciosidade, setOrdemOciosidade] = useState<OrdemOciosidade>('padrao');

  function ao_digitar_busca(evento: React.ChangeEvent<HTMLInputElement>) {
    setTermoBusca(evento.target.value);
  }

  function ao_selecionar_filtro(filtro: FiltroStatus) {
    setFiltroStatus(filtro);
  }

  function formatarVersaoAndroid(versaoBruta?: string): string {
    if (!versaoBruta || versaoBruta.trim() === '' || versaoBruta === 'Android') {
      return 'Android (SO)';
    }
    const limpa = versaoBruta.trim();
    if (limpa.toLowerCase().startsWith('android')) {
      return limpa;
    }
    return `Android ${limpa}`;
  }

  function filtrar_dispositivos(): DispositivoItem[] {
    const lista = dispositivos.filter((d) => {
      const termo = termoBusca.toLowerCase();
      const correspondeBusca =
        d.numero_serie.toLowerCase().includes(termo) ||
        d.modelo.toLowerCase().includes(termo) ||
        (d.ssid_wifi && d.ssid_wifi.toLowerCase().includes(termo)) ||
        (d.usuario_nome && d.usuario_nome.toLowerCase().includes(termo)) ||
        (d.usuario_unidade_basica && d.usuario_unidade_basica.toLowerCase().includes(termo)) ||
        (d.perfil_ativo_nome && d.perfil_ativo_nome.toLowerCase().includes(termo));

      if (!correspondeBusca) return false;

      const ocioso = formatar_tempo_ocioso(d.tempo_ocioso_minutos, d.ultimo_contato);

      if (filtroStatus === 'em_uso_ativo') {
        return d.status_conexao === 'conectado' && ocioso.tempoTotalMinutos <= 1;
      }
      if (filtroStatus === 'ocioso_moderado') {
        return ocioso.tempoTotalMinutos >= 120 && ocioso.tempoTotalMinutos < 1440;
      }
      if (filtroStatus === 'ocioso_critico') {
        return ocioso.ehSuspeitoReset || ocioso.tempoTotalMinutos >= 1440;
      }
      if (filtroStatus === 'conectado') return d.status_conexao === 'conectado';
      if (filtroStatus === 'desconectado') return d.status_conexao === 'desconectado';
      if (filtroStatus === 'bateria_baixa') return d.bateria <= 20;

      return true;
    });

    if (ordemOciosidade === 'maior_ociosidade') {
      lista.sort((a, b) => {
        const ociosoA = formatar_tempo_ocioso(a.tempo_ocioso_minutos, a.ultimo_contato).tempoTotalMinutos;
        const ociosoB = formatar_tempo_ocioso(b.tempo_ocioso_minutos, b.ultimo_contato).tempoTotalMinutos;
        return ociosoB - ociosoA;
      });
    }

    return lista;
  }

  function formatar_tempo_ocioso(minutos?: number, ultimoContato?: string): {
    texto: string;
    alertaNivel: 'normal' | 'atencao' | 'critico';
    tempoTotalMinutos: number;
    ehSuspeitoReset: boolean;
  } {
    let minutosEfetivos = minutos ?? 0;
    if (ultimoContato) {
      const msSemContato = Date.now() - new Date(ultimoContato).getTime();
      const minutosSemContato = Math.max(0, Math.floor(msSemContato / 60000));
      if (minutosSemContato > 3) {
        minutosEfetivos = Math.max(minutosEfetivos, minutosSemContato);
      }
    }

    const ehSuspeitoReset = minutosEfetivos >= 1440;

    if (minutosEfetivos <= 1) {
      return { texto: 'Em uso agora', alertaNivel: 'normal', tempoTotalMinutos: minutosEfetivos, ehSuspeitoReset: false };
    }

    if (minutosEfetivos < 60) {
      return {
        texto: `${minutosEfetivos} min`,
        alertaNivel: 'normal',
        tempoTotalMinutos: minutosEfetivos,
        ehSuspeitoReset: false,
      };
    }

    if (minutosEfetivos < 1440) {
      const horas = Math.round(minutosEfetivos / 60);
      return {
        texto: `${horas} ${horas === 1 ? 'hora' : 'horas'}`,
        alertaNivel: 'atencao',
        tempoTotalMinutos: minutosEfetivos,
        ehSuspeitoReset: false,
      };
    }

    const dias = Math.floor(minutosEfetivos / 1440);
    const horasRestantes = Math.round((minutosEfetivos % 1440) / 60);
    return {
      texto: `${dias}d ${horasRestantes}h`,
      alertaNivel: 'critico',
      tempoTotalMinutos: minutosEfetivos,
      ehSuspeitoReset,
    };
  }

  function formatar_data_hora(isoString?: string): string {
    if (!isoString) return 'Nunca';
    try {
      const data = new Date(isoString);
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  const listaFiltrada = filtrar_dispositivos();

  const contagemEmUso = dispositivos.filter(
    (d) => d.status_conexao === 'conectado' && formatar_tempo_ocioso(d.tempo_ocioso_minutos, d.ultimo_contato).tempoTotalMinutos <= 1
  ).length;

  const contagemModerado = dispositivos.filter((d) => {
    const o = formatar_tempo_ocioso(d.tempo_ocioso_minutos, d.ultimo_contato).tempoTotalMinutos;
    return o >= 120 && o < 1440;
  }).length;

  const contagemCritico = dispositivos.filter((d) => {
    const o = formatar_tempo_ocioso(d.tempo_ocioso_minutos, d.ultimo_contato);
    return o.ehSuspeitoReset || o.tempoTotalMinutos >= 1440;
  }).length;

  return (
    <div className="card-dispositivos">
      <div className="painel-filtros-topo">
        <div className="campo-busca">
          <Search size={16} className="icone-busca" />
          <input
            type="text"
            placeholder="Buscar por serial, modelo, agente, UBS, perfil ou Wi-Fi..."
            value={termoBusca}
            onChange={ao_digitar_busca}
          />
        </div>

        <div className="grupo-chips-filtro">
          <button
            className={`filtro-chip ${filtroStatus === 'todos' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('todos')}
          >
            Todos ({dispositivos.length})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'em_uso_ativo' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('em_uso_ativo')}
            style={filtroStatus === 'em_uso_ativo' ? { borderColor: '#10b981', color: '#34d399' } : {}}
          >
            🟢 Em Uso Ativo ({contagemEmUso})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'ocioso_moderado' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('ocioso_moderado')}
            style={filtroStatus === 'ocioso_moderado' ? { borderColor: '#f59e0b', color: '#fbbf24' } : {}}
          >
            ⏳ Ociosos &gt; 2h ({contagemModerado})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'ocioso_critico' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('ocioso_critico')}
            style={filtroStatus === 'ocioso_critico' ? { borderColor: '#ef4444', color: '#f87171' } : {}}
          >
            🚨 Críticos &ge; 24h ({contagemCritico})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'conectado' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('conectado')}
          >
            Online ({dispositivos.filter((d) => d.status_conexao === 'conectado').length})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'desconectado' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('desconectado')}
          >
            Offline ({dispositivos.filter((d) => d.status_conexao === 'desconectado').length})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'bateria_baixa' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('bateria_baixa')}
          >
            Bateria Baixa ({dispositivos.filter((d) => d.bateria <= 20).length})
          </button>

          <button
            className={`btn ${ordemOciosidade === 'maior_ociosidade' ? 'btn-primario' : 'btn-secundario'}`}
            style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '20px' }}
            onClick={() => setOrdemOciosidade(ordemOciosidade === 'padrao' ? 'maior_ociosidade' : 'padrao')}
            title="Alternar ordenação por maior tempo de ociosidade"
          >
            <ArrowUpDown size={12} />
            {ordemOciosidade === 'maior_ociosidade' ? 'Mais Ociosos Primeiro' : 'Ordenar p/ Ociosidade'}
          </button>
        </div>
      </div>

      {/* Tabela Unificada de Dispositivos com Agente Responsável e Perfil */}
      <div className="tabela-wrapper">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Dispositivo / Serial</th>
              <th>Agente Responsável (ACS)</th>
              <th>Perfil de Políticas</th>
              <th>SO / Firmware</th>
              <th>Bateria & Wi-Fi</th>
              <th>App em Foco / Uso</th>
              <th>Último Contato</th>
              <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                  Sincronizando telemetria com a frota...
                </td>
              </tr>
            ) : listaFiltrada.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                  Nenhum tablet localizado com os critérios informados.
                </td>
              </tr>
            ) : (
              listaFiltrada.map((disp) => {
                const isOnline = disp.status_conexao === 'conectado';
                const temUsuario = Boolean(disp.usuario_nome);

                return (
                  <tr key={disp.id || disp.numero_serie}>
                    {/* Status */}
                    <td>
                      <span className={`badge-status ${isOnline ? 'conectado' : 'desconectado'}`}>
                        <span className="ponto-pulso"></span>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>

                    {/* Dispositivo / Serial / Versão SO */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{disp.modelo}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span className="texto-mono" style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>
                          SN: {disp.numero_serie}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatarVersaoAndroid(disp.versao_so || disp.versao_android)}
                        </span>
                      </div>
                    </td>

                    {/* Agente Responsável (ACS) */}
                    <td>
                      {temUsuario ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '12.5px' }}>
                            {disp.usuario_nome}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                background: 'rgba(56, 189, 248, 0.12)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Building size={9} /> {disp.usuario_unidade_basica || 'USF'}
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
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Smartphone size={11} /> Livre no Estoque
                        </span>
                      )}
                    </td>

                    {/* Perfil de Políticas */}
                    <td>
                      <div
                        style={{
                          background: 'rgba(139, 92, 246, 0.12)',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          gap: '1px',
                        }}
                      >
                        <span style={{ fontSize: '11.5px', color: '#c084fc', fontWeight: 700 }}>
                          {disp.perfil_ativo_nome || 'Perfil Estrito ACS'}
                        </span>
                        <span style={{ fontSize: '9.5px', color: '#34d399', fontWeight: 600 }}>
                          ✓ Blindagem Ativa
                        </span>
                      </div>
                    </td>

                    {/* SO / Firmware */}
                    <td>
                      <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {formatarVersaoAndroid(disp.versao_so || disp.versao_android)}
                      </span>
                      {disp.aplicativos_instalados && disp.aplicativos_instalados.length > 0 ? (
                        <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          {disp.aplicativos_instalados.slice(0, 3).map((app) => (
                            <span
                              key={app.pacote}
                              style={{
                                background: 'rgba(59, 130, 246, 0.12)',
                                color: '#93c5fd',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                fontSize: '9.5px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                              title={`${app.nome || app.pacote} • Versão Código: ${app.versao_codigo}`}
                            >
                              {app.nome ? app.nome.split(' ')[0] : 'App'}
                            </span>
                          ))}
                          {disp.aplicativos_instalados.length > 3 && (
                            <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                              +{disp.aplicativos_instalados.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '9.5px', color: 'var(--texto-fraco)', display: 'block', marginTop: '2px' }}>
                          Telemetria apps pendente
                        </span>
                      )}
                    </td>

                    {/* Bateria & Wi-Fi */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Battery
                          size={15}
                          color={disp.bateria <= 20 ? '#ef4444' : disp.bateria <= 50 ? '#f59e0b' : '#10b981'}
                        />
                        <span style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>{disp.bateria}%</span>
                        {disp.esta_carregando && <Zap size={12} color="#fbbf24" />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '11px', color: 'var(--texto-secundario)' }}>
                        <Wifi size={12} color="#60a5fa" />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>
                          {disp.ssid_wifi || 'Sem rede'}
                        </span>
                      </div>
                    </td>

                    {/* App em Foco / Tempo Ocioso */}
                    <td>
                      <span
                        className="texto-mono"
                        style={{
                          fontSize: '11.5px',
                          background: 'rgba(255,255,255,0.04)',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          display: 'block',
                          marginBottom: '3px',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#e2e8f0',
                        }}
                        title={disp.app_foco || 'Sistema'}
                      >
                        {disp.app_foco || 'Sistema'}
                      </span>
                      {(() => {
                        const ocioso = formatar_tempo_ocioso(disp.tempo_ocioso_minutos, disp.ultimo_contato);
                        const cor =
                          ocioso.alertaNivel === 'critico'
                            ? '#ef4444'
                            : ocioso.alertaNivel === 'atencao'
                            ? '#f59e0b'
                            : ocioso.tempoTotalMinutos <= 1
                            ? '#10b981'
                            : 'var(--texto-fraco)';

                        return (
                          <div
                            style={{
                              fontSize: '10.5px',
                              color: cor,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: ocioso.alertaNivel === 'critico' ? 600 : 400,
                            }}
                          >
                            {ocioso.alertaNivel === 'critico' ? (
                              <AlertTriangle size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                            ) : (
                              <Clock size={10} color={cor} style={{ flexShrink: 0 }} />
                            )}
                            <span>
                              {ocioso.tempoTotalMinutos <= 1 ? (
                                <span style={{ color: '#34d399', fontWeight: 600 }}>Em uso ativo</span>
                              ) : (
                                <>Ocioso: {ocioso.texto}</>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Último Contato */}
                    <td>
                      <span style={{ fontSize: '11.5px', color: 'var(--texto-secundario)', whiteSpace: 'nowrap' }}>
                        {formatar_data_hora(disp.ultimo_contato)}
                      </span>
                    </td>

                    {/* Ações Rápidas */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '5px' }}>
                        <button
                          className="btn btn-secundario btn-acao-rapida"
                          title="Bloquear Tela Imediatamente"
                          onClick={() => aoBloquearDispositivo(disp)}
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                        >
                          <Lock size={12} />
                        </button>
                        <button
                          className="btn btn-secundario btn-acao-rapida"
                          title="Reiniciar Tablet"
                          onClick={() => aoReiniciarDispositivo(disp)}
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button
                          className="btn btn-secundario btn-acao-rapida"
                          title="Mais Comandos"
                          onClick={() => aoAbrirComandosCompletos(disp)}
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                        >
                          <MoreVertical size={12} />
                        </button>
                        {aoRemoverDispositivo && (
                          <button
                            className="btn btn-acao-rapida"
                            title="Remover da Frota"
                            onClick={() => aoRemoverDispositivo(disp)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              color: '#f87171',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '11px',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
