# Guia de Provisionamento e Instalação via ADB (Device Owner) - v1.2.3

Este documento detalha o processo de configuração dos 250 tablets Android (compatível com Android 8 até **Android 15 / API 35**, incluindo frota **TCL 8493A**) usando conexão cabeada USB via **ADB (Android Debug Bridge)** para registrar o aplicativo corporativo como **Device Owner (Proprietário do Dispositivo)**.

---

## 1. Onde está o APK de Controle (MDM Android DPC)?
O APK do agente MDM corporativo é o arquivo principal que controla o tablet. Ele fica localizado na pasta pública do backend ou na pasta de distribuição:
* `./backend/public/apk/mdm-dpc.apk` (Ambiente Dev)
* `./producao/apk/mdm-dpc.apk` (Ambiente Produção)
* Também pode ser baixado diretamente pelo botão no painel web: `https://[IP_OU_DOMINIO]/apk/mdm-dpc.apk`

### Como gerar uma nova versão após alterar o código Android:
Abra o terminal na pasta `android` do projeto e execute:
```bash
cd android
.\gradlew assembleRelease
```
O arquivo compilado final gerado será: `android/app/build/outputs/apk/release/app-release.apk`.
Copie este arquivo para `backend/public/apk/mdm-dpc.apk` e `producao/apk/mdm-dpc.apk`.

---

## 2. Preparação do Tablet Novo
O tablet deve preencher **obrigatoriamente** dois requisitos para ser promovido a Device Owner:
1. **Sem Contas Google / Samsung Logadas:** Se você colocar uma Conta Google no tablet antes de rodar o comando ADB, a promoção falhará (restrição de segurança do sistema operacional Android). O ideal é rodar o ADB em um tablet logo após sair da caixa ou recém formatado (**Factory Reset / Restauração para o Padrão de Fábrica**).
2. **Depuração USB Ativada:** 
   * Acesse `Configurações > Sobre o tablet > Informações de software`.
   * Toque **7 vezes** seguidas em "Número da compilação" até ativar o Modo Desenvolvedor.
   * Volte em `Configurações > Opções do desenvolvedor` e ligue a chave **Depuração USB**.
3. **Cabo USB de Dados:** Utilize um cabo USB que transmita dados (não apenas carregamento).

---

## 3. Métodos de Provisionamento

