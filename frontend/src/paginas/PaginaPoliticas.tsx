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
  Filter,
  CheckCheck,
  RotateCcw,
  Smartphone,
  Info,
} from 'lucide-react';
import {
  obter_politicas_api,
  obter_politicas_dispositivo_api,
  salvar_politicas_frota_api,
  salvar_politicas_dispositivo_api,
  DadosPolitica,
  DispositivoItem,
} from '../servicos/api_mdm';

interface PropriedadesPaginaPoliticas {
  dispositivos: DispositivoItem[];
}

interface AppBloqueavel {
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
  const [dispositivoAlvo, setDispositivoAlvo] = useState<string>('todos');

  // Filtros de busca e categoria no catálogo de apps
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');

  // Lista de pacotes vitais do sistema que JAMAIS podem ser bloqueados ou suspensos
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

  // Aplicativos de Trabalho Oficiais (100% Protegidos e Liberados)
  const APLICATIVOS_AUTORIZADOS_ACS = [
    { nome: 'Google Chrome', pacote: 'com.android.chrome', desc: 'Navegador oficial com lista branca', icone: '🌐' },
    { nome: 'e-SUS Território', pacote: 'br.gov.saude.esus.territorio', desc: 'Prontuário eletrônico e visitas ACS', icone: '🩺' },
    { nome: 'WhatsApp', pacote: 'com.whatsapp', desc: 'Comunicação oficial ACS e equipe', icone: '💬' },
    { nome: 'Relógio e Alarme', pacote: 'com.google.android.deskclock', desc: 'Despertador e rotina de trabalho', icone: '⏰' },
    { nome: 'Agenda / Calendário', pacote: 'com.google.android.calendar', desc: 'Agendamento de visitas domiciliares', icone: '📅' },
    { nome: 'MDM Corporativo', pacote: 'com.mdm.corporativo', desc: 'Agente de gestão e telemetria', icone: '🛡️' },
  ];

  useEffect(() => {
    if (dispositivoAlvo === 'todos') {
      carregar_politicas_sistema();
    } else {
      carregar_politicas_dispositivo(dispositivoAlvo);
    }
  }, [dispositivoAlvo]);

  async function carregar_politicas_dispositivo(id: string) {
    setCarregando(true);
    try {
      const resp = await obter_politicas_dispositivo_api(id);
      if (resp.politica) {
        const pacotesSeguros = (resp.politica.pacotes_ocultos || []).filter(
          (p: string) => !PACOTES_VITAIS_IMUNES.includes(p) && !p.startsWith('com.android.providers.')
        );
        setPolitica({
          ...resp.politica,
          bloquear_instalacao_apps: resp.politica.bloquear_instalacao_apps ?? true,
          bloquear_bluetooth: resp.politica.bloquear_bluetooth ?? false,
          pacotes_ocultos: pacotesSeguros,
          urls_permitidas: resp.politica.urls_permitidas || [],
        });
      }
    } catch (erro) {
      console.error('Erro ao carregar diretrizes específicas do dispositivo:', erro);
    } finally {
      setCarregando(false);
    }
  }

