"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.liberar_porta_se_ocupada = liberar_porta_se_ocupada;
exports.configurar_plugins = configurar_plugins;
exports.configurar_rotas_api = configurar_rotas_api;
exports.iniciar_servidor_mdm = iniciar_servidor_mdm;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const controlador_dispositivos_1 = require("./controladores/controlador_dispositivos");
const controlador_comandos_1 = require("./controladores/controlador_comandos");
const controlador_politicas_1 = require("./controladores/controlador_politicas");
const controlador_perfis_1 = require("./controladores/controlador_perfis");
const controlador_usuarios_tablets_1 = require("./controladores/controlador_usuarios_tablets");
const controlador_usuarios_sistema_1 = require("./controladores/controlador_usuarios_sistema");
const controlador_aplicativos_1 = require("./controladores/controlador_aplicativos");
const controlador_provisionamento_1 = require("./controladores/controlador_provisionamento");
const controlador_autenticacao_1 = require("./controladores/controlador_autenticacao");
const servico_autenticacao_1 = require("./servicos/servico_autenticacao");
const servico_mqtt_1 = require("./servicos/servico_mqtt");
const conexao_1 = require("./banco/conexao");
dotenv_1.default.config();
const aplicacao = (0, fastify_1.default)({
    logger: true,
    bodyLimit: 1024 * 1024 * 1024, // 1 GB para pacotes pesados de APK, XAPK e APKS
});
/**
 * Encerra processos órfãos que possam estar prendendo a porta do servidor.
 */
