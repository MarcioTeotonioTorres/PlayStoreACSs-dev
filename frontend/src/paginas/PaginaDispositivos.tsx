import React from 'react';
import { Plus, RefreshCw, Layers } from 'lucide-react';
import { TabelaDispositivos } from '../componentes/TabelaDispositivos';
import { DispositivoItem } from '../servicos/api_mdm';

interface PropriedadesPaginaDispositivos {
  dispositivos: DispositivoItem[];
  carregando: boolean;
  aoAtualizar: () => void;
  aoAbrirAdicionar: () => void;
  aoAbrirComandosLote: () => void;
  aoBloquearDispositivo: (disp: DispositivoItem) => void;
  aoReiniciarDispositivo: (disp: DispositivoItem) => void;
  aoAbrirComandosCompletos: (disp: DispositivoItem) => void;
}

export const PaginaDispositivos: React.FC<PropriedadesPaginaDispositivos> = ({
  dispositivos,
  carregando,
  aoAtualizar,
  aoAbrirAdicionar,
  aoAbrirComandosLote,
  aoBloquearDispositivo,
  aoReiniciarDispositivo,
  aoAbrirComandosCompletos,
}) => {
  return (
    <div className="pagina-conteudo">
      <div className="pagina-cabecalho">
        <div>
          <h2 className="pagina-titulo">Gerenciamento de Dispositivos</h2>
          <p className="pagina-subtitulo">
            Tabela de inventário com monitoramento de status em tempo real, nível de bateria e ações remotas
          </p>
        </div>

        <div className="cabecalho-acoes">
          <button className="btn btn-secundario" onClick={aoAtualizar} title="Recarregar">
            <RefreshCw size={14} />
            Sincronizar
          </button>
          <button className="btn btn-secundario" onClick={aoAbrirComandosLote}>
            <Layers size={14} />
            Comandos em Lote
          </button>
          <button className="btn btn-primario" onClick={aoAbrirAdicionar}>
            <Plus size={14} />
            Adicionar Tablet
          </button>
        </div>
      </div>

      <TabelaDispositivos
        dispositivos={dispositivos}
        carregando={carregando}
        aoBloquearDispositivo={aoBloquearDispositivo}
        aoReiniciarDispositivo={aoReiniciarDispositivo}
        aoAbrirComandosCompletos={aoAbrirComandosCompletos}
      />
    </div>
  );
};