  async function carregar_politicas_sistema() {
    setCarregando(true);
    try {
      const resp = await obter_politicas_api();
      if (resp.politica) {
        const pacotesSeguros = (resp.politica.pacotes_ocultos || []).filter(
          (p: string) => !PACOTES_VITAIS_IMUNES.includes(p) && !p.startsWith('com.android.providers.')
        );
        setPolitica({
          ...resp.politica,
          bloquear_instalacao_apps: resp.politica.bloquear_instalacao_apps ?? true,
          bloquear_bluetooth: resp.politica.bloquear_bluetooth ?? false,
          pacotes_ocultos: pacotesSeguros,
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
    if (PACOTES_VITAIS_IMUNES.includes(pacote)) {
      alert('⚠️ AÇÃO BLOQUEADA POR SEGURANÇA: Este é um pacote vital do sistema operacional e não pode ser suspenso para evitar travamento do tablet.');
      return;
    }

    const jaOculto = politica.pacotes_ocultos.includes(pacote);
    const novaLista = jaOculto
      ? politica.pacotes_ocultos.filter((p) => p !== pacote)
      : [...politica.pacotes_ocultos, pacote];

    setPolitica({ ...politica, pacotes_ocultos: novaLista });
  }

  // Ação em massa: Bloquear todos os 26 aplicativos recreativos (Perfil Estrito ACS)
  function ao_bloquear_todos_perfil_estrito() {
    const pacotesPerfil = CATALOGO_BLOATWARE_ACS.map((a) => a.pacote);
    const pacotesExtras = politica.pacotes_ocultos.filter(
      (p) => !CATALOGO_BLOATWARE_ACS.some((a) => a.pacote === p)
    );
    const novaLista = Array.from(new Set([...pacotesPerfil, ...pacotesExtras]));
    setPolitica({ ...politica, pacotes_ocultos: novaLista });
  }

  // Ação em massa: Liberar todos os aplicativos do catálogo (Restauração de Fábrica)
  function ao_liberar_todos_catalogo() {
    const pacotesPerfil = new Set(CATALOGO_BLOATWARE_ACS.map((a) => a.pacote));
    const novaLista = politica.pacotes_ocultos.filter((p) => !pacotesPerfil.has(p));
    setPolitica({ ...politica, pacotes_ocultos: novaLista });
  }

  function ao_adicionar_pacote_customizado() {
    const pacoteLimpo = novoPacote.trim().toLowerCase();
    if (!pacoteLimpo) return;

    if (PACOTES_VITAIS_IMUNES.includes(pacoteLimpo) || pacoteLimpo.startsWith('com.android.providers.')) {
      alert('⚠️ AÇÃO BLOQUEADA POR SEGURANÇA: O pacote "' + pacoteLimpo + '" é essencial para o funcionamento do Android. Bloqueá-lo pode causar bootloop no dispositivo.');
      return;
    }

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
      }, 4000);
    } catch (erro) {
      alert('Falha ao salvar e despachar políticas.');
    } finally {
      setSalvando(false);
    }
  }

  // Filtragem dos apps do catálogo por texto de busca e por categoria selecionada
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

  // Contagem de bloqueados
  const totalBloqueadosCatalogo = CATALOGO_BLOATWARE_ACS.filter((app) =>
    politica.pacotes_ocultos.includes(app.pacote)
  ).length;

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho da Página */}
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Políticas de Acesso e Restrições</h2>
          <p className="pagina-subtitulo">
            Controle visual completo dos 26 aplicativos de fábrica bloqueados, lista branca do Google Chrome e diretrizes de hardware
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-secundario" onClick={carregar_politicas_sistema} title="Recarregar" disabled={carregando}>
            <RefreshCw size={14} className={carregando ? 'anim-spin' : ''} />
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
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle size={18} />
          {mensagemSucesso}
        </div>
      )}

      {/* Banner de Como Funciona a Restauração no Tablet */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.06) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        <Info size={22} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
          <strong style={{ color: '#fff' }}>Como funciona a restauração de um aplicativo no tablet:</strong>
          <br />
          Os 26 aplicativos de fábrica ocultados pelo script ADB nunca são excluídos da memória do tablet. Quando você clica em <strong>"Liberar"</strong> em qualquer aplicativo abaixo e clica em <strong>"Salvar e Aplicar Políticas"</strong>, o servidor despacha um comando remoto via MQTT/HTTP. O agente MDM executa <code>setApplicationHidden(false)</code> e o aplicativo <strong>reaparece instantaneamente na gaveta (Launcher) do tablet</strong>, sem necessidade de cabo USB!
        </div>
      </div>

      {/* Card de Aplicativos Autorizados de Trabalho (Imunes a Bloqueio) */}
      <div
        style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <ShieldCheck size={18} color="#34d399" />
          <strong style={{ color: '#34d399', fontSize: '14px' }}>
            Aplicativos Oficiais de Trabalho ACS (100% Protegidos e Liberados na Gaveta):
          </strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {APLICATIVOS_AUTORIZADOS_ACS.map((app) => (
            <div
              key={app.pacote}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
              }}
            >
              <span style={{ fontSize: '18px' }}>{app.icone}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{app.nome}</div>
                <div style={{ fontSize: '11px', color: 'var(--texto-secundario)' }}>{app.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      {/* Grid Principal: Seção 1 (Apps Nativos) e Seção 2 (Navegação Web) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* SEÇÃO 1: CATÁLOGO COMPLETO DE BLOATWARE E APPS RECREATIVOS */}
        <div className="card-tabela" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AppWindow size={22} color="var(--primaria)" />
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Catálogo de Apps Ocultados e Bloqueáveis</h3>
            </div>
            <span
              style={{
                background: totalBloqueadosCatalogo > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: totalBloqueadosCatalogo > 0 ? '#f87171' : '#34d399',
                border: `1px solid ${totalBloqueadosCatalogo > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {totalBloqueadosCatalogo} de {CATALOGO_BLOATWARE_ACS.length} Bloqueados
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
            Estes são os aplicativos de fábrica que o comando ADB e o MDM gerenciam. Clique em <strong>"Liberar"</strong> para fazer qualquer um deles voltar a aparecer no tablet.
          </p>

          {/* Barra de Ações Rápidas em Massa */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secundario"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={ao_bloquear_todos_perfil_estrito}
              title="Bloqueia todos os 26 aplicativos recreativos do perfil ACS"
            >
              <Lock size={13} color="#f87171" />
              Bloquear Todos (Perfil ACS Estrito)
            </button>
            <button
              className="btn btn-secundario"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={ao_liberar_todos_catalogo}
              title="Restaura a visibilidade de todos os aplicativos de fábrica"
            >
              <RotateCcw size={13} color="#34d399" />
              Restaurar Todos (Padrão de Fábrica)
            </button>
          </div>

          {/* Barra de Busca e Filtro de Categoria */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar app por nome ou pacote..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '12px',
                }}
              />
            </div>

            <select
              value={categoriaAtiva}
              onChange={(e) => setCategoriaAtiva(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: 'white',
                fontSize: '12px',
              }}
            >
              <option value="todas">Todas as Categorias ({CATALOGO_BLOATWARE_ACS.length})</option>
              <option value="Streaming & Vídeo">Streaming & Vídeo (5)</option>
              <option value="Redes Sociais">Redes Sociais (5)</option>
              <option value="Lojas & Jogos">Lojas & Jogos (4)</option>
              <option value="Google Utilitários">Google Utilitários (5)</option>
              <option value="Fabricante TCL">Fabricante TCL (7)</option>
            </select>
          </div>

          {/* Lista com Scroll dos 26 Aplicativos */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '420px',
              overflowY: 'auto',
              paddingRight: '4px',
              marginBottom: '20px',
            }}
          >
            {appsFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--texto-secundario)', fontSize: '13px' }}>
                Nenhum aplicativo encontrado para os filtros selecionados.
              </div>
            ) : (
              appsFiltrados.map((app) => {
                const estaOculto = politica.pacotes_ocultos.includes(app.pacote);
                return (
                  <div
                    key={app.pacote}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: estaOculto ? 'rgba(239, 68, 68, 0.08)' : 'var(--fundo-elevado)',
                      border: `1px solid ${estaOculto ? 'rgba(239, 68, 68, 0.3)' : 'var(--borda-suave)'}`,
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{app.icone}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{app.nome}</span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'var(--fundo-base)',
                              color: 'var(--texto-secundario)',
                              border: '1px solid var(--borda-suave)',
                            }}
                          >
                            {app.categoria}
                          </span>
                        </div>
                        <div
                          className="texto-mono"
                          style={{
                            fontSize: '11px',
                            color: 'var(--texto-fraco)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {app.pacote}
                        </div>
                      </div>
                    </div>

                    <button
                      className={`btn ${estaOculto ? 'btn-perigo' : 'btn-secundario'}`}
                      style={{ fontSize: '11px', padding: '5px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => ao_alternar_bloqueio_app(app.pacote)}
                    >
                      {estaOculto ? <Lock size={12} /> : <Unlock size={12} />}
                      {estaOculto ? 'Bloqueado (Oculto)' : 'Liberado (Visível)'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Campo para bloquear pacote customizado */}
          <div style={{ borderTop: '1px solid var(--borda-suave)', paddingTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--texto-secundario)', marginBottom: '8px' }}>
              Bloquear Outro Aplicativo Específico pelo Pacote:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={novoPacote}
                onChange={(e) => setNovoPacote(e.target.value)}
                placeholder="ex: com.jogos.exemplo"
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

            {/* Lista de pacotes customizados extras */}
            {politica.pacotes_ocultos.filter((p) => !CATALOGO_BLOATWARE_ACS.some((a) => a.pacote === p)).length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--texto-secundario)', marginBottom: '8px' }}>
                  Outros Pacotes Manuais Bloqueados:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {politica.pacotes_ocultos
                    .filter((p) => !CATALOGO_BLOATWARE_ACS.some((a) => a.pacote === p))
                    .map((pacote) => (
                      <div
                        key={pacote}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Lock size={13} color="#f87171" />
                          <span className="texto-mono" style={{ fontSize: '12px', color: '#fff' }}>{pacote}</span>
                        </div>
                        <button
                          onClick={() => ao_remover_pacote(pacote)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#34d399',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                          title="Liberar aplicativo"
                        >
                          <Unlock size={13} />
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

          {/* Bloqueio de Instaladores APK e Fontes Desconhecidas */}
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
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} color="var(--primaria)" />
                Bloquear Instaladores APK (Fontes Desconhecidas)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--texto-fraco)' }}>
                Impede instalação de APKs locais, navegadores e lojas não autorizadas
              </div>
            </div>
            <button
              className={`btn ${politica.bloquear_instalacao_apps ? 'btn-primario' : 'btn-secundario'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setPolitica({ ...politica, bloquear_instalacao_apps: !politica.bloquear_instalacao_apps })}
            >
              {politica.bloquear_instalacao_apps ? 'Bloqueado (Ativado)' : 'Liberado'}
            </button>
          </div>

          {/* Bloqueio de Bluetooth e Compartilhamento de Arquivos */}
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
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bluetooth size={16} color="#60a5fa" />
                Bloquear Bluetooth e Envio de Arquivos
              </div>
              <div style={{ fontSize: '12px', color: 'var(--texto-fraco)' }}>
                Desativa rádio Bluetooth e impede transferência de arquivos APK por proximidade
              </div>
            </div>
            <button
              className={`btn ${politica.bloquear_bluetooth ? 'btn-primario' : 'btn-secundario'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => setPolitica({ ...politica, bloquear_bluetooth: !politica.bloquear_bluetooth })}
            >
              {politica.bloquear_bluetooth ? 'Bloqueado (Ativado)' : 'Liberado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
