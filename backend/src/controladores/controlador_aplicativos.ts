import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { despachar_comando_mqtt } from '../servicos/servico_mqtt';
import { executar_consulta } from '../banco/conexao';

export interface ItemCatalogoApk {
  nome_arquivo: string;
  tamanho_bytes: number;
  tamanho_mb: string;
  checksum_sha256: string;
  url_download: string;
  data_modificacao: string;
}

const DIRETORIO_APKS = path.join(__dirname, '../../public/apk');

/**
 * Retorna a lista de todos os pacotes APK disponíveis no catálogo do servidor.
 */
export async function listar_catalogo_aplicativos(
  requisicao: FastifyRequest,
  resposta: FastifyReply
): Promise<void> {
  try {
    if (!fs.existsSync(DIRETORIO_APKS)) {
      fs.mkdirSync(DIRETORIO_APKS, { recursive: true });
    }

    const arquivos = fs.readdirSync(DIRETORIO_APKS);
    const listaApks: ItemCatalogoApk[] = [];

    const host = process.env.DOMINIO_DUCKDNS || 'localhost:3000';
    // Usa HTTP se: for localhost OU se a porta explícita não for 443 (sem SSL)
    const usaHttps = !host.includes('localhost') && !host.includes(':') && process.env.HTTPS_PORT === '443';
    const protocolo = usaHttps ? 'https' : 'http';

    for (const arquivo of arquivos) {
      if (arquivo.endsWith('.apk')) {
        const caminhoCompleto = path.join(DIRETORIO_APKS, arquivo);
        const stats = fs.statSync(caminhoCompleto);

        // Calcula checksum SHA-256
        const conteudo = fs.readFileSync(caminhoCompleto);
        const checksum = crypto.createHash('sha256').update(conteudo).digest('hex');

        listaApks.push({
          nome_arquivo: arquivo,
          tamanho_bytes: stats.size,
          tamanho_mb: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          checksum_sha256: checksum,
          url_download: `${protocolo}://${host}/apk/${arquivo}`,
          data_modificacao: stats.mtime.toISOString(),
        });
      }
    }

    resposta.status(200).send({
      sucesso: true,
      total_aplicativos: listaApks.length,
      aplicativos: listaApks,
    });
  } catch (erro) {
    console.error('Erro em listar_catalogo_aplicativos:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao listar catálogo de aplicativos.' });
  }
}

/**
 * Realiza o upload de um novo pacote APK para distribuição na frota.
 */
export async function fazer_upload_aplicativo(
  requisicao: FastifyRequest,
  resposta: FastifyReply
): Promise<void> {
  try {
    const dadosArquivo = await requisicao.file();
    if (!dadosArquivo) {
      resposta.status(400).send({ sucesso: false, mensagem: 'Nenhum arquivo enviado.' });
      return;
    }

    if (!fs.existsSync(DIRETORIO_APKS)) {
      fs.mkdirSync(DIRETORIO_APKS, { recursive: true });
    }

    const nomeSanitizado = dadosArquivo.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const caminhoDestino = path.join(DIRETORIO_APKS, nomeSanitizado);

    const streamSaida = fs.createWriteStream(caminhoDestino);
    await dadosArquivo.toBuffer().then((buffer) => streamSaida.write(buffer));
    streamSaida.end();

    const stats = fs.statSync(caminhoDestino);
    const checksum = crypto.createHash('sha256').update(fs.readFileSync(caminhoDestino)).digest('hex');

    resposta.status(201).send({
      sucesso: true,
      mensagem: `Arquivo ${nomeSanitizado} armazenado no catálogo com sucesso!`,
      aplicativo: {
        nome_arquivo: nomeSanitizado,
        tamanho_bytes: stats.size,
        checksum_sha256: checksum,
      },
    });
  } catch (erro) {
    console.error('Erro em fazer_upload_aplicativo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha no processamento do upload do APK.' });
  }
}

/**
 * Dispara a instalação silenciosa de um APK do catálogo para um ou todos os tablets.
 */
export async function disparar_instalacao_catalogo(
  requisicao: FastifyRequest<{
    Body: {
      nome_arquivo: string;
      dispositivo_id?: string; // Se omitido ou 'todos', dispara para a frota inteira
    };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { nome_arquivo, dispositivo_id } = requisicao.body;

    const caminhoArquivo = path.join(DIRETORIO_APKS, nome_arquivo);
    if (!fs.existsSync(caminhoArquivo)) {
      resposta.status(404).send({ sucesso: false, mensagem: 'APK não localizado no catálogo do servidor.' });
      return;
    }

    const host = process.env.DOMINIO_DUCKDNS || 'localhost:3000';
    // Usa HTTP se: for localhost OU se a porta explícita não for 443 (sem SSL)
    const usaHttps = !host.includes('localhost') && !host.includes(':') && process.env.HTTPS_PORT === '443';
    const protocolo = usaHttps ? 'https' : 'http';
    const urlDownload = `${protocolo}://${host}/apk/${nome_arquivo}`;

    const comandoId = crypto.randomUUID();
    const payloadComando = {
      id: comandoId,
      tipo_comando: 'instalar_aplicativo_silencioso',
      parametros: {
        url_apk: urlDownload,
        nome_arquivo,
      },
    };

    if (!dispositivo_id || dispositivo_id === 'todos') {
      // Disparo em lote
      await despachar_comando_mqtt('todos', payloadComando);
      resposta.status(200).send({
        sucesso: true,
        mensagem: `Ordem de instalação silenciosa de '${nome_arquivo}' despachada para toda a frota!`,
        comando_id: comandoId,
      });
    } else {
      // Disparo individual
      const sqlDisp = `SELECT numero_serie FROM dispositivos WHERE id::text = $1 OR numero_serie = $1;`;
      const resDisp = await executar_consulta(sqlDisp, [dispositivo_id]);
      const numeroSerie = resDisp.rows.length > 0 ? resDisp.rows[0].numero_serie : dispositivo_id;

      await despachar_comando_mqtt(numeroSerie, payloadComando);
      resposta.status(200).send({
        sucesso: true,
        mensagem: `Ordem de instalação de '${nome_arquivo}' enviada para o tablet ${numeroSerie}.`,
        comando_id: comandoId,
      });
    }
  } catch (erro) {
    console.error('Erro em disparar_instalacao_catalogo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao despachar instalação do aplicativo.' });
  }
}