function liberar_porta_se_ocupada(porta) {
    try {
        if (process.platform === 'win32') {
            const output = (0, child_process_1.execSync)(`netstat -ano | findstr :${porta}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            const linhas = output.split('\n');
            const pidsParaMatar = new Set();
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
                    (0, child_process_1.execSync)(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                    console.log(`[MDM Port Guard] Processo órfão (PID ${pid}) na porta ${porta} encerrado.`);
                }
                catch (e) { }
            }
        }
        else {
            try {
                (0, child_process_1.execSync)(`fuser -k ${porta}/tcp 2>/dev/null || true`);
            }
            catch (e) { }
        }
    }
    catch (erro) {
        // Porta já se encontra livre
    }
}
/**
 * Registra os plugins fundamentais (CORS, Multipart Upload e Servidor de Arquivos Estáticos).
 */
async function configurar_plugins(app) {
    await app.register(cors_1.default, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
    // Upload de arquivos APK, XAPK e APKS corporativos (até 1 GB)
    await app.register(multipart_1.default, {
        limits: {
            fileSize: 1024 * 1024 * 1024, // 1 GB
            fieldNameSize: 100,
            fieldSize: 1024 * 1024,
            fields: 10,
            files: 1,
        },
    });
    // Servir arquivos de APK para download pelo leitor QR do Android Enterprise
    await app.register(static_1.default, {
        root: path_1.default.join(__dirname, '../public/apk'),
        prefix: '/apk/',
    });
}
/**
 * Registra as rotas da API REST do MDM Corporativo e middleware de segurança.
 */
function configurar_rotas_api(app) {
    // Tratador global de erros para respostas padronizadas em JSON (evita quebra do frontend em erro 413)
    app.setErrorHandler((error, requisicao, resposta) => {
        const codErro = error.code;
        const status = error.statusCode || 500;
        if (status === 413 ||
            codErro === 'FST_REQ_FILE_TOO_LARGE' ||
            codErro === 'FST_ERR_CTP_BODY_TOO_LARGE' ||
            error.message?.includes('body is too large') ||
            error.message?.includes('File too large')) {
            resposta.status(413).send({
                sucesso: false,
                mensagem: 'O arquivo enviado excede o limite máximo permitido pelo servidor (1 GB).',
                codigo: 'PAYLOAD_TOO_LARGE',
            });
            return;
        }
        resposta.status(status).send({
            sucesso: false,
            mensagem: error.message || 'Erro interno no servidor.',
            codigo: codErro || 'INTERNAL_SERVER_ERROR',
        });
    });
    // Hook Global de Autenticação e Proteção de Rotas (Zero Trust para rotas administrativas)
    app.addHook('preHandler', async (requisicao, resposta) => {
        const urlLimpa = (requisicao.raw.url || requisicao.url).split('?')[0];
        // Rotas públicas que não requerem autenticação
        const rotasPublicas = [
            '/api/auth/login',
            '/api/saude',
            '/api/provisionamento/qr',
            '/api/provisionamento/versao-dpc',
            '/api/debug/ping',
        ];
        if (rotasPublicas.includes(urlLimpa) || urlLimpa.startsWith('/apk/')) {
            return;
        }
        // Endpoint de telemetria e respostas de comandos dos tablets via HTTP:
        // Permite que tablets se comuniquem com resiliência sem exigir sessão JWT de operador
        if (urlLimpa === '/api/telemetria' ||
            (urlLimpa.startsWith('/api/dispositivos/') && urlLimpa.includes('/comandos/'))) {
            return;
        }
        // Todas as demais rotas administrativas (/api/*) exigem token JWT válido
        if (urlLimpa.startsWith('/api/')) {
            const authHeader = requisicao.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                resposta.status(401).send({
                    sucesso: false,
                    mensagem: 'Acesso restrito. Faça login com credenciais válidas para continuar.',
                });
                return;
            }
            const token = authHeader.substring(7).trim();
            const payload = (0, servico_autenticacao_1.verificar_token_jwt)(token);
            if (!payload) {
                resposta.status(401).send({
                    sucesso: false,
                    mensagem: 'Sessão expirada ou token de acesso inválido.',
                });
                return;
            }
            requisicao.usuario = payload;
        }
    });
    // Middleware estrito de permissão RBAC para operações exclusivas de 'adm'
    // Supervisores têm acesso unicamente para visualização e monitoramento da frota
    const rotasExclusivasAdm = [
        { metodo: 'POST', prefixo: '/api/dispositivos' },
        { metodo: 'DELETE', prefixo: '/api/dispositivos' },
        { metodo: 'POST', prefixo: '/api/comandos' },
        { metodo: 'PUT', prefixo: '/api/politicas' },
        { metodo: 'POST', prefixo: '/api/perfis' },
        { metodo: 'PUT', prefixo: '/api/perfis' },
        { metodo: 'DELETE', prefixo: '/api/perfis' },
        { metodo: 'GET', prefixo: '/api/usuarios-sistema' },
        { metodo: 'POST', prefixo: '/api/usuarios-sistema' },
        { metodo: 'PUT', prefixo: '/api/usuarios-sistema' },
        { metodo: 'DELETE', prefixo: '/api/usuarios-sistema' },
        { metodo: 'POST', prefixo: '/api/aplicativos' },
        { metodo: 'DELETE', prefixo: '/api/aplicativos' },
    ];
    app.addHook('preHandler', async (requisicao, resposta) => {
        const url = requisicao.raw.url || '';
        const metodo = requisicao.method.toUpperCase();
        // Sincronização periódica da frota é permitida para atualização sob demanda no dashboard
        if (url.startsWith('/api/dispositivos/sincronizar') && metodo === 'POST') {
            return;
        }
        const ehExclusiva = rotasExclusivasAdm.some((r) => r.metodo === metodo && url.startsWith(r.prefixo));
        if (ehExclusiva) {
            const usuario = requisicao.usuario;
            const perfil = usuario?.perfil === 'admin' ? 'adm' : usuario?.perfil;
            if (perfil !== 'adm') {
                resposta.status(403).send({
                    sucesso: false,
                    mensagem: 'Acesso restrito: Supervisores possuem acesso apenas para monitoramento e não podem executar esta ação.',
                });
            }
        }
    });
    // 0. Rotas de Autenticação e Gestão de Operadores
    app.post('/api/auth/login', controlador_autenticacao_1.login_usuario);
    app.get('/api/auth/perfil', controlador_autenticacao_1.obter_perfil_usuario);
    app.post('/api/auth/senha', controlador_autenticacao_1.alterar_senha_usuario);
    // 0.1 Gestão de Usuários do Sistema (Exclusivo para Admins)
    app.get('/api/usuarios-sistema', controlador_usuarios_sistema_1.listar_usuarios_sistema);
    app.get('/api/usuarios-sistema/:id', controlador_usuarios_sistema_1.obter_usuario_sistema);
    app.post('/api/usuarios-sistema', controlador_usuarios_sistema_1.criar_usuario_sistema);
    app.put('/api/usuarios-sistema/:id', controlador_usuarios_sistema_1.atualizar_usuario_sistema);
    app.delete('/api/usuarios-sistema/:id', controlador_usuarios_sistema_1.remover_usuario_sistema);
    // 1. Verificação de saúde da aplicação
    app.get('/api/saude', async () => ({
        status: 'operacional',
        plataforma: 'MDM Corporativo Privado',
        dispositivos_alvo: 250,
        timestamp: new Date().toISOString(),
    }));
    // 2. Métricas e telemetria da frota
    app.get('/api/frota/resumo', controlador_dispositivos_1.obter_resumo_frota);
    // 3. Listagem e detalhes de tablets
    app.get('/api/dispositivos', controlador_dispositivos_1.listar_dispositivos);
    app.get('/api/dispositivos/:id', controlador_dispositivos_1.obter_detalhes_dispositivo);
    app.post('/api/dispositivos', controlador_dispositivos_1.cadastrar_dispositivo_manual);
    app.delete('/api/dispositivos/:id', controlador_dispositivos_1.remover_dispositivo);
    app.post('/api/telemetria', controlador_dispositivos_1.receber_telemetria_http);
    app.post('/api/dispositivos/sincronizar', controlador_dispositivos_1.sincronizar_telemetria_frota);
    app.post('/api/dispositivos/:numero_serie/comandos/:comando_id/resposta', controlador_dispositivos_1.receber_resposta_comando_http);
    // 4. Despacho e consulta de comandos individuais e em lote (Exclusivo Adm)
    app.post('/api/comandos/despachar', controlador_comandos_1.despachar_comando_dispositivo);
    app.post('/api/comandos/lote', controlador_comandos_1.despachar_comando_em_lote);
    app.get('/api/comandos/:id', controlador_dispositivos_1.consultar_status_comando);
    // 5. Políticas de Acesso e Restrições (Sprint 2 - Exclusivo Adm)
    app.get('/api/politicas', controlador_politicas_1.obter_politicas_frota);
    app.put('/api/politicas', controlador_politicas_1.atualizar_politicas_globais_frota);
    app.get('/api/politicas/dispositivo/:id', controlador_politicas_1.obter_politicas_dispositivo);
    app.put('/api/politicas/dispositivo/:id', controlador_politicas_1.atualizar_politicas_dispositivo);
    // 5.1 Perfis de Provisionamento e Configurações de Restrições Salvas (Exclusivo Adm)
    app.get('/api/perfis', controlador_perfis_1.listar_perfis_provisionamento);
    app.get('/api/perfis/:id', controlador_perfis_1.obter_perfil_provisionamento);
    app.post('/api/perfis', controlador_perfis_1.criar_perfil_provisionamento);
    app.put('/api/perfis/:id', controlador_perfis_1.atualizar_perfil_provisionamento);
    app.delete('/api/perfis/:id', controlador_perfis_1.remover_perfil_provisionamento);
    app.post('/api/perfis/:id/aplicar', controlador_perfis_1.aplicar_perfil_provisionamento);
    // 5.2 Cadastro de Usuários dos Tablets (Agentes / Responsáveis - Exclusivo Adm)
    app.get('/api/usuarios-tablets', controlador_usuarios_tablets_1.listar_usuarios_tablets);
    app.get('/api/usuarios-tablets/:id', controlador_usuarios_tablets_1.obter_usuario_tablet);
    app.post('/api/usuarios-tablets', controlador_usuarios_tablets_1.cadastrar_usuario_tablet);
    app.put('/api/usuarios-tablets/:id', controlador_usuarios_tablets_1.atualizar_usuario_tablet);
    app.delete('/api/usuarios-tablets/:id', controlador_usuarios_tablets_1.remover_usuario_tablet);
    // 6. Catálogo e Distribuição de Aplicativos APK e XAPK (Exclusivo Adm)
    app.get('/api/aplicativos', controlador_aplicativos_1.listar_catalogo_aplicativos);
    app.post('/api/aplicativos/upload', controlador_aplicativos_1.fazer_upload_aplicativo);
    app.delete('/api/aplicativos/:nome_arquivo', controlador_aplicativos_1.remover_aplicativo_catalogo);
    app.post('/api/aplicativos/instalar', controlador_aplicativos_1.disparar_instalacao_catalogo);
    // 7. Provisionamento QR Code Android Enterprise e Versão DPC
    app.get('/api/provisionamento/qr', controlador_provisionamento_1.obter_dados_provisionamento_qr);
    app.post('/api/provisionamento/qr', controlador_provisionamento_1.obter_dados_provisionamento_qr);
    app.get('/api/provisionamento/versao-dpc', controlador_provisionamento_1.obter_versao_dpc_mais_recente);
    // 7.1 Rota de telemetria diagnóstica do provisionamento do tablet
    app.get('/api/debug/ping', async (req, res) => {
        const etapa = req.query.etapa || 'sem_etapa';
        const detalhe = req.query.detalhe || '';
        console.log(`\n======================================================`);
        console.log(`[MDM DPC PING DO TABLET] Etapa: ${etapa} | Detalhe: ${detalhe}`);
        console.log(`======================================================\n`);
        return res.send({ recebido: true, etapa, timestamp: new Date().toISOString() });
    });
    // 8. Rota dedicada de entrega de pacotes APK com proteção contra Path Traversal
    app.get('/apk/:nomeArquivo', async (requisicao, resposta) => {
        const nomeBruto = requisicao.params.nomeArquivo;
        const nomeSeguro = path_1.default.basename(nomeBruto);
        // Bloqueia qualquer tentativa de escape de diretório ou arquivo não autorizado
        const extensao = path_1.default.extname(nomeSeguro).toLowerCase();
        if (nomeSeguro !== nomeBruto || (extensao !== '.apk' && extensao !== '.xapk')) {
            resposta.status(400).send({
                sucesso: false,
                mensagem: 'Nome de arquivo inválido ou requisição de arquivo não autorizada. Permitidos apenas .apk e .xapk.',
            });
            return;
        }
        const tentativas = [
            path_1.default.resolve('/app/public/apk', nomeSeguro),
            path_1.default.resolve('/app/apk', nomeSeguro),
            path_1.default.resolve(process.cwd(), 'public/apk', nomeSeguro),
            path_1.default.resolve(process.cwd(), 'apk', nomeSeguro),
            path_1.default.resolve(__dirname, '../public/apk', nomeSeguro),
            path_1.default.resolve(__dirname, '../../public/apk', nomeSeguro),
            path_1.default.resolve(__dirname, '../../../apk', nomeSeguro),
        ];
        for (const caminho of tentativas) {
            if (fs_1.default.existsSync(caminho) && fs_1.default.statSync(caminho).isFile()) {
                const stat = fs_1.default.statSync(caminho);
                const tipoConteudo = extensao === '.xapk' ? 'application/octet-stream' : 'application/vnd.android.package-archive';
                resposta.header('Content-Type', tipoConteudo);
                resposta.header('Content-Disposition', `attachment; filename="${nomeSeguro}"`);
                resposta.header('Content-Length', stat.size);
                return resposta.send(fs_1.default.createReadStream(caminho));
            }
        }
        console.warn(`[MDM APK 404] Arquivo '${nomeSeguro}' não encontrado nos caminhos:`, tentativas);
        resposta.status(404).send({
            sucesso: false,
            mensagem: `Arquivo APK '${nomeSeguro}' não encontrado no servidor.`,
            locais_verificados: tentativas,
        });
    });
}
/**
 * Inicializa os serviços de infraestrutura e sobe o servidor HTTP/API com liberação automática de porta.
 */
async function iniciar_servidor_mdm() {
    const porta = Number(process.env.PORTA_API) || 3000;
    const host = process.env.HOST_API || '0.0.0.0';
    try {
        console.log('Iniciando infraestrutura do MDM Corporativo...');
        // Libera a porta antes de iniciar caso haja processo órfão
        liberar_porta_se_ocupada(porta);
        // 1. Conexão com o banco de dados PostgreSQL e execução de migrações estruturais
        (0, conexao_1.inicializar_pool_conexoes)();
        await (0, conexao_1.executar_migracoes_banco)();
        // 1.1 Garante existência do usuário administrador padrão
        await (0, servico_autenticacao_1.garantir_usuario_admin_inicial)();
        // 2. Conexão com o Broker MQTT
        try {
            (0, servico_mqtt_1.inicializar_servico_mqtt)();
        }
        catch (errMqtt) {
            console.warn('Aviso: Broker MQTT ainda não disponível localmente. O backend tentará reconectar periodicamente.');
        }
        // 3. Configurar Plugins e Rotas
        await configurar_plugins(aplicacao);
        configurar_rotas_api(aplicacao);
        // 4. Iniciar Servidor com retry se necessário
        try {
            await aplicacao.listen({ port: porta, host });
        }
        catch (listenErr) {
            if (listenErr.code === 'EADDRINUSE') {
                console.warn(`[MDM Port Guard] Detectado EADDRINUSE na porta ${porta}. Forçando encerramento e tentando novamente...`);
                liberar_porta_se_ocupada(porta);
                await new Promise((r) => setTimeout(r, 1000));
                await aplicacao.listen({ port: porta, host });
            }
            else {
                throw listenErr;
            }
        }
        console.log(`\n======================================================`);
        console.log(` Servidor MDM Corporativo Ativo na porta ${porta}`);
        console.log(` URL Base: http://${host}:${porta}`);
        console.log(` Catálogo de APKs: http://${host}:${porta}/apk/`);
        console.log(` APK Provisionamento: http://${host}:${porta}/apk/mdm-dpc.apk`);
        console.log(`======================================================\n`);
    }
    catch (erro) {
        console.error('Erro fatal ao iniciar servidor MDM:', erro);
        process.exit(1);
    }
}
// Inicializa a aplicação se for o arquivo principal
if (require.main === module) {
    iniciar_servidor_mdm();
}
