import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  Package,
  Bluetooth,
  Search,
  CheckCheck,
  RotateCcw,
  Smartphone,
  Info,
  Layers,
  Sparkles,
  Send,
  Edit3,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  obter_politicas_api,
  obter_politicas_dispositivo_api,
  salvar_politicas_frota_api,
  salvar_politicas_dispositivo_api,
  listar_perfis_api,
  aplicar_perfil_api,
  remover_perfil_api,
  DadosPolitica,
  DispositivoItem,
  PerfilProvisionamentoItem,
} from '../servicos/api_mdm';
import { ModalSalvarPerfil } from '../componentes/ModalSalvarPerfil';
import { ModalEditarPerfil } from '../componentes/ModalEditarPerfil';

interface PropriedadesPaginaPoliticas {
  dispositivos: DispositivoItem[];
}

export interface AppBloqueavel {
  nome: string;
  pacote: string;
  descricao: string;
  icone: string;
  categoria: 'Streaming & Vídeo' | 'Redes Sociais' | 'Lojas & Jogos' | 'Google Utilitários' | 'Fabricante TCL';
}

// Catálogo completo dos 26 aplicativos recreativos e bloatware de fábrica do Perfil Estrito ACS
export const CATALOGO_BLOATWARE_ACS: AppBloqueavel[] = [
  // Streaming & Vídeo
  {
    nome: 'YouTube',
    pacote: 'com.google.android.youtube',
    descricao: 'Vídeos e streaming de entretenimento',
    icone: '📺',
    categoria: 'Streaming & Vídeo',
  },
  {
    nome: 'YouTube Music',
    pacote: 'com.google.android.apps.youtube.music',
    descricao: 'Streaming de músicas do YouTube',
    icone: '🎧',
    categoria: 'Streaming & Vídeo',
  },
  {
    nome: 'Netflix',
    pacote: 'com.netflix.mediaclient',
    descricao: 'Filmes e séries de entretenimento',
    icone: '🍿',
    categoria: 'Streaming & Vídeo',
  },
  {
    nome: 'Google TV / Filmes',
    pacote: 'com.google.android.videos',
    descricao: 'Filmes e programas recreativos da Google Play',
    icone: '🎬',
    categoria: 'Streaming & Vídeo',
  },
  {
    nome: 'Google Podcasts',
    pacote: 'com.google.android.apps.podcasts',
    descricao: 'Áudios e podcasts do Google',
    icone: '🎙️',
    categoria: 'Streaming & Vídeo',
  },

  // Redes Sociais e Mensagens Pessoais
  {
    nome: 'Facebook',
    pacote: 'com.facebook.katana',
    descricao: 'Aplicativo oficial da rede social Facebook',
    icone: '👥',
    categoria: 'Redes Sociais',
  },
  {
    nome: 'Instagram',
    pacote: 'com.instagram.android',
    descricao: 'Rede social de fotos e vídeos curtos',
    icone: '📸',
    categoria: 'Redes Sociais',
  },
  {
    nome: 'TikTok',
    pacote: 'com.zhiliaoapp.musically',
    descricao: 'Plataforma de vídeos recreativos do TikTok',
    icone: '🎵',
    categoria: 'Redes Sociais',
  },
  {
    nome: 'Google Meet / Duo',
    pacote: 'com.google.android.apps.tachyon',
    descricao: 'Chamadas de vídeo pessoais do Google',
    icone: '📹',
    categoria: 'Redes Sociais',
  },
  {
    nome: 'Gmail Pessoal',
    pacote: 'com.google.android.gm',
    descricao: 'Cliente de e-mail do Google',
    icone: '✉️',
    categoria: 'Redes Sociais',
  },

  // Lojas & Jogos
  {
    nome: 'Google Play Store',
    pacote: 'com.android.vending',
    descricao: 'Loja oficial de aplicativos, jogos e compras',
    icone: '🛍️',
    categoria: 'Lojas & Jogos',
  },
  {
    nome: 'Google Play Jogos',
    pacote: 'com.google.android.play.games',
    descricao: 'Serviço de perfil e conquistas de jogos',
    icone: '🎮',
    categoria: 'Lojas & Jogos',
  },
  {
    nome: 'TCL App Store',
    pacote: 'com.tcl.appstore',
    descricao: 'Loja alternativa de apps embutida da TCL',
    icone: '🛒',
    categoria: 'Lojas & Jogos',
  },
  {
    nome: 'TCL Game Center',
    pacote: 'com.tcl.gamecenter',
    descricao: 'Central e catálogo de jogos da fabricante TCL',
    icone: '🕹️',
    categoria: 'Lojas & Jogos',
  },

  // Google Utilitários e Feed
  {
    nome: 'Galeria / Google Fotos',
    pacote: 'com.google.android.apps.photos',
    descricao: 'Visualizador e backup de mídias pessoais',
    icone: '🖼️',
    categoria: 'Google Utilitários',
  },
  {
    nome: 'Google Drive / Docs',
    pacote: 'com.google.android.apps.docs',
    descricao: 'Documentos e planilhas pessoais do Google',
    icone: '📄',
    categoria: 'Google Utilitários',
  },
  {
    nome: 'Pesquisa Google & Feed',
    pacote: 'com.google.android.googlequicksearchbox',
    descricao: 'Barra de pesquisa e feed Discover do Google',
    icone: '🔍',
    categoria: 'Google Utilitários',
  },
  {
    nome: 'Google Notícias',
    pacote: 'com.google.android.apps.magazines',
    descricao: 'Feed de notícias, revistas e artigos recreativos',
    icone: '📰',
    categoria: 'Google Utilitários',
  },
  {
    nome: 'Feedback Google',
    pacote: 'com.google.android.feedback',
    descricao: 'Envio de telemetria de feedback do usuário',
    icone: '💬',
    categoria: 'Google Utilitários',
  },

  // Fabricante TCL & Serviços Nativos
  {
    nome: 'TCL Live / TV',
    pacote: 'com.tcl.live',
    descricao: 'Canais de streaming ao vivo embutidos da TCL',
    icone: '📺',
    categoria: 'Fabricante TCL',
  },
  {
    nome: 'Navegador TCL',
    pacote: 'com.tcl.browser',
    descricao: 'Navegador web alternativo não restrito da TCL',
    icone: '🌐',
    categoria: 'Fabricante TCL',
  },
  {
    nome: 'TCL Community',
    pacote: 'com.tcl.community',
    descricao: 'Fórum comunitário e novidades da fabricante',
    icone: '💬',
    categoria: 'Fabricante TCL',
  },
  {
    nome: 'TCL User Center',
    pacote: 'com.tcl.usercenter',
    descricao: 'Central de conta e serviços da TCL',
    icone: '👤',
    categoria: 'Fabricante TCL',
  },
  {
    nome: 'TCL Smart Switch',
    pacote: 'com.tcl.smartswitch',
    descricao: 'Transferência de dados e cópia entre aparelhos',
    icone: '🔄',
    categoria: 'Fabricante TCL',
  },
  {
    nome: 'Facebook Services',
    pacote: 'com.facebook.services',
    descricao: 'Serviço de segundo plano embutido do Facebook',
    icone: '⚙️',
    categoria: 'Fabricante TCL',
  },
  {
    nome: 'Facebook System',
    pacote: 'com.facebook.system',
    descricao: 'Instalador de atualizações nativas do Facebook',
    icone: '⚙️',
    categoria: 'Fabricante TCL',
  },
];

