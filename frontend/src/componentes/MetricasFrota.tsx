import React from 'react';
import { Tablet, Wifi, BatteryCharging, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MetricasFrotaResposta } from '../servicos/api_mdm';

interface PropriedadesMetricas {
  dadosMetricas: MetricasFrotaResposta['metricas'] | null;
  capacidadeTotal?: number;
}

export const MetricasFrota: React.FC<PropriedadesMetricas> = ({
  dadosMetricas,
  capacidadeTotal = 250,
}) => {
  const metricas = dadosMetricas || {
    total_dispositivos: 0,
    conectados: 0,
    desconectados: 0,
    bateria_critica: 0,
    sinal_wifi_fraco: 0,
    em_uso_ativo: 0,
  };

  const percentualConectados = capacidadeTotal > 0
    ? Math.round((metricas.conectados / capacidadeTotal) * 100)
    : 0;

  return (
    <div className="grid-metricas">
      {/* Total de Tablets Provisionados */}
      <div className="card-metrica">
        <div className="card-metrica-header">
          <span>Frota Total de Tablets</span>
          <Tablet size={18} color="#3b82f6" />
        </div>
        <div className="card-metrica-valor">
          {metricas.total_dispositivos}
          <span style={{ fontSize: '16px', color: 'var(--texto-fraco)', fontWeight: 500, marginLeft: '6px' }}>
            / {capacidadeTotal}
          </span>
        </div>
        <div className="card-metrica-sub">
          {capacidadeTotal - metricas.total_dispositivos} slots de provisionamento disponíveis
        </div>
      </div>

      {/* Dispositivos Conectados (MQTTS Online) */}
      <div className="card-metrica">
        <div className="card-metrica-header">
          <span>Conectados em Tempo Real</span>
          <ShieldCheck size={18} color="#10b981" />
        </div>
        <div className="card-metrica-valor" style={{ color: '#34d399' }}>
          {metricas.conectados}
        </div>
        <div className="card-metrica-sub">
          {percentualConectados}% da frota com conexão TLS ativa
        </div>
      </div>

      {/* Alerta de Bateria Crítica */}
      <div className="card-metrica">
        <div className="card-metrica-header">
          <span>Bateria Crítica (&le; 20%)</span>
          <BatteryCharging size={18} color="#f59e0b" />
        </div>
        <div className="card-metrica-valor" style={{ color: metricas.bateria_critica > 0 ? '#fbbf24' : '#ffffff' }}>
          {metricas.bateria_critica}
        </div>
        <div className="card-metrica-sub">
          Tablets que necessitam de recarga imediata
        </div>
      </div>

      {/* Sinal Wi-Fi Fraco */}
      <div className="card-metrica">
        <div className="card-metrica-header">
          <span>Sinal Wi-Fi Fraco</span>
          <Wifi size={18} color="#ef4444" />
        </div>
        <div className="card-metrica-valor" style={{ color: metricas.sinal_wifi_fraco > 0 ? '#f87171' : '#ffffff' }}>
          {metricas.sinal_wifi_fraco}
        </div>
        <div className="card-metrica-sub">
          RSSI &lt; -75 dBm (possível instabilidade)
        </div>
      </div>
    </div>
  );
};
