import React, { useState } from 'react';
import { X, Lock, RotateCcw, ShieldAlert, Download, Camera, Usb, AppWindow } from 'lucide-react';
import { DispositivoItem } from '../servicos/api_mdm';

interface PropriedadesModal {
  dispositivo: DispositivoItem | null;
  aoFechar: () => void;
  aoEnviarComando: (
    dispositivoId: string,
    tipoComando: string,
    parametros: Record<string, any>
  ) => Promise<void>;
}

export const ModalComandos: React.FC<PropriedadesModal> = ({
  dispositivo,
  aoFechar,
  aoEnviarComando,
}) => {
  if (!dispositivo) return null;

  const [tipoComando, setTipoComando] = useState<string>('bloquear_tela_imediata');
  const [pacoteQuiosque, setPacoteQuiosque] = useState<string>('com.empresa.operacao');
  const [urlApk, setUrlApk] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');

  async function executar_comando_escolhido() {
    if (!dispositivo) return;
    setEnviando(true);
    setMensagemSucesso('');

    let parametros: Record<string, any> = {};

    if (tipoComando === 'modo_quiosque') {
      parametros = { pacote_app: pacoteQuiosque, habilitar: true };
    } else if (tipoComando === 'desativar_quiosque') {
      parametros = { pacote_app: '', habilitar: false };
    } else if (tipoComando === 'instalar_aplicativo_silencioso') {
      parametros = { url_apk: urlApk };
    } else if (tipoComando === 'definir_bloqueio_reset_fabrica') {
      parametros = { habilitar: true };
    } else if (tipoComando === 'definir_bloqueio_camera') {
      parametros = { bloquear: true };
    } else if (tipoComando === 'definir_bloqueio_usb') {
      parametros = { bloquear: true };
    } else if (tipoComando === 'limpar_dados_dispositivo') {
      parametros = { incluir_sd: true };
    }

    try {
      const comandoFinal = tipoComando === 'desativar_quiosque' ? 'modo_quiosque' : tipoComando;
      await aoEnviarComando(dispositivo.id, comandoFinal, parametros);
      setMensagemSucesso('Comando despachado com sucesso via MQTT!');
      setTimeout(() => {
        setMensagemSucesso('');
        aoFechar();
      }, 1500);
    } catch (erro) {
      alert('Falha ao despachar comando para o dispositivo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={aoFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho do Modal */}
        <div className="modal-header">
          <div>
            <h3>Comandos Remotos MDM</h3>
            <div style={{ fontSize: '13px', color: 'var(--texto-secundario)', marginTop: '4px' }}>
              Alvo: <strong style={{ color: '#fff' }}>{dispositivo.modelo}</strong> (SN: {dispositivo.numero_serie})
            </div>
          </div>
          <button
            onClick={aoFechar}
            style={{ background: 'transparent', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Seleção de Comandos */}
        <div className="modal-corpo">
          {mensagemSucesso && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ✓ {mensagemSucesso}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            Selecione a Ação Remota:
          </label>
          <select
            value={tipoComando}
            onChange={(e) => setTipoComando(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--fundo-base)',
              border: '1px solid var(--borda-suave)',
              color: 'white',
              fontSize: '14px',
              marginBottom: '18px',
            }}
          >
            <option value="bloquear_tela_imediata">🔒 Bloquear Tela Imediatamente</option>
            <option value="reiniciar_aparelho">🔄 Reiniciar Tablet</option>
            <option value="modo_quiosque">🛡️ Ativar Modo Quiosque (Travar em Aplicativo)</option>
            <option value="desativar_quiosque">🔓 Liberar Modo Quiosque</option>
            <option value="definir_bloqueio_reset_fabrica">🚫 Proibir Restauração de Fábrica (FRP)</option>
            <option value="definir_bloqueio_camera">📷 Bloquear Uso de Câmeras</option>
            <option value="definir_bloqueio_usb">🔌 Bloquear Transferência de Arquivos USB</option>
            <option value="instalar_aplicativo_silencioso">📦 Instalar APK Silenciosamente</option>
            <option value="limpar_dados_dispositivo">⚠️ Limpeza Remota de Dados (Wipe Total)</option>
          </select>

          {/* Campo condicional para modo quiosque */}
          {tipoComando === 'modo_quiosque' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '6px' }}>
                Nome do Pacote do App (Package Name):
              </label>
              <input
                type="text"
                value={pacoteQuiosque}
                onChange={(e) => setPacoteQuiosque(e.target.value)}
                placeholder="ex: com.google.android.apps.docs"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>
          )}

          {/* Campo condicional para instalação silenciosa */}
          {tipoComando === 'instalar_aplicativo_silencioso' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '6px' }}>
                URL de Download do APK Corporativo (HTTPS):
              </label>
              <input
                type="text"
                value={urlApk}
                onChange={(e) => setUrlApk(e.target.value)}
                placeholder="https://mdm-corporativo.duckdns.org/apk/aplicativo-v2.apk"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>
          )}

          {/* Aviso para Wipe */}
          {tipoComando === 'limpar_dados_dispositivo' && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#f87171',
                lineHeight: 1.5,
              }}
            >
              <strong>ATENÇÃO:</strong> Esta operação apagará permanentemente todos os dados e contas do tablet,
              restaurando-o para as configurações iniciais de fábrica.
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="modal-rodape">
          <button className="btn btn-secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </button>
          <button
            className={`btn ${tipoComando === 'limpar_dados_dispositivo' ? 'btn-perigo' : 'btn-primario'}`}
            onClick={executar_comando_escolhido}
            disabled={enviando}
          >
            {enviando ? 'Despachando...' : 'Confirmar e Enviar Comando'}
          </button>
        </div>
      </div>
    </div>
  );
};
