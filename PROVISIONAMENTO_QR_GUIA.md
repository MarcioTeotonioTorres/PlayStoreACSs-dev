# Guia de Provisionamento Device Owner via QR Code (Android Enterprise)
## Frota de 250 Tablets Android Corporativos

Este documento detalha o procedimento operacional padrão para ativação autônoma dos 250 tablets Android como **Device Owner**, sem qualquer dependência de licenças pagas do Google (Zero-Touch pago ou EMM comercial).

---

### 1. O Mecanismo de Provisionamento Android Enterprise

Quando um dispositivo Android novo sai da caixa ou passa por um reset de fábrica, o sistema operacional entra no assistente de primeiro boot (**Setup Wizard**).
A especificação oficial do Android Enterprise permite iniciar o leitor de QR Code oculto em qualquer dispositivo Android 7.0+ (com câmera) através do seguinte gesto:

1. Na primeira tela do assistente (geralmente onde aparece **"Iniciar"** ou **"Bem-vindo"** e a seleção de idiomas), localize uma área vazia da tela (onde não haja botões).
2. **Toque 6 (seis) vezes consecutivas** no mesmo ponto vazio.
3. O assistente reproduzirá um sinal sonoro e abrirá uma tela de configuração guiada que baixa e abre o **Leitor nativo de QR Code do Android Enterprise**.

---

### 2. Estrutura do Payload JSON do QR Code

O leitor de QR Code lê um payload JSON padronizado com os seguintes campos:

```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME": "com.mdm.corporativo",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://mdm-corporativo.duckdns.org/apk/mdm-dpc.apk",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU",
  "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
  "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false,
  "android.app.extra.PROVISIONING_WIFI_SSID": "Corporativo-Tablets",
  "android.app.extra.PROVISIONING_WIFI_PASSWORD": "SuaSenhaSegura2026",
  "android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE": "WPA",
  "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
    "servidor_api": "https://mdm-corporativo.duckdns.org/api",
    "broker_mqtt_host": "mdm-corporativo.duckdns.org",
    "broker_mqtt_porta": 8883,
    "frota_total_esperada": 250,
    "ambiente": "producao"
  }
}
```

#### Detalhes Cruciais de Cada Chave:
- **`PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME`**: Aponta para o `ReceptorAdministradorDispositivo` declarado no `AndroidManifest.xml`.
- **`PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION`**: URL HTTPS servida pelo Caddy/Fastify na VPS onde o tablet baixará o arquivo APK.
- **`PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM`**: **MANDATÓRIO**. É o hash SHA-256 do arquivo APK, codificado em **Base64 URL-safe** (sem preenchimento `=` e com `+` substituído por `-` e `/` por `_`). Se o checksum não bater com o APK baixado, o Android rejeita a instalação por motivos de integridade e segurança.
- **`PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED`**: Definido como `true`. Por padrão no Android Enterprise, quase todos os aplicativos do sistema (como Câmera, Galeria, Configurações de Wi-Fi) são desativados se este campo for omitido. Mantê-lo `true` garante que os 250 tablets mantenham todas as funcionalidades de fábrica ativas.
- **`PROVISIONING_WIFI_SSID` / `PROVISIONING_WIFI_PASSWORD`**: Permite que o operador apenas aponte a câmera para o QR Code e o tablet conecte-se na rede sem precisar digitar senhas na tela!
- **`PROVISIONING_ADMIN_EXTRAS_BUNDLE`**: Parâmetros passados diretamente para o `Intent` recebido pelo método `ao_concluir_provisionamento()` do DPC.

---

### 3. Procedimento de Cálculo do Checksum no Servidor

Caso queira calcular manualmente o checksum do seu APK compilado (`mdm-dpc.apk`) no terminal Linux da sua VPS:

```bash
# Opção 1: Usando openssl
openssl dgst -sha256 -binary app-release.apk | openssl base64 -A | tr '+/' '-_' | tr -d '='

# Opção 2: Pela própria API MDM
curl http://localhost:3000/api/provisionamento/qr
```

---

### 4. Fluxo de Execução Pós-Leitura do QR Code no Tablet

1. O tablet lê o QR Code na tela do computador.
2. O tablet conecta na rede Wi-Fi informada no payload.
3. Faz o download de `https://mdm-corporativo.duckdns.org/apk/mdm-dpc.apk`.
4. Valida o hash SHA-256 recebido no QR.
5. Instala o APK de forma privilegiada e executa o comando de sistema que concede a tag imutável de **Device Owner**.
6. O Android dispara a Intent `android.app.action.PROFILE_PROVISIONING_COMPLETE`.
7. O DPC intercepta o evento na classe `ReceptorAdministradorDispositivo.kt`, executa o método `ao_concluir_provisionamento()` e:
   - Aplica as políticas corporativas (proibir reset não autorizado, proibir remoção do DPC).
   - Inicia o serviço persistente `ServicoSegundoPlanoMdm.kt`.
   - Conecta ao Mosquitto no MQTTS (porta 8883) via TLS com certificado Let's Encrypt.
   - Publica a primeira telemetria e passa a figurar como **Online** no painel web!
