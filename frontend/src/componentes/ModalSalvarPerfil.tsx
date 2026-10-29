import React, { useState } from 'react';
import {
  X,
  BookmarkPlus,
  ShieldCheck,
  CheckCircle,
  Lock,
  Unlock,
  Package,
  Bluetooth,
  Globe,
  Smartphone,
} from 'lucide-react';
import { DadosPolitica, PerfilProvisionamentoItem, criar_perfil_api } from '../servicos/api_mdm';

interface PropriedadesModalSalvarPerfil {
  visivel: boolean;
  politicaAtual: DadosPolitica;
  aoFechar: () => void;
  aoSalvarSucesso: (perfilSalvo: PerfilProvisionamentoItem) => void;
}

export const ModalSalvarPerfil: React.FC<PropriedadesModalSalvarPerfil> = ({
  visivel,
  politicaAtual,
  aoFechar,
  aoSalvarSucesso,
}) => {
  const [nome, setNome] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  if (!visivel) return null;

  async function aoSubmeter(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe um nome identificador para este perfil.');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const resp = await criar_perfil_api({
        nome: nome.trim(),
        descricao: descricao.trim(),
        permitir_camera: politicaAtual.permitir_camera,
        bloquear_usb: politicaAtual.bloquear_usb,
        permitir_reset_fabrica: politicaAtual.permitir_reset_fabrica,
        bloquear_instalacao_apps: politicaAtual.bloquear_instalacao_apps ?? true,
        bloquear_bluetooth: politicaAtual.bloquear_bluetooth ?? false,
        modo_quiosque_app: politicaAtual.modo_quiosque_app || null,
        habilitar_modo_quiosque: politicaAtual.habilitar_modo_quiosque ?? false,
        pacotes_ocultos: politicaAtual.pacotes_ocultos || [],
        urls_permitidas: politicaAtual.urls_permitidas || [],
      });

      setNome('');
      setDescricao('');
      aoSalvarSucesso(resp.perfil);
      aoFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar perfil de provisionamento.');
    } finally {
      setSalvando(false);
    }
  }

  const totalBloqueados = (politicaAtual.pacotes_ocultos || []).length;
  const totalUrls = (politicaAtual.urls_permitidas || []).length;

  return (
    <div className="modal-sobreposicao" style={{ zIndex: 1050 }}>
      <div
        className="modal-conteudo"
        style={{
          maxWidth: '560px',
          width: '95%',
          background: 'var(--fundo-card)',
          border: '1px solid var(--borda-suave)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookmarkPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                Salvar Perfil de Provisionamento
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--texto-secundario)' }}>
                Salve o conjunto atual de restrições para reutilizar a qualquer momento
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

        <form onSubmit={aoSubmeter} style={{ padding: '24px' }}>
          {erro && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              {erro}
            </div>
          )}

          {/* Nome do Perfil */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
              Nome do Perfil <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Perfil ACS Zona Rural / Campo"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Descrição do Perfil */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
              Descrição e Finalidade
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva quando este perfil de provisionamento deve ser aplicado (ex: tablets designados para operação nas UBS sem internet aberta)..."
              rows={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: '#fff',
                fontSize: '13px',
                resize: 'none',
              }}
            />
          </div>

          {/* Resumo Visual das Diretrizes Inclusas no Perfil */}
          <div
            style={{
              background: 'var(--fundo-elevado)',
              border: '1px solid var(--borda-suave)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--texto-secundario)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Diretrizes que serão gravadas neste perfil:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={14} color="#f87171" />
                <span style={{ color: '#cbd5e1' }}>
                  Apps Ocultados: <strong style={{ color: '#fff' }}>{totalBloqueados} pacotes</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={14} color="#34d399" />
                <span style={{ color: '#cbd5e1' }}>
                  Lista Branca Chrome: <strong style={{ color: '#fff' }}>{totalUrls} domínios</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={14} color={politicaAtual.bloquear_usb ? '#34d399' : '#94a3b8'} />
                <span style={{ color: '#cbd5e1' }}>
                  Cabo USB: <strong style={{ color: '#fff' }}>{politicaAtual.bloquear_usb ? 'Bloqueado' : 'Liberado'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={14} color={politicaAtual.bloquear_instalacao_apps ? '#34d399' : '#94a3b8'} />
                <span style={{ color: '#cbd5e1' }}>
                  Instalação APKs: <strong style={{ color: '#fff' }}>{politicaAtual.bloquear_instalacao_apps ? 'Bloqueada' : 'Liberada'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bluetooth size={14} color={politicaAtual.bloquear_bluetooth ? '#f87171' : '#60a5fa'} />
                <span style={{ color: '#cbd5e1' }}>
                  Bluetooth: <strong style={{ color: '#fff' }}>{politicaAtual.bloquear_bluetooth ? 'Bloqueado' : 'Liberado'}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={14} color={!politicaAtual.permitir_reset_fabrica ? '#34d399' : '#f87171'} />
                <span style={{ color: '#cbd5e1' }}>
                  Reset de Fábrica: <strong style={{ color: '#fff' }}>{!politicaAtual.permitir_reset_fabrica ? 'Protegido' : 'Liberado'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={aoFechar}
              disabled={salvando}
              style={{ padding: '8px 18px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primario"
              disabled={salvando}
              style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <BookmarkPlus size={16} />
              {salvando ? 'Salvando Perfil...' : 'Salvar Perfil de Provisionamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
