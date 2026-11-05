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

      {/* Modal de Criação / Edição */}
      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-caixa" style={{ maxWidth: '520px', width: '100%' }}>
            <div className="modal-cabecalho">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={22} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                  {usuarioEmEdicao ? `Editar Operador: ${usuarioEmEdicao.nome}` : 'Cadastrar Novo Operador'}
                </h3>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={salvarUsuario}>
              <div className="modal-corpo" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João da Silva Santos"
                    className="campo-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    E-mail Corporativo *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operador@mdm.corporativo"
                    className="campo-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    Perfil de Acesso *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <label
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${perfil === 'supervisor' ? '#10b981' : 'var(--borda-suave)'}`,
                        background: perfil === 'supervisor' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="perfil"
                          checked={perfil === 'supervisor'}
                          onChange={() => setPerfil('supervisor')}
                        />
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>Supervisor</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', paddingLeft: '22px' }}>
                        Acesso exclusivo ao Dashboard para monitoramento. Sem comandos ou exclusões.
                      </span>
                    </label>

                    <label
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${perfil === 'adm' ? '#3b82f6' : 'var(--borda-suave)'}`,
                        background: perfil === 'adm' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="perfil"
                          checked={perfil === 'adm'}
                          onChange={() => setPerfil('adm')}
                        />
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>Administrador (Adm)</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8', paddingLeft: '22px' }}>
                        Controle total: frota, catálogo, comandos remotos, políticas e novos operadores.
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                    {usuarioEmEdicao ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                  </label>
                  <input
                    type="password"
                    required={!usuarioEmEdicao}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={usuarioEmEdicao ? '••••••••' : 'Mínimo de 8 caracteres'}
                    minLength={senha ? 8 : undefined}
                    className="campo-input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="chkAtivo"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkAtivo" style={{ fontSize: '13px', color: '#f8fafc', cursor: 'pointer' }}>
                    Conta ativa e liberada para login
                  </label>
                </div>
              </div>

              <div className="modal-rodape" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="botao botao-secundario"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="botao botao-primario"
                  disabled={salvando}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {salvando ? 'Salvando...' : usuarioEmEdicao ? 'Salvar Alterações' : 'Cadastrar Operador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

