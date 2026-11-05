import React, { useState, useEffect } from 'react';
import {
  UserCog,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Lock,
  Mail,
  User,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  KeyRound,
  X,
  Search,
} from 'lucide-react';
import {
  UsuarioSistemaItem,
  listar_usuarios_sistema_api,
  cadastrar_usuario_sistema_api,
  atualizar_usuario_sistema_api,
  remover_usuario_sistema_api,
} from '../servicos/api_mdm';
import { useAuth } from '../contextos/ContextoAutenticacao';

export const PaginaUsuariosSistema: React.FC = () => {
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioSistemaItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [busca, setBusca] = useState<string>('');
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemErro, setMensagemErro] = useState<string>('');

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioSistemaItem | null>(null);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Campos do Formulário
  const [nome, setNome] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [perfil, setPerfil] = useState<'adm' | 'supervisor'>('supervisor');
  const [ativo, setAtivo] = useState<boolean>(true);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setCarregando(true);
    setMensagemErro('');
    try {
      const resp = await listar_usuarios_sistema_api();
      setUsuarios(resp.usuarios || []);
    } catch (erro: any) {
      setMensagemErro(erro.message || 'Falha ao carregar usuários do sistema.');
    } finally {
      setCarregando(false);
    }
  }

  function abrirModalCriar() {
    setUsuarioEmEdicao(null);
    setNome('');
    setEmail('');
    setSenha('');
    setPerfil('supervisor');
    setAtivo(true);
    setMensagemErro('');
    setModalAberto(true);
  }

  function abrirModalEditar(u: UsuarioSistemaItem) {
    setUsuarioEmEdicao(u);
    setNome(u.nome);
    setEmail(u.email);
    setSenha(''); // Deixa vazio; preenche apenas se for trocar
    setPerfil(u.perfil);
    setAtivo(u.ativo);
    setMensagemErro('');
    setModalAberto(true);
  }

  async function salvarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagemErro('');

    try {
      if (usuarioEmEdicao) {
        // Atualização
        await atualizar_usuario_sistema_api(usuarioEmEdicao.id, {
          nome,
          email,
          perfil,
          ativo,
          nova_senha: senha.trim() ? senha : undefined,
        });
        setMensagemSucesso(`Operador "${nome}" atualizado com sucesso!`);
      } else {
        // Criação
        if (!senha || senha.length < 8) {
          throw new Error('A senha de acesso deve possuir no mínimo 8 caracteres.');
        }
        await cadastrar_usuario_sistema_api({
          nome,
          email,
          senha,
          perfil,
          ativo,
        });
        setMensagemSucesso(`Novo operador "${nome}" (${perfil}) cadastrado com sucesso!`);
      }

      setModalAberto(false);
      carregarUsuarios();
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (erro: any) {
      setMensagemErro(erro.message || 'Erro ao salvar operador.');
    } finally {
      setSalvando(false);
    }
  }

  async function removerUsuario(u: UsuarioSistemaItem) {
    if (usuarioLogado && usuarioLogado.id === u.id) {
      alert('Você não pode excluir sua própria conta enquanto estiver conectado.');
      return;
    }

    if (!confirm(`Deseja realmente remover o acesso de "${u.nome}" (${u.email})?`)) {
      return;
    }

    try {
      await remover_usuario_sistema_api(u.id);
      setMensagemSucesso(`Operador "${u.nome}" removido do sistema.`);
      carregarUsuarios();
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (erro: any) {
      alert(erro.message || 'Falha ao remover usuário.');
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase();
    return (
      u.nome.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      u.perfil.toLowerCase().includes(termo)
    );
  });

  const totalAdms = usuarios.filter((u) => u.perfil === 'adm').length;
  const totalSupervisores = usuarios.filter((u) => u.perfil === 'supervisor').length;

  return (
    <div className="pagina-container" style={{ padding: '24px' }}>
      {/* Topo / Cabeçalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <UserCog size={28} color="#3b82f6" />
            Gestão de Usuários do Sistema
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', marginBottom: 0 }}>
            Controle de acesso granular e operadores do painel MDM (Perfis: Administrador e Supervisor)
          </p>
        </div>

        <button
          onClick={abrirModalCriar}
          className="botao botao-primario"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          <UserPlus size={18} />
          <span>Novo Operador</span>
        </button>
      </div>

      {/* Alertas */}
      {mensagemSucesso && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
          }}
        >
          <CheckCircle size={18} />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* Cards de Resumo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="card-kpi" style={{ padding: '18px', background: 'var(--card-fundo)' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Total de Operadores</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {usuarios.length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Acessos cadastrados para gestão
          </div>
        </div>

        <div className="card-kpi" style={{ padding: '18px', background: 'var(--card-fundo)' }}>
          <div style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} /> Administradores Gerais (Adm)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#60a5fa', marginTop: '6px' }}>
            {totalAdms}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Controle total de frota, comandos e políticas
          </div>
        </div>

        <div className="card-kpi" style={{ padding: '18px', background: 'var(--card-fundo)' }}>
          <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={16} /> Supervisores (Monitoração)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>
            {totalSupervisores}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Acesso exclusivo ao Dashboard para telemetria
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          background: 'var(--card-fundo)',
          padding: '10px 16px',
          borderRadius: '10px',
          border: '1px solid var(--borda-suave)',
        }}
      >
        <Search size={18} color="#64748b" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar operador por nome, e-mail ou perfil..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f8fafc',
            width: '100%',
            fontSize: '14px',
          }}
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela de Operadores */}
      <div
        style={{
          background: 'var(--card-fundo)',
          borderRadius: '12px',
          border: '1px solid var(--borda-suave)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--borda-suave)' }}>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Operador</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>E-mail</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Perfil de Acesso</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600 }}>Último Acesso</th>
              <th style={{ padding: '14px 16px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  Carregando operadores do sistema...
                </td>
              </tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  Nenhum operador encontrado com o filtro aplicado.
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((u) => {
                const ehAdm = u.perfil === 'adm';
                const ehEuMesmo = usuarioLogado?.id === u.id;

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: ehAdm ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: ehAdm ? '#60a5fa' : '#34d399',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          {u.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {u.nome} {ehEuMesmo && <span style={{ fontSize: '11px', color: '#38bdf8' }}>(Você)</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Cadastrado em {new Date(u.criado_em || '').toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                      {u.email}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {ehAdm ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <ShieldAlert size={14} /> Administrador Geral
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Eye size={14} /> Supervisor (Dashboard)
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {u.ativo ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                          Ativo
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                          Inativo
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px' }}>
                      {u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('pt-BR') : 'Nunca acessou'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => abrirModalEditar(u)}
                          className="botao botao-secundario"
                          style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Editar operador"
                        >
                          <Edit2 size={13} /> Editar
                        </button>

                        <button
                          onClick={() => removerUsuario(u)}
                          disabled={ehEuMesmo}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: ehEuMesmo ? '#64748b' : '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: ehEuMesmo ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                          }}
                          title={ehEuMesmo ? 'Você não pode excluir sua própria conta' : 'Excluir operador'}
                        >
                          <Trash2 size={13} /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Criação / Edição de Operador */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div
            className="modal-conteudo"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '95%',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '16px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Cabeçalho do Modal */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1e293b',
                background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: usuarioEmEdicao ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${usuarioEmEdicao ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    color: usuarioEmEdicao ? '#60a5fa' : '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {usuarioEmEdicao ? <UserCog size={22} /> : <UserPlus size={22} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                    {usuarioEmEdicao ? `Editar Operador: ${usuarioEmEdicao.nome}` : 'Cadastrar Novo Operador'}
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    {usuarioEmEdicao
                      ? 'Altere o nome, e-mail, permissões ou redefina a senha de acesso'
                      : 'Configure os dados de acesso e a permissão do novo operador do sistema'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalAberto(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={salvarUsuario} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Alerta de erro se houver */}
                {mensagemErro && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{mensagemErro}</span>
                  </div>
                )}

                {/* Campo Nome Completo */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      marginBottom: '8px',
                    }}
                  >
                    Nome Completo <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <User
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        color: '#64748b',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: João da Silva Santos"
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 44px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '13.5px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                      onBlur={(e) => (e.target.style.borderColor = '#334155')}
                    />
                  </div>
                </div>

                {/* Campo E-mail Corporativo */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      marginBottom: '8px',
                    }}
                  >
                    E-mail Corporativo <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        color: '#64748b',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operador@mdm.corporativo"
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 44px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '13.5px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                      onBlur={(e) => (e.target.style.borderColor = '#334155')}
                    />
                  </div>
                </div>

                {/* Seletor de Perfil de Acesso */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      marginBottom: '8px',
                    }}
                  >
                    Perfil de Acesso & Nível de Permissão <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    
                    {/* Perfil Supervisor */}
                    <div
                      onClick={() => setPerfil('supervisor')}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: `2px solid ${perfil === 'supervisor' ? '#10b981' : '#334155'}`,
                        background: perfil === 'supervisor' ? 'rgba(16, 185, 129, 0.08)' : '#1e293b',
                        boxShadow: perfil === 'supervisor' ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.2)',
                              color: '#34d399',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Eye size={15} />
                          </div>
                          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13.5px' }}>Supervisor</span>
                        </div>
                        <input
                          type="radio"
                          name="perfil_operador"
                          checked={perfil === 'supervisor'}
                          onChange={() => setPerfil('supervisor')}
                          style={{ accentColor: '#10b981', cursor: 'pointer' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginTop: '4px' }}>
                        Acesso ao Dashboard e vínculo de tablets a agentes. Sem comandos remotos ou exclusões.
                      </p>
                    </div>

                    {/* Perfil Administrador */}
                    <div
                      onClick={() => setPerfil('adm')}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: `2px solid ${perfil === 'adm' ? '#3b82f6' : '#334155'}`,
                        background: perfil === 'adm' ? 'rgba(59, 130, 246, 0.08)' : '#1e293b',
                        boxShadow: perfil === 'adm' ? '0 0 15px rgba(59, 130, 246, 0.15)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.2)',
                              color: '#60a5fa',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ShieldAlert size={15} />
                          </div>
                          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13.5px' }}>Administrador</span>
                        </div>
                        <input
                          type="radio"
                          name="perfil_operador"
                          checked={perfil === 'adm'}
                          onChange={() => setPerfil('adm')}
                          style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4, marginTop: '4px' }}>
                        Controle irrestrito: comandos remotos, políticas de bloqueio e gestão de operadores.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Senha de Acesso */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#e2e8f0',
                      marginBottom: '8px',
                    }}
                  >
                    {usuarioEmEdicao ? 'Nova Senha de Acesso (Opcional)' : 'Senha de Acesso *'}
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        color: '#64748b',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="password"
                      required={!usuarioEmEdicao}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder={usuarioEmEdicao ? 'Deixe em branco para manter a senha atual' : 'Mínimo de 8 caracteres'}
                      minLength={senha ? 8 : undefined}
                      style={{
                        width: '100%',
                        padding: '11px 14px 11px 44px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '13.5px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
                      }}
                      onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                      onBlur={(e) => (e.target.style.borderColor = '#334155')}
                    />
                  </div>
                  {usuarioEmEdicao && (
                    <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                      Preencha apenas caso deseje resetar a senha deste operador.
                    </small>
                  )}
                </div>

                {/* Status Ativo / Inativo */}
                <div
                  onClick={() => setAtivo(!ativo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: ativo ? '#10b981' : '#ef4444',
                        boxShadow: ativo ? '0 0 8px #10b981' : '0 0 8px #ef4444',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                        {ativo ? 'Conta Ativa e Liberada' : 'Conta Desativada / Suspensa'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {ativo ? 'O operador pode realizar login normalmente' : 'Acesso bloqueado até reativação'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </div>

              </div>

              {/* Rodapé do Modal */}
              <div
                style={{
                  padding: '16px 24px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  borderTop: '1px solid #1e293b',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  disabled={salvando}
                  style={{
                    padding: '10px 18px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderColor = '#475569';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.borderColor = '#334155';
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  style={{
                    padding: '10px 22px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: salvando ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    opacity: salvando ? 0.7 : 1,
                  }}
                >
                  {salvando ? (
                    <>Salvando...</>
                  ) : usuarioEmEdicao ? (
                    <>
                      <CheckCircle size={16} /> Salvar Alterações
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} /> Cadastrar Operador
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

