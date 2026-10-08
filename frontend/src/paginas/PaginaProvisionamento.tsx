import React from 'react';
import { Terminal, ShieldCheck, Download, CheckCircle, Usb } from 'lucide-react';

export const PaginaProvisionamento: React.FC = () => {
  return (
    <div className="pagina-conteudo">
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Instalação e Provisionamento via ADB</h2>
          <p className="pagina-subtitulo">
            Instruções detalhadas para registrar novos tablets como Device Owner na frota usando conexão via cabo USB.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Seção 1: Requisitos */}
        <div className="card-tabela" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Usb size={22} color="var(--primaria)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>1. Requisitos Iniciais</h3>
          </div>
          <div className="instrucoes-box" style={{ fontSize: '13px', lineHeight: '1.6' }}>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Tablet Formatado:</strong> O tablet deve ter sido restaurado para os padrões de fábrica recentemente e não possuir contas Google logadas.</li>
              <li><strong>Depuração USB:</strong> O tablet deve estar com as "Opções de Desenvolvedor" ativadas e a <strong>Depuração USB</strong> ligada.</li>
              <li><strong>Cabo de Dados:</strong> Conecte o tablet ao computador via cabo USB.</li>
              <li><strong>Plataforma Android:</strong> O computador precisa ter o ADB (Android Debug Bridge) instalado e reconhecido no terminal.</li>
            </ul>
          </div>
        </div>

        {/* Seção 2: Passos para Instalação */}
        <div className="card-tabela" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Terminal size={22} color="#10b981" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>2. Instalação e Ativação</h3>
          </div>
          <div className="instrucoes-box" style={{ fontSize: '13px', lineHeight: '1.6' }}>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li>
                <strong>Verifique a conexão:</strong>
                <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '8px', borderRadius: '6px', marginTop: '4px', border: '1px solid var(--borda-suave)', color: '#93c5fd' }}>
                  adb devices
                </pre>
                <em>Certifique-se de que o dispositivo aparece na lista e está "Autorizado".</em>
              </li>
              <li>
                <strong>Instale o Aplicativo (APK):</strong>
                <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '8px', borderRadius: '6px', marginTop: '4px', border: '1px solid var(--borda-suave)', color: '#93c5fd' }}>
                  adb install mdmapk.apk
                </pre>
              </li>
              <li>
                <strong>Defina como Device Owner:</strong>
                <pre className="texto-mono" style={{ background: 'var(--fundo-base)', padding: '8px', borderRadius: '6px', marginTop: '4px', border: '1px solid var(--borda-suave)', color: '#93c5fd', whiteSpace: 'pre-wrap' }}>
                  adb shell dpm set-device-owner com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo
                </pre>
                <em>Se retornar "Success", o dispositivo já é de uso corporativo.</em>
              </li>
            </ol>
          </div>
        </div>

      </div>

      {/* Seção de Validação */}
      <div className="card-metrica" style={{ marginTop: '24px', border: '1px solid rgba(52, 211, 153, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <CheckCircle size={24} color="#10b981" />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#34d399' }}>Pronto!</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.5' }}>
          Assim que a mensagem de sucesso for exibida no terminal, o tablet se conectará automaticamente ao servidor MQTTS. Em poucos segundos, ele aparecerá no <strong>Dashboard</strong> e na aba <strong>Dispositivos</strong> deste painel, pronto para receber telemetria e comandos remotos em lote.
        </p>
      </div>

    </div>
  );
};
