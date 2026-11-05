import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Tablet,
  CheckCircle,
  AlertCircle,
  Save,
  UserPlus,
  Edit3,
  Building,
  CreditCard,
} from 'lucide-react';
import {
  UsuarioTabletItem,
  DispositivoItem,
  cadastrar_usuario_tablet_api,
  atualizar_usuario_tablet_api,
} from '../servicos/api_mdm';

interface PropriedadesModalUsuarioTablet {
  visivel: boolean;
  usuarioParaEditar: UsuarioTabletItem | null;
  dispositivos: DispositivoItem[];
  usuariosExistentes: UsuarioTabletItem[];
  aoFechar: () => void;
  aoSalvarSucesso: (usuario: UsuarioTabletItem, mensagem: string) => void;
}

export const ModalUsuarioTablet: React.FC<PropriedadesModalUsuarioTablet> = ({
  visivel,
  usuarioParaEditar,
  dispositivos,
  usuariosExistentes,
  aoFechar,
  aoSalvarSucesso,
}) => {
  const [nomeCompleto, setNomeCompleto] = useState<string>('');
  const [unidadeBasica, setUnidadeBasica] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [dispositivoId, setDispositivoId] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  const ehEdicao = Boolean(usuarioParaEditar);

  useEffect(() => {
    if (usuarioParaEditar) {
      setNomeCompleto(usuarioParaEditar.nome_completo || '');
      setUnidadeBasica(usuarioParaEditar.unidade_basica || '');
      setCpf(usuarioParaEditar.cpf || '');
      setEmail(usuarioParaEditar.email || '');
      setTelefone(usuarioParaEditar.telefone || '');
      setDispositivoId(usuarioParaEditar.dispositivo_id || '');
    } else {
      setNomeCompleto('');
      setUnidadeBasica('');
      setCpf('');
      setEmail('');
      setTelefone('');
      setDispositivoId('');
    }
    setErro('');
  }, [usuarioParaEditar, visivel]);

  if (!visivel) return null;

  // Formatação amigável de CPF brasileiro: 000.000.000-00
  function aoMudarCpf(valor: string) {
    const apenasDigitos = valor.replace(/\D/g, '').slice(0, 11);
    let formatado = apenasDigitos;
    if (apenasDigitos.length > 9) {
      formatado = `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6, 9)}-${apenasDigitos.slice(9)}`;
    } else if (apenasDigitos.length > 6) {
      formatado = `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6)}`;
    } else if (apenasDigitos.length > 3) {
      formatado = `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3)}`;
    }
    setCpf(formatado);
  }

  // Formatação automática amigável de telefone brasileiro (XX) XXXXX-XXXX
  function aoMudarTelefone(valor: string) {
    const apenasDigitos = valor.replace(/\D/g, '');
    let formatado = apenasDigitos;

    if (apenasDigitos.length > 11) {
      formatado = apenasDigitos.slice(0, 11);
    }

    if (formatado.length > 6) {
      formatado = `(${formatado.slice(0, 2)}) ${formatado.slice(2, 7)}-${formatado.slice(7)}`;
    } else if (formatado.length > 2) {
      formatado = `(${formatado.slice(0, 2)}) ${formatado.slice(2)}`;
    } else if (formatado.length > 0) {
      formatado = `(${formatado}`;
    }

    setTelefone(formatado);
  }

  async function aoSubmeter(e: React.FormEvent) {
    e.preventDefault();

    if (!nomeCompleto.trim() || nomeCompleto.trim().length < 3) {
      setErro('Informe o nome completo do Agente (mínimo de 3 caracteres).');
      return;
    }

    if (!unidadeBasica.trim()) {
      setErro('Informe a Unidade Básica (USF / UBS) do Agente.');
      return;
    }

    const digitosCpf = cpf.replace(/\D/g, '');
    if (digitosCpf.length !== 11) {
      setErro('Informe um CPF válido com 11 dígitos numéricos.');
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErro('Informe um endereço de e-mail corporativo válido.');
      return;
    }

    if (!telefone.trim() || telefone.replace(/\D/g, '').length < 10) {
      setErro('Informe um telefone de contato válido com DDD (mínimo 10 dígitos).');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      if (ehEdicao && usuarioParaEditar) {
        const resp = await atualizar_usuario_tablet_api(usuarioParaEditar.id, {
          nome_completo: nomeCompleto.trim(),
          unidade_basica: unidadeBasica.trim(),
          cpf: cpf.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone.trim(),
          dispositivo_id: dispositivoId || null,
        });
        aoSalvarSucesso(resp.usuario, resp.mensagem);
      } else {
        const resp = await cadastrar_usuario_tablet_api({
          nome_completo: nomeCompleto.trim(),
          unidade_basica: unidadeBasica.trim(),
          cpf: cpf.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone.trim(),
          dispositivo_id: dispositivoId || null,
        });
        aoSalvarSucesso(resp.usuario, resp.mensagem);
      }
      aoFechar();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar dados do usuário.');
    } finally {
      setSalvando(false);
    }
  }

  // Identifica se o tablet selecionado já está em uso por outro usuário
  const usuarioDoTabletSelecionado = dispositivoId
    ? usuariosExistentes.find(
        (u) =>
          u.dispositivo_id === dispositivoId &&
          (!usuarioParaEditar || u.id !== usuarioParaEditar.id)
      )
    : null;

  return (
    <div className="modal-sobreposicao" style={{ zIndex: 1060 }}>
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
                background: ehEdicao ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: ehEdicao ? '#60a5fa' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {ehEdicao ? <Edit3 size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                {ehEdicao ? 'Editar Responsável pelo Tablet' : 'Cadastrar Responsável / Agente'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--texto-secundario)' }}>
                {ehEdicao
                  ? 'Atualize a unidade básica, CPF, contatos e o tablet vinculado'
                  : 'Cadastre os dados completos do agente para emissão do Termo de Entrega'}
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
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{erro}</span>
            </div>
          )}

          {/* Nome Completo */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '6px',
              }}
            >
              Nome Completo do Agente (ACS / Servidor) <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}
              />
              <input
                type="text"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Ex: Maria Aparecida dos Santos"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Grid de 2 Colunas: Unidade Básica e CPF */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            {/* Unidade Básica */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: '6px',
                }}
              >
                Unidade Básica (USF / UBS) <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Building
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}
                />
                <input
                  type="text"
                  value={unidadeBasica}
                  onChange={(e) => setUnidadeBasica(e.target.value)}
                  placeholder="Ex: USF 01 Centro"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* CPF */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: '6px',
                }}
              >
                CPF do Agente <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <CreditCard
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}
                />
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => aoMudarCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  required
                  maxLength={14}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Grid de 2 Colunas: E-mail e Telefone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            {/* E-mail de Contato */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: '6px',
                }}
              >
                E-mail para Contato <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agente@saude.gov.br"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* Telefone para Contato */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: '6px',
                }}
              >
                Telefone / Celular <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}
                />
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => aoMudarTelefone(e.target.value)}
                  placeholder="(81) 98765-4321"
                  required
                  maxLength={15}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    background: 'var(--fundo-base)',
                    border: '1px solid var(--borda-suave)',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tablet Vinculado */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '6px',
              }}
            >
              Tablet Corporativo Vinculado (Alocação)
            </label>
            <div style={{ position: 'relative' }}>
              <Tablet
                size={16}
                style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }}
              />
              <select
                value={dispositivoId}
                onChange={(e) => setDispositivoId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '8px',
                  background: 'var(--fundo-base)',
                  border: '1px solid var(--borda-suave)',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <option value="">-- Nenhum Tablet Atribuído (Aguardando Alocação) --</option>
                {dispositivos.map((d) => {
                  const ocupadoPor = usuariosExistentes.find(
                    (u) =>
                      u.dispositivo_id === d.id &&
                      (!usuarioParaEditar || u.id !== usuarioParaEditar.id)
                  );
                  return (
                    <option key={d.id} value={d.id}>
                      📱 {d.modelo} — SN: {d.numero_serie} {ocupadoPor ? `[Em uso por: ${ocupadoPor.nome_completo}]` : '[Disponível no Estoque]'}
                    </option>
                  );
                })}
              </select>
            </div>

            {usuarioDoTabletSelecionado && (
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                ⚠️ Atenção: Este tablet já está alocado para <strong>{usuarioDoTabletSelecionado.nome_completo}</strong>. Ao salvar, ele será transferido.
              </div>
            )}
          </div>

          {/* Botões do Rodapé */}
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
              style={{
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Save size={16} />
              {salvando ? 'Salvando...' : ehEdicao ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
