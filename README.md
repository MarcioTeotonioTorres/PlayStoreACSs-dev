# Plataforma de MDM Corporativo Privado (250 Tablets Android)

Solução corporativa e autônoma de Gerenciamento e Monitoramento de Dispositivos Móveis (MDM / EMM Privado) para **250 tablets Android**, operando como **Device Owner (Android Enterprise)** provisionado via **QR Code no primeiro boot**.

A infraestrutura foi projetada para execução autônoma em uma VPS com domínio **DuckDNS**, certificados **Let's Encrypt** e mensageria segura **MQTT com TLS (MQTTS)**, sem dependência de licenças pagas do Google.

---

## 🏛️ Estrutura do Monorepo

```
PlayServiceACSs/
├── android/                                 # Agente 1: Aplicativo Android DPC (Device Owner)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml          # Configuração de permissões e receptores de sistema
│   │   │   ├── res/xml/dispositivo_admin_politicas.xml # Declaração de políticas do DeviceAdminReceiver
│   │   │   └── java/com/mdm/corporativo/
│   │   │       ├── receptor/
│   │   │       │   ├── ReceptorAdministradorDispositivo.kt # Extensão de DeviceAdminReceiver
│   │   │       │   └── ReceptorInicializacaoSistema.kt      # Auto-start após reinício do tablet
│   │   │       ├── gestores/
│   │   │       │   ├── GestorPoliticasDispositivo.kt        # Bloqueio, reboot, políticas, quiosque
│   │   │       │   ├── GestorInstaladorSilencioso.kt        # PackageInstaller silencioso (Device Owner)
│   │   │       │   ├── GestorTelemetria.kt                  # Bateria, Wi-Fi RSSI, apps, RAM, disco
│   │   │       │   └── GestorComandosMdm.kt                 # Roteador de execução de comandos remotos
│   │   │       ├── mqtt/
│   │   │       │   └── ClienteMqttSeguro.kt                 # Cliente TLS/MQTTS com LWT e reconexão
│   │   │       ├── servico/
│   │   │       │   └── ServicoSegundoPlanoMdm.kt            # Foreground Service persistente
│   │   │       └── ui/
│   │   │           └── AtividadeProvisionamentoPrincipal.kt # Tela de diagnóstico e status
│   │   └── build.gradle.kts
│   └── settings.gradle.kts
│
├── backend/                                 # Agente 2: API REST Fastify + Gateway MQTT + PostgreSQL
│   ├── src/
│   │   ├── banco/
│   │   │   ├── schema.sql                   # Modelagem PostgreSQL (dispositivos, comandos, políticas)
│   │   │   └── conexao.ts                   # Pool e consultas SQL
│   │   ├── servicos/
│   │   │   ├── servico_mqtt.ts              # Escuta de telemetria, LWT e despacho de comandos
│   │   │   └── servico_provisionamento.ts   # Cálculo SHA-256 e payload Android Enterprise
│   │   ├── controladores/
│   │   │   ├── controlador_dispositivos.ts  # Métricas da frota e listagem
│   │   │   ├── controlador_comandos.ts      # Despacho de comandos individuais e em lote
│   │   │   └── controlador_provisionamento.ts # Endpoint para renderização do QR Code
│   │   └── servidor.ts                      # Servidor Fastify com CORS e download de APK
│   ├── public/apk/                          # Diretório estático para distribuição do APK DPC
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/                                # Agente 3: Painel de Controle Web (React + Vite)
│   ├── src/
│   │   ├── componentes/
│   │   │   ├── MetricasFrota.tsx            # Cards: Total (250), Online, Bateria Crítica, Sinal
│   │   │   ├── TabelaDispositivos.tsx       # Tabela com busca, filtros e ações rápidas
│   │   │   ├── ModalComandos.tsx            # Ações remotas individuais (Bloquear, Reboot, Quiosque)
│   │   │   ├── PainelProvisionamentoQr.tsx  # Tela do QR Code Android Enterprise (6 toques no boot)
│   │   │   └── PainelComandosLote.tsx       # Disparo simultâneo para toda a frota
│   │   ├── servicos/
│   │   │   └── api_mdm.ts                   # Cliente HTTP para a API
│   │   ├── App.tsx                          # Aplicação principal
│   │   ├── index.css                        # Design system escuro de alta fidelidade
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── infraestrutura/                          # Configurações de Deploy VPS
│   ├── docker-compose.yml                   # PostgreSQL 16 + Mosquitto MQTTS + Fastify + Caddy
│   ├── mosquitto/
│   │   └── config/mosquitto.conf            # Listener 1883 (interno) e 8883 (TLS MQTTS externo)
│   └── caddy/
│       └── Caddyfile                        # Proxy reverso HTTPS automático com DuckDNS
│
├── PROVISIONAMENTO_QR_GUIA.md               # Manual operacional detalhado de ativação dos tablets
└── README.md
```

