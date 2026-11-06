import React, { useState, useEffect } from 'react';
import { Printer, X, Settings, Check, FileText } from 'lucide-react';
import { UsuarioTabletItem, DispositivoItem } from '../servicos/api_mdm';

interface PropriedadesModalTermo {
  visivel: boolean;
  usuario: UsuarioTabletItem | null;
  dispositivo?: DispositivoItem | null;
  aoFechar: () => void;
}

interface ConfiguracaoTermoOficial {
  enteGovernamental: string;
  secretaria: string;
  cidade: string;
  numeroTermo: string;
  telefoneServiceDesk: string;
  emailServiceDesk: string;
  itensInclusosPadrao: string;
  enderecoSecretaria: string;
}

const CHAVE_STORAGE_TERMO = 'mdm_config_termo_responsabilidade_v2';

const CONFIG_PADRAO: ConfiguracaoTermoOficial = {
  enteGovernamental: 'Prefeitura Municipal / Secretaria de Saúde',
  secretaria: 'Secretaria Municipal de Saúde',
  cidade: 'Município Sede',
  numeroTermo: '126/26',
  telefoneServiceDesk: '(XX) XXXXX-XXXX',
  emailServiceDesk: 'tic.saude@municipio.gov.br',
  itensInclusosPadrao: 'Carregador Bivolt, Cabo USB Type-C, Capa Antichoque Protetora',
  enderecoSecretaria: 'Sede Administrativa / Complexo de Saúde',
};

