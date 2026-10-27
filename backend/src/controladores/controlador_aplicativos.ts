import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { despachar_comando_mqtt } from '../servicos/servico_mqtt';
import { executar_consulta } from '../banco/conexao';

export interface ItemCatalogoApk {
  nome_arquivo: string;
  extensao: string;
  tipo: 'APK' | 'XAPK';
  tamanho_bytes: number;
  tamanho_mb: string;
  checksum_sha256: string;
  url_download: string;
  data_modificacao: string;
}

const DIRETORIO_APKS = path.join(__dirname, '../../public/apk');

/**
 * Calcula o checksum SHA-256 via stream para não sobrecarregar a memória RAM na VPS.
 */
function calcular_checksum_sha256(caminhoArquivo: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(caminhoArquivo);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', err => reject(err));
  });
}

/**
 * Retorna a lista de todos os pacotes APK e XAPK disponíveis no catálogo do servidor.
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
      const ext = path.extname(arquivo).toLowerCase();
      if (ext === '.apk' || ext === '.xapk') {
        const caminhoCompleto = path.join(DIRETORIO_APKS, arquivo);
        const stats = fs.statSync(caminhoCompleto);
        const checksum = await calcular_checksum_sha256(caminhoCompleto);

        listaApks.push({
          nome_arquivo: arquivo,
          extensao: ext,
          tipo: ext === '.xapk' ? 'XAPK' : 'APK',
          tamanho_bytes: stats.size,
          tamanho_mb: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          checksum_sha256: checksum,
          url_download: `${protocolo}://${host}/apk/${encodeURI(arquivo)}`,
          data_modificacao: stats.mtime.toISOString(),
        });
      }
    }

    // Ordenação: mais recentes primeiro
    listaApks.sort(
      (a, b) => new Date(b.data_modificacao).getTime() - new Date(a.data_modificacao).getTime()
    );

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
 * Realiza o upload de um novo pacote APK ou XAPK para distribuição na frota.
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

    const nomeOriginal = dadosArquivo.filename || '';
    const extensao = path.extname(nomeOriginal).toLowerCase();
    if (extensao !== '.apk' && extensao !== '.xapk') {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Formato inválido. Apenas pacotes com extensão .apk ou .xapk são permitidos.',
      });
      return;
    }

    const buffer = await dadosArquivo.toBuffer();
    // Validação estrita de Magic Bytes: pacotes ZIP / APK / XAPK Android DEVEM começar com PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Arquivo rejeitado por segurança: cabeçalho binário incompatível com pacote Android (APK ou XAPK).',
      });
      return;
    }

    if (!fs.existsSync(DIRETORIO_APKS)) {
      fs.mkdirSync(DIRETORIO_APKS, { recursive: true });
    }

    const nomeSanitizado = path.basename(nomeOriginal).replace(/[^a-zA-Z0-9._-]/g, '_');
    const caminhoDestino = path.join(DIRETORIO_APKS, nomeSanitizado);

    fs.writeFileSync(caminhoDestino, buffer);

    const stats = fs.statSync(caminhoDestino);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    resposta.status(201).send({
      sucesso: true,
      mensagem: `Pacote '${nomeSanitizado}' (${extensao.toUpperCase().replace('.', '')}) armazenado no catálogo com sucesso!`,
      aplicativo: {
        nome_arquivo: nomeSanitizado,
        extensao,
        tipo: extensao === '.xapk' ? 'XAPK' : 'APK',
        tamanho_bytes: stats.size,
        tamanho_mb: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
        checksum_sha256: checksum,
      },
    });
  } catch (erro) {
    console.error('Erro em fazer_upload_aplicativo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Falha no processamento do upload do pacote.' });
  }
}

/**
 * Remove um pacote APK ou XAPK do catálogo do servidor, liberando espaço físico no disco da VPS.
 */
