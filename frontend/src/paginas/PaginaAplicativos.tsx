import React, { useState, useEffect, useRef } from 'react';
import { Package, UploadCloud, Download, CheckCircle, RefreshCw, Send, AlertCircle, FileCheck } from 'lucide-react';
import {
  listar_catalogo_aplicativos_api,
  fazer_upload_aplicativo_api,
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
  const [mensagemStatus, setMensagemStatus] = useState<string>('');
  const [dispositivoAlvo, setDispositivoAlvo] = useState<string>('todos');

  const inputArquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregar_catalogo_aplicativos();
  }, []);

  async function carregar_catalogo_aplicativos() {
    setCarregando(true);
    try {
      const resp = await listar_catalogo_aplicativos_api();
      setAplicativos(resp.aplicativos);
    } catch (erro) {
      console.error('Erro ao carregar catálogo de apps:', erro);
    } finally {
      setCarregando(false);
    }
  }

  async function ao_selecionar_arquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = evento.target.files;
    if (!arquivos || arquivos.length === 0) return;

    const arquivoApk = arquivos[0];
    if (!arquivoApk.name.endsWith('.apk')) {
      alert('Por favor, selecione um arquivo com extensão .apk');
      return;
    }

    setEnviandoUpload(true);
    setMensagemStatus('');

    try {
      const resp = await fazer_upload_aplicativo_api(arquivoApk);
      setMensagemStatus(`✓ ${resp.mensagem}`);
      carregar_catalogo_aplicativos();
    } catch (erro) {
      alert('Falha ao enviar arquivo APK para o servidor.');
    } finally {
      setEnviandoUpload(false);
      if (inputArquivoRef.current) inputArquivoRef.current.value = '';
    }
  }

  async function disparar_instalacao_remota(nomeArquivo: string) {
    const alvoTexto = dispositivoAlvo === 'todos' ? 'TODOS os 250 tablets da frota' : `o tablet selecionado (${dispositivoAlvo})`;
    if (!confirm(`Deseja disparar a instalação silenciosa de '${nomeArquivo}' para ${alvoTexto}?`)) {
      return;
    }

    try {
      const resp = await disparar_instalacao_catalogo_api(nomeArquivo, dispositivoAlvo);
      setMensagemStatus(`✓ ${resp.mensagem}`);
    } catch (erro) {
      alert('Erro ao despachar comando de instalação do APK.');
    }
  }

  return (
    <div className="pagina-conteudo">
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Catálogo de Aplicativos Corporativos</h2>
          <p className="pagina-subtitulo">
            Upload, gestão e disparo de instalação silenciosa (sem prompt ao usuário) via prerrogativas de Device Owner
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-secundario" onClick={carregar_catalogo_aplicativos} title="Atualizar catálogo">
            <RefreshCw size={14} />
            Atualizar
          </button>
          <button
            className="btn btn-primario"
            onClick={() => inputArquivoRef.current?.click()}
            disabled={enviandoUpload}
          >
            <UploadCloud size={15} />
            {enviandoUpload ? 'Enviando APK...' : 'Fazer Upload de APK'}
          </button>
          <input
            type="file"
            ref={inputArquivoRef}
            onChange={ao_selecionar_arquivo}
            accept=".apk"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {mensagemStatus && (
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
          {mensagemStatus}
        </div>
      )}

      {/* Área de Seleção de Alvo para Instalação */}
      <div className="card-metrica" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Alvo do Disparo de Instalação:</div>
            <div style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
              Escolha se a instalação será remetida a toda a frota ou a um aparelho em teste
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
                  📱 {d.modelo} — SN: {d.numero_serie} ({d.status_conexao})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Aplicativos no Catálogo */}
      <div className="card-tabela">
        <div className="tabela-barra-topo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="var(--primaria)" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>APKs Armazenados no Servidor</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
            Total no servidor: {aplicativos.length} arquivo(s)
          </span>
        </div>

        <div className="tabela-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome do Pacote APK</th>
                <th>Tamanho</th>
                <th>Checksum SHA-256</th>
                <th>Última Atualização</th>
                <th style={{ textAlign: 'right' }}>Ação de Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--texto-secundario)' }}>
                    Carregando catálogo de pacotes...
                  </td>
                </tr>
              ) : aplicativos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--texto-secundario)' }}>
                    Nenhum pacote APK cadastrado ainda. Clique em "Fazer Upload de APK" para adicionar seu primeiro app.
                  </td>
                </tr>
              ) : (
                aplicativos.map((apk) => (
                  <tr key={apk.nome_arquivo}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '8px', color: '#60a5fa' }}>
                          <FileCheck size={18} />
                        </div>
                        <div>
                          <strong style={{ color: '#fff', fontSize: '14px' }}>{apk.nome_arquivo}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--texto-fraco)' }}>
                            Link: {apk.url_download}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{apk.tamanho_mb}</span>
                    </td>
                    <td>
                      <span className="texto-mono" style={{ fontSize: '11px', color: '#93c5fd' }} title={apk.checksum_sha256}>
                        {apk.checksum_sha256.substring(0, 16)}...
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--texto-secundario)' }}>
                        {new Date(apk.data_modificacao).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primario btn-acao-rapida"
                        onClick={() => disparar_instalacao_remota(apk.nome_arquivo)}
                        title="Disparar instalação silenciosa no alvo"
                      >
                        <Send size={13} />
                        Instalar Silenciosamente
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
