import React, { useState } from 'react';
import { X, Tablet, Plus, Check } from 'lucide-react';
import { cadastrar_dispositivo_api } from '../servicos/api_mdm';

interface PropriedadesModalAdicionar {
  visivel: boolean;
  aoFechar: () => void;
  aoSucesso: () => void;
}

export const ModalAdicionarDispositivo: React.FC<PropriedadesModalAdicionar> = ({
  visivel,
  aoFechar,
  aoSucesso,
}) => {
  if (!visivel) return null;

  const [numeroSerie, setNumeroSerie] = useState<string>('TAB-REAL-001');
  const [modelo, setModelo] = useState<string>('Samsung Galaxy Tab A9+ (SM-X210)');
  const [versaoSo, setVersaoSo] = useState<string>('Android 14 (API 34)');
  const [bateria, setBateria] = useState<number>(95);
  const [ssidWifi, setSsidWifi] = useState<string>('Corporativo-Matriz-5G');
  const [appFoco, setAppFoco] = useState<string>('com.mdm.corporativo');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [sucesso, setSucesso] = useState<string>('');

  async function salvar_novo_dispositivo() {
    if (!numeroSerie.trim()) {
      alert('Informe o número de série do tablet.');
      return;
    }

    setSalvando(true);
    setSucesso('');

    try {
      const resp = await cadastrar_dispositivo_api({
        numero_serie: numeroSerie,
        modelo,
        versao_so: versaoSo,
        bateria: Number(bateria),
        ssid_wifi: ssidWifi,
        app_foco: appFoco,
      });

      setSucesso(`Tablet ${resp.dispositivo.numero_serie} adicionado à frota com sucesso!`);
      setTimeout(() => {
        aoSucesso();
        aoFechar();
      }, 1400);
    } catch (erro) {
      alert('Erro ao cadastrar dispositivo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={aoFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tablet size={22} color="var(--primaria)" />
            <div>
              <h3>Adicionar Tablet à Frota</h3>
              <div style={{ fontSize: '13px', color: 'var(--texto-secundario)' }}>
                Cadastro manual imediato no ambiente local
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
          {sucesso && (
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
              ✓ {sucesso}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
              Número de Série / Identificador Único *:
            </label>
            <input
              type="text"
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
              placeholder="ex: R52N10XXXXX ou TAB-001"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: 'white',
                fontSize: '14px',
                fontFamily: 'var(--fonte-mono)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
                Modelo do Tablet:
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="ex: Samsung Galaxy Tab A9+"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
                Versão do SO Android:
              </label>
              <input
                type="text"
                value={versaoSo}
                onChange={(e) => setVersaoSo(e.target.value)}
                placeholder="ex: Android 14 (API 34)"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
                Nível Inicial da Bateria (%):
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={bateria}
                onChange={(e) => setBateria(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
                Rede Wi-Fi Conectada:
              </label>
              <input
                type="text"
                value={ssidWifi}
                onChange={(e) => setSsidWifi(e.target.value)}
                placeholder="ex: Corporativo-WiFi"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
              App em Primeiro Plano:
            </label>
            <input
              type="text"
              value={appFoco}
              onChange={(e) => setAppFoco(e.target.value)}
              placeholder="ex: com.mdm.corporativo"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: 'white',
                fontSize: '13px',
                fontFamily: 'var(--fonte-mono)',
              }}
            />
          </div>
        </div>

        <div className="modal-rodape">
          <button className="btn btn-secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button className="btn btn-primario" onClick={salvar_novo_dispositivo} disabled={salvando}>
            <Plus size={15} />
            {salvando ? 'Cadastrando...' : 'Cadastrar Tablet Agora'}
          </button>
        </div>
      </div>
    </div>
  );
};