---

## 🎯 Padrão de Nomenclatura Mandatório

Em conformidade rigorosa com a especificação, **todas as funções e métodos gerados possuem nomes em português**:

| Módulo | Exemplos de Funções Implementadas |
|---|---|
| **Android DPC** | `bloquear_tela_imediata()`, `reiniciar_aparelho()`, `definir_bloqueio_reset_fabrica()`, `definir_bloqueio_camera()`, `definir_bloqueio_usb()`, `configurar_modo_quiosque()`, `instalar_aplicativo_silencioso()`, `coletar_telemetria_dispositivo()`, `conectar_broker_mqtt()`, `ao_concluir_provisionamento()` |
| **Backend API** | `obter_resumo_frota()`, `listar_dispositivos()`, `despachar_comando_dispositivo()`, `despachar_comando_em_lote()`, `gerar_payload_provisionamento_qr()`, `calcular_checksum_sha256_apk()`, `inicializar_servico_mqtt()`, `processar_mensagem_telemetria()` |
| **Frontend Web** | `obter_resumo_frota_api()`, `listar_dispositivos_api()`, `despachar_comando_api()`, `despachar_comando_lote_api()`, `carregar_dados_sistema()`, `ao_bloquear_dispositivo_rapido()`, `executar_comando_escolhido()` |

---

## 📱 Provisionamento Device Owner via QR Code

1. Ligue o tablet com o Android restaurado de fábrica.
2. Na tela de boas-vindas (*"Iniciar"*), execute o **gesto de 6 toques seguidos** em uma área vazia da tela.
3. O Android iniciará o leitor de QR Code nativo do Android Enterprise.
4. Aponte a câmera para o QR Code gerado pelo painel (`PainelProvisionamentoQr.tsx`).
5. O tablet conectará na rede corporativa Wi-Fi configurada, baixará o APK `mdm-dpc.apk`, validará o checksum SHA-256 e assumirá o papel de **Device Owner**.

Consulte o [PROVISIONAMENTO_QR_GUIA.md](file:///c:/Users/Marcinho%20do%20TI/Documents/Projetos%20Mobile/PlayServiceACSs/PROVISIONAMENTO_QR_GUIA.md) para detalhes completos do payload.

---

## 🚀 Como Executar em Desenvolvimento Local

### 1. Iniciar o Backend:
```bash
cd backend
npm.cmd install
npm.cmd run dev
```
*API disponível em `http://localhost:3000` (e download de APK em `/apk/mdm-dpc.apk`).*

### 2. Iniciar o Frontend:
```bash
cd frontend
npm.cmd install
npm.cmd run dev
```
*Painel disponível em `http://localhost:5173`.*

---

## 🌐 Deploy de Produção na VPS (DuckDNS + Let's Encrypt)

```bash
cd infraestrutura
# Preencha seu domínio DuckDNS no arquivo .env ou execute:
DOMINIO_DUCKDNS=sua-empresa.duckdns.org docker compose up -d
```
O Caddy solicitará o certificado SSL do Let's Encrypt automaticamente para o seu subdomínio DuckDNS, e o Mosquitto atenderá no MQTTS com TLS na porta 8883.
