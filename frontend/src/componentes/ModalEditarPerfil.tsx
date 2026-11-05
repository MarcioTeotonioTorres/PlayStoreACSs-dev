import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Save,
  Shield,
  Layers,
  Lock,
  Unlock,
  Globe,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import {
  PerfilProvisionamentoItem,
  atualizar_perfil_api,
  aplicar_perfil_api,
} from '../servicos/api_mdm';
import { CATALOGO_BLOATWARE_ACS } from '../paginas/PaginaPoliticas';

interface PropriedadesModalEditarPerfil {
  visivel: boolean;
  perfil: PerfilProvisionamentoItem | null;
  aoFechar: () => void;
  aoSucesso: (mensagem: string) => void;
}

export const ModalEditarPerfil: React.FC<PropriedadesModalEditarPerfil> = ({
  visivel,
  perfil,
  aoFechar,
  aoSucesso,
}) => {
  const [nome, setNome] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [permitirCamera, setPermitirCamera] = useState<boolean>(true);
  const [bloquearUsb, setBloquearUsb] = useState<boolean>(true);
  const [permitirReset, setPermitirReset] = useState<boolean>(false);
  const [bloquearInstalacaoApps, setBloquearInstalacaoApps] = useState<boolean>(true);
  const [bloquearBluetooth, setBloquearBluetooth] = useState<boolean>(false);
  const [pacotesOcultos, setPacotesOcultos] = useState<string[]>([]);
  const [urlsPermitidas, setUrlsPermitidas] = useState<string[]>([]);
  const [novaUrl, setNovaUrl] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'apps' | 'chrome'>('geral');
  const [buscaApp, setBuscaApp] = useState<string>('');

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome || '');
      setDescricao(perfil.descricao || '');
      setPermitirCamera(perfil.permitir_camera ?? true);
      setBloquearUsb(perfil.bloquear_usb ?? true);
      setPermitirReset(perfil.permitir_reset_fabrica ?? false);
      setBloquearInstalacaoApps(perfil.bloquear_instalacao_apps ?? true);
      setBloquearBluetooth(perfil.bloquear_bluetooth ?? false);
      setPacotesOcultos(perfil.pacotes_ocultos || []);
      setUrlsPermitidas(perfil.urls_permitidas || []);
    }
    setErro('');
  }, [perfil, visivel]);

  if (!visivel || !perfil) return null;

  function alternarApp(pacote: string) {
    if (pacotesOcultos.includes(pacote)) {
      setPacotesOcultos(pacotesOcultos.filter((p) => p !== pacote));
    } else {
      setPacotesOcultos([...pacotesOcultos, pacote]);
    }
  }

  function bloquearTodos() {
    const todos = CATALOGO_BLOATWARE_ACS.map((a) => a.pacote);
    setPacotesOcultos(Array.from(new Set([...pacotesOcultos, ...todos])));
  }

  function liberarTodos() {
    const todosSet = new Set(CATALOGO_BLOATWARE_ACS.map((a) => a.pacote));
    setPacotesOcultos(pacotesOcultos.filter((p) => !todosSet.has(p)));
  }

  function adicionarUrl() {
    const limpa = novaUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!limpa) return;
    if (urlsPermitidas.includes(limpa)) {
      alert('Esta URL já consta na lista branca.');
      return;
    }
    setUrlsPermitidas([...urlsPermitidas, limpa]);
    setNovaUrl('');
  }

  function removerUrl(url: string) {
    setUrlsPermitidas(urlsPermitidas.filter((u) => u !== url));
  }

  async function aoSalvar(aplicarTambem = false) {
    if (!perfil) return;
    if (!nome.trim() || nome.trim().length < 3) {
      setErro('O nome do perfil é obrigatório (mínimo de 3 caracteres).');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const resp = await atualizar_perfil_api(perfil.id, {
        nome: nome.trim(),
        descricao: descricao.trim(),
        permitir_camera: permitirCamera,
        bloquear_usb: bloquearUsb,
        permitir_reset_fabrica: permitirReset,
        bloquear_instalacao_apps: bloquearInstalacaoApps,
        bloquear_bluetooth: bloquearBluetooth,
        pacotes_ocultos: pacotesOcultos,
        urls_permitidas: urlsPermitidas,
      });

      if (aplicarTambem) {
        await aplicar_perfil_api(perfil.id, 'todos');
        aoSucesso(`✓ Perfil "${nome}" atualizado e aplicado a toda a frota com sucesso!`);
      } else {
        aoSucesso(`✓ Perfil "${nome}" atualizado com sucesso!`);
      }
      aoFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setSalvando(false);
    }
  }

  const appsFiltrados = CATALOGO_BLOATWARE_ACS.filter(
    (a) =>
      a.nome.toLowerCase().includes(buscaApp.toLowerCase()) ||
      a.pacote.toLowerCase().includes(buscaApp.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={aoFechar}>
      <div
        className="modal-conteudo"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '750px',
          width: '95%',
          maxHeight: '90vh',
          background: 'var(--fundo-card)',
          border: '1px solid var(--borda-suave)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--borda-suave)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(59, 130, 246, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                Editar Perfil de Provisionamento
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--texto-secundario)' }}>
                Ajuste os parâmetros de segurança e restrições do template
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

        {/* Abas Internas */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--borda-suave)',
            background: 'var(--fundo-elevado)',
            padding: '0 24px',
          }}
        >
          <button
            onClick={() => setAbaAtiva('geral')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              color: abaAtiva === 'geral' ? '#60a5fa' : '#94a3b8',
              borderBottom: abaAtiva === 'geral' ? '2px solid #60a5fa' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Diretrizes & Hardware
          </button>
          <button
            onClick={() => setAbaAtiva('apps')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              color: abaAtiva === 'apps' ? '#60a5fa' : '#94a3b8',
              borderBottom: abaAtiva === 'apps' ? '2px solid #60a5fa' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Apps Bloqueados ({pacotesOcultos.length})
          </button>
          <button
            onClick={() => setAbaAtiva('chrome')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              color: abaAtiva === 'chrome' ? '#60a5fa' : '#94a3b8',
              borderBottom: abaAtiva === 'chrome' ? '2px solid #60a5fa' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Lista Branca Web ({urlsPermitidas.length})
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {erro && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{erro}</span>
            </div>
          )}

          {abaAtiva === 'geral' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Nome do Perfil:
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Perfil Estrito ACS (Padrão)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Descrição Operacional:
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva a finalidade deste perfil..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '13px',
                    resize: 'none',
                  }}
                />
              </div>

              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '12px' }}>
                Diretrizes de Hardware e Sistema
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {/* Bloquear Transferência USB */}
                <div
                  onClick={() => setBloquearUsb(!bloquearUsb)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Bloquear Transferência USB (MTP)</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Permite apenas carregamento de bateria</div>
                  </div>
                  <input type="checkbox" checked={bloquearUsb} readOnly style={{ cursor: 'pointer' }} />
                </div>

                {/* Bloquear Instalação de APKs */}
                <div
                  onClick={() => setBloquearInstalacaoApps(!bloquearInstalacaoApps)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Bloquear Instalação de APKs</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Impede fontes desconhecidas no tablet</div>
                  </div>
                  <input type="checkbox" checked={bloquearInstalacaoApps} readOnly style={{ cursor: 'pointer' }} />
                </div>

                {/* Bloquear Bluetooth */}
                <div
                  onClick={() => setBloquearBluetooth(!bloquearBluetooth)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Bloquear Bluetooth</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Impede pareamento de arquivos externos</div>
                  </div>
                  <input type="checkbox" checked={bloquearBluetooth} readOnly style={{ cursor: 'pointer' }} />
                </div>

                {/* Permitir Câmera */}
                <div
                  onClick={() => setPermitirCamera(!permitirCamera)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Permitir Câmera</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Necessária para leitura de QR Code e fotos</div>
                  </div>
                  <input type="checkbox" checked={permitirCamera} readOnly style={{ cursor: 'pointer' }} />
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'apps' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar aplicativo no catálogo..."
                  value={buscaApp}
                  onChange={(e) => setBuscaApp(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '12px',
                    minWidth: '220px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secundario" onClick={bloquearTodos} style={{ fontSize: '11px', padding: '6px 12px' }}>
                    <CheckCheck size={12} /> Bloquear Todos (26)
                  </button>
                  <button className="btn btn-secundario" onClick={liberarTodos} style={{ fontSize: '11px', padding: '6px 12px' }}>
                    <RotateCcw size={12} /> Liberar Todos
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {appsFiltrados.map((app) => {
                  const bloqueado = pacotesOcultos.includes(app.pacote);
                  return (
                    <div
                      key={app.pacote}
                      onClick={() => alternarApp(app.pacote)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: bloqueado ? 'rgba(239, 68, 68, 0.08)' : 'var(--fundo-base)',
                        border: bloqueado ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--borda-suave)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{app.icone}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: bloqueado ? '#f87171' : '#fff' }}>
                            {app.nome}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            {app.pacote}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: bloqueado ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: bloqueado ? '#f87171' : '#34d399',
                        }}
                      >
                        {bloqueado ? 'BLOQUEADO' : 'LIBERADO'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {abaAtiva === 'chrome' && (
            <div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
                Domínios explicitamente permitidos no Google Chrome Enterprise. O restante de toda a internet é bloqueado automaticamente pelo Device Owner.
              </p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Ex: conectesus.saude.gov.br ou *.saude.gov.br"
                  value={novaUrl}
                  onChange={(e) => setNovaUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarUrl())}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <button className="btn btn-secundario" onClick={adicionarUrl} style={{ fontSize: '12px', padding: '6px 14px' }}>
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {urlsPermitidas.map((u) => (
                  <div
                    key={u}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--fundo-base)',
                      border: '1px solid var(--borda-suave)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  >
                    <span style={{ color: '#38bdf8' }}>{u}</span>
                    <button
                      onClick={() => removerUrl(u)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--borda-suave)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--fundo-elevado)',
          }}
        >
          <button className="btn btn-secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button
            className="btn btn-secundario"
            onClick={() => aoSalvar(false)}
            disabled={salvando}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={14} />
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button
            className="btn btn-primario"
            onClick={() => aoSalvar(true)}
            disabled={salvando}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle size={14} />
            {salvando ? 'Salvando & Aplicando...' : 'Salvar e Aplicar na Frota'}
          </button>
        </div>
      </div>
    </div>
  );
};
