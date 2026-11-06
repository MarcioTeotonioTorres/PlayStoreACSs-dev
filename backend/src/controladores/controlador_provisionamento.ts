import { FastifyRequest, FastifyReply } from 'fastify';
import {
  gerar_payload_provisionamento_qr,
  gerar_imagem_qr_code,
  ParametrosProvisionamento,
} from '../servicos/servico_provisionamento';

/**
 * Rota para obter o payload JSON e a imagem renderizável do QR Code de provisionamento
 * para os novos tablets da frota de 250 aparelhos.
 */
export async function obter_dados_provisionamento_qr(
  requisicao: FastifyRequest<{ Querystring: ParametrosProvisionamento }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const parametros = requisicao.query;

    const payloadJson = gerar_payload_provisionamento_qr(parametros);
    const imagemQrBase64 = await gerar_imagem_qr_code(payloadJson);

    resposta.status(200).send({
      sucesso: true,
      instrucoes: [
        '1. Ligue o tablet com as configurações de fábrica.',
        '2. Na primeira tela ("Bem-vindo" / "Iniciar"), toque 6 vezes seguidas no mesmo ponto vazio da tela.',
        '3. O leitor nativo de QR Code do Android Enterprise será iniciado.',
        '4. Aponte a câmera para o QR Code gerado.',
        '5. O tablet conectará no Wi-Fi corporativo, baixará o APK e ativará o DPC como Device Owner.',
      ],
      payload_android_enterprise: payloadJson,
      qr_code_imagem_base64: imagemQrBase64,
      gerado_em: new Date().toISOString(),
    });
  } catch (erro) {
    console.error('Erro ao gerar dados de provisionamento QR:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao gerar QR Code de provisionamento.' });
  }
}

/**
 * Rota pública para consulta da versão mais recente do APK DPC disponível para auto-update OTA.
 */
export async function obter_versao_dpc_mais_recente(
  _requisicao: FastifyRequest,
  resposta: FastifyReply
): Promise<void> {
  try {
    const versaoCodigo = 7;
    const versaoNome = '1.2.4';
    const host = process.env.DOMINIO_EXTERNO || 'mdmplaystoreacs.duckdns.org';
    const protocolo = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const urlDownload = `${protocolo}://${host}/apk/mdm-dpc.apk`;

    resposta.status(200).send({
      sucesso: true,
      versao_codigo: versaoCodigo,
      versao_nome: versaoNome,
      url_apk: urlDownload,
      obrigatoria: false,
      descricao: 'Atualização do DPC MDM: Auto-Update OTA, telemetria diária de 24h e Whitelist Universal Multi-Marca.',
      atualizado_em: new Date().toISOString(),
    });
  } catch (erro) {
    console.error('Erro ao consultar versão DPC:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha ao consultar versão do DPC.' });
  }
}
