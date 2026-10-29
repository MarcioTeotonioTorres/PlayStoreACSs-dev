import React, { useState } from 'react';
import {
  X,
  Layers,
  ShieldCheck,
  CheckCircle,
  Lock,
  Unlock,
  Trash2,
  Send,
  Download,
  Search,
  Sparkles,
  Smartphone,
  Globe,
  Bluetooth,
  Package,
  Usb,
  RotateCcw,
} from 'lucide-react';
import {
  PerfilProvisionamentoItem,
  DispositivoItem,
  aplicar_perfil_api,
  remover_perfil_api,
} from '../servicos/api_mdm';

interface PropriedadesModalGerenciarPerfis {
  visivel: boolean;
  perfis: PerfilProvisionamentoItem[];
  dispositivos: DispositivoItem[];
  aoFechar: () => void;
  aoCarregarNoEditor: (perfil: PerfilProvisionamentoItem) => void;
  aoPerfilAplicado: (mensagem: string) => void;
  aoRecarregarPerfis: () => void;
}

export const ModalGerenciarPerfis: React.FC<PropriedadesModalGerenciarPerfis> = ({
  visivel,
  perfis,
  dispositivos,
  aoFechar,
  aoCarregarNoEditor,
  aoPerfilAplicado,
  aoRecarregarPerfis,
}) => {
  const [busca, setBusca] = useState<string>('');
  const [aplicandoId, setAplicandoId] = useState<string | null>(null);
  const [alvoSelecionado, setAlvoSelecionado] = useState<Record<string, string>>({});
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  if (!visivel) return null;

  const perfisFiltrados = perfis.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase()))
  );

  async function aoAplicar(perfil: PerfilProvisionamentoItem) {
    const alvo = alvoSelecionado[perfil.id] || 'todos';
    const isFrota = alvo === 'todos';

    const confirmMsg = isFrota
      ? `Deseja realmente aplicar o perfil "${perfil.nome}" a TODOS os 250 tablets da frota corporativa?`
      : `Deseja aplicar o perfil "${perfil.nome}" ao tablet selecionado?`;

    if (!confirm(confirmMsg)) return;

    setAplicandoId(perfil.id);
    try {
      const resp = await aplicar_perfil_api(
        perfil.id,
        isFrota ? 'todos' : 'dispositivo',
        isFrota ? undefined : alvo
      );
      aoPerfilAplicado(resp.mensagem);
      aoFechar();
    } catch (err: any) {
      alert(`Falha ao aplicar perfil: ${err.message || 'Erro de comunicação.'}`);
    } finally {
      setAplicandoId(null);
    }
  }

  async function aoExcluir(perfil: PerfilProvisionamentoItem) {
    if (perfil.eh_padrao) {
      alert('Perfis padrão de fábrica do sistema não podem ser excluídos.');
      return;
    }

    if (!confirm(`Deseja excluir permanentemente o perfil personalizado "${perfil.nome}"?`)) {
      return;
    }

    setExcluindoId(perfil.id);
    try {
      await remover_perfil_api(perfil.id);
      aoRecarregarPerfis();
    } catch (err: any) {
      alert(`Falha ao excluir perfil: ${err.message || 'Erro inesperado.'}`);
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="modal-sobreposicao" style={{ zIndex: 1050 }}>
      <div
        className="modal-conteudo"
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '90vh',
          background: 'var(--fundo-card)',
          border: '1px solid var(--borda-suave)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Topo do Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--borda-suave)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(59, 130, 246, 0.04)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                Perfis de Provisionamento e Restrições
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--texto-secundario)' }}>
                Gerencie templates de segurança e aplique configurações granulares à frota ou tablets individuais
              </p>
            </div>
          </div>

          <button
            onClick={aoFechar}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--texto-secundario)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Filtro */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--borda-suave)',
            background: 'var(--fundo-elevado)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou descrição do perfil..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--texto-secundario)', whiteSpace: 'nowrap' }}>
            {perfisFiltrados.length} {perfisFiltrados.length === 1 ? 'perfil' : 'perfis'}
          </span>
        </div>

        {/* Lista de Cards de Perfis com Scroll */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
          }}
        >
          {perfisFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)', fontSize: '14px' }}>
              Nenhum perfil de provisionamento encontrado para os termos pesquisados.
            </div>
          ) : (
            perfisFiltrados.map((perfil) => {
              const estaAplicando = aplicandoId === perfil.id;
              const estaExcluindo = excluindoId === perfil.id;
              const alvoAtual = alvoSelecionado[perfil.id] || 'todos';

              return (
                <div
                  key={perfil.id}
                  style={{
                    background: perfil.eh_padrao ? 'rgba(59, 130, 246, 0.03)' : 'var(--fundo-elevado)',
                    border: `1px solid ${perfil.eh_padrao ? 'rgba(59, 130, 246, 0.25)' : 'var(--borda-suave)'}`,
                    borderRadius: '14px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  {/* Cabeçalho do Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{perfil.nome}</span>
                        {perfil.eh_padrao ? (
                          <span
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Sparkles size={11} />
                            Template Padrão
                          </span>
                        ) : (
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
                            Personalizado
                          </span>
                        )}
                        {perfil.habilitar_modo_quiosque && (
                          <span
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            Modo Quiosque
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {perfil.descricao || 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    {!perfil.eh_padrao && (
                      <button
                        onClick={() => aoExcluir(perfil)}
                        disabled={estaExcluindo}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                        }}
                        title="Excluir este perfil personalizado"
                      >
                        <Trash2 size={13} />
                        Excluir
                      </button>
                    )}
                  </div>

                  {/* Badges de Restrições Ativas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--fundo-base)',
                        border: '1px solid var(--borda-suave)',
                        color: (perfil.pacotes_ocultos || []).length > 0 ? '#f87171' : '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Lock size={12} />
                      {(perfil.pacotes_ocultos || []).length} Apps Bloqueados
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--fundo-base)',
                        border: '1px solid var(--borda-suave)',
                        color: perfil.bloquear_usb ? '#34d399' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Usb size={12} />
                      USB {perfil.bloquear_usb ? 'Bloqueado' : 'Liberado'}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--fundo-base)',
                        border: '1px solid var(--borda-suave)',
                        color: perfil.bloquear_bluetooth ? '#f87171' : '#60a5fa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Bluetooth size={12} />
                      Bluetooth {perfil.bloquear_bluetooth ? 'Bloqueado' : 'Liberado'}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--fundo-base)',
                        border: '1px solid var(--borda-suave)',
                        color: perfil.bloquear_instalacao_apps ? '#34d399' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Package size={12} />
                      Instalação APK {perfil.bloquear_instalacao_apps ? 'Bloqueada' : 'Liberada'}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--fundo-base)',
                        border: '1px solid var(--borda-suave)',
                        color: (perfil.urls_permitidas || []).length > 0 ? '#34d399' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Globe size={12} />
                      {(perfil.urls_permitidas || []).length} URLs Liberadas
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--fundo-base)',
                        border: '1px solid var(--borda-suave)',
                        color: !perfil.permitir_reset_fabrica ? '#34d399' : '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Smartphone size={12} />
                      Reset {!perfil.permitir_reset_fabrica ? 'Protegido' : 'Liberado'}
                    </span>
                  </div>

                  {/* Barra de Ação de Aplicação do Perfil */}
                  <div
                    style={{
                      borderTop: '1px solid var(--borda-suave)',
                      paddingTop: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <button
                      className="btn btn-secundario"
                      onClick={() => {
                        aoCarregarNoEditor(perfil);
                        aoFechar();
                      }}
                      style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Carrega os parâmetros deste perfil nos controles da página de políticas"
                    >
                      <Download size={14} />
                      Carregar no Editor
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <select
                        value={alvoAtual}
                        onChange={(e) =>
                          setAlvoSelecionado({ ...alvoSelecionado, [perfil.id]: e.target.value })
                        }
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          background: 'var(--fundo-base)',
                          border: '1px solid var(--borda-suave)',
                          color: '#fff',
                          fontSize: '12px',
                          maxWidth: '260px',
                        }}
                      >
                        <option value="todos">🌐 Toda a Frota (250 Tablets)</option>
                        {dispositivos.map((d) => (
                          <option key={d.id} value={d.id}>
                            📱 {d.modelo} ({d.numero_serie})
                          </option>
                        ))}
                      </select>

                      <button
                        className="btn btn-primario"
                        onClick={() => aoAplicar(perfil)}
                        disabled={estaAplicando}
                        style={{ fontSize: '12px', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Send size={13} />
                        {estaAplicando ? 'Aplicando...' : 'Aplicar Perfil Agora'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