const CHAVE_STORAGE_PERFIL_ATIVO = 'mdm_perfil_ativo_frota_id';

export const PaginaPoliticas: React.FC<PropriedadesPaginaPoliticas> = ({ dispositivos }) => {
  const [politica, setPolitica] = useState<DadosPolitica>({
    permitir_camera: true,
    bloquear_usb: true,
    permitir_reset_fabrica: false,
    bloquear_instalacao_apps: true,
    bloquear_bluetooth: false,
    habilitar_modo_quiosque: false,
    pacotes_ocultos: CATALOGO_BLOATWARE_ACS.map((a) => a.pacote),
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

  // Perfis de Provisionamento
  const [perfis, setPerfis] = useState<PerfilProvisionamentoItem[]>([]);
  const [perfilAtivoId, setPerfilAtivoId] = useState<string>('');
  const [perfilParaEditar, setPerfilParaEditar] = useState<PerfilProvisionamentoItem | null>(null);
  const [modalSalvarVisivel, setModalSalvarVisivel] = useState<boolean>(false);
  const [modalEditarVisivel, setModalEditarVisivel] = useState<boolean>(false);
  const [aplicandoId, setAplicandoId] = useState<string | null>(null);

  // Filtros de busca no catálogo de apps
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');

  const PACOTES_VITAIS_IMUNES = [
    'com.android.settings',
    'com.android.systemui',
    'android',
    'com.android.launcher',
    'com.android.launcher3',
    'com.tcl.launcher',
    'com.sec.android.app.launcher',
    'com.google.android.apps.nexuslauncher',
    'com.android.packageinstaller',
    'com.google.android.packageinstaller',
    'com.android.permissioncontroller',
    'com.google.android.permissioncontroller',
    'com.android.inputmethod.latin',
    'com.google.android.inputmethod.latin',
    'com.google.android.webview',
    'com.android.webview',
    'com.android.providers.media',
    'com.android.providers.media.module',
    'com.android.providers.settings',
    'com.android.documentsui',
    'com.mdm.corporativo',
    'com.google.android.gms',
  ];

  async function carregarDados() {
    setCarregando(true);
    try {
      const [resPerfis, resPolitica] = await Promise.all([
        listar_perfis_api(),
        obter_politicas_api(),
      ]);

      if (resPerfis.perfis && resPerfis.perfis.length > 0) {
        setPerfis(resPerfis.perfis);
        // Resgata o perfil ativo salvo no navegador ou pega o primeiro padrão
        const salvo = localStorage.getItem(CHAVE_STORAGE_PERFIL_ATIVO);
        const ativoValido = resPerfis.perfis.find((p) => p.id === salvo);
        if (ativoValido) {
          setPerfilAtivoId(ativoValido.id);
        } else {
          const padrao = resPerfis.perfis.find((p) => p.eh_padrao) || resPerfis.perfis[0];
          setPerfilAtivoId(padrao.id);
          localStorage.setItem(CHAVE_STORAGE_PERFIL_ATIVO, padrao.id);
        }
      }

      if (resPolitica.politica) {
        setPolitica({
          ...resPolitica.politica,
          bloquear_instalacao_apps: resPolitica.politica.bloquear_instalacao_apps ?? true,
          bloquear_bluetooth: resPolitica.politica.bloquear_bluetooth ?? false,
          pacotes_ocultos: resPolitica.politica.pacotes_ocultos || [],
          urls_permitidas: resPolitica.politica.urls_permitidas || [],
        });
      }
    } catch (e) {
      console.error('Erro ao sincronizar perfis e políticas:', e);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const perfilAtivoAtual = useMemo(() => {
    return perfis.find((p) => p.id === perfilAtivoId) || perfis[0] || null;
  }, [perfis, perfilAtivoId]);

  async function aoAplicarPerfilNaFrota(perfil: PerfilProvisionamentoItem) {
    if (
      !confirm(
        `Deseja realmente definir o perfil "${perfil.nome}" como ATIVO e aplicar imediatamente em toda a frota e nos futuros tablets provisionados via QR Code?`
      )
    ) {
      return;
    }

    setAplicandoId(perfil.id);
    try {
      const resp = await aplicar_perfil_api(perfil.id, 'todos');
      setPerfilAtivoId(perfil.id);
      localStorage.setItem(CHAVE_STORAGE_PERFIL_ATIVO, perfil.id);

      // Atualiza o estado da política com as diretrizes do perfil aplicado
      setPolitica({
        permitir_camera: perfil.permitir_camera,
        bloquear_usb: perfil.bloquear_usb,
        permitir_reset_fabrica: perfil.permitir_reset_fabrica,
        bloquear_instalacao_apps: perfil.bloquear_instalacao_apps,
        bloquear_bluetooth: perfil.bloquear_bluetooth,
        habilitar_modo_quiosque: perfil.habilitar_modo_quiosque ?? false,
        modo_quiosque_app: perfil.modo_quiosque_app || '',
        pacotes_ocultos: perfil.pacotes_ocultos || [],
        urls_permitidas: perfil.urls_permitidas || [],
      });

      setMensagemSucesso(`✓ ${resp.mensagem}`);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err: any) {
      alert(`Falha ao aplicar perfil na frota: ${err.message || 'Erro de comunicação.'}`);
    } finally {
      setAplicandoId(null);
    }
  }

  function aoAbrirEdicaoPerfil(perfil: PerfilProvisionamentoItem) {
    setPerfilParaEditar(perfil);
    setModalEditarVisivel(true);
  }

  async function aoExcluirPerfil(perfil: PerfilProvisionamentoItem) {
    if (perfil.eh_padrao) {
      alert('Perfis padrão de fábrica do sistema não podem ser excluídos.');
      return;
    }
    if (!confirm(`Deseja remover permanentemente o perfil "${perfil.nome}"?`)) {
      return;
    }

    try {
      await remover_perfil_api(perfil.id);
      setMensagemSucesso(`✓ Perfil "${perfil.nome}" excluído com sucesso.`);
      setTimeout(() => setMensagemSucesso(''), 4000);
      carregarDados();
    } catch (e: any) {
      alert(`Erro ao excluir perfil: ${e.message}`);
    }
  }

  function aoAlternarBloqueioApp(pacote: string) {
    if (PACOTES_VITAIS_IMUNES.includes(pacote)) {
      alert('⚠️ AÇÃO BLOQUEADA POR SEGURANÇA: Este é um pacote vital do sistema Android e não pode ser suspenso.');
      return;
    }

    const jaOculto = politica.pacotes_ocultos.includes(pacote);
    const novaLista = jaOculto
      ? politica.pacotes_ocultos.filter((p) => p !== pacote)
      : [...politica.pacotes_ocultos, pacote];

    setPolitica({ ...politica, pacotes_ocultos: novaLista });
  }

  function aoBloquearTodosCatalogo() {
    const pacotes = CATALOGO_BLOATWARE_ACS.map((a) => a.pacote);
    const extras = politica.pacotes_ocultos.filter(
      (p) => !CATALOGO_BLOATWARE_ACS.some((a) => a.pacote === p)
    );
    setPolitica({
      ...politica,
      pacotes_ocultos: Array.from(new Set([...pacotes, ...extras])),
    });
  }

  function aoLiberarTodosCatalogo() {
    const pacotesSet = new Set(CATALOGO_BLOATWARE_ACS.map((a) => a.pacote));
    setPolitica({
      ...politica,
      pacotes_ocultos: politica.pacotes_ocultos.filter((p) => !pacotesSet.has(p)),
    });
  }

  function aoAdicionarUrl() {
    const limpa = novaUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!limpa) return;
    if (politica.urls_permitidas.includes(limpa)) {
      alert('Este domínio já consta na lista branca.');
      return;
    }
    setPolitica({ ...politica, urls_permitidas: [...politica.urls_permitidas, limpa] });
    setNovaUrl('');
  }

  function aoRemoverUrl(url: string) {
    setPolitica({
      ...politica,
      urls_permitidas: politica.urls_permitidas.filter((u) => u !== url),
    });
  }

  async function aoSalvarPoliticasGerais() {
    setSalvando(true);
    setMensagemSucesso('');
    try {
      const resp = await salvar_politicas_frota_api(politica);
      setMensagemSucesso(`✓ ${resp.mensagem}`);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (e) {
      alert('Falha ao despachar políticas para a frota.');
    } finally {
      setSalvando(false);
    }
  }

  const appsFiltrados = useMemo(() => {
    return CATALOGO_BLOATWARE_ACS.filter((app) => {
      const matchBusca =
        app.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
        app.pacote.toLowerCase().includes(termoBusca.toLowerCase()) ||
        app.descricao.toLowerCase().includes(termoBusca.toLowerCase());

      const matchCategoria =
        categoriaAtiva === 'todas' || app.categoria === categoriaAtiva;

      return matchBusca && matchCategoria;
    });
  }, [termoBusca, categoriaAtiva]);

  const totalBloqueadosCatalogo = CATALOGO_BLOATWARE_ACS.filter((a) =>
    politica.pacotes_ocultos.includes(a.pacote)
  ).length;

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho da Página */}
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Políticas de Provisionamento e Segurança</h2>
          <p className="pagina-subtitulo">
            Controle visual e transparente: veja exatamente qual perfil está ativo na frota, edite perfis e gerencie restrições com 1 clique
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-secundario" onClick={carregarDados} disabled={carregando}>
            <RefreshCw size={14} className={carregando ? 'anim-spin' : ''} />
            Atualizar
          </button>
          <button className="btn btn-secundario" onClick={() => setModalSalvarVisivel(true)}>
            <Plus size={14} />
            Novo Perfil
          </button>
          <button className="btn btn-primario" onClick={aoSalvarPoliticasGerais} disabled={salvando}>
            <Save size={15} />
            {salvando ? 'Propagando...' : 'Salvar Alterações na Frota'}
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
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle size={18} />
          {mensagemSucesso}
        </div>
      )}

      {/* BANNER PRINCIPAL: PERFIL ATUALMENTE IMPLANTADO NA FROTA */}
      {perfilAtivoAtual && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                    }}
                  >
                    ★ ATIVO NA HORA DO PROVISIONAMENTO
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Aplicado nos 250 Tablets da Frota
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 2px 0', fontSize: '19px', fontWeight: 800, color: '#fff' }}>
                  {perfilAtivoAtual.nome}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                  {perfilAtivoAtual.descricao || 'Template corporativo padrão para atuação dos Agentes de Campo.'}
                </p>
              </div>
            </div>

            <button
              className="btn btn-primario"
              onClick={() => aoAbrirEdicaoPerfil(perfilAtivoAtual)}
              style={{
                fontSize: '12.5px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0284c7',
                borderColor: '#0369a1',
              }}
            >
              <Edit3 size={14} />
              Editar Este Perfil Ativo
            </button>
          </div>

          {/* Resumo das Diretrizes em Vigor */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Diretrizes Aplicadas:</span>
            <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 600 }}>
              🔒 {(perfilAtivoAtual.pacotes_ocultos || []).length} Apps Bloqueados
            </span>
            <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
              🛡️ USB Bloqueado: {perfilAtivoAtual.bloquear_usb ? 'SIM (Apenas carga)' : 'NÃO'}
            </span>
            <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontWeight: 600 }}>
              📶 Bluetooth Bloqueado: {perfilAtivoAtual.bloquear_bluetooth ? 'SIM' : 'NÃO'}
            </span>
            <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
              🌐 {(perfilAtivoAtual.urls_permitidas || []).length} URLs Liberadas no Chrome
            </span>
            <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600 }}>
              ⛔ Bloqueio de APKs: {perfilAtivoAtual.bloquear_instalacao_apps ? 'ATIVO' : 'DESATIVADO'}
            </span>
          </div>
        </div>
      )}

      {/* SEÇÃO 1: GRADE DE PERFIS DE PROVISIONAMENTO SALVOS (CRUD COMPLETO) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              Templates & Perfis de Provisionamento Salvos ({perfis.length})
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--texto-secundario)' }}>
              Selecione qual perfil deseja aplicar na frota ou edite diretamente as restrições de cada modelo
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {perfis.map((p) => {
            const ehAtivo = p.id === perfilAtivoId;
            const aplicandoEste = aplicandoId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  background: ehAtivo ? 'rgba(14, 165, 233, 0.08)' : 'var(--fundo-card)',
                  border: ehAtivo ? '2px solid #0284c7' : '1px solid var(--borda-suave)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: ehAtivo ? '0 0 20px rgba(2, 132, 199, 0.2)' : 'none',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '15px', color: '#fff' }}>{p.nome}</strong>
                    </div>
                    {ehAtivo ? (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        ✓ ATIVO NA FROTA
                      </span>
                    ) : (
                      p.eh_padrao && (
                        <span style={{ fontSize: '10.5px', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          Padrão de Fábrica
                        </span>
                      )
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', margin: '0 0 14px 0', minHeight: '34px', lineHeight: 1.4 }}>
                    {p.descricao || 'Sem descrição cadastrada.'}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171' }}>
                      {(p.pacotes_ocultos || []).length} Apps Bloqueados
                    </span>
                    <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
                      USB: {p.bloquear_usb ? 'Bloqueado' : 'Liberado'}
                    </span>
                    <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }}>
                      Bluetooth: {p.bloquear_bluetooth ? 'Bloqueado' : 'Liberado'}
                    </span>
                    <span style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
                      {(p.urls_permitidas || []).length} URLs Liberadas
                    </span>
                  </div>
                </div>

                {/* Botões de Ação do Perfil */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--borda-suave)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secundario"
                      onClick={() => aoAbrirEdicaoPerfil(p)}
                      style={{ fontSize: '11.5px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Editar regras deste perfil"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    {!p.eh_padrao && (
                      <button
                        className="btn btn-perigo"
                        onClick={() => aoExcluirPerfil(p)}
                        style={{ fontSize: '11.5px', padding: '6px 10px' }}
                        title="Excluir este perfil"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {!ehAtivo ? (
                    <button
                      className="btn btn-primario"
                      onClick={() => aoAplicarPerfilNaFrota(p)}
                      disabled={aplicandoEste}
                      style={{ fontSize: '11.5px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CheckCircle size={13} />
                      {aplicandoEste ? 'Aplicando...' : 'Aplicar na Frota'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Em Operação
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: DIRETRIZES DE HARDWARE E NAVEGAÇÃO WEB */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Diretrizes de Hardware */}
        <div className="card-tabela" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} color="#60a5fa" /> Controles de Hardware e Integridade
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#fff' }}>Bloquear Transferência USB (MTP)</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Permite recarregar sem expor arquivos internos</p>
              </div>
              <input
                type="checkbox"
                checked={politica.bloquear_usb}
                onChange={(e) => setPolitica({ ...politica, bloquear_usb: e.target.checked })}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#fff' }}>Bloquear Conexão Bluetooth</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Impede pareamento não autorizado com outros aparelhos</p>
              </div>
              <input
                type="checkbox"
                checked={politica.bloquear_bluetooth}
                onChange={(e) => setPolitica({ ...politica, bloquear_bluetooth: e.target.checked })}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#fff' }}>Bloquear Instalação de APKs Externos</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Garante que apenas o MDM instale novos softwares</p>
              </div>
              <input
                type="checkbox"
                checked={politica.bloquear_instalacao_apps}
                onChange={(e) => setPolitica({ ...politica, bloquear_instalacao_apps: e.target.checked })}
              />
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#fff' }}>Permitir Câmera Traseira / Frontal</strong>
                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>Necessária para leitura de cartões e QR Codes de saúde</p>
              </div>
              <input
                type="checkbox"
                checked={politica.permitir_camera}
                onChange={(e) => setPolitica({ ...politica, permitir_camera: e.target.checked })}
              />
            </label>
          </div>
        </div>

        {/* Lista Branca do Chrome Enterprise */}
        <div className="card-tabela" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} color="#34d399" /> Lista Branca de Navegação Web (Chrome Enterprise)
          </h4>

          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#94a3b8' }}>
            Apenas os domínios abaixo são autorizados. Toda a navegação restante na internet é bloqueada nativamente.
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="Ex: conectesus.saude.gov.br ou *.saude.gov.br"
              value={novaUrl}
              onChange={(e) => setNovaUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), aoAdicionarUrl())}
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
            <button className="btn btn-secundario" onClick={aoAdicionarUrl} style={{ fontSize: '12px', padding: '6px 14px' }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {politica.urls_permitidas.map((u) => (
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
                  onClick={() => aoRemoverUrl(u)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  title="Remover domínio"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: CATÁLOGO DE BLOATWARE E APPS BLOQUEADOS */}
      <div className="card-tabela" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={17} color="#f87171" />
              Catálogo de Aplicativos de Fábrica Bloqueáveis ({totalBloqueadosCatalogo} de {CATALOGO_BLOATWARE_ACS.length} Bloqueados)
            </h4>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Apps suspensos e ocultados da gaveta do tablet sem risco de perda de arquivos
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-secundario" onClick={aoBloquearTodosCatalogo} style={{ fontSize: '11.5px', padding: '6px 12px' }}>
              <CheckCheck size={13} /> Bloquear Todos (26)
            </button>
            <button className="btn btn-secundario" onClick={aoLiberarTodosCatalogo} style={{ fontSize: '11.5px', padding: '6px 12px' }}>
              <RotateCcw size={13} /> Liberar Todos
            </button>
          </div>
        </div>

        {/* Busca e Filtro de Categoria */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por nome ou pacote..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                borderRadius: '6px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: '#fff',
                fontSize: '12px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['todas', 'Streaming & Vídeo', 'Redes Sociais', 'Lojas & Jogos', 'Google Utilitários', 'Fabricante TCL'].map((cat) => (
              <button
                key={cat}
                className={`filtro-chip ${categoriaAtiva === cat ? 'ativo' : ''}`}
                onClick={() => setCategoriaAtiva(cat)}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                {cat === 'todas' ? 'Todas as Categorias' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grade dos Aplicativos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {appsFiltrados.map((app) => {
            const bloqueado = politica.pacotes_ocultos.includes(app.pacote);
            return (
              <div
                key={app.pacote}
                onClick={() => aoAlternarBloqueioApp(app.pacote)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: bloqueado ? 'rgba(239, 68, 68, 0.08)' : 'var(--fundo-base)',
                  border: bloqueado ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--borda-suave)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '22px' }}>{app.icone}</span>
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
                    fontSize: '10.5px',
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

      {/* Modal para Salvar Novo Perfil */}
      <ModalSalvarPerfil
        visivel={modalSalvarVisivel}
        politicaAtual={politica}
        aoFechar={() => setModalSalvarVisivel(false)}
        aoSalvarSucesso={(novo: PerfilProvisionamentoItem) => {
          setPerfis([novo, ...perfis]);
          setMensagemSucesso(`✓ Perfil "${novo.nome}" cadastrado com sucesso!`);
          setTimeout(() => setMensagemSucesso(''), 4000);
        }}
      />

      {/* Modal Dedicado para Editar Perfil Existente */}
      <ModalEditarPerfil
        visivel={modalEditarVisivel}
        perfil={perfilParaEditar}
        aoFechar={() => {
          setModalEditarVisivel(false);
          setPerfilParaEditar(null);
        }}
        aoSucesso={(msg) => {
          setMensagemSucesso(msg);
          setTimeout(() => setMensagemSucesso(''), 5000);
          carregarDados();
        }}
      />
    </div>
  );
};
