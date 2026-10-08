# Guia de Provisionamento e Instalação via ADB (Device Owner)

Este documento detalha o processo de configuração dos 250 tablets Android usando conexão cabeada USB via **ADB (Android Debug Bridge)** para registrar o aplicativo corporativo como **Device Owner**.

## 1. Onde está o APK de Controle (MDM Android)?
O APK do agente MDM corporativo (`app-release.apk` ou `mdmapk.apk`) pode ser gerado no seu computador de desenvolvimento e deve ser colocado na máquina onde os tablets serão conectados fisicamente pelo cabo USB.

**Para compilar localmente (na máquina do admin):**
Abra o terminal na pasta `android` do projeto e execute:
```bash
./gradlew assembleRelease
```
O arquivo final estará em: `android/app/build/outputs/apk/release/app-release.apk`

Você deve copiá-lo para uma pasta de fácil acesso (ex: `C:\Tablets\mdmapk.apk`).

## 2. Preparação do Tablet Novo
O tablet deve preencher **obrigatoriamente** dois requisitos para ser promovido a Device Owner:
1. **Sem Contas Google Logadas:** Se você colocar uma Conta Google no tablet antes de rodar o comando ADB, a promoção falhará (restrição de segurança do Android). O ideal é rodar o ADB em um tablet logo após sair da caixa ou recém formatado (Factory Reset).
2. **Depuração USB Ativada:** 
   * Acesse `Configurações > Sobre o tablet > Informações de software`.
   * Toque 7 vezes em "Número da compilação" para virar desenvolvedor.
   * Vá em `Configurações > Opções do desenvolvedor` e ative a **Depuração USB**.

## 3. Passo a Passo de Ativação (Instalação + DPM)

No computador em que o cabo USB está conectado:

### Passo A: Verifique a Conexão
No terminal, digite:
```bash
adb devices
```
> **Dica:** O tablet exibirá uma mensagem perguntando "Permitir depuração USB?". Marque a caixa "Sempre permitir deste computador" e clique em Permitir. Se o resultado do terminal exibir a palavra `unauthorized`, tente o comando novamente após aceitar. Tem que exibir a palavra `device`.

### Passo B: Instale o Aplicativo de Controle (APK)
Envie o APK para o tablet executando:
```bash
adb install "C:\Tablets\mdmapk.apk"
```
> Aguarde a mensagem `Success`.

### Passo C: Promova o App a Device Owner (Proprietário do Dispositivo)
Execute o comando principal (em uma única linha):
```bash
adb shell dpm set-device-owner com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo
```

**Resultado Esperado:** 
`Success: Device owner set to package com.mdm.corporativo`

### Passo D: Habilite a Inicialização Automática (Opcional, mas recomendado)
Alguns tablets mais agressivos na bateria exigem que o app seja colocado na lista de exclusão de otimização de bateria:
```bash
adb shell dumpsys deviceidle whitelist +com.mdm.corporativo
```

---

## 4. Como funciona o "Catálogo de Apps" Silencioso?
Uma vez que o tablet processou com `Success` o Passo C, o agente MDM se torna um administrador total e super-privilegiado (Device Owner). 

Isso significa que, a partir desse momento, **você não precisa mais plugar o cabo USB para instalar outros aplicativos da empresa**. 

1. Você faz o upload do APK do "App do Motorista", "App de Vendas", etc., no **Painel Web (Dashboard)** na aba *Catálogo de Apps*.
2. O arquivo APK é salvo no **VPS** (na pasta `backend/public/apk`).
3. Você clica em "Instalar na Frota".
4. Um comando MQTT é enviado para o tablet.
5. O tablet baixa o APK diretamente do seu servidor (via protocolo HTTPS).
6. O MDM Android (sendo Device Owner) usa a API Nativa `PackageInstaller` para rodar a instalação em segundo plano (background) **sem pedir nenhuma confirmação, sem apertar "Avançar" e sem interrupção na tela do usuário**.

Pronto! Agora o tablet está corporativo e auto-gerenciável pela VPS.
