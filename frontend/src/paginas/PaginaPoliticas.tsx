import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Globe,
  AppWindow,
  Lock,
  Unlock,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  Send,
  HelpCircle,
  RefreshCw,
  Usb,
  Camera,
  RotateCcw,
} from 'lucide-react';
import {
  obter_politicas_api,
  salvar_politicas_frota_api,
  salvar_politicas_dispositivo_api,
  DadosPolitica,
  DispositivoItem,
} from '../servicos/api_mdm';

interface PropriedadesPaginaPoliticas {
  dispositivos: DispositivoItem[];
}

export const PaginaPoliticas: React.FC<PropriedadesPaginaPoliticas> = ({ dispositivos }) => {
  const [politica, setPolitica] = useState<DadosPolitica>({
    permitir_camera: true,
    bloquear_usb: true,
    permitir_reset_fabrica: false,
    habilitar_modo_quiosque: false,
    pacotes_ocultos: [
      'com.google.android.youtube',
      'com.android.vending',
      'com.google.android.apps.photos',
    ],
    urls_permitidas: [
      'portal.empresa.com.br',
      '*.empresa.com.br',
      'sistema.empresa.com.br',
    ],
  });

  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [novaUrl, setNovaUrl] = useState<string>('');
  const [novoPacote, setNovoPacote] = useState<string>('');
  const [dispositivoAlvo, setDispositivoAlvo] = useState<string>('todos');

  // Aplicativos comuns do sistema Android com seus identificadores de pacote
  const aplicativosComuns = [
    {
      nome: 'YouTube',
      pacote: 'com.google.android.youtube',
      descricao: 'Vídeos e streaming de entretenimento',
      icone: '📺',
    },
    {
      nome: 'Google Play Store',
      pacote: 'com.android.vending',
      descricao: 'Loja de aplicativos e jogos',
      icone: '🛍️',
    },
    {
      nome: 'Galeria / Google Fotos',
      pacote: 'com.google.android.apps.photos',
      descricao: 'Visualizador e backup de mídias pessoais',
      icone: '🖼️',
    },
    {
      nome: 'Configurações do Android',
      pacote: 'com.android.settings',
      descricao: 'Ajustes avançados do sistema operacional',
      icone: '⚙️',
    }
  ];

  useEffect(() => {
    carregar_politicas_sistema();
  }, []);

  async function carregar_politicas_sistema() {
    setCarregando(true);
    try {
      const resp = await obter_politicas_api();
      if (resp.politica) {
        setPolitica({
          ...resp.politica,
          pacotes_ocultos: resp.politica.pacotes_ocultos || [],
          urls_permitidas: resp.politica.urls_permitidas || [],
        });
      }
    } catch (erro) {
      console.error('Erro ao carregar políticas:', erro);
    } finally {
      setCarregando(false);
    }
  }

  function ao_alternar_bloqueio_app(pacote: string) {
    const jaOculto = politica.pacotes_ocultos.includes(pacote);
    const novaLista = jaOculto
      ? politica.pacotes_ocultos.filter((p) => p !== pacote)
      : [...politica.pacotes_ocultos, pacote];

    setPolitica({ ...politica, pacotes_ocultos: novaLista });
  }

  function ao_adicionar_pacote_customizado() {
    const pacoteLimpo = novoPacote.trim().toLowerCase();
    if (!pacoteLimpo) return;

    if (politica.pacotes_ocultos.includes(pacoteLimpo)) {
      alert('Este pacote já está na lista de bloqueados.');
      return;
    }

    setPolitica({
      ...politica,
      pacotes_ocultos: [...politica.pacotes_ocultos, pacoteLimpo],
    });
    setNovoPacote('');
  }

  function ao_remover_pacote(pacote: string) {
    setPolitica({
      ...politica,
      pacotes_ocultos: politica.pacotes_ocultos.filter((p) => p !== pacote),
    });
  }

  function ao_adicionar_url_permitida() {
    const urlLimpa = novaUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!urlLimpa) return;

    if (politica.urls_permitidas.includes(urlLimpa)) {
      alert('Este domínio já está na lista branca.');
      return;
    }

    setPolitica({
      ...politica,
      urls_permitidas: [...politica.urls_permitidas, urlLimpa],
    });
    setNovaUrl('');
  }

  function ao_remover_url_permitida(url: string) {
    setPolitica({
      ...politica,
      urls_permitidas: politica.urls_permitidas.filter((u) => u !== url),
    });
  }

  async function ao_salvar_politicas() {
    setSalvando(true);
    setMensagemSucesso('');

    try {
      if (dispositivoAlvo === 'todos') {
        const resp = await salvar_politicas_frota_api(politica);
        setMensagemSucesso(`✓ ${resp.mensagem}`);
      } else {
        const resp = await salvar_politicas_dispositivo_api(dispositivoAlvo, politica);
        setMensagemSucesso(`✓ ${resp.mensagem}`);
      }

      setTimeout(() => {
        setMensagemSucesso('');
      }, 3500);
    } catch (erro) {
      alert('Falha ao salvar e despachar políticas.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho da Página */}
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Políticas de Acesso e Restrições</h2>
          <p className="pagina-subtitulo">
            Controle granular de aplicativos nativos indesejados e lista branca de navegação corporativa no Google Chrome
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-secundario" onClick={carregar_politicas_sistema} title="Recarregar">
            <RefreshCw size={14} />
            Atualizar
          </button>
          <button className="btn btn-primario" onClick={ao_salvar_politicas} disabled={salvando}>
            <Save size={15} />
            {salvando ? 'Aplicando na Frota...' : 'Salvar e Aplicar Políticas'}
          </button>
        </div>
      </div>

      {mensagemSucesso && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {mensagemSucesso}
        </div>
      )}

      {/* Seleção de Escopo de Aplicação */}
      <div className="card-metrica" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Escopo de Aplicação das Diretrizes:</div>
            <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
              Aplique as restrições a todos os 250 tablets de uma vez ou selecione um aparelho específico
            </div>
          </div>

          <div style={{ minWidth: '320px' }}>
            <select
              value={dispositivoAlvo}
              onChange={(e) => setDispositivoAlvo(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: 'white',
                fontSize: '13px',
              }}
            >
              <option value="todos">🌐 Toda a Frota Conectada (250 Tablets)</option>
              {dispositivos.map((d) => (
                <option key={d.id} value={d.id}>
                  📱 {d.modelo} — SN: {d.numero_serie}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid com as duas seções principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* SEÇÃO 1: APPS NATIVOS BLOQUEADOS */}
        <div className="card-tabela" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <AppWindow size={22} color="var(--primaria)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Controle de Aplicativos Nativos</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--texto-secundario)', marginBottom: '20px' }}>
            Utiliza <code>DevicePolicyManager.setApplicationHidden()</code> para desativar e fazer sumir da tela os apps nativos indesejados.
          </p>

          {/* Toggles Rápidos de Apps Comuns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {aplicativosComuns.map((app) => {
              const estaOculto = politica.pacotes_ocultos.includes(app.pacote);
              return (
                <div
                  key={app.pacote}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: estaOculto ? 'rgba(239, 68, 68, 0.08)' : 'var(--fundo-elevado)',
                    border: `1px solid ${estaOculto ? 'rgba(239, 68, 68, 0.3)' : 'var(--borda-suave)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{app.icone}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{app.nome}</div>
                      <div className="texto-mono" style={{ fontSize: '11px', color: 'var(--texto-fraco)' }}>
                        {app.pacote}
                      </div>
                    </div>
                  </div>

                  <button
                    className={`btn ${estaOculto ? 'btn-perigo' : 'btn-secundario'}`}
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => ao_alternar_bloqueio_app(app.pacote)}
                  >
                    {estaOculto ? <Lock size={12} /> : <Unlock size={12} />}
                    {estaOculto ? 'Bloqueado (Oculto)' : 'Liberado'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Campo para bloquear pacote customizado */}
          <div style={{ borderTop: '1px solid var(--borda-suave)', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--texto-secundario)', marginBottom: '8px' }}>
              Bloquear Outro Aplicativo pelo Nome do Pacote:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={novoPacote}
                onChange={(e) => setNovoPacote(e.target.value)}
                placeholder="ex: com.whatsapp ou com.netflix.mediaclient"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                  fontFamily: 'var(--fonte-mono)',
                }}
              />
              <button className="btn btn-secundario" onClick={ao_adicionar_pacote_customizado}>
                <Plus size={14} />
                Bloquear
              </button>
            </div>
            
            {/* Lista de pacotes customizados bloqueados */}
            {politica.pacotes_ocultos.filter(p => !aplicativosComuns.map(a => a.pacote).includes(p)).length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--texto-secundario)', marginBottom: '8px' }}>
                  Outros Aplicativos Bloqueados:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {politica.pacotes_ocultos
                    .filter(p => !aplicativosComuns.map(a => a.pacote).includes(p))
                    .map(pacote => (
                      <div
                        key={pacote}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lock size={14} color="#f87171" />
                          <span className="texto-mono" style={{ fontSize: '13px', color: '#fff' }}>{pacote}</span>
                        </div>
                        <button
                          onClick={() => ao_remover_pacote(pacote)}
                          style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                          title="Liberar aplicativo"
                        >
                          <Unlock size={14} />
                          Liberar
                        </button>
                      </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 2: RESTRIÇÃO DE NAVEGAÇÃO WEB (GOOGLE CHROME) */}
        <div className="card-tabela" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Globe size={22} color="var(--sucesso)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Restrição de Navegação Web (Chrome)</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
            Configura políticas de restrição do Google Chrome Enterprise:
            bloqueio de toda a internet (<code>URLBlocklist: ["*"]</code>) liberando estritamente a lista branca.
          </p>

          <div
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#93c5fd',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={16} color="#60a5fa" />
            <span>Navegação Anônima no Chrome: <strong>DESATIVADA AUTOMATICAMENTE</strong></span>
          </div>

          {/* Adicionar URL na lista branca */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--texto-secundario)', marginBottom: '8px' }}>
              Adicionar Domínio à Lista Branca (URLAllowlist):
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={novaUrl}
                onChange={(e) => setNovaUrl(e.target.value)}
                placeholder="ex: portal.empresa.com.br ou *.google.com"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
              <button className="btn btn-primario" onClick={ao_adicionar_url_permitida}>
                <Plus size={14} />
                Liberar URL
              </button>
            </div>
          </div>

          {/* Lista de Domínios Permitidos */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--texto-secundario)', marginBottom: '10px' }}>
              Domínios Corporativos Autorizados ({politica.urls_permitidas.length}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {politica.urls_permitidas.map((url) => (
                <div
                  key={url}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--fundo-elevado)',
                    border: '1px solid var(--borda-suave)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={14} color="#34d399" />
                    <span className="texto-mono" style={{ fontSize: '13px', color: '#fff' }}>{url}</span>
                  </div>

                  <button
                    onClick={() => ao_remover_url_permitida(url)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                    title="Remover domínio"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: RESTRIÇÕES GERAIS DE HARDWARE */}
      <div className="card-tabela" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
          Diretrizes Gerais de Hardware e Segurança
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Bloqueio de USB */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'var(--fundo-elevado)',
              border: '1px solid var(--borda-suave)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>Bloquear Transferência USB</div>
              <div style={{ fontSize: '12px', color: 'var(--texto-fraco)' }}>Impede cópia de arquivos via cabo USB</div>
            </div>
            <button
              className={`btn ${politica.bloquear_usb ? 'btn-primario' : 'btn-secundario'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setPolitica({ ...politica, bloquear_usb: !politica.bloquear_usb })}
            >
              {politica.bloquear_usb ? 'Ativado' : 'Desativado'}
            </button>
          </div>

          {/* Bloqueio de Restauração de Fábrica (FRP) */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'var(--fundo-elevado)',
              border: '1px solid var(--borda-suave)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>Bloqueio de Reset de Fábrica</div>
              <div style={{ fontSize: '12px', color: 'var(--texto-fraco)' }}>Proíbe formatação nas configurações</div>
            </div>
            <button
              className={`btn ${!politica.permitir_reset_fabrica ? 'btn-primario' : 'btn-secundario'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setPolitica({ ...politica, permitir_reset_fabrica: !politica.permitir_reset_fabrica })}
            >
              {!politica.permitir_reset_fabrica ? 'Protegido (Ativado)' : 'Liberado'}
            </button>
          </div>

          {/* Permissão de Câmera */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'var(--fundo-elevado)',
              border: '1px solid var(--borda-suave)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>Permitir Câmeras de Hardware</div>
              <div style={{ fontSize: '12px', color: 'var(--texto-fraco)' }}>Habilitar ou desabilitar sensores físicos</div>
            </div>
            <button
              className={`btn ${politica.permitir_camera ? 'btn-primario' : 'btn-perigo'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setPolitica({ ...politica, permitir_camera: !politica.permitir_camera })}
            >
              {politica.permitir_camera ? 'Liberadas' : 'Bloqueadas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