### Método 1: Provisionamento Automático em 1-Clique (Recomendado)
Criamos um script batch automatizado para agilizar a bancada de TI:
```bat
.\provisionar_novo_tablet.bat
```
* O script detecta automaticamente a presença do tablet via ADB.
* Localiza o `mdm-dpc.apk` tanto na raiz, em `backend\public\apk\` ou em `apk\`.
* Instala o APK com flag de atualização (`-r`).
* Promove a Device Owner via DPM.
* Concede `dumpsys deviceidle whitelist` (imunidade de bateria).
* Concede `GET_USAGE_STATS` (estatísticas de tela e tempo ocioso).
* Oculta mais de 25 bloatwares recreativos de fábrica (YouTube, Fotos, Play Store, Jogos).
* Garante a liberação e visibilidade dos aplicativos autorizados (Chrome, e-SUS Território, WhatsApp, Relógio, Calculadora).

---

### Método 2: Comandos Manuais Passo a Passo

Conecte o tablet ao computador via cabo USB e execute no terminal:

#### Passo A: Verifique a Conexão
```bash
adb devices
```
> **Atenção:** Na tela do tablet aparecerá o pop-up *"Permitir depuração USB?"*. Marque **"Sempre permitir deste computador"** e toque em **Permitir**. O terminal deve listar o serial do tablet seguido de `device` (não `unauthorized`).

#### Passo B: Instale o Aplicativo de Controle (APK)
```bash
adb install -r backend\public\apk\mdm-dpc.apk
```
*(Ou se estiver com o APK na mesma pasta: `adb install -r mdm-dpc.apk`)*  
> Retorno esperado: `Success`.

#### Passo C: Promova o App a Device Owner (Proprietário do Dispositivo)
Execute o comando DPM em linha única:
```bash
adb shell dpm set-device-owner com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo
```
> Retorno esperado: `Success: Device owner set to package com.mdm.corporativo`.  
> A partir deste instante, o app possui autoridade máxima de hardware no tablet.

#### Passo D: Habilite a Inicialização Automática e Imunidade de Bateria
```bash
adb shell dumpsys deviceidle whitelist +com.mdm.corporativo
```

#### Passo E: Permissão de Estatísticas de Uso e Leitura de App Ocioso
```bash
adb shell appops set com.mdm.corporativo GET_USAGE_STATS allow
```

#### Passo F: Ocultação de Bloatware Recreativo & Perfil Estrito ACS (Opcional se usar script)
Para ocultar aplicativos recreativos de fábrica e manter foco exclusivo nas ferramentas de saúde e trabalho:
```bash
adb shell dpm set-application-hidden com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo com.google.android.youtube true
adb shell dpm set-application-hidden com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo com.android.vending true
```

---

## 4. Como funciona o "Catálogo de Apps" e Instalação Silenciosa?

Uma vez que o tablet processou com `Success` o Passo C, o agente MDM se torna um administrador super-privilegiado (Device Owner). 

**Você não precisa mais plugar o cabo USB para instalar outros aplicativos de trabalho!**

1. Faça o upload do arquivo do aplicativo no **Painel Web (Dashboard)** na aba *Catálogo de Aplicativos*.
2. O sistema aceita tanto **.apk** como **.xapk** (Split APKs / App Bundles).
3. Na lista de pacotes, clique em **"Instalar na Frota"**.
4. O servidor envia uma ordem remota via MQTT para os tablets online.
5. O tablet baixa o pacote diretamente do servidor por HTTPS (com buffer de alta velocidade e timeout estendido de 5 minutos).
6. O MDM Android (sendo Device Owner) utiliza a API Nativa `PackageInstaller` para instalar silenciosamente em segundo plano:
   - **Arquivos .apk:** Instalação direta silenciosa em sessão única.
   - **Arquivos .xapk:** O agente DPC descompacta o arquivo ZIP, identifica o `base.apk` e todos os splits de recursos/arquiteturas (`split_config.*.apk`), e injeta todos simultaneamente na sessão do `PackageInstaller`.
7. O aplicativo é instalado sem intervenção do usuário, sem pop-up na tela e sem apertar "Avançar".
8. Imediatamente após a conclusão, o MDM desbloqueia a visibilidade do pacote (`setApplicationHidden = false` e `setPackagesSuspended = false`), fazendo o ícone surgir instantaneamente na gaveta de aplicativos.

---

## 5. Resolução de Erros Comuns

### Erro: `Not allowed to set the device owner because there are already some accounts on the device`
* **Causa:** O tablet possui uma conta Google, Samsung, WhatsApp ou e-mail já logada.
* **Solução:** Acesse `Configurações > Contas` e remova todas as contas, ou realize a restauração para o padrão de fábrica (`Configurações > Gerenciamento geral > Restaurar > Restaurar padrão de fábrica`).

### Erro: `device unauthorized`
* **Causa:** O popup de autorização de depuração USB ainda não foi confirmado na tela do tablet.
* **Solução:** Desbloqueie a tela do tablet, marque **"Sempre permitir a partir deste computador"**, toque em **Permitir** e execute `adb devices` novamente até constar como `device`.

### Erro de Instalação Remota: `INSTALL_FAILED_MISSING_SPLIT` (ex: e-SUS Território)
* **Causa:** O arquivo enviado foi um `.apk` extraído do Google Play que contém apenas a fatia `base.apk` (faltando recursos de idioma, densidade e bibliotecas nativas).
* **Solução:** Envie o arquivo no formato **`.xapk`** na aba *Catálogo de Aplicativos*. O MDM v1.2.3 possui suporte nativo para descompactar e transmitir todos os splits de uma só vez para o Android.

### Compatibilidade com Android 15 (TCL 8493A)
* Na versão 1.2.3, o Android 15 possui regras estritas de visibilidade de pacotes. O DPC inclui a permissão `QUERY_ALL_PACKAGES` e rotina de auto-unhide, garantindo que o e-SUS Território, WhatsApp e qualquer outro app corporativo apareçam na tela imediatamente após a instalação remota.

### Preservação da Depuração USB (ADB) após virar Device Owner
* O DPC corporativo mantém a depuração USB ativa por padrão (`UserManager.DISALLOW_DEBUGGING_FEATURES` desativada e `ADB_ENABLED = 1`), assegurando que a equipe técnica de TI possa continuar executando comandos ADB no tablet para suporte, diagnósticos ou emergências de bancada sem perda de conexão.

---

## 6. Políticas de Bloqueio de APKs Externos e Bluetooth

Uma vez provisionado como Device Owner, o painel web oferece controle total:
* **Bloqueio de Instaladores de APKs (Fontes Desconhecidas):** Ativa `UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES` e `UserManager.DISALLOW_INSTALL_APPS`, impedindo o usuário de instalar qualquer APK manual, lojas de terceiros ou downloads via navegador. Apenas o MDM corporativo pode instalar aplicativos.
* **Bloqueio de Bluetooth e Compartilhamento de Arquivos:** Ativa `UserManager.DISALLOW_BLUETOOTH_SHARING`, `UserManager.DISALLOW_BLUETOOTH` e desliga o rádio Bluetooth, impedindo recebimento ou envio de APKs e arquivos por proximidade.
* **Proteção Ativa contra Bootloop:** Pacotes vitais do sistema operacional (Configurações, Launcher, SystemUI, Teclado) são protegidos permanentemente e imunes a suspensão ou bloqueio.
