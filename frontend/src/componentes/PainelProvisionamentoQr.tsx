import React, { useState, useEffect } from 'react';
import { X, QrCode, Wifi, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { obter_dados_provisionamento_qr_api, RespostaProvisionamentoQr } from '../servicos/api_mdm';

interface PropriedadesPainelQr {
  visivel: boolean;
  aoFechar: () => void;
}

export const PainelProvisionamentoQr: React.FC<PropriedadesPainelQr> = ({ visivel, aoFechar }) => {
  if (!visivel) return null;

  const [dominio, setDominio] = useState<string>('mdm-corporativo.duckdns.org');
  const [wifiSsid, setWifiSsid] = useState<string>('Corporativo-Tablets');
  const [wifiSenha, setWifiSenha] = useState<string>('SenhaSegura2026!');
  const [dadosQr, setDadosQr] = useState<RespostaProvisionamentoQr | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);

  useEffect(() => {
    carregar_dados_qr_code();
  }, []);

  async function carregar_dados_qr_code() {
    setCarregando(true);
    try {
      const resposta = await obter_dados_provisionamento_qr_api({
        dominioDuckDns: dominio,
        wifiSsid,
        wifiSenha,
      });
      setDadosQr(resposta);
    } catch (erro) {
      console.error('Erro ao carregar dados do QR:', erro);
    } finally {
      setCarregando(false);
    }
  }

  function copiar_payload_json() {
    if (dadosQr?.payload_android_enterprise) {
      navigator.clipboard.writeText(JSON.stringify(dadosQr.payload_android_enterprise, null, 2));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  return (
    <div className="modal-overlay" onClick={aoFechar}>
      <div className="modal-conteudo" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <QrCode size={22} color="var(--primaria)" />
            <div>
              <h3>Provisionamento Device Owner (Android Enterprise)</h3>
              <div style={{ fontSize: '13px', color: 'var(--texto-secundario)' }}>
                Ativação autônoma dos 250 tablets no primeiro boot
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

        {/* Corpo */}
        <div className="modal-corpo" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Configurações do QR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
                Domínio DuckDNS:
              </label>
              <input
                type="text"
                value={dominio}
                onChange={(e) => setDominio(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
                SSID Wi-Fi Corporativo:
              </label>
              <input
                type="text"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '4px' }}>
                Senha do Wi-Fi:
              </label>
              <input
                type="password"
                value={wifiSenha}
                onChange={(e) => setWifiSenha(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: 'white',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-secundario" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={carregar_dados_qr_code}>
              <RefreshCw size={13} />
              Recalcular Checksum e Atualizar QR
            </button>
          </div>

          {/* Área do QR Code e Instruções */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="qr-container" style={{ flexShrink: 0, margin: '0 auto' }}>
              {carregando ? (
                <div style={{ height: '240px', width: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  Gerando QR Code...
                </div>
              ) : dadosQr?.qr_code_imagem_base64 ? (
                <img src={dadosQr.qr_code_imagem_base64} alt="QR Code Android Enterprise" />
              ) : (
                <div style={{ color: '#ef4444' }}>Falha ao renderizar QR Code</div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <h4 style={{ fontSize: '15px', marginBottom: '10px', color: '#60a5fa' }}>
                Passo a Passo de Ativação do Tablet:
              </h4>
              <div className="instrucoes-box">
                <ol>
                  <li>Ligue o tablet Android novo ou restaurado de fábrica.</li>
                  <li>Na tela de boas-vindas ("Iniciar"), <strong>toque 6 vezes seguidas</strong> em uma área vazia da tela.</li>
                  <li>O leitor QR nativo do Android Enterprise será iniciado.</li>
                  <li>Aponte a câmera para o QR Code ao lado.</li>
                  <li>O tablet conectará ao Wi-Fi corporativo, baixará o APK do DPC e assumirá o papel de <strong>Device Owner</strong> automaticamente.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Payload JSON de Provisionamento */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--texto-secundario)' }}>
                Payload Android Enterprise (JSON):
              </span>
              <button
                className="btn btn-secundario"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={copiar_payload_json}
              >
                {copiado ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copiado ? 'Copiado!' : 'Copiar JSON'}
              </button>
            </div>
            <pre
              className="texto-mono"
              style={{
                background: 'var(--fundo-base)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--borda-suave)',
                fontSize: '11px',
                maxHeight: '140px',
                overflowY: 'auto',
                color: '#93c5fd',
              }}
            >
              {JSON.stringify(dadosQr?.payload_android_enterprise, null, 2)}
            </pre>
          </div>
        </div>

        {/* Rodapé */}
        <div className="modal-rodape">
          <button className="btn btn-secundario" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
