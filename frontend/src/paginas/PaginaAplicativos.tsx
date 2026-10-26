import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Package,
  UploadCloud,
  RefreshCw,
  Send,
  Trash2,
  AlertTriangle,
  FileCheck,
  HardDrive,
  Layers,
  Search,
  Copy,
  Check,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  listar_catalogo_aplicativos_api,
  fazer_upload_aplicativo_api,
  remover_aplicativo_catalogo_api,
  disparar_instalacao_catalogo_api,
  ItemCatalogoApk,
  DispositivoItem,
} from '../servicos/api_mdm';

interface PropriedadesPaginaAplicativos {
  dispositivos: DispositivoItem[];
}

export const PaginaAplicativos: React.FC<PropriedadesPaginaAplicativos> = ({ dispositivos }) => {
  const [aplicativos, setAplicativos] = useState<ItemCatalogoApk[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [enviandoUpload, setEnviandoUpload] = useState<boolean>(false);
  const [progressoUpload, setProgressoUpload] = useState<number | null>(null);
  const [removendo, setRemovendo] = useState<boolean>(false);
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [dispositivoAlvo, setDispositivoAlvo] = useState<string>('todos');

  // Filtros e busca
  const [busca, setBusca] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'apk' | 'xapk'>('todos');

  // Estado do modal de remoção
  const [pacoteParaRemover, setPacoteParaRemover] = useState<ItemCatalogoApk | null>(null);
  const [checksumCopiado, setChecksumCopiado] = useState<string | null>(null);

  const inputArquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregar_catalogo_aplicativos();
  }, []);

  async function carregar_catalogo_aplicativos() {
    setCarregando(true);
    try {
      const resp = await listar_catalogo_aplicativos_api();
      setAplicativos(resp.aplicativos || []);
    } catch (erro) {
      console.error('Erro ao carregar catálogo de apps:', erro);
      setMensagemStatus({
        tipo: 'erro',
        texto: 'Falha ao sincronizar o catálogo de pacotes com o servidor.',
      });
    } finally {
      setCarregando(false);
    }
  }

  async function ao_selecionar_arquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = evento.target.files;
    if (!arquivos || arquivos.length === 0) return;

    const arquivoSelecionado = arquivos[0];
    const nomeMinusculo = arquivoSelecionado.name.toLowerCase();
    const ehApk = nomeMinusculo.endsWith('.apk');
    const ehXapk = nomeMinusculo.endsWith('.xapk');

    if (!ehApk && !ehXapk) {
      alert('Formato não suportado! Por favor selecione um arquivo com extensão .apk ou .xapk.');
      if (inputArquivoRef.current) inputArquivoRef.current.value = '';
      return;
    }

    setEnviandoUpload(true);
    setProgressoUpload(0);
    setMensagemStatus({
      tipo: 'sucesso',
      texto: `Iniciando upload de ${arquivoSelecionado.name} (${(arquivoSelecionado.size / (1024 * 1024)).toFixed(1)} MB)...`,
    });

    try {
      const resp = await fazer_upload_aplicativo_api(arquivoSelecionado, (p) => {
        setProgressoUpload(p);
      });
      setMensagemStatus({
        tipo: 'sucesso',
        texto: `✓ ${resp.mensagem}`,
      });
      await carregar_catalogo_aplicativos();
    } catch (erro: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: erro.message || 'Falha ao enviar arquivo para o catálogo do servidor.',
      });
    } finally {
      setEnviandoUpload(false);
      setProgressoUpload(null);
      if (inputArquivoRef.current) inputArquivoRef.current.value = '';
    }
  }

  async function confirmar_remocao_pacote() {
    if (!pacoteParaRemover) return;
    setRemovendo(true);

    try {
      const resp = await remover_aplicativo_catalogo_api(pacoteParaRemover.nome_arquivo);
      setMensagemStatus({
        tipo: 'sucesso',
        texto: `✓ ${resp.mensagem}`,
      });
      setPacoteParaRemover(null);
      await carregar_catalogo_aplicativos();
    } catch (erro: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: erro.message || 'Erro ao remover pacote do servidor.',
      });
    } finally {
      setRemovendo(false);
    }
  }

  async function disparar_instalacao_remota(nomeArquivo: string) {
    const alvoTexto =
      dispositivoAlvo === 'todos'
        ? 'TODOS os 250 tablets da frota'
        : `o tablet selecionado (${dispositivoAlvo})`;

    if (
      !confirm(
        `Deseja despachar a instalação silenciosa de '${nomeArquivo}' para ${alvoTexto}?\n\nO tablet realizará o download e a instalação de forma autônoma sem interromper o usuário.`
      )
    ) {
      return;
    }

    try {
      const resp = await disparar_instalacao_catalogo_api(nomeArquivo, dispositivoAlvo);
      setMensagemStatus({
        tipo: 'sucesso',
        texto: `✓ ${resp.mensagem}`,
      });
    } catch (erro: any) {
      setMensagemStatus({
        tipo: 'erro',
        texto: erro.message || 'Erro ao despachar comando de instalação silenciosa.',
      });
    }
  }

  function copiarChecksum(hash: string) {
    navigator.clipboard.writeText(hash);
    setChecksumCopiado(hash);
    setTimeout(() => setChecksumCopiado(null), 2500);
  }

  // Estatísticas de armazenamento da VPS
  const { totalBytes, totalMb, totalApk, totalXapk } = useMemo(() => {
    let bytes = 0;
    let apks = 0;
    let xapks = 0;
    for (const app of aplicativos) {
      bytes += app.tamanho_bytes || 0;
      if (app.nome_arquivo.toLowerCase().endsWith('.xapk')) {
        xapks++;
      } else {
        apks++;
      }
    }
    return {
      totalBytes: bytes,
      totalMb: (bytes / (1024 * 1024)).toFixed(2),
      totalApk: apks,
      totalXapk: xapks,
    };
  }, [aplicativos]);

  // Lista filtrada
  const aplicativosFiltrados = useMemo(() => {
    return aplicativos.filter((app) => {
      const nomeMatch = app.nome_arquivo.toLowerCase().includes(busca.toLowerCase());
      const hashMatch = (app.checksum_sha256 || '').toLowerCase().includes(busca.toLowerCase());
      const bateuBusca = nomeMatch || hashMatch;

      const ehXapk = app.nome_arquivo.toLowerCase().endsWith('.xapk');
      if (filtroTipo === 'apk' && ehXapk) return false;
      if (filtroTipo === 'xapk' && !ehXapk) return false;

      return bateuBusca;
    });
  }, [aplicativos, busca, filtroTipo]);

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho da Página */}
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Catálogo de Aplicativos Corporativos</h2>
          <p className="pagina-subtitulo">
            Gestão de pacotes <strong>.apk</strong> e <strong>.xapk</strong>, liberação de espaço em disco na VPS e despacho de instalação silenciosa sem intervenção do operador
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button
            className="btn btn-secundario"
            onClick={carregar_catalogo_aplicativos}
            title="Atualizar catálogo de pacotes"
          >
            <RefreshCw size={14} className={carregando ? 'spin' : ''} />
            Atualizar
          </button>

          <button
            className="btn btn-primario"
            onClick={() => inputArquivoRef.current?.click()}
            disabled={enviandoUpload}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
            }}
          >
            <UploadCloud size={16} />
            {enviandoUpload
              ? progressoUpload !== null
                ? `Enviando... ${progressoUpload}%`
                : 'Processando Upload...'
              : 'Fazer Upload (.apk / .xapk)'}
          </button>

          <input
            type="file"
            ref={inputArquivoRef}
            onChange={ao_selecionar_arquivo}
            accept=".apk,.xapk"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Banner de Status / Feedback */}
      {mensagemStatus && (
        <div
          style={{
            background:
              mensagemStatus.tipo === 'sucesso'
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            color: mensagemStatus.tipo === 'sucesso' ? '#34d399' : '#f87171',
            border: `1px solid ${
              mensagemStatus.tipo === 'sucesso'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>{mensagemStatus.texto}</span>
          <button
            onClick={() => setMensagemStatus(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid de Métricas de Armazenamento e Compatibilidade */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="card-metrica">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--texto-secundario)', fontWeight: 600 }}>Total no Catálogo</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '6px', borderRadius: '8px' }}>
              <Package size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
            {aplicativos.length} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--texto-secundario)' }}>pacote(s)</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--texto-fraco)', marginTop: '4px' }}>
            {totalApk} APK(s) padrão • {totalXapk} XAPK(s)
          </div>
        </div>

        <div className="card-metrica">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--texto-secundario)', fontWeight: 600 }}>Espaço em Disco na VPS</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '6px', borderRadius: '8px' }}>
              <HardDrive size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24' }}>
            {totalMb} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--texto-secundario)' }}>MB</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--texto-fraco)', marginTop: '4px' }}>
            Remova pacotes obsoletos para liberar armazenamento
          </div>
        </div>

        <div className="card-metrica">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--texto-secundario)', fontWeight: 600 }}>Suporte a Extensões</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', padding: '6px', borderRadius: '8px' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <span
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              .APK
            </span>
            <span
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              .XAPK
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--texto-fraco)', marginTop: '6px' }}>
            Compatível com App Bundles, Splits e OBBs
          </div>
        </div>
      </div>

      {/* Barra de Alvo de Instalação Silenciosa */}
      <div className="card-metrica" style={{ marginBottom: '24px', background: 'var(--fundo-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Alvo do Disparo de Instalação:</div>
            <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
              Selecione o destino da ordem MQTT para instalação silenciosa e autônoma
            </div>
          </div>

          <div style={{ minWidth: '340px' }}>
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
                cursor: 'pointer',
              }}
            >
              <option value="todos">🌐 Toda a Frota Conectada (250 Tablets)</option>
              {dispositivos.map((d) => (
                <option key={d.id} value={d.id}>
                  📱 {d.modelo} — SN: {d.numero_serie} ({d.status_conexao})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela do Catálogo com Barra de Filtros e Busca */}
      <div className="card-tabela">
        <div
          className="tabela-barra-topo"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--borda-suave)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={18} color="var(--primaria)" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Pacotes Armazenados no Servidor</span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'var(--texto-secundario)',
                fontWeight: 600,
              }}
            >
              {aplicativosFiltrados.length} de {aplicativos.length}
            </span>
          </div>

          {/* Filtros e Barra de Pesquisa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Abas de Formato */}
            <div
              style={{
                display: 'flex',
                background: 'var(--fundo-base)',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid var(--borda-suave)',
              }}
            >
              <button
                onClick={() => setFiltroTipo('todos')}
                style={{
                  background: filtroTipo === 'todos' ? 'var(--primaria)' : 'transparent',
                  color: filtroTipo === 'todos' ? '#fff' : 'var(--texto-secundario)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroTipo('apk')}
                style={{
                  background: filtroTipo === 'apk' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                  color: filtroTipo === 'apk' ? '#60a5fa' : 'var(--texto-secundario)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                APK
              </button>
              <button
                onClick={() => setFiltroTipo('xapk')}
                style={{
                  background: filtroTipo === 'xapk' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                  color: filtroTipo === 'xapk' ? '#c084fc' : 'var(--texto-secundario)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                XAPK
              </button>
            </div>

            {/* Input de Busca */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--fundo-base)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borda-suave)',
              }}
            >
              <Search size={14} color="var(--texto-fraco)" />
              <input
                type="text"
                placeholder="Buscar pacote..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  width: '160px',
                }}
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--texto-fraco)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="tabela-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome do Pacote</th>
                <th>Tipo</th>
                <th>Tamanho</th>
                <th>Checksum SHA-256</th>
                <th>Modificação</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={22} className="spin" color="var(--primaria)" />
                      <span>Carregando catálogo de pacotes da VPS...</span>
                    </div>
                  </td>
                </tr>
              ) : aplicativosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Package size={32} color="var(--texto-fraco)" />
                      <div>
                        {busca || filtroTipo !== 'todos' ? (
                          <span>Nenhum pacote encontrado para o filtro atual.</span>
                        ) : (
                          <span>
                            Nenhum pacote cadastrado no momento. Clique em{' '}
                            <strong>"Fazer Upload (.apk / .xapk)"</strong> para adicionar seu primeiro app.
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                aplicativosFiltrados.map((item) => {
                  const ehXapk = item.nome_arquivo.toLowerCase().endsWith('.xapk');
                  const ehDpcBase = item.nome_arquivo.toLowerCase() === 'mdm-dpc.apk';

                  return (
                    <tr key={item.nome_arquivo}>
                      {/* Nome do Pacote e Link */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              background: ehXapk
                                ? 'rgba(139, 92, 246, 0.15)'
                                : 'rgba(59, 130, 246, 0.15)',
                              padding: '10px',
                              borderRadius: '8px',
                              color: ehXapk ? '#a78bfa' : '#60a5fa',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FileCheck size={18} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ color: '#fff', fontSize: '14px' }}>{item.nome_arquivo}</strong>
                              {ehDpcBase && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background: 'rgba(16, 185, 129, 0.2)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                  }}
                                  title="Agente Device Owner base essencial para onboarding e provisionamento"
                                >
                                  DPC Base
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--texto-fraco)',
                                marginTop: '2px',
                                maxWidth: '380px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.url_download}
                            >
                              URL: {item.url_download}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tipo / Formato */}
                      <td>
                        {ehXapk ? (
                          <span
                            style={{
                              background: 'rgba(139, 92, 246, 0.18)',
                              color: '#c084fc',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                            }}
                          >
                            XAPK
                          </span>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(59, 130, 246, 0.18)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                            }}
                          >
                            APK
                          </span>
                        )}
                      </td>

                      {/* Tamanho */}
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
                          {item.tamanho_mb}
                        </span>
                      </td>

                      {/* Checksum SHA-256 */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="texto-mono"
                            style={{
                              fontSize: '11px',
                              color: '#93c5fd',
                              background: 'rgba(15, 23, 42, 0.6)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                            title={item.checksum_sha256}
                          >
                            {item.checksum_sha256.substring(0, 14)}...
                          </span>
                          <button
                            onClick={() => copiarChecksum(item.checksum_sha256)}
                            title="Copiar Checksum SHA-256"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: checksumCopiado === item.checksum_sha256 ? '#34d399' : 'var(--texto-fraco)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {checksumCopiado === item.checksum_sha256 ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Data de Modificação */}
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
                          {new Date(item.data_modificacao).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Ações: Instalar Silenciosamente + Remover */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {/* Botão de Instalar Silenciosamente */}
                          <button
                            className="btn btn-primario btn-acao-rapida"
                            onClick={() => disparar_instalacao_remota(item.nome_arquivo)}
                            title="Disparar instalação silenciosa sem intervenção do usuário"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 12px',
                            }}
                          >
                            <Send size={13} />
                            Instalar
                          </button>

                          {/* Botão de Remover Pacote */}
                          {ehDpcBase ? (
                            <button
                              disabled
                              title="O agente mdm-dpc.apk é a base do sistema Device Owner e está protegido contra exclusão."
                              style={{
                                padding: '7px 10px',
                                fontSize: '12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                background: 'rgba(255, 255, 255, 0.03)',
                                color: 'var(--texto-fraco)',
                                cursor: 'not-allowed',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <ShieldAlert size={13} />
                              Protegido
                            </button>
                          ) : (
                            <button
                              onClick={() => setPacoteParaRemover(item)}
                              title="Remover pacote do servidor e liberar espaço em disco na VPS"
                              style={{
                                padding: '7px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                                e.currentTarget.style.color = '#f87171';
                              }}
                            >
                              <Trash2 size={13} />
                              Remover
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

      {/* Modal de Confirmação para Remoção de Pacote */}
      {pacoteParaRemover && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !removendo && setPacoteParaRemover(null)}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '14px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.18)',
                  color: '#ef4444',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  Remover Pacote do Servidor?
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
                  Ação permanente de liberação de armazenamento na VPS
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--texto-secundario)', lineHeight: '1.6', marginBottom: '18px' }}>
              Tem certeza de que deseja remover permanentemente o arquivo{' '}
              <strong style={{ color: '#fff' }}>"{pacoteParaRemover.nome_arquivo}"</strong> do catálogo?
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--borda-suave)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--texto-fraco)' }}>Tamanho que será liberado:</span>
                <strong style={{ color: '#34d399' }}>{pacoteParaRemover.tamanho_mb}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--texto-fraco)' }}>Extensão:</span>
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>
                  {pacoteParaRemover.nome_arquivo.toLowerCase().endsWith('.xapk') ? 'Pacote XAPK' : 'Pacote APK'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--texto-fraco)' }}>Status:</span>
                <span style={{ color: '#fbbf24' }}>O arquivo físico será excluído do disco da VPS</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secundario"
                onClick={() => setPacoteParaRemover(null)}
                disabled={removendo}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-perigo"
                onClick={confirmar_remocao_pacote}
                disabled={removendo}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                {removendo ? 'Excluindo da VPS...' : 'Confirmar e Liberar Espaço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
