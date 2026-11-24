"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcular_checksum_sha256_apk = calcular_checksum_sha256_apk;
exports.gerar_payload_provisionamento_qr = gerar_payload_provisionamento_qr;
exports.gerar_imagem_qr_code = gerar_imagem_qr_code;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const qrcode_1 = __importDefault(require("qrcode"));
/**
 * Calcula o hash criptográfico SHA-256 de um arquivo de APK local.
 * Converte para formato Base64 URL-Safe sem preenchimento, exatamente como exigido
 * pela especificação Android Enterprise Device Owner QR Code Provisioning.
 */
function calcular_checksum_sha256_apk(caminhoArquivoApk) {
    if (!fs_1.default.existsSync(caminhoArquivoApk)) {
        // Caso o APK ainda não tenha sido compilado na VPS, gera um hash seguro demonstrativo
        const hashFallback = crypto_1.default
            .createHash('sha256')
            .update('MDM_CORPORATIVO_DPC_BUILD_BASE_2026')
            .digest('base64');
        return hashFallback.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    const bufferConteudo = fs_1.default.readFileSync(caminhoArquivoApk);
    const hash = crypto_1.default.createHash('sha256').update(bufferConteudo).digest('base64');
    // Conversão para Base64 URL-Safe sem padding (RFC 4648)
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/**
 * Monta o payload JSON oficial de provisionamento Device Owner para Android Enterprise.
 */
function gerar_payload_provisionamento_qr(parametros = {}) {
    let hostEntrada = (parametros.dominioDuckDns || process.env.DOMINIO_DUCKDNS || 'mdm-corporativo.duckdns.org').trim();
    const portaMqtt = parametros.portaMqtt || (process.env.MQTT_PORT ? Number(process.env.MQTT_PORT) : 1883);
    const nomeApk = parametros.nomeArquivoApk || 'mdm-dpc.apk';
    let urlBase = '';
    if (hostEntrada.startsWith('http://') || hostEntrada.startsWith('https://')) {
        urlBase = hostEntrada.replace(/\/+$/, '');
    }
    else {
        // Verifica se é formato de endereço IP (ex: 192.168.1.100 ou 192.168.1.100:8090)
        const ehIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(hostEntrada);
        if (ehIp) {
            if (!hostEntrada.includes(':')) {
                // Se for IP sem porta, usa a porta padrão do painel (8090)
                urlBase = `http://${hostEntrada}:8090`;
            }
            else {
                urlBase = `http://${hostEntrada}`;
            }
        }
        else {
            const porta = parametros.portaHttps || (process.env.HTTPS_PORT ? Number(process.env.HTTPS_PORT) : 443);
            urlBase = porta === 443 ? `https://${hostEntrada}` : `https://${hostEntrada}:${porta}`;
        }
    }
    const hostLimpo = urlBase.replace(/^https?:\/\//, '').replace(/:.*$/, '');
    const urlDownloadApk = `${urlBase}/apk/${nomeApk}`;
    // Procurar o APK em múltiplos caminhos possíveis (mesma lógica do servidor)
    const tentativas = [
        path_1.default.resolve('/app/public/apk', nomeApk),
        path_1.default.resolve('/app/apk', nomeApk),
        path_1.default.resolve(process.cwd(), 'public/apk', nomeApk),
        path_1.default.resolve(process.cwd(), 'apk', nomeApk),
        path_1.default.resolve(__dirname, '../public/apk', nomeApk),
        path_1.default.resolve(__dirname, '../../public/apk', nomeApk),
        path_1.default.resolve(__dirname, '../../../apk', nomeApk),
    ];
    let caminhoLocalApk = '';
    for (const caminho of tentativas) {
        if (fs_1.default.existsSync(caminho) && fs_1.default.statSync(caminho).isFile()) {
            caminhoLocalApk = caminho;
            break;
        }
    }
    if (!caminhoLocalApk) {
        console.error(`[MDM APK Hash 404] Arquivo '${nomeApk}' não encontrado para cálculo de hash! Usando fallback.`);
    }
    const checksumApk = calcular_checksum_sha256_apk(caminhoLocalApk);
    console.log(`[MDM QR Code] Gerando payload com APK hash: ${checksumApk}`);
    const payloadAndroidEnterprise = {
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': 'com.mdm.corporativo/com.mdm.corporativo.receptor.ReceptorAdministradorDispositivo',
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME': 'com.mdm.corporativo',
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION': urlDownloadApk,
        'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM': checksumApk,
        // Permite que câmeras, Wi-Fi e apps essenciais continuem ativos
        'android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED': true,
        'android.app.extra.PROVISIONING_SKIP_ENCRYPTION': true,
        // Bundle customizado entregue diretamente ao DPC no boot
        'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
            servidor_api: `${urlBase}/api`,
            broker_mqtt_host: hostLimpo,
            broker_mqtt_porta: portaMqtt,
            frota_total_esperada: 250,
            ambiente: 'producao',
        },
    };
    // Se credenciais Wi-Fi forem fornecidas, o tablet conecta na rede corporativa antes de baixar o APK!
    if (parametros.wifiSsid) {
        payloadAndroidEnterprise['android.app.extra.PROVISIONING_WIFI_SSID'] = parametros.wifiSsid;
        payloadAndroidEnterprise['android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE'] =
            parametros.wifiSeguranca || 'WPA';
        if (parametros.wifiSenha) {
            payloadAndroidEnterprise['android.app.extra.PROVISIONING_WIFI_PASSWORD'] = parametros.wifiSenha;
        }
    }
    return payloadAndroidEnterprise;
}
/**
 * Converte o payload JSON em imagem base64 Data URL para renderização direta na UI.
 */
async function gerar_imagem_qr_code(conteudoObjeto) {
    const jsonString = JSON.stringify(conteudoObjeto);
    return await qrcode_1.default.toDataURL(jsonString, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
        color: {
            dark: '#0f172a',
            light: '#ffffff',
        },
    });
}
