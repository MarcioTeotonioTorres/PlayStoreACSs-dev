import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

import {
  obter_resumo_frota,
  listar_dispositivos,
  obter_detalhes_dispositivo,
  cadastrar_dispositivo_manual,
  receber_telemetria_http,
  remover_dispositivo,
} from './controladores/controlador_dispositivos';
import {
  despachar_comando_dispositivo,
  despachar_comando_em_lote,
} from './controladores/controlador_comandos';
import {
  obter_politicas_frota,
  atualizar_politicas_globais_frota,
  atualizar_politicas_dispositivo,
} from './controladores/controlador_politicas';
import {
  listar_catalogo_aplicativos,
  fazer_upload_aplicativo,
  disparar_instalacao_catalogo,
} from './controladores/controlador_aplicativos';
import { obter_dados_provisionamento_qr } from './controladores/controlador_provisionamento';
import { inicializar_servico_mqtt } from './servicos/servico_mqtt';
import { inicializar_pool_conexoes } from './banco/conexao';

dotenv.config();

const aplicacao: FastifyInstance = Fastify({
  logger: true,
});

/**
 * Encerra processos órfãos que possam estar prendendo a porta do servidor.
 */
export function liberar_porta_se_ocupada(porta: number): void {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${porta}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const linhas = output.split('\n');
      const pidsParaMatar = new Set<string>();

      for (const linha of linhas) {
        const partes = linha.trim().split(/\s+/);
        // Ex: TCP  0.0.0.0:3000  0.0.0.0:0  LISTENING  1234
        if (partes.length >= 5 && partes[1]?.endsWith(`:${porta}`) && partes[3] === 'LISTENING') {
          const pid = partes[4];
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            pidsParaMatar.add(pid);
          }
        }
      }

      for (const pid of pidsParaMatar) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[MDM Port Guard] Processo órfão (PID ${pid}) na porta ${porta} encerrado.`);
        } catch (e) {}
      }
    } else {
      try {
        execSync(`fuser -k ${porta}/tcp 2>/dev/null || true`);
      } catch (e) {}
    }
  } catch (erro) {
    // Porta já se encontra livre
  }
}

/**
 * Registra os plugins fundamentais (CORS, Multipart Upload e Servidor de Arquivos Estáticos).
 */
export async function configurar_plugins(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Upload de arquivos APK corporativos (até 250MB)
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 250 * 1024 * 1024,
    },
  });

  // Servir arquivos de APK para download pelo leitor QR do Android Enterprise
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../public/apk'),
    prefix: '/apk/',
  });
}

/**
 * Registra as rotas da API REST do MDM Corporativo.
 */
export function configurar_rotas_api(app: FastifyInstance): void {
  // 1. Verificação de saúde da aplicação
  app.get('/api/saude', async () => ({
    status: 'operacional',
    plataforma: 'MDM Corporativo Privado',
    dispositivos_alvo: 250,
    timestamp: new Date().toISOString(),
  }));

  // 2. Métricas e telemetria da frota
  app.get('/api/frota/resumo', obter_resumo_frota);

  // 3. Listagem e detalhes de tablets
  app.get('/api/dispositivos', listar_dispositivos);
  app.get('/api/dispositivos/:id', obter_detalhes_dispositivo);
  app.post('/api/dispositivos', cadastrar_dispositivo_manual);
  app.delete('/api/dispositivos/:id', remover_dispositivo);
  app.post('/api/telemetria', receber_telemetria_http);

  // 4. Despacho de comandos individuais e em lote
  app.post('/api/comandos/despachar', despachar_comando_dispositivo);
  app.post('/api/comandos/lote', despachar_comando_em_lote);

  // 5. Políticas de Acesso e Restrições (Sprint 2)
  app.get('/api/politicas', obter_politicas_frota);
  app.put('/api/politicas', atualizar_politicas_globais_frota);
  app.put('/api/politicas/dispositivo/:id', atualizar_politicas_dispositivo);

  // 6. Catálogo e Distribuição de Aplicativos APK (Sprint 2)
  app.get('/api/aplicativos', listar_catalogo_aplicativos);
  app.post('/api/aplicativos/upload', fazer_upload_aplicativo);
  app.post('/api/aplicativos/instalar', disparar_instalacao_catalogo);

  // 7. Provisionamento QR Code Android Enterprise
  app.get('/api/provisionamento/qr', obter_dados_provisionamento_qr);
  app.post('/api/provisionamento/qr', obter_dados_provisionamento_qr);

  // 7.1 Rota de telemetria diagnóstica do provisionamento do tablet
  app.get(
    '/api/debug/ping',
    async (
      req: FastifyRequest<{ Querystring: { etapa?: string; detalhe?: string } }>,
      res: FastifyReply
    ) => {
      const etapa = req.query.etapa || 'sem_etapa';
      const detalhe = req.query.detalhe || '';
      console.log(`\n======================================================`);
      console.log(`[MDM DPC PING DO TABLET] Etapa: ${etapa} | Detalhe: ${detalhe}`);
      console.log(`======================================================\n`);
      return res.send({ recebido: true, etapa, timestamp: new Date().toISOString() });
    }
  );

  // 8. Rota dedicada de entrega de pacotes APK com busca inteligente em múltiplos diretórios
  app.get(
    '/apk/:nomeArquivo',
    async (
      requisicao: FastifyRequest<{ Params: { nomeArquivo: string } }>,
      resposta: FastifyReply
    ) => {
      const { nomeArquivo } = requisicao.params;
      const tentativas = [
        path.resolve('/app/public/apk', nomeArquivo),
        path.resolve('/app/apk', nomeArquivo),
        path.resolve(process.cwd(), 'public/apk', nomeArquivo),
        path.resolve(process.cwd(), 'apk', nomeArquivo),
        path.resolve(__dirname, '../public/apk', nomeArquivo),
        path.resolve(__dirname, '../../public/apk', nomeArquivo),
        path.resolve(__dirname, '../../../apk', nomeArquivo),
      ];

      for (const caminho of tentativas) {
        if (fs.existsSync(caminho) && fs.statSync(caminho).isFile()) {
          const stat = fs.statSync(caminho);
          resposta.header('Content-Type', 'application/vnd.android.package-archive');
          resposta.header('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
          resposta.header('Content-Length', stat.size);
          return resposta.send(fs.createReadStream(caminho));
        }
      }

      console.warn(`[MDM APK 404] Arquivo '${nomeArquivo}' não encontrado nos caminhos:`, tentativas);
      resposta.status(404).send({
        sucesso: false,
        mensagem: `Arquivo APK '${nomeArquivo}' não encontrado no servidor.`,
        locais_verificados: tentativas,
      });
    }
  );
}

/**
 * Inicializa os serviços de infraestrutura e sobe o servidor HTTP/API com liberação automática de porta.
 */
export async function iniciar_servidor_mdm(): Promise<void> {
  const porta = Number(process.env.PORTA_API) || 3000;
  const host = process.env.HOST_API || '0.0.0.0';

  try {
    console.log('Iniciando infraestrutura do MDM Corporativo...');

    // Libera a porta antes de iniciar caso haja processo órfão
    liberar_porta_se_ocupada(porta);

    // 1. Conexão com o banco de dados PostgreSQL
    inicializar_pool_conexoes();

    // 2. Conexão com o Broker MQTT
    try {
      inicializar_servico_mqtt();
    } catch (errMqtt) {
      console.warn('Aviso: Broker MQTT ainda não disponível localmente. O backend tentará reconectar periodicamente.');
    }

    // 3. Configurar Plugins e Rotas
    await configurar_plugins(aplicacao);
    configurar_rotas_api(aplicacao);

    // 4. Iniciar Servidor com retry se necessário
    try {
      await aplicacao.listen({ port: porta, host });
    } catch (listenErr: any) {
      if (listenErr.code === 'EADDRINUSE') {
        console.warn(`[MDM Port Guard] Detectado EADDRINUSE na porta ${porta}. Forçando encerramento e tentando novamente...`);
        liberar_porta_se_ocupada(porta);
        await new Promise((r) => setTimeout(r, 1000));
        await aplicacao.listen({ port: porta, host });
      } else {
        throw listenErr;
      }
    }

    console.log(`\n======================================================`);
    console.log(` Servidor MDM Corporativo Ativo na porta ${porta}`);
    console.log(` URL Base: http://${host}:${porta}`);
    console.log(` Catálogo de APKs: http://${host}:${porta}/apk/`);
    console.log(` APK Provisionamento: http://${host}:${porta}/apk/mdm-dpc.apk`);
    console.log(`======================================================\n`);
  } catch (erro) {
    console.error('Erro fatal ao iniciar servidor MDM:', erro);
    process.exit(1);
  }
}

// Inicializa a aplicação se for o arquivo principal
if (require.main === module) {
  iniciar_servidor_mdm();
}
