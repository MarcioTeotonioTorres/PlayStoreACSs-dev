import React, { useState } from 'react';
import { Search, Lock, RotateCcw, MoreVertical, Wifi, Battery, Zap } from 'lucide-react';
import { DispositivoItem } from '../servicos/api_mdm';

interface PropriedadesTabela {
  dispositivos: DispositivoItem[];
  carregando: boolean;
  aoBloquearDispositivo: (dispositivo: DispositivoItem) => void;
  aoReiniciarDispositivo: (dispositivo: DispositivoItem) => void;
  aoAbrirComandosCompletos: (dispositivo: DispositivoItem) => void;
}

export const TabelaDispositivos: React.FC<PropriedadesTabela> = ({
  dispositivos,
  carregando,
  aoBloquearDispositivo,
  aoReiniciarDispositivo,
  aoAbrirComandosCompletos,
}) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'conectado' | 'desconectado' | 'bateria_baixa'>('todos');

  function ao_digitar_busca(evento: React.ChangeEvent<HTMLInputElement>) {
    setTermoBusca(evento.target.value);
  }

  function ao_selecionar_filtro(filtro: 'todos' | 'conectado' | 'desconectado' | 'bateria_baixa') {
    setFiltroStatus(filtro);
  }

  function filtrar_dispositivos(): DispositivoItem[] {
    return dispositivos.filter((d) => {
      const correspondeBusca =
        d.numero_serie.toLowerCase().includes(termoBusca.toLowerCase()) ||
        d.modelo.toLowerCase().includes(termoBusca.toLowerCase()) ||
        (d.ssid_wifi && d.ssid_wifi.toLowerCase().includes(termoBusca.toLowerCase()));

      if (!correspondeBusca) return false;

      if (filtroStatus === 'conectado') return d.status_conexao === 'conectado';
      if (filtroStatus === 'desconectado') return d.status_conexao === 'desconectado';
      if (filtroStatus === 'bateria_baixa') return d.bateria <= 20;

      return true;
    });
  }

  function formatar_data_hora(isoString: string): string {
    if (!isoString) return 'Nunca';
    try {
      const data = new Date(isoString);
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  }

  const listaFiltrada = filtrar_dispositivos();

  return (
    <div className="card-tabela">
      {/* Barra de Filtros e Busca */}
      <div className="tabela-barra-topo">
        <div className="tabela-barra-busca">
          <Search size={16} color="var(--texto-secundario)" />
          <input
            type="text"
            placeholder="Buscar por serial, modelo ou rede Wi-Fi..."
            value={termoBusca}
            onChange={ao_digitar_busca}
          />
        </div>

        <div className="tabela-filtros">
          <button
            className={`filtro-chip ${filtroStatus === 'todos' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('todos')}
          >
            Todos ({dispositivos.length})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'conectado' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('conectado')}
          >
            Conectados ({dispositivos.filter((d) => d.status_conexao === 'conectado').length})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'desconectado' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('desconectado')}
          >
            Desconectados ({dispositivos.filter((d) => d.status_conexao === 'desconectado').length})
          </button>
          <button
            className={`filtro-chip ${filtroStatus === 'bateria_baixa' ? 'ativo' : ''}`}
            onClick={() => ao_selecionar_filtro('bateria_baixa')}
          >
            Bateria Baixa ({dispositivos.filter((d) => d.bateria <= 20).length})
          </button>
        </div>
      </div>

      {/* Tabela de Dispositivos */}
      <div className="tabela-wrapper">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Dispositivo / Serial</th>
              <th>SO / Firmware</th>
              <th>Bateria</th>
              <th>Wi-Fi / Sinal</th>
              <th>App em Primeiro Plano</th>
              <th>Último Contato</th>
              <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                  Sincronizando telemetria com a frota...
                </td>
              </tr>
            ) : listaFiltrada.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                  Nenhum tablet localizado com os critérios informados.
                </td>
              </tr>
            ) : (
              listaFiltrada.map((disp) => {
                const isOnline = disp.status_conexao === 'conectado';
                return (
                  <tr key={disp.id || disp.numero_serie}>
                    {/* Status */}
                    <td>
                      <span className={`badge-status ${isOnline ? 'conectado' : 'desconectado'}`}>
                        <span className="ponto-pulso"></span>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>

                    {/* Dispositivo / Serial */}
                    <td>
                      <div style={{ fontWeight: 600 }}>{disp.modelo}</div>
                      <div className="texto-mono" style={{ fontSize: '11px', color: 'var(--texto-fraco)' }}>
                        SN: {disp.numero_serie}
                      </div>
                    </td>

                    {/* Versão SO */}
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--texto-secundario)' }}>
                        {disp.versao_so}
                      </span>
                    </td>

                    {/* Bateria */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Battery
                          size={16}
                          color={disp.bateria <= 20 ? '#ef4444' : disp.bateria <= 50 ? '#f59e0b' : '#10b981'}
                        />
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{disp.bateria}%</span>
                        {disp.esta_carregando && (
                          <span title="Carregando">
                            <Zap size={14} color="#3b82f6" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Wi-Fi */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wifi size={15} color="var(--texto-secundario)" />
                        <span style={{ fontSize: '13px' }}>{disp.ssid_wifi || 'N/D'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--texto-fraco)' }}>
                        {disp.sinal_wifi_rssi} dBm
                      </div>
                    </td>

                    {/* App em Foco */}
                    <td>
                      <span
                        className="texto-mono"
                        style={{
                          fontSize: '12px',
                          background: 'rgba(255,255,255,0.04)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {disp.app_foco || 'Sistema'}
                      </span>
                    </td>

                    {/* Último Contato */}
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
                        {formatar_data_hora(disp.ultimo_contato)}
                      </span>
                    </td>

                    {/* Ações Rápidas */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secundario btn-acao-rapida"
                          title="Bloquear Tela Imediatamente"
                          onClick={() => aoBloquearDispositivo(disp)}
                        >
                          <Lock size={13} />
                          Bloquear
                        </button>
                        <button
                          className="btn btn-secundario btn-acao-rapida"
                          title="Reiniciar Tablet"
                          onClick={() => aoReiniciarDispositivo(disp)}
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          className="btn btn-secundario btn-acao-rapida"
                          title="Mais Comandos"
                          onClick={() => aoAbrirComandosCompletos(disp)}
                        >
                          <MoreVertical size={13} />
                        </button>
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
