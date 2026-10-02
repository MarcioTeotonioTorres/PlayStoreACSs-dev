import React, { useState, useEffect } from 'react';
import { QrCode, RefreshCw, Copy, Check, ShieldCheck, Wifi, ExternalLink } from 'lucide-react';
import { obter_dados_provisionamento_qr_api, RespostaProvisionamentoQr } from '../servicos/api_mdm';

export const PaginaProvisionamento: React.FC = () => {
  const [dominio, setDominio] = useState<string>('mdm-corporativo.duckdns.org');
  const [wifiSsid, setWifiSsid] = useState<string>('Corporativo-Tablets');
  const [wifiSenha, setWifiSenha] = useState<string>('SenhaSegura2026!');
  const [dadosQr, setDadosQr] = useState<RespostaProvisionamentoQr | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [copiado, setCopiado] = useState<boolean>(false);

  useEffect(() => {
    carregar_dados_qr_code();
  }, []);

  async function carregar_dados_qr_code() {
    setCarregando(true);
    try {
      const resp = await obter_dados_provisionamento_qr_api({
        dominioDuckDns: dominio,
        wifiSsid,
        wifiSenha,
      });
      setDadosQr(resp);
    } catch (erro) {
      console.error('Erro ao gerar dados de provisionamento QR:', erro);
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
    <div className="pagina-conteudo">
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Provisionamento de Dispositivos (QR Code)</h2>
          <p className="pagina-subtitulo">
            Ativação autônoma de tablets Android novos no primeiro boot com prerrogativas de Device Owner (Android Enterprise)
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-primario" onClick={carregar_dados_qr_code}>
            <RefreshCw size={14} />
            Recalcular Checksum e Atualizar QR
          </button>
        </div>
      </div>

      {/* Configurações do Payload de Provisionamento */}
      <div className="card-metrica" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#fff' }}>
          Configuração da Rede e Servidor para os Tablets Novos:
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '6px' }}>
              Domínio DuckDNS ou Host HTTPS:
            </label>
            <input
              type="text"
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '6px' }}>
              SSID Wi-Fi Corporativo (Rede da Empresa):
            </label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              placeholder="Nome exato da sua rede Wi-Fi"
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
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '6px' }}>
              Senha do Wi-Fi:
            </label>
            <input
              type="password"
              value={wifiSenha}
              onChange={(e) => setWifiSenha(e.target.value)}
              placeholder="Senha do seu roteador"
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
      </div>

      {/* Grid com o QR Code e o Passo a Passo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Card do QR Code Renderizado */}
        <div className="card-tabela" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: '#fff' }}>
            QR Code Oficial de Provisionamento
          </div>
          <p style={{ fontSize: '12px', color: 'var(--texto-secundario)', marginBottom: '20px' }}>
            Aponte a câmera do tablet novo para o código abaixo
          </p>

          <div className="qr-container" style={{ margin: '0 auto', background: '#fff', padding: '16px', borderRadius: '12px' }}>
            {carregando ? (
              <div style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                Gerando QR Code...
              </div>
            ) : dadosQr?.qr_code_imagem_base64 ? (
              <img
                src={dadosQr.qr_code_imagem_base64}
                alt="QR Code Android Enterprise"
                style={{ width: '260px', height: '260px', display: 'block' }}
              />
            ) : (
              <div style={{ color: '#ef4444' }}>Falha ao renderizar QR Code</div>
            )}
          </div>

          <div style={{ marginTop: '18px', fontSize: '12px', color: 'var(--texto-fraco)' }}>
            Contém credenciais Wi-Fi + Link do APK + Checksum SHA-256
          </div>
        </div>

        {/* Guia de 6 Toques Passo a Passo */}
        <div className="card-tabela" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <ShieldCheck size={22} color="var(--primaria)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Procedimento de Ativação do Tablet</h3>
          </div>

          <div className="instrucoes-box" style={{ lineHeight: '1.7', fontSize: '13px' }}>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li>
                <strong>Tire o tablet da caixa e ligue-o:</strong> Ele iniciará na tela de boas-vindas (*"Olá"* ou *"Iniciar"*).
              </li>
              <li>
                <strong>Gesto de 6 toques:</strong> Toque <strong>6 vezes seguidas</strong> no mesmo ponto vazio da tela inicial (onde não há botões).
              </li>
              <li>
                <strong>Abertura da Câmera:</strong> O leitor de QR Code nativo do Android Enterprise abrirá automaticamente na tela do tablet.
              </li>
              <li>
                <strong>Escanear:</strong> Aponte o tablet para o QR Code ao lado.
              </li>
              <li>
                <strong>Ativação Automática:</strong> O tablet se conectará ao seu Wi-Fi sozinho, baixará o APK e assumirá o papel de <strong>Device Owner</strong> sem nenhuma intervenção manual!
              </li>
            </ol>
          </div>

          {/* Payload JSON de Depuração */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--texto-secundario)' }}>
                Payload JSON Gerado:
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
      </div>
    </div>
  );
};