export async function remover_aplicativo_catalogo(
  requisicao: FastifyRequest<{
    Params: {
      nome_arquivo: string;
    };
  }>,
  resposta: FastifyReply
): Promise<void> {
  try {
    const { nome_arquivo } = requisicao.params;
    if (!nome_arquivo) {
      resposta.status(400).send({ sucesso: false, mensagem: 'Nome do arquivo não fornecido.' });
      return;
    }

    const nomeSeguro = path.basename(nome_arquivo);
    if (nomeSeguro !== nome_arquivo || nomeSeguro.includes('..') || nomeSeguro.includes('/') || nomeSeguro.includes('\\')) {
      resposta.status(400).send({
        sucesso: false,
        mensagem: 'Nome de arquivo inválido ou tentativa de path traversal detectada.',
      });
      return;
    }

    // Proteção crucial: não permitir a exclusão acidental do agente MDM DPC Device Owner principal
    if (nomeSeguro.toLowerCase() === 'mdm-dpc.apk') {
      resposta.status(400).send({
        sucesso: false,
        mensagem: "O arquivo 'mdm-dpc.apk' é o agente Device Owner base do sistema MDM (essencial para provisionamento de novos tablets) e não pode ser excluído do servidor.",
      });
      return;
    }

    const caminhoCompleto = path.join(DIRETORIO_APKS, nomeSeguro);
    if (!fs.existsSync(caminhoCompleto)) {
      resposta.status(404).send({
        sucesso: false,
        mensagem: `Pacote '${nomeSeguro}' não encontrado no catálogo do servidor.`,
      });
      return;
    }

    const stats = fs.statSync(caminhoCompleto);
    const mbLiberados = (stats.size / (1024 * 1024)).toFixed(2);

    // Deleta fisicamente o arquivo do volume da VPS para liberar espaço
    fs.unlinkSync(caminhoCompleto);

    resposta.status(200).send({
      sucesso: true,
      mensagem: `Pacote '${nomeSeguro}' (${mbLiberados} MB) removido com sucesso! Espaço liberado na VPS.`,
      nome_arquivo: nomeSeguro,
      mb_liberados: mbLiberados,
      bytes_liberados: stats.size,
    });
  } catch (erro) {
    console.error('Erro em remover_aplicativo_catalogo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao remover pacote do catálogo do servidor.' });
  }
}

/**
 * Dispara a instalação silenciosa de um APK ou XAPK do catálogo para um ou todos os tablets.
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

    const nomeSeguro = path.basename(nome_arquivo);
    const caminhoArquivo = path.join(DIRETORIO_APKS, nomeSeguro);
    if (!fs.existsSync(caminhoArquivo)) {
      resposta.status(404).send({ sucesso: false, mensagem: 'Pacote não localizado no catálogo do servidor.' });
      return;
    }

    const host = process.env.DOMINIO_DUCKDNS || 'localhost:3000';
    // Usa HTTP se: for localhost OU se a porta explícita não for 443 (sem SSL)
    const usaHttps = !host.includes('localhost') && !host.includes(':') && process.env.HTTPS_PORT === '443';
    const protocolo = usaHttps ? 'https' : 'http';
    const urlDownload = `${protocolo}://${host}/apk/${encodeURI(nomeSeguro)}`;

    const comandoId = crypto.randomUUID();
    const payloadComando = {
      id: comandoId,
      tipo_comando: 'instalar_aplicativo_silencioso',
      parametros: {
        url_apk: urlDownload,
        nome_arquivo: nomeSeguro,
        tipo_pacote: nomeSeguro.toLowerCase().endsWith('.xapk') ? 'xapk' : 'apk',
      },
    };

    if (!dispositivo_id || dispositivo_id === 'todos') {
      // Disparo em lote para todos os tablets registrados
      const resTodos = await executar_consulta('SELECT id, numero_serie FROM dispositivos;');
      for (const d of resTodos.rows) {
        const cmdId = crypto.randomUUID();
        try {
          await executar_consulta(
            `INSERT INTO comandos (id, dispositivo_id, tipo_comando, parametros, status, criado_em)
             VALUES ($1, $2, 'instalar_aplicativo_silencioso', $3, 'pendente', NOW());`,
            [cmdId, d.id, JSON.stringify(payloadComando.parametros)]
          );
        } catch (_) {}

        await despachar_comando_mqtt(d.numero_serie, {
          id: cmdId,
          tipo_comando: 'instalar_aplicativo_silencioso',
          parametros: payloadComando.parametros,
        });
      }

      resposta.status(200).send({
        sucesso: true,
        mensagem: `Ordem de instalação silenciosa de '${nomeSeguro}' despachada para toda a frota!`,
        comando_id: comandoId,
      });
    } else {
      // Disparo individual
      const sqlDisp = `SELECT id, numero_serie FROM dispositivos WHERE id::text = $1 OR numero_serie = $1;`;
      const resDisp = await executar_consulta(sqlDisp, [dispositivo_id]);
      if (resDisp.rows.length === 0) {
        resposta.status(404).send({ sucesso: false, mensagem: 'Dispositivo alvo não encontrado.' });
        return;
      }

      const disp = resDisp.rows[0];
      try {
        await executar_consulta(
          `INSERT INTO comandos (id, dispositivo_id, tipo_comando, parametros, status, criado_em)
           VALUES ($1, $2, 'instalar_aplicativo_silencioso', $3, 'pendente', NOW());`,
          [comandoId, disp.id, JSON.stringify(payloadComando.parametros)]
        );
      } catch (_) {}

      await despachar_comando_mqtt(disp.numero_serie, payloadComando);
      resposta.status(200).send({
        sucesso: true,
        mensagem: `Ordem de instalação de '${nomeSeguro}' enviada para o tablet ${disp.numero_serie}.`,
        comando_id: comandoId,
      });
    }
  } catch (erro) {
    console.error('Erro em disparar_instalacao_catalogo:', erro);
    resposta.status(500).send({ sucesso: false, mensagem: 'Erro ao despachar instalação do aplicativo.' });
  }
}
