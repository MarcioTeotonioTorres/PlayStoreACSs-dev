import React, { useState } from 'react';
import { X, Layers, Lock, RotateCcw, Camera, Shield, CheckCircle } from 'lucide-react';
import { despachar_comando_lote_api } from '../servicos/api_mdm';

interface PropriedadesLote {
  visivel: boolean;
  totalConectados: number;
  aoFechar: () => void;
  aoConcluirComandoLote: () => void;
}

export const PainelComandosLote: React.FC<PropriedadesLote> = ({
  visivel,
  totalConectados,
  aoFechar,
  aoConcluirComandoLote,
}) => {
  if (!visivel) return null;

  const [tipoComando, setTipoComando] = useState<string>('bloquear_tela_imediata');
  const [pacoteApp, setPacoteApp] = useState<string>('com.empresa.operacao');
  const [apenasConectados, setApenasConectados] = useState<boolean>(true);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [resultado, setResultado] = useState<string>('');

  async function executar_comando_lote() {
    setEnviando(true);
    setResultado('');

    let parametros: Record<string, any> = {};

    if (tipoComando === 'modo_quiosque') {
      parametros = { pacote_app: pacoteApp, habilitar: true };
    } else if (tipoComando === 'desativar_quiosque') {
      parametros = { pacote_app: '', habilitar: false };
    } else if (tipoComando === 'definir_bloqueio_camera') {
      parametros = { bloquear: true };
    } else if (tipoComando === 'liberar_camera') {
      parametros = { bloquear: false };
    }

    try {
      const comandoFinal =
        tipoComando === 'desativar_quiosque'
          ? 'modo_quiosque'
          : tipoComando === 'liberar_camera'
          ? 'definir_bloqueio_camera'
          : tipoComando;

      const resp = await despachar_comando_lote_api(comandoFinal, parametros, apenasConectados);
      setResultado(`Sucesso! ${resp.total_afetados} comandos transmitidos para a frota.`);
      setTimeout(() => {
        aoConcluirComandoLote();
        aoFechar();
      }, 1800);
    } catch (erro) {
      alert('Erro ao disparar comando em lote.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={aoFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} color="var(--primaria)" />
            <div>
              <h3>Comandos em Lote para Frota</h3>
              <div style={{ fontSize: '13px', color: 'var(--texto-secundario)' }}>
                Envio simultâneo para até 250 tablets corporativos
              </div>
            </div>
          </div>
          <button
            onClick={aoFechar}
            style={{ background: 'transparent', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-corpo">
          {resultado && (
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
              ✓ {resultado}
            </div>
          )}

          <div
            style={{
              background: 'var(--fundo-elevado)',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              color: 'var(--texto-secundario)',
            }}
          >
            Tablets atualmente com sessão MQTT ativa: <strong style={{ color: '#34d399' }}>{totalConectados} aparelhos</strong>
          </div>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
            Ação Coletiva a Executar:
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
              marginBottom: '16px',
            }}
          >
            <option value="bloquear_tela_imediata">🔒 Bloquear Tela de Todos os Tablets</option>
            <option value="reiniciar_aparelho">🔄 Reiniciar Toda a Frota Conectada</option>
            <option value="modo_quiosque">🛡️ Ativar Modo Quiosque em Lote (App Fixo)</option>
            <option value="desativar_quiosque">🔓 Desativar Modo Quiosque em Lote</option>
            <option value="definir_bloqueio_camera">📷 Bloquear Câmeras na Frota</option>
            <option value="liberar_camera">📸 Liberar Câmeras na Frota</option>
          </select>

          {tipoComando === 'modo_quiosque' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '6px' }}>
                Nome do Pacote para Quiosque Coletivo:
              </label>
              <input
                type="text"
                value={pacoteApp}
                onChange={(e) => setPacoteApp(e.target.value)}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <input
              type="checkbox"
              id="chkConectados"
              checked={apenasConectados}
              onChange={(e) => setApenasConectados(e.target.checked)}
            />
            <label htmlFor="chkConectados" style={{ fontSize: '13px', color: 'var(--texto-secundario)', cursor: 'pointer' }}>
              Aplicar apenas aos tablets com status Conectado (Online)
            </label>
          </div>
        </div>

        <div className="modal-rodape">
          <button className="btn btn-secundario" onClick={aoFechar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primario" onClick={executar_comando_lote} disabled={enviando}>
            {enviando ? 'Disparando Lote...' : 'Executar Ação em Lote'}
          </button>
        </div>
      </div>
    </div>
  );
};
