import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Tablet,
  Package,
  ShieldCheck,
  QrCode,
  Shield,
  Wifi,
} from 'lucide-react';

interface PropriedadesBarraLateral {
  totalTablets?: number;
  onlineTablets?: number;
}

export const BarraLateral: React.FC<PropriedadesBarraLateral> = ({
  totalTablets = 250,
  onlineTablets = 0,
}) => {
  const itensNavegacao = [
    { caminho: '/', rotulo: 'Dashboard', icone: LayoutDashboard },
    { caminho: '/dispositivos', rotulo: 'Dispositivos', icone: Tablet },
    { caminho: '/aplicativos', rotulo: 'Catálogo de Apps', icone: Package },
    { caminho: '/politicas', rotulo: 'Políticas & Restrições', icone: ShieldCheck },
    { caminho: '/provisionamento', rotulo: 'Provisionamento QR', icone: QrCode },
  ];

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

      {/* Rodapé / Status da VPS e MQTTS */}
      <div className="barra-lateral-rodape">
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
