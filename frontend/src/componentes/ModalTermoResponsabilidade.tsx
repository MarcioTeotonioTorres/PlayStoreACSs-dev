import React, { useState, useEffect } from 'react';
import { Printer, X, Settings, Check, FileText, Smartphone, User, Shield } from 'lucide-react';
import { UsuarioTabletItem, DispositivoItem } from '../servicos/api_mdm';

interface PropriedadesModalTermo {
  visivel: boolean;
  usuario: UsuarioTabletItem | null;
  dispositivo?: DispositivoItem | null;
  aoFechar: () => void;
}

interface CabecalhoInstitucional {
  enteGovernamental: string;
  secretaria: string;
  departamento: string;
  cidade: string;
  marcaEquipamento: string;
  memoriaInterna: string;
  memoriaExterna: string;
  tamanhoTela: string;
  processador: string;
  estadoConservacao: string;
}

const CHAVE_STORAGE_CABECALHO = 'mdm_cabecalho_termo_responsabilidade';

// Padrão institucional genérico e seguro para repositórios públicos (sem menção direta a cidades específicas)
const CABECALHO_PADRAO: CabecalhoInstitucional = {
  enteGovernamental: 'Governo Municipal / Secretaria Municipal',
  secretaria: 'Secretaria Municipal de Saúde',
  departamento: 'Diretoria de Atenção Primária à Saúde',
  cidade: 'Município Sede',
  marcaEquipamento: 'Samsung',
  memoriaInterna: '32 GB',
  memoriaExterna: '1.5 GB',
  tamanhoTela: '10"',
  processador: 'ONE UI CORE / Octa-Core',
  estadoConservacao: 'Novo',
};

