import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  RefreshCw,
  Search,
  Filter,
  Tablet,
  Mail,
  Phone,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  Building,
  CreditCard,
  Printer,
  FileText,
} from 'lucide-react';
import {
  UsuarioTabletItem,
  DispositivoItem,
  listar_usuarios_tablets_api,
  remover_usuario_tablet_api,
} from '../servicos/api_mdm';
import { ModalUsuarioTablet } from '../componentes/ModalUsuarioTablet';
import { ModalTermoResponsabilidade } from '../componentes/ModalTermoResponsabilidade';

interface PropriedadesPaginaUsuariosTablets {
  dispositivos: DispositivoItem[];
}

export const PaginaUsuariosTablets: React.FC<PropriedadesPaginaUsuariosTablets> = ({
  dispositivos,
}) => {
  const [usuarios, setUsuarios] = useState<UsuarioTabletItem[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [busca, setBusca] = useState<string>('');
  const [filtroVinculo, setFiltroVinculo] = useState<'todos' | 'com_tablet' | 'sem_tablet'>('todos');
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');

  // Estados dos Modais
  const [modalVisivel, setModalVisivel] = useState<boolean>(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioTabletItem | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Modal do Termo de Responsabilidade
  const [usuarioParaTermo, setUsuarioParaTermo] = useState<UsuarioTabletItem | null>(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setCarregando(true);
    try {
      const resp = await listar_usuarios_tablets_api();
      setUsuarios(resp.usuarios || []);
    } catch (erro) {
      console.error('Erro ao listar usuários dos tablets:', erro);
    } finally {
      setCarregando(false);
    }
  }

  function aoAbrirCadastro() {
    setUsuarioEmEdicao(null);
    setModalVisivel(true);
  }

  function aoAbrirEdicao(user: UsuarioTabletItem) {
    setUsuarioEmEdicao(user);
    setModalVisivel(true);
  }

  function aoAbrirTermo(user: UsuarioTabletItem) {
    setUsuarioParaTermo(user);
  }

  async function aoExcluir(user: UsuarioTabletItem) {
    const confirmacao = confirm(
      `Deseja realmente remover o usuário "${user.nome_completo}"?\n\nO tablet vinculado (se houver) ficará desassociado e disponível para outro responsável.`
    );
    if (!confirmacao) return;

    setExcluindoId(user.id);
    try {
      const resp = await remover_usuario_tablet_api(user.id);
      setMensagemSucesso(`✓ ${resp.mensagem}`);
      setTimeout(() => setMensagemSucesso(''), 4000);
      carregarUsuarios();
    } catch (erro: any) {
      alert(`Falha ao remover usuário: ${erro.message || 'Erro inesperado.'}`);
    } finally {
      setExcluindoId(null);
    }
  }

  function aoSalvarSucesso(usuarioSalvo: UsuarioTabletItem, msg: string) {
    setMensagemSucesso(`✓ ${msg}`);
    setTimeout(() => setMensagemSucesso(''), 4000);
    carregarUsuarios();
  }

  // Filtragem e busca reativa
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((user) => {
      const termo = busca.toLowerCase();
      const matchBusca =
        user.nome_completo.toLowerCase().includes(termo) ||
        (user.unidade_basica && user.unidade_basica.toLowerCase().includes(termo)) ||
        (user.cpf && user.cpf.toLowerCase().includes(termo)) ||
        user.email.toLowerCase().includes(termo) ||
        user.telefone.toLowerCase().includes(termo) ||
        (user.dispositivo_numero_serie && user.dispositivo_numero_serie.toLowerCase().includes(termo)) ||
        (user.dispositivo_modelo && user.dispositivo_modelo.toLowerCase().includes(termo));

      let matchFiltro = true;
      if (filtroVinculo === 'com_tablet') {
        matchFiltro = Boolean(user.dispositivo_id);
      } else if (filtroVinculo === 'sem_tablet') {
        matchFiltro = !user.dispositivo_id;
      }

      return matchBusca && matchFiltro;
    });
  }, [usuarios, busca, filtroVinculo]);

  // Métricas calculadas
  const totalUsuarios = usuarios.length;
  const usuariosComTablet = usuarios.filter((u) => u.dispositivo_id).length;
  const tabletsDisponiveis = Math.max(0, dispositivos.length - usuariosComTablet);
  const taxaAlocacao = dispositivos.length > 0 ? Math.round((usuariosComTablet / dispositivos.length) * 100) : 0;

  // Localiza dispositivo associado ao usuário para o termo
  const dispositivoDoTermo = useMemo(() => {
    if (!usuarioParaTermo || !usuarioParaTermo.dispositivo_id) return null;
    return dispositivos.find((d) => d.id === usuarioParaTermo.dispositivo_id) || null;
  }, [usuarioParaTermo, dispositivos]);

  return (
    <div className="pagina-conteudo">
      {/* Cabeçalho da Página */}
      <div className="pagina-cabecalho">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 className="pagina-titulo" style={{ margin: 0 }}>Usuários dos Tablets (Agentes / Responsáveis)</h2>
            <span
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Gestão de Frota & Termos
            </span>
          </div>
          <p className="pagina-subtitulo">
            Controle de alocação de equipamentos: cadastre nome, unidade básica (USF/UBS), CPF, telefone, e-mail e emita o Termo de Entrega Oficial para assinatura
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button
            className="btn btn-secundario"
            onClick={carregarUsuarios}
            title="Recarregar"
            disabled={carregando}
          >
            <RefreshCw size={14} className={carregando ? 'anim-spin' : ''} />
            Atualizar
          </button>
          <button
            className="btn btn-primario"
            onClick={aoAbrirCadastro}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <UserPlus size={16} />
            Cadastrar Novo Usuário
          </button>
        </div>
      </div>

      {mensagemSucesso && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle size={18} />
          {mensagemSucesso}
        </div>
      )}

      {/* Grid de Métricas / KPIs */}
      <div className="grid-metricas" style={{ marginBottom: '24px' }}>
        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Total de Usuários Cadastrados</div>
            <div className="card-metrica-valor">{totalUsuarios}</div>
          </div>
        </div>

        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Tablet size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Tablets com Agentes (Termo Emitido)</div>
            <div className="card-metrica-valor">{usuariosComTablet}</div>
          </div>
        </div>

        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Smartphone size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Tablets Livres em Estoque</div>
            <div className="card-metrica-valor">{tabletsDisponiveis}</div>
          </div>
        </div>

        <div className="card-metrica">
          <div className="card-metrica-icone" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="card-metrica-rotulo">Taxa de Cobertura da Frota</div>
            <div className="card-metrica-valor">{taxaAlocacao}%</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="card-tabela" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, unidade básica, CPF, telefone ou serial do tablet..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={15} color="var(--texto-secundario)" />
            <select
              value={filtroVinculo}
              onChange={(e) => setFiltroVinculo(e.target.value as any)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                background: 'var(--fundo-base)',
                border: '1px solid var(--borda-suave)',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              <option value="todos">Todos os Registros ({usuarios.length})</option>
              <option value="com_tablet">Com Tablet Vinculado ({usuariosComTablet})</option>
              <option value="sem_tablet">Sem Tablet Vinculado ({usuarios.length - usuariosComTablet})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários e Tablets Vinculados */}
      <div className="card-tabela" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--borda-suave)', background: 'var(--fundo-elevado)', color: 'var(--texto-secundario)' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Agente / Servidor</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Unidade Básica (USF / UBS)</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>CPF</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Contatos</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Tablet Vinculado</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Ações & Termo</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
                    {busca || filtroVinculo !== 'todos'
                      ? 'Nenhum usuário localizado para os filtros informados.'
                      : 'Nenhum usuário cadastrado até o momento. Clique em "Cadastrar Novo Usuário" para começar.'}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((user) => {
                  const estaExcluindo = excluindoId === user.id;
                  const iniciais = user.nome_completo
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid var(--borda-suave)',
                        transition: 'background 0.15s ease',
                      }}
                      className="linha-tabela-hover"
                    >
                      {/* Nome e Avatar */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.25) 100%)',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              color: '#60a5fa',
                              fontWeight: 700,
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {iniciais || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                              {user.nome_completo}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              Agente Comunitário de Saúde
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Unidade Básica */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building size={14} color="#38bdf8" />
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                            {user.unidade_basica || 'Não informada'}
                          </span>
                        </div>
                      </td>

                      {/* CPF */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CreditCard size={14} color="#94a3b8" />
                          <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
                            {user.cpf || 'Não informado'}
                          </span>
                        </div>
                      </td>

                      {/* Contatos */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                          <a
                            href={`tel:${user.telefone.replace(/\D/g, '')}`}
                            style={{
                              color: '#34d399',
                              textDecoration: 'none',
                              fontFamily: 'monospace',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Phone size={12} color="#34d399" />
                            <span>{user.telefone}</span>
                          </a>
                          <a
                            href={`mailto:${user.email}`}
                            style={{
                              color: '#94a3b8',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                            }}
                          >
                            <Mail size={12} color="#94a3b8" />
                            <span>{user.email}</span>
                          </a>
                        </div>
                      </td>

                      {/* Tablet Vinculado */}
                      <td style={{ padding: '14px 20px' }}>
                        {user.dispositivo_id ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              gap: '2px',
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Tablet size={13} color="#60a5fa" />
                              <strong style={{ color: '#fff', fontSize: '12px' }}>
                                {user.dispositivo_modelo || 'Tablet Corporativo'}
                              </strong>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '11px',
                                color: 'var(--texto-secundario)',
                              }}
                            >
                              <span className="texto-mono" style={{ color: '#38bdf8' }}>SN: {user.dispositivo_numero_serie || 'Atribuído'}</span>
                              {user.dispositivo_status && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: user.dispositivo_status === 'conectado' ? '#34d399' : '#94a3b8',
                                  }}
                                  title={`Status: ${user.dispositivo_status}`}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <AlertCircle size={12} />
                            Sem Tablet Atribuído
                          </span>
                        )}
                      </td>

                      {/* Ações & Termo de Responsabilidade */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="btn btn-primario"
                            onClick={() => aoAbrirTermo(user)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#0284c7',
                              borderColor: '#0369a1',
                            }}
                            title="Imprimir Termo de Entrega de Equipamento para assinatura do servidor"
                          >
                            <Printer size={13} />
                            Imprimir Termo
                          </button>
                          <button
                            className="btn btn-secundario"
                            onClick={() => aoAbrirEdicao(user)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                            title="Editar dados e tablet deste usuário"
                          >
                            <Edit3 size={13} />
                            Editar
                          </button>
                          <button
                            className="btn btn-perigo"
                            onClick={() => aoExcluir(user)}
                            disabled={estaExcluindo}
                            style={{
                              padding: '6px 10px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Excluir cadastro do usuário"
                          >
                            <Trash2 size={13} />
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
      </div>

      {/* Modal de Criação / Edição de Usuário de Tablet */}
      <ModalUsuarioTablet
        visivel={modalVisivel}
        usuarioParaEditar={usuarioEmEdicao}
        dispositivos={dispositivos}
        usuariosExistentes={usuarios}
        aoFechar={() => setModalVisivel(false)}
        aoSalvarSucesso={aoSalvarSucesso}
      />

      {/* Modal de Impressão do Termo de Responsabilidade */}
      <ModalTermoResponsabilidade
        visivel={Boolean(usuarioParaTermo)}
        usuario={usuarioParaTermo}
        dispositivo={dispositivoDoTermo}
        aoFechar={() => setUsuarioParaTermo(null)}
      />
    </div>
  );
};
