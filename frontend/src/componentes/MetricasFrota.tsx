import React from 'react';
import { Tablet, Wifi, BatteryCharging, AlertTriangle, ShieldCheck, PlayCircle, Clock } from 'lucide-react';
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
    ociosos_moderados: 0,
    ociosos_criticos: 0,
    tempo_ocioso_medio_minutos: 0,
    taxa_utilizacao_percentual: 0,
  };

  const percentualConectados = capacidadeTotal > 0
    ? Math.round((metricas.conectados / capacidadeTotal) * 100)
    : 0;

  function formatar_minutos(min: number = 0): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  return (
    <div className="grid-metricas">
      {/* 1. Frota Total de Tablets */}
      <div className="card-metrica">
        <div className="card-metrica-header">
          <span>Frota Cadastrada</span>
          <Tablet size={18} color="#3b82f6" />
        </div>
        <div className="card-metrica-valor">
          {metricas.total_dispositivos}
          <span style={{ fontSize: '15px', color: 'var(--texto-fraco)', fontWeight: 500, marginLeft: '6px' }}>
            / {capacidadeTotal}
          </span>
        </div>
        <div className="card-metrica-sub">
          {capacidadeTotal - metricas.total_dispositivos} vagas livres no inventário
        </div>
      </div>

      {/* 2. Dispositivos Conectados (MQTTS Online) */}
      <div className="card-metrica">
        <div className="card-metrica-header">
          <span>Online em Tempo Real</span>
          <ShieldCheck size={18} color="#10b981" />
        </div>
        <div className="card-metrica-valor" style={{ color: '#34d399' }}>
          {metricas.conectados}
        </div>
        <div className="card-metrica-sub">
          {percentualConectados}% da frota conectada e comunicando
        </div>
      </div>

      {/* 3. Em Uso Ativo Agora (Tela Ligada + App em Primeiro Plano) */}
      <div className="card-metrica" style={{ border: '1px solid rgba(16, 185, 129, 0.35)', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)' }}>
        <div className="card-metrica-header">
          <span style={{ color: '#34d399', fontWeight: 600 }}>Em Uso Ativo Agora</span>
          <PlayCircle size={18} color="#10b981" />
        </div>
        <div className="card-metrica-valor" style={{ color: '#34d399', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          {metricas.em_uso_ativo}
          <span style={{ fontSize: '13px', color: '#6ee7b7', fontWeight: 500 }}>
            ({metricas.taxa_utilizacao_percentual ?? 0}% da frota)
          </span>
        </div>
        <div className="card-metrica-sub" style={{ color: '#a7f3d0' }}>
          Tablets operando com telas ativas e app em foco
        </div>
      </div>

      {/* 4. Ociosidade Moderada (2h a 24h sem uso) */}
      <div className="card-metrica" style={{ border: (metricas.ociosos_moderados ?? 0) > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : undefined }}>
        <div className="card-metrica-header">
          <span>Ociosos (2h a 24h)</span>
          <Clock size={18} color="#f59e0b" />
        </div>
        <div className="card-metrica-valor" style={{ color: (metricas.ociosos_moderados ?? 0) > 0 ? '#fbbf24' : '#ffffff' }}>
          {metricas.ociosos_moderados ?? 0}
        </div>
        <div className="card-metrica-sub">
          Tablets em repouso prolongado ou sem atividade
        </div>
      </div>

      {/* 5. Ociosidade Crítica (> 24h) - Alerta de Possível Abandono ou Reset Bootloader */}
      <div className="card-metrica" style={{ border: (metricas.ociosos_criticos ?? 0) > 0 ? '1px solid rgba(239, 68, 68, 0.5)' : undefined, background: (metricas.ociosos_criticos ?? 0) > 0 ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.7) 100%)' : undefined }}>
        <div className="card-metrica-header">
          <span style={{ color: (metricas.ociosos_criticos ?? 0) > 0 ? '#f87171' : undefined }}>Ociosidade Crítica (&ge; 24h)</span>
          <AlertTriangle size={18} color="#ef4444" />
        </div>
        <div className="card-metrica-valor" style={{ color: (metricas.ociosos_criticos ?? 0) > 0 ? '#f87171' : '#ffffff' }}>
          {metricas.ociosos_criticos ?? 0}
        </div>
        <div className="card-metrica-sub">
          Possível reset via bootloader, aparelho guardado ou sem contato
        </div>
      </div>

      {/* 6. Média Geral de Ociosidade & Saúde da Frota */}
      <div className="card-metrica">
        <div className="card-metrica-header">
          <span>Média de Ociosidade</span>
          <Clock size={18} color="#94a3b8" />
        </div>
        <div className="card-metrica-valor" style={{ color: '#e2e8f0' }}>
          {formatar_minutos(metricas.tempo_ocioso_medio_minutos ?? 0)}
        </div>
        <div className="card-metrica-sub">
          {metricas.bateria_critica > 0 ? `${metricas.bateria_critica} com bateria baixa` : 'Nenhum tablet com bateria crítica'}
        </div>
      </div>
    </div>
  );
};
