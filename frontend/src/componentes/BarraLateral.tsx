import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Tablet,
  Package,
  ShieldCheck,
  QrCode,
  Shield,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../contextos/ContextoAutenticacao';

interface PropriedadesBarraLateral {
  totalTablets?: number;
  onlineTablets?: number;
}

export const BarraLateral: React.FC<PropriedadesBarraLateral> = ({
  totalTablets = 250,
  onlineTablets = 0,
}) => {
  const { usuario, logout } = useAuth();

  const itensNavegacao = [
    { caminho: '/', rotulo: 'Dashboard', icone: LayoutDashboard },
    { caminho: '/dispositivos', rotulo: 'Dispositivos', icone: Tablet },
    { caminho: '/aplicativos', rotulo: 'Catálogo de Apps', icone: Package },
    { caminho: '/politicas', rotulo: 'Políticas & Restrições', icone: ShieldCheck },
    { caminho: '/provisionamento', rotulo: 'Instalação via ADB', icone: QrCode },
  ];

  function aoClicarSair() {
    if (confirm('Deseja realmente encerrar sua sessão no painel MDM?')) {
      logout();
    }
  }

  return (
    <aside className="barra-lateral">
      {/* Topo / Logo */}
      <div className="barra-lateral-topo">
        <div className="logo-box">
          <Shield size={26} color="#3b82f6" />
          <div>
            <div className="logo-titulo">MDM Corporativo</div>
            <div className="logo-sub">Frota: {totalTablets} Tablets</div>
          </div>
        </div>
      </div>

      {/* Menu de Navegação */}
      <nav className="barra-lateral-menu">
        {itensNavegacao.map((item) => {
          const Icone = item.icone;
          return (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              className={({ isActive }) =>
                `item-navegacao ${isActive ? 'ativo' : ''}`
              }
              end={item.caminho === '/'}
            >
              <Icone size={18} />
              <span>{item.rotulo}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Perfil do Operador Autenticado e Botão Sair */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--borda-suave)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <User size={16} color="#60a5fa" />
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {usuario?.nome || 'Operador TI'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {usuario?.email || 'admin@mdm.corporativo'}
              </div>
            </div>
          </div>

          <button
            onClick={aoClicarSair}
            title="Sair do Sistema"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Status da VPS e MQTTS */}
        <div className="status-conexao-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="ponto-pulso" style={{ background: '#10b981', color: '#10b981' }}></span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>MQTTS Seguro</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--texto-fraco)', marginTop: '4px' }}>
            TLS 8883 • {onlineTablets} Online
          </div>
        </div>
      </div>
    </aside>
  );
};