export const ModalTermoResponsabilidade: React.FC<PropriedadesModalTermo> = ({
  visivel,
  usuario,
  dispositivo,
  aoFechar,
}) => {
  const [config, setConfig] = useState<CabecalhoInstitucional>(CABECALHO_PADRAO);
  const [editandoConfig, setEditandoConfig] = useState<boolean>(false);
  const [salvoFeedback, setSalvoFeedback] = useState<boolean>(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE_CABECALHO);
      if (salvo) {
        setConfig(JSON.parse(salvo));
      }
    } catch {
      // Usa padrão em caso de indisponibilidade do storage
    }
  }, []);

  if (!visivel || !usuario) return null;

  function salvarConfiguracao() {
    try {
      localStorage.setItem(CHAVE_STORAGE_CABECALHO, JSON.stringify(config));
      setSalvoFeedback(true);
      setTimeout(() => setSalvoFeedback(false), 2500);
      setEditandoConfig(false);
    } catch (e) {
      console.error('Falha ao salvar configuração local do termo:', e);
    }
  }

  function aoImprimir() {
    window.print();
  }

  // Dados do Equipamento
  const modeloTablet =
    usuario.dispositivo_modelo || dispositivo?.modelo || 'Samsung Galaxy Tab A';
  const serialTablet =
    usuario.dispositivo_numero_serie || dispositivo?.numero_serie || 'SN-NÃO-INFORMADO';

  // Data atual formatada por extenso em português
  const hoje = new Date();
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  return (
    <div className="modal-termo-backdrop">
      <div className="modal-termo-container">
        {/* Barra de Ferramentas Superior (Oculta na impressão) */}
        <div className="modal-termo-toolbar nao-imprimir">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#38bdf8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 700 }}>
                Termo Oficial de Entrega de Equipamento
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Pronto para assinatura física no ato do vínculo do tablet com o Agente
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secundario"
              onClick={() => setEditandoConfig(!editandoConfig)}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Personalizar cabeçalho da prefeitura/secretaria no navegador"
            >
              <Settings size={14} />
              {editandoConfig ? 'Fechar Edição' : 'Personalizar Cabeçalho'}
            </button>
            <button
              className="btn btn-primario"
              onClick={aoImprimir}
              style={{
                fontSize: '13px',
                padding: '6px 16px',
                background: '#0284c7',
                borderColor: '#0369a1',
              }}
            >
              <Printer size={15} />
              Imprimir Termo (A4)
            </button>
            <button
              className="btn-fechar"
              onClick={aoFechar}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Painel de Configuração Rápida (Salvo no Navegador - Seguro contra vazamento no Git) */}
        {editandoConfig && (
          <div className="modal-termo-painel-config nao-imprimir">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
                Personalizar Dados Institucionais (Salvo no seu Navegador):
              </div>
              {salvoFeedback && (
                <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> Dados salvos localmente com sucesso!
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Ente Governamental / Prefeitura:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.enteGovernamental}
                  onChange={(e) => setConfig({ ...config, enteGovernamental: e.target.value })}
                  placeholder="Ex: Prefeitura Municipal de..."
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Secretaria / Órgão:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.secretaria}
                  onChange={(e) => setConfig({ ...config, secretaria: e.target.value })}
                  placeholder="Ex: Secretaria Municipal de Saúde"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Cidade da Assinatura:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.cidade}
                  onChange={(e) => setConfig({ ...config, cidade: e.target.value })}
                  placeholder="Ex: Sua Cidade"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Marca do Tablet:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.marcaEquipamento}
                  onChange={(e) => setConfig({ ...config, marcaEquipamento: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Memória Interna / Externa:</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="input-termo-cfg"
                    value={config.memoriaInterna}
                    onChange={(e) => setConfig({ ...config, memoriaInterna: e.target.value })}
                    placeholder="32 GB"
                  />
                  <input
                    type="text"
                    className="input-termo-cfg"
                    value={config.memoriaExterna}
                    onChange={(e) => setConfig({ ...config, memoriaExterna: e.target.value })}
                    placeholder="1.5 GB"
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Tela / Processador:</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="input-termo-cfg"
                    value={config.tamanhoTela}
                    onChange={(e) => setConfig({ ...config, tamanhoTela: e.target.value })}
                    placeholder='10"'
                  />
                  <input
                    type="text"
                    className="input-termo-cfg"
                    value={config.processador}
                    onChange={(e) => setConfig({ ...config, processador: e.target.value })}
                    placeholder="Processador"
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button
                className="btn btn-primario"
                onClick={salvarConfiguracao}
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                Salvar Configurações no Navegador
              </button>
            </div>
          </div>
        )}

        {/* Folha A4 para Impressão */}
        <div className="folha-termo-a4" id="folha-impressao-termo">
          {/* Cabeçalho Oficial com Logos */}
          <div className="termo-cabecalho">
            <div className="termo-cabecalho-texto">
              <h1 className="termo-titulo-principal">TERMO DE ENTREGA DE EQUIPAMENTO</h1>
              <p className="termo-subtitulo-orgao">{config.enteGovernamental}</p>
              <p className="termo-subtitulo-secretaria">{config.secretaria}</p>
            </div>

            {/* Brasões e Logos Institucionais do SUS e Atenção Básica */}
            <div className="termo-cabecalho-logos">
              {/* Logo Saúde / Atenção Básica / SUS */}
              <div className="logo-bloco-sus">
                <span className="logo-sus-texto">SAÚDE</span>
                <span className="logo-sus-badge">e-SUS</span>
                <span className="logo-sus-sub">ATENÇÃO BÁSICA</span>
              </div>

              {/* Brasão Institucional */}
              <div className="logo-bloco-orgao">
                <div className="brasao-svg-circulo">
                  <Shield size={22} color="#0284c7" />
                </div>
                <div className="logo-orgao-texto">
                  <span>{config.enteGovernamental.toUpperCase().slice(0, 24)}</span>
                  <small>GESTÃO PÚBLICA</small>
                </div>
              </div>

              {/* Símbolo Cidade Saudável */}
              <div className="logo-bloco-saudavel">
                <div className="simbolo-verde-coracao">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#10b981">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
                <div className="logo-saudavel-texto">
                  <span>Cidade</span>
                  <strong>Saudável</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Texto de Qualificação do Servidor e Objeto */}
          <div className="termo-corpo-declaracao">
            <p>
              Eu, <strong>{usuario.nome_completo}</strong>, doravante denominado{' '}
              <strong>USUÁRIO</strong>, Agente Comunitário de Saúde da{' '}
              <strong>{usuario.unidade_basica || 'Unidade Básica de Saúde'}</strong>, CPF nº{' '}
              <strong>{usuario.cpf || 'Não informado'}</strong>, telefone/celular para contato{' '}
              <strong>{usuario.telefone || 'Não informado'}</strong>, declaro estar recebendo da{' '}
              <strong>{config.secretaria}</strong> o Equipamento de marca{' '}
              <strong>{config.marcaEquipamento}</strong>, modelo:{' '}
              <strong>{modeloTablet}</strong>, com características descritas abaixo, sob as
              seguintes condições:
            </p>
          </div>

          {/* Cláusulas Oficiais de 1 a 5 */}
          <ol className="termo-lista-clausulas">
            <li>
              O equipamento deverá ser utilizado <strong>ÚNICA e EXCLUSIVAMENTE</strong> para
              atender as necessidades inerentes às funções exercidas pelo <strong>USUÁRIO</strong>;
            </li>
            <li>
              Ficará o <strong>USUÁRIO</strong> responsável pelo uso e conservação do equipamento;
            </li>
            <li>
              Em caso de perda ou furto o usuário deverá registrar o Boletim de Ocorrência e
              comunicar imediatamente a {config.secretaria} para as devidas providências;
            </li>
            <li>
              O <strong>USUÁRIO</strong> tem somente a <strong>POSSE PROVISÓRIA DO EQUIPAMENTO</strong>,
              enquanto ocupante do cargo ao qual o uso está relacionado e <strong>NÃO</strong> a
              PROPRIEDADE do equipamento sendo terminantemente proibido o empréstimo, aluguel ou
              cessão a terceiros, atribuição esta de competência da {config.secretaria};
            </li>
            <li>
              Ao término da prestação do serviço o <strong>USUÁRIO</strong> compromete-se a
              devolver o equipamento em perfeito estado, considerando o desgaste natural do
              equipamento, podendo a {config.secretaria} promover todo meio necessário para reaver o
              equipamento, objeto deste Termo de Responsabilidade.
            </li>
          </ol>

          {/* Tabela de Especificações do Equipamento */}
          <div className="termo-tabela-specs-wrapper">
            <table className="termo-tabela-specs">
              <thead>
                <tr>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Identificador (Serial SN)</th>
                  <th>Mem. Interna</th>
                  <th>Mem. Externa</th>
                  <th>Tela</th>
                  <th>Processador</th>
                  <th>QTD</th>
                  <th>EC</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{config.marcaEquipamento}</td>
                  <td>{modeloTablet}</td>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{serialTablet}</td>
                  <td>{config.memoriaInterna}</td>
                  <td>{config.memoriaExterna}</td>
                  <td>{config.tamanhoTela}</td>
                  <td>{config.processador}</td>
                  <td>1</td>
                  <td>{config.estadoConservacao}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Acessórios Entregues */}
          <div className="termo-acessorios">
            <span className="termo-acessorios-titulo">ACESSÓRIOS</span>
            <div className="termo-acessorios-itens">
              <span>1 - Carregador Bivolt</span>
              <span>1 - Cabo USB Type-C</span>
              <span>1 - Capa Antichoque Protetora</span>
            </div>
          </div>

          {/* Campos de Assinatura */}
          <div className="termo-assinaturas">
            <div className="bloco-assinatura">
              <div className="linha-assinatura"></div>
              <div className="cargo-assinatura">Assinatura do recebedor</div>
              <div className="dados-linha-assinatura">
                <span>Telefone: ________________________________</span>
                <span>Matrícula: ______________________________</span>
              </div>
            </div>

            <div className="bloco-assinatura" style={{ marginTop: '30px' }}>
              <div className="linha-assinatura"></div>
              <div className="cargo-assinatura">
                Diretor(a) de atenção à saúde ou coordenação de atenção básica
              </div>
            </div>

            <div className="termo-data-local">
              <span>
                {config.cidade}, {dataExtenso}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .modal-termo-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 7, 14, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          overflow-y: auto;
        }

        .modal-termo-container {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          width: 100%;
          max-width: 900px;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          overflow: hidden;
        }

        .modal-termo-toolbar {
          padding: 14px 20px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-termo-painel-config {
          padding: 14px 20px;
          background: #090e17;
          border-bottom: 1px solid #334155;
        }

        .input-termo-cfg {
          width: 100%;
          background: #1e293b;
          border: 1px solid #475569;
          color: #f8fafc;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 12px;
          outline: none;
        }

        .input-termo-cfg:focus {
          border-color: #38bdf8;
        }

        /* Folha A4 Branca com Tipografia Fiel ao Documento Impresso */
        .folha-termo-a4 {
          background: #ffffff;
          color: #111827;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          padding: 38px 45px;
          overflow-y: auto;
          line-height: 1.45;
          font-size: 12.5px;
        }

        .termo-cabecalho {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }

        .termo-titulo-principal {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.3px;
        }

        .termo-subtitulo-orgao {
          font-size: 12px;
          color: #334155;
          margin: 0;
          font-weight: 600;
        }

        .termo-subtitulo-secretaria {
          font-size: 11.5px;
          color: #64748b;
          margin: 0;
        }

        .termo-cabecalho-logos {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo-bloco-sus {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid #93c5fd;
          background: #eff6ff;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .logo-sus-texto {
          font-size: 11px;
          font-weight: 900;
          color: #1d4ed8;
          letter-spacing: 0.5px;
        }

        .logo-sus-badge {
          background: #1d4ed8;
          color: #ffffff;
          font-size: 8px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        .logo-sus-sub {
          font-size: 7px;
          color: #1e40af;
          font-weight: 700;
          margin-top: 1px;
        }

        .logo-bloco-orgao {
          display: flex;
          align-items: center;
          gap: 6px;
          border-left: 1px solid #cbd5e1;
          padding-left: 12px;
        }

        .logo-orgao-texto span {
          display: block;
          font-size: 9px;
          font-weight: 800;
          color: #0369a1;
        }

        .logo-orgao-texto small {
          font-size: 7.5px;
          color: #64748b;
          font-weight: 600;
        }

        .logo-bloco-saudavel {
          display: flex;
          align-items: center;
          gap: 6px;
          border-left: 1px solid #cbd5e1;
          padding-left: 12px;
        }

        .logo-saudavel-texto span {
          display: block;
          font-size: 10px;
          color: #059669;
          line-height: 1;
        }

        .logo-saudavel-texto strong {
          font-size: 10.5px;
          color: #047857;
          line-height: 1;
        }

        .termo-corpo-declaracao {
          text-align: justify;
          margin-bottom: 14px;
          font-size: 12px;
          line-height: 1.55;
          color: #1e293b;
        }

        .termo-lista-clausulas {
          margin: 0 0 16px 0;
          padding-left: 18px;
          font-size: 11.5px;
          line-height: 1.5;
          color: #1e293b;
        }

        .termo-lista-clausulas li {
          margin-bottom: 7px;
          text-align: justify;
        }

        .termo-tabela-specs-wrapper {
          margin-bottom: 14px;
        }

        .termo-tabela-specs {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 1px solid #cbd5e1;
        }

        .termo-tabela-specs th {
          background: #f1f5f9;
          color: #334155;
          padding: 6px 8px;
          text-align: center;
          border: 1px solid #cbd5e1;
          font-weight: 700;
        }

        .termo-tabela-specs td {
          padding: 6px 8px;
          text-align: center;
          border: 1px solid #cbd5e1;
          color: #1e293b;
        }

        .termo-acessorios {
          border-top: 1px solid #cbd5e1;
          padding-top: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 30px;
          font-size: 11.5px;
        }

        .termo-acessorios-titulo {
          font-weight: 800;
          color: #334155;
          font-size: 11px;
        }

        .termo-acessorios-itens {
          display: flex;
          gap: 25px;
          color: #475569;
          font-weight: 600;
        }

        .termo-assinaturas {
          margin-top: 36px;
        }

        .bloco-assinatura {
          text-align: center;
          width: 70%;
          margin: 0 auto;
        }

        .linha-assinatura {
          border-top: 1px solid #000000;
          margin-bottom: 6px;
        }

        .cargo-assinatura {
          font-size: 11.5px;
          font-weight: 600;
          color: #1e293b;
        }

        .dados-linha-assinatura {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #334155;
        }

        .termo-data-local {
          text-align: right;
          margin-top: 28px;
          font-size: 11.5px;
          color: #334155;
        }

        /* Regras Estritas de Impressão A4 */
        @media print {
          body * {
            visibility: hidden;
          }

          .nao-imprimir,
          .barra-lateral,
          .pagina-cabecalho,
          header {
            display: none !important;
          }

          .modal-termo-backdrop {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            visibility: visible !important;
            backdrop-filter: none !important;
          }

          .modal-termo-container {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            background: #ffffff !important;
            visibility: visible !important;
          }

          #folha-impressao-termo,
          #folha-impressao-termo * {
            visibility: visible !important;
          }

          .folha-termo-a4 {
            padding: 10mm 15mm !important;
            font-size: 11.5pt !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
};
