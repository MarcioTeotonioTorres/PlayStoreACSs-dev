import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import dotenv from 'dotenv';

import {
  obter_resumo_frota,
  listar_dispositivos,
  obter_detalhes_dispositivo,
  cadastrar_dispositivo_manual,
} from './controladores/controlador_dispositivos';
import {
  despachar_comando_dispositivo,
  despachar_comando_em_lote,
} from './controladores/controlador_comandos';
import { obter_dados_provisionamento_qr } from './controladores/controlador_provisionamento';
import { inicializar_servico_mqtt } from './servicos/servico_mqtt';
import { inicializar_pool_conexoes } from './banco/conexao';

dotenv.config();

const aplicacao: FastifyInstance = Fastify({
  logger: true,
});

/**
 * Registra os plugins fundamentais (CORS e Servidor de Arquivos Estáticos).
 */
export async function configurar_plugins(app: FastifyInstance): Promise<void> {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
  // Verificação de saúde da aplicação
  app.get('/api/saude', async () => ({
    status: 'operacional',
    plataforma: 'MDM Corporativo Privado',
    dispositivos_alvo: 250,
    timestamp: new Date().toISOString(),
  }));

  // Métricas e telemetria da frota
  app.get('/api/frota/resumo', obter_resumo_frota);

  // Listagem e detalhes de tablets
  app.get('/api/dispositivos', listar_dispositivos);
  app.get('/api/dispositivos/:id', obter_detalhes_dispositivo);
  app.post('/api/dispositivos', cadastrar_dispositivo_manual);

  // Despacho de comandos individuais e em lote
  app.post('/api/comandos/despachar', despachar_comando_dispositivo);
  app.post('/api/comandos/lote', despachar_comando_em_lote);

  // Provisionamento QR Code Android Enterprise
  app.get('/api/provisionamento/qr', obter_dados_provisionamento_qr);
  app.post('/api/provisionamento/qr', obter_dados_provisionamento_qr);
}

/**
 * Inicializa os serviços de infraestrutura e sobe o servidor HTTP/API.
 */
export async function iniciar_servidor_mdm(): Promise<void> {
  try {
    console.log('Iniciando infraestrutura do MDM Corporativo...');

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

    // 4. Iniciar Servidor
    const porta = Number(process.env.PORTA_API) || 3000;
    const host = process.env.HOST_API || '0.0.0.0';

    await aplicacao.listen({ port: porta, host });
    console.log(`\n======================================================`);
    console.log(` Servidor MDM Corporativo Ativo na porta ${porta}`);
    console.log(` URL Base: http://${host}:${porta}`);
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
