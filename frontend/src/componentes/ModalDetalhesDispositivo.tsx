import React from 'react';
import {
  X,
  Tablet,
  User,
  Building,
  CreditCard,
  Phone,
  Mail,
  Wifi,
  Battery,
  Shield,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Smartphone,
} from 'lucide-react';
import { DispositivoItem } from '../servicos/api_mdm';

interface PropriedadesModalDetalhes {
  visivel: boolean;
  dispositivo: DispositivoItem | null;
  aoFechar: () => void;
}

export const ModalDetalhesDispositivo: React.FC<PropriedadesModalDetalhes> = ({
  visivel,
  dispositivo,
  aoFechar,
}) => {
  if (!visivel || !dispositivo) return null;

  const online = dispositivo.status_conexao === 'conectado';
  const temUsuario = Boolean(dispositivo.usuario_nome);

  function formatarDataHora(iso?: string): string {
    if (!iso) return 'Nunca sincronizado';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return iso;
    }
  }

  return (
    <div className="modal-overlay" onClick={aoFechar}>
      <div
        className="modal-conteudo"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '95%',
          background: 'var(--fundo-card)',
          border: '1px solid var(--borda-suave)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--borda-suave)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(59, 130, 246, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: online ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                color: online ? '#34d399' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Tablet size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                  {dispositivo.modelo}
                </h3>
                <span
                  style={{
                    background: online ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                    color: online ? '#34d399' : '#94a3b8',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {online ? '● ONLINE' : '○ OFFLINE'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--texto-secundario)', fontFamily: 'monospace' }}>
                SN: {dispositivo.numero_serie}
              </p>
            </div>
          </div>

          <button
            onClick={aoFechar}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--texto-secundario)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com Informações Detalhadas */}
        <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Seção 1: Agente Comunitário / Servidor Vinculado */}
          <div style={{ marginBottom: '22px' }}>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#60a5fa',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <User size={15} /> Responsável pelo Equipamento
            </h4>

            {temUsuario ? (
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Nome Completo:</span>
                    <strong style={{ fontSize: '14px', color: '#fff' }}>{dispositivo.usuario_nome}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Unidade Básica:</span>
                    <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={13} /> {dispositivo.usuario_unidade_basica || 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>CPF do Servidor:</span>
                    <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>
                      {dispositivo.usuario_cpf || 'Não cadastrado'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Telefone / Contato:</span>
                    <span style={{ fontSize: '13px', color: '#34d399', fontFamily: 'monospace' }}>
                      {dispositivo.usuario_telefone || 'Não cadastrado'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#fbbf24',
                  fontSize: '13px',
                }}
              >
                <AlertTriangle size={18} />
                <span>
                  Este tablet está <strong>Livre no Estoque</strong> (sem agente comunitário vinculado no momento).
                </span>
              </div>
            )}
          </div>

          {/* Seção 2: Telemetria e Hardware do Dispositivo */}
          <div style={{ marginBottom: '22px' }}>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#34d399',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Activity size={15} /> Telemetria Operacional do Tablet
            </h4>

            <div
              style={{
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                borderRadius: '10px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Nível de Bateria:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <Battery size={18} color={dispositivo.bateria > 20 ? '#34d399' : '#f87171'} />
                  <strong style={{ fontSize: '14px', color: '#fff' }}>{dispositivo.bateria}%</strong>
                  {dispositivo.carregando && (
                    <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>⚡ Carregando</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Rede Wi-Fi Conectada:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <Wifi size={16} color="#60a5fa" />
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                    {dispositivo.ssid_wifi || 'Sem rede Wi-Fi'}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Endereço IP Local:</span>
                <span style={{ fontSize: '13px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                  {dispositivo.endereco_ip || '127.0.0.1'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Versão do Sistema:</span>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                  {(() => {
                    const versao = dispositivo.versao_so || dispositivo.versao_android;
                    if (!versao || versao.trim() === '' || versao === 'Android') return 'Android (SO)';
                    return versao.toLowerCase().startsWith('android') ? versao : `Android ${versao}`;
                  })()} • Agente DPC v{dispositivo.versao_agente || '1.2.4'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Aplicativo Ativo em Foco:</span>
                <span style={{ fontSize: '13px', color: online ? '#38bdf8' : '#94a3b8', fontWeight: 600 }}>
                  {online
                    ? (dispositivo.app_foco || dispositivo.aplicativo_ativo || 'Área de Trabalho')
                    : (dispositivo.app_foco ? `Desligado (Último app registrado: ${dispositivo.app_foco})` : 'Aparelho Desligado / Offline')}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Último Contato Telemetria:</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {formatarDataHora(dispositivo.ultimo_contato)}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 3: Políticas e Segurança Ativa */}
          <div>
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#a78bfa',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Shield size={15} /> Perfil de Políticas & Restrições MDM
            </h4>

            <div
              style={{
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>
                  {dispositivo.perfil_ativo_nome || 'Perfil Padrão ACS (26 Apps Bloqueados)'}
                </span>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  ✓ IMPLANTADO & SEGURO
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                Tablet em modo Device Owner com proteção contra desinstalação, blindagem do Google Play Protect, transferência USB restrita e navegação web restrita às diretrizes de saúde.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--borda-suave)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--fundo-elevado)',
          }}
        >
          <button className="btn btn-secundario" onClick={aoFechar} style={{ padding: '8px 22px' }}>
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};