export const ModalTermoResponsabilidade: React.FC<PropriedadesModalTermo> = ({
  visivel,
  usuario,
  dispositivo,
  aoFechar,
}) => {
  const [config, setConfig] = useState<ConfiguracaoTermoOficial>(CONFIG_PADRAO);
  const [editandoConfig, setEditandoConfig] = useState<boolean>(false);
  const [salvoFeedback, setSalvoFeedback] = useState<boolean>(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE_TERMO);
      if (salvo) {
        setConfig({ ...CONFIG_PADRAO, ...JSON.parse(salvo) });
      }
    } catch {
      // Fallback para valores padrão
    }
  }, []);

  if (!visivel || !usuario) return null;

  function salvarConfiguracao() {
    try {
      localStorage.setItem(CHAVE_STORAGE_TERMO, JSON.stringify(config));
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
    usuario.dispositivo_modelo || dispositivo?.modelo || 'Tablet Corporativo';
  const serialTablet =
    usuario.dispositivo_numero_serie || dispositivo?.numero_serie || 'SN-NÃO-INFORMADO';

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
  const diaAtual = String(hoje.getDate()).padStart(2, '0');
  const mesAtual = meses[hoje.getMonth()];
  const anoAtual = hoje.getFullYear();

  return (
    <div className="modal-termo-backdrop">
      <div className="modal-termo-container">
        {/* Barra de Ferramentas Superior (Oculta na impressão) */}
        <div className="modal-termo-toolbar nao-imprimir">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#38bdf8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 700 }}>
                Termo de Responsabilidade pela Guarda e Uso do Equipamento
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Pronto para assinatura física no ato do vínculo com o Agente
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secundario"
              onClick={() => setEditandoConfig(!editandoConfig)}
              style={{ fontSize: '12px', padding: '6px 12px' }}
              title="Personalizar dados de Service Desk ou número do termo"
            >
              <Settings size={14} />
              {editandoConfig ? 'Fechar Edição' : 'Personalizar Dados'}
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
                padding: '6px 10px',
                borderRadius: '6px',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Painel de Edição Rápida (Opcional, Oculto na impressão) */}
        {editandoConfig && (
          <div className="modal-termo-painel-config nao-imprimir">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
                Parâmetros do Termo Oficial (Armazenamento Local)
              </span>
              {salvoFeedback && (
                <span style={{ fontSize: '12px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> Configurações salvas!
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Nº do Termo:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.numeroTermo}
                  onChange={(e) => setConfig({ ...config, numeroTermo: e.target.value })}
                  placeholder="Ex: 126/26"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Ente Governamental:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.enteGovernamental}
                  onChange={(e) => setConfig({ ...config, enteGovernamental: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Secretaria:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.secretaria}
                  onChange={(e) => setConfig({ ...config, secretaria: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Cidade:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.cidade}
                  onChange={(e) => setConfig({ ...config, cidade: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Fone Service Desk:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.telefoneServiceDesk}
                  onChange={(e) => setConfig({ ...config, telefoneServiceDesk: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>E-mail Service Desk:</label>
                <input
                  type="text"
                  className="input-termo-cfg"
                  value={config.emailServiceDesk}
                  onChange={(e) => setConfig({ ...config, emailServiceDesk: e.target.value })}
                />
              </div>
            </div>
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <button
                className="btn btn-primario"
                onClick={salvarConfiguracao}
                style={{ fontSize: '12px', padding: '6px 16px' }}
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

        {/* Folha A4 para Impressão */}
        <div className="folha-termo-a4" id="folha-impressao-termo">
          {/* Cabeçalho Oficial com Título e Número */}
          <div className="termo-cabecalho-oficial">
            <div className="termo-bloco-titulos">
              <h1 className="termo-titulo-documento">
                TERMO DE RESPONSABILIDADE PELA GUARDA E USO DO EQUIPAMENTO DE TRABALHO
              </h1>
              <p className="termo-subtitulo-documento">
                {config.enteGovernamental} - {config.secretaria}
              </p>
            </div>
            <div className="termo-bloco-numero">
              <span className="termo-numero-rotulo">N.º</span>
              <span className="termo-numero-valor">{config.numeroTermo}</span>
            </div>
          </div>

          {/* Quadro 1: Identificação do Servidor */}
          <div className="termo-box-identificacao">
            <div className="termo-box-topo">
              IDENTIFICAÇÃO DO SERVIDOR
            </div>
            <div className="termo-box-conteudo">
              <div className="termo-linha-grid">
                <div className="termo-col-item" style={{ flex: '1 1 65%' }}>
                  <span className="campo-rotulo">NOME:</span>
                  <span className="campo-valor campo-sublinhado">{usuario.nome_completo}</span>
                </div>
                <div className="termo-col-item" style={{ flex: '1 1 35%' }}>
                  <span className="campo-rotulo">Mat.:</span>
                  <span className="campo-valor campo-sublinhado">
                    {usuario.matricula?.trim() || (usuario.id ? usuario.id.substring(0, 8).toUpperCase() : '__________________')}
                  </span>
                </div>
              </div>

              <div className="termo-linha-grid">
                <div className="termo-col-item" style={{ flex: '1 1 60%' }}>
                  <span className="campo-rotulo">CARGO:</span>
                  <span className="campo-valor campo-sublinhado">Agente Comunitário de Saúde (ACS)</span>
                </div>
                <div className="termo-col-item" style={{ flex: '1 1 40%' }}>
                  <span className="campo-rotulo">CPF:</span>
                  <span className="campo-valor campo-sublinhado">{usuario.cpf || 'Não informado'}</span>
                </div>
              </div>

              <div className="termo-linha-grid">
                <div className="termo-col-item" style={{ flex: '1 1 45%' }}>
                  <span className="campo-rotulo">LOTAÇÃO:</span>
                  <span className="campo-valor campo-sublinhado">{usuario.unidade_basica || config.secretaria}</span>
                </div>
                <div className="termo-col-item" style={{ flex: '1 1 55%' }}>
                  <span className="campo-rotulo">E-MAIL:</span>
                  <span className="campo-valor campo-sublinhado">{usuario.email || 'Não informado'}</span>
                </div>
              </div>

              <div className="termo-linha-grid">
                <div className="termo-col-item" style={{ width: '100%' }}>
                  <span className="campo-rotulo">TELEFONE DE CONTATO Nº:</span>
                  <span className="campo-valor campo-sublinhado">{usuario.telefone || 'Não informado'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quadro 2: Tabela de Itens e Equipamento */}
          <table className="termo-tabela-equipamento">
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>ITEM</th>
                <th style={{ width: '38%' }}>DESCRIÇÃO/MARCA/MODELO</th>
                <th style={{ width: '24%', textAlign: 'center' }}>Nº DE SÉRIE</th>
                <th style={{ width: '30%' }}>ITEM INCLUSOS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>1</td>
                <td>Tablet {modeloTablet}</td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>{serialTablet}</td>
                <td>{config.itensInclusosPadrao}</td>
              </tr>
            </tbody>
          </table>

          {/* Declaração de Recebimento */}
          <div className="termo-texto-abertura">
            Declaro, para todos os fins de direito, que recebi da <strong>{config.enteGovernamental}\{config.secretaria}</strong>, para uso exclusivo, em prol das atividades desenvolvidas no referido ente público, em razão do cargo por mim ocupado, o equipamento especificado neste termo de responsabilidade, comprometendo-me a mantê-lo em perfeito estado de conservação, ficando ciente de que:
          </div>

          {/* Lista Completa e Fiel das 8 Cláusulas Jurídicas */}
          <div className="termo-lista-regras">
            <p>
              <strong>1-</strong> O serviço de Service Desk (Atendimento ao usuário) está disponível através do fone: <strong>{config.telefoneServiceDesk}</strong> e pelo e-mail: <strong>{config.emailServiceDesk}</strong>, deverá ser acionado este canal em casos de defeitos e mal funcionalidades;
            </p>
            <p>
              <strong>2-</strong> Em caso de dano, ou extravio do equipamento o usuário deverá comunicar imediatamente a Gerência de TIC a ocorrência, além de cumprir o item seguinte;
            </p>
            <p>
              <strong>3-</strong> É dever do servidor, zelar pela conservação do patrimônio público, sendo proibido retirar, sem prévia anuência da autoridade competente, objeto da repartição, consoante art. 200, Inciso VII c/c art. 201, Inciso II, da Lei 1494/2008. No caso de violação da proibição, caberá a penalidade de advertência, conforme disposto no art. 210, Caput, da mesma Lei. De acordo com o art. 312 do Código Penal, comete crime de PECULATO funcionário público que apropriar-se de dinheiro, valor ou qualquer outro bem móvel, público ou particular, de que tem a posse em razão do cargo, ou desviá-lo, em proveito próprio ou alheio, inclusive, aplicando-se a mesma pena, se o funcionário público, embora não tendo a posse do dinheiro, valor ou bem, o subtrai, ou concorre para que seja subtraído, em proveito próprio ou alheio, valendo-se de facilidade que lhe proporciona a qualidade de funcionário.
            </p>
            <p>
              <strong>4-</strong> Em caso de danos ou inutilização do equipamento por emprego inadequado, mau uso, negligência, imprudência ou extravio, sendo o usuário responsável pela substituição as suas expensas, do equipamento por outro igual ou similar equivalente, ou pagar o valor correspondente a ser devidamente aferido pela coordenação;
            </p>
            <p>
              <strong>5-</strong> O servidor público poderá ser chamado à responsabilidade pelo desaparecimento do material que lhe for confiado, para guarda e uso, bem como pelo dano que dolosa ou culposamente, causar a qualquer material que esteja ou não sob sua guarda, sob pena de responsabilidade de acordo com os dispositivos legais, art. 203 e seguintes da Lei 1494/2008 (Estatuto do Servidor Municipal) c/c art. 116, seus incisos, e art.122, seus incisos e ss. da Lei 8112/1990 (Estatuto do Servidor Federal), que trata sobre os deveres do servidor e a responsabilidade civil decorre de ato omissivo ou comissivo, doloso ou culposo, que resulte em prejuízo ao erário ou a terceiros, sendo a indenização de prejuízo dolosamente causado ao erário somente liquidada na forma prevista em lei. Aduz ainda o art. 206 c/c Secretaria de Saúde, localizada na {config.enderecoSecretaria}. art.125 das referidas Leis, respectivamente, que as sanções civis, penais e administrativas poderão cumular-se, sendo independentes entre si.
            </p>
            <p>
              <strong>6-</strong> Em caso de exoneração ou mudança de cargo que implique na descontinuação do uso do equipamento completo e em perfeito estado de conservação, considerando-se o tempo de uso do mesmo, ao setor competente, sob pena de adoção das medidas administrativas e judiciais cabíveis;
            </p>
            <p>
              <strong>7-</strong> De acordo com o art. 9º, I c/c art. 10, X, respectivamente da Lei 8429/92 (Improbidade Administrativa) constitui ato de improbidade administrativa importando em enriquecimento ilícito auferir, mediante a prática de ato doloso, qualquer tipo de vantagem patrimonial indevida em razão do exercício de cargo, de mandato, de função, de emprego ou de atividade nas entidades referidas(...) e incorporar, por qualquer forma, ao seu patrimônio bens, rendas, verbas ou valores integrantes do acervo patrimonial das entidades mencionadas, bem como, constitui ato de improbidade administrativa aquele que cause lesão ao erário qualquer ação ou omissão dolosa, que enseje, efetiva e comprovadamente, perda patrimonial, desvio, apropriação, malbaratamento ou dilapidação dos bens ou haveres das entidades referidas e notadamente, o disposto no Inciso X: agir ilicitamente na arrecadação de tributo ou de renda, bem como no que diz respeito à conservação do patrimônio público;
            </p>
            <p>
              <strong>8-</strong> Sujeita-se ainda o usuário a inspeções sem prévio aviso.
            </p>
          </div>

          {/* Declaração de Plena Concordância */}
          <div className="termo-texto-fechamento">
            Declaro que conferi o (s) equipamento (s) acima descrito (s), estando este em perfeitas condições de uso, bem como expresso, neste ato, plena, total e irrevogável concordância com as condições acima estabelecidas no presente termo.
          </div>

          {/* Data e Campo de Ciente / Assinatura */}
          <div className="termo-area-assinatura">
            <div className="termo-data-cidade">
              {config.cidade}, {diaAtual} de {mesAtual} de {anoAtual}.
            </div>
            <div className="termo-bloco-ciente">
              <span className="termo-rotulo-ciente">Ciente:</span>
              <div className="termo-linha-assinatura-ciente">
                <span className="termo-nome-assinante">{usuario.nome_completo}</span>
              </div>
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
          max-width: 960px;
          max-height: 96vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          overflow: hidden;
        }

        .modal-termo-toolbar {
          padding: 12px 20px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-termo-painel-config {
          padding: 12px 20px;
          background: #090e17;
          border-bottom: 1px solid #334155;
        }

        .input-termo-cfg {
          width: 100%;
          background: #1e293b;
          border: 1px solid #475569;
          color: #f8fafc;
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 11px;
          outline: none;
        }

        .input-termo-cfg:focus {
          border-color: #38bdf8;
        }

        /* Folha A4 com Calibração Estrita para Impressão em 1 Página */
        .folha-termo-a4 {
          background: #ffffff;
          color: #000000;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          padding: 24px 34px;
          overflow-y: auto;
          line-height: 1.25;
          font-size: 9pt;
        }

        .termo-cabecalho-oficial {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid #000000;
          padding-bottom: 8px;
          margin-bottom: 12px;
          gap: 12px;
        }

        .termo-bloco-titulos {
          flex: 1;
          text-align: left;
        }

        .termo-titulo-documento {
          font-size: 10.5pt;
          font-weight: 900;
          color: #000000;
          margin: 0;
          line-height: 1.15;
          text-transform: uppercase;
          letter-spacing: -0.2px;
        }

        .termo-subtitulo-documento {
          font-size: 8.5pt;
          color: #334155;
          margin: 2px 0 0 0;
          font-weight: 600;
        }

        .termo-bloco-numero {
          text-align: right;
          white-space: nowrap;
          font-size: 9pt;
          font-weight: bold;
        }

        .termo-numero-rotulo {
          margin-right: 4px;
        }

        .termo-box-identificacao {
          border: 1px solid #000000;
          margin-bottom: 12px;
        }

        .termo-box-topo {
          background: #f1f5f9;
          font-weight: bold;
          font-size: 8.5pt;
          padding: 3px 6px;
          border-bottom: 1px solid #000000;
          letter-spacing: 0.3px;
        }

        .termo-box-conteudo {
          padding: 5px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .termo-linha-grid {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 8.5pt;
        }

        .termo-col-item {
          display: flex;
          align-items: baseline;
          overflow: hidden;
        }

        .campo-rotulo {
          font-weight: bold;
          margin-right: 5px;
          white-space: nowrap;
        }

        .campo-valor {
          flex: 1;
          color: #111827;
        }

        .campo-sublinhado {
          border-bottom: 1px dotted #64748b;
          min-height: 14px;
        }

        .termo-tabela-equipamento {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 8.5pt;
        }

        .termo-tabela-equipamento th,
        .termo-tabela-equipamento td {
          border: 1px solid #000000;
          padding: 4px 6px;
        }

        .termo-tabela-equipamento th {
          background: #f1f5f9;
          font-weight: bold;
          text-align: left;
          font-size: 8pt;
        }

        .termo-texto-abertura {
          font-size: 8.5pt;
          text-align: justify;
          margin-bottom: 12px;
          line-height: 1.28;
        }

        .termo-lista-regras {
          font-size: 8pt;
          line-height: 1.25;
          text-align: justify;
          margin-bottom: 12px;
        }

        .termo-lista-regras p {
          margin: 0 0 10px 0;
          text-indent: 0;
        }

        .termo-texto-fechamento {
          font-size: 8.2pt;
          text-align: justify;
          margin-bottom: 14px;
          line-height: 1.25;
        }

        .termo-area-assinatura {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          padding-top: 6px;
        }

        .termo-data-cidade {
          font-size: 8.5pt;
          font-weight: 500;
        }

        .termo-bloco-ciente {
          display: flex;
          align-items: baseline;
          gap: 6px;
          width: 58%;
        }

        .termo-rotulo-ciente {
          font-weight: bold;
          font-size: 9pt;
        }

        .termo-linha-assinatura-ciente {
          flex: 1;
          border-bottom: 1px solid #000000;
          text-align: center;
          padding-bottom: 2px;
        }

        .termo-nome-assinante {
          font-size: 8.5pt;
          color: #0f172a;
        }

        /* Regras Rigorosas para Impressão A4 em Página Única com Espaçamento */
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
            padding: 6mm 10mm !important;
            font-size: 8.2pt !important;
            line-height: 1.22 !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .termo-cabecalho-oficial {
            padding-bottom: 6px !important;
            margin-bottom: 9px !important;
          }

          .termo-titulo-documento {
            font-size: 9.5pt !important;
            line-height: 1.15 !important;
          }

          .termo-subtitulo-documento {
            font-size: 8pt !important;
          }

          .termo-box-identificacao {
            margin-bottom: 9px !important;
            font-size: 7.8pt !important;
          }

          .termo-box-topo {
            padding: 2px 6px !important;
            font-size: 8pt !important;
          }

          .termo-box-conteudo {
            padding: 4px 6px !important;
            gap: 3px !important;
          }

          .termo-linha-grid {
            font-size: 7.8pt !important;
            gap: 10px !important;
          }

          .termo-tabela-equipamento {
            margin-bottom: 9px !important;
            font-size: 7.8pt !important;
          }

          .termo-tabela-equipamento th,
          .termo-tabela-equipamento td {
            padding: 3px 6px !important;
          }

          .termo-texto-abertura {
            font-size: 7.8pt !important;
            line-height: 1.2 !important;
            margin-bottom: 9px !important;
            text-align: justify !important;
          }

          .termo-lista-regras {
            font-size: 7.6pt !important;
            line-height: 1.2 !important;
            margin-bottom: 9px !important;
            text-align: justify !important;
          }

          .termo-lista-regras p {
            margin: 0 0 8px 0 !important;
            margin-bottom: 8px !important;
            text-indent: 0 !important;
            display: block !important;
          }

          .termo-texto-fechamento {
            font-size: 7.8pt !important;
            line-height: 1.2 !important;
            margin-bottom: 12px !important;
            text-align: justify !important;
          }

          .termo-area-assinatura {
            margin-top: 14px !important;
            padding-top: 4px !important;
            display: flex !important;
          }

          .termo-data-cidade,
          .termo-nome-assinante {
            font-size: 8pt !important;
          }

          @page {
            size: A4 portrait;
            margin: 6mm;
          }
        }
      `}</style>
    </div>
  );
};
