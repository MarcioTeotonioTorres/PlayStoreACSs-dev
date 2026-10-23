# Guia de Provisionamento e Instalação via ADB (Device Owner)

Este documento detalha o processo de configuração dos 250 tablets Android usando conexão cabeada USB via **ADB (Android Debug Bridge)** para registrar o aplicativo corporativo como **Device Owner**.

## 1. Onde está o APK de Controle (MDM Android)?
O APK do agente MDM corporativo é o arquivo principal que controla o tablet. Ele fica localizado na pasta pública do backend ou na pasta de distribuição:
`./backend/public/apk/mdm-dpc.apk`
ou
`./producao/apk/mdm-dpc.apk`

**Sempre que você fizer uma alteração no código do Android e quiser gerar uma versão nova:**
Abra o terminal na pasta `android` do projeto e execute:
```bash
./gradlew assembleRelease
```
O arquivo final gerado será: `android/app/build/outputs/apk/release/app-release.apk`.
**Sim, eles são o mesmo arquivo!** O `mdm-dpc.apk` é simplesmente o `app-release.apk` renomeado e guardado na pasta de distribuição. Sempre que compilar uma versão nova, copie o `app-release.apk` e substitua o `mdm-dpc.apk`.

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
adb install ./backend/public/apk/mdm-dpc.apk
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

### Passo E: Permissão de Estatísticas de Uso e Leitura de App Ocioso (Recomendado)
Garante a leitura de aplicativo em primeiro plano e tempo ocioso/ativo no Dashboard em tempo real:
```bash
adb shell appops set com.mdm.corporativo GET_USAGE_STATS allow
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

---

## 5. Resolução de Erros Comuns no ADB

### Erro: `Not allowed to set the device owner because there are already some accounts on the device`
* **Causa:** O tablet possui uma conta Google, Samsung, WhatsApp ou e-mail logada.
* **Solução:** Acesse `Configurações > Contas` e remova todas as contas, ou faça uma restauração para o padrão de fábrica (`Configurações > Gerenciamento geral > Restaurar > Restaurar padrão de fábrica`).

### Erro: `device unauthorized`
* **Causa:** O popup de autorização de depuração USB ainda não foi confirmado na tela do tablet.
* **Solução:** Desbloqueie a tela do tablet, marque **"Sempre permitir a partir deste computador"**, toque em **Permitir** e execute `adb devices` novamente até constar como `device`.

### Preservação da Depuração USB (ADB) após virar Device Owner (v1.2.0)
Na versão 1.2.0 em diante, o DPC mantém a depuração USB ativa por padrão (`UserManager.DISALLOW_DEBUGGING_FEATURES` desativada e `ADB_ENABLED = 1`), garantindo que a equipe técnica de TI possa continuar executando comandos ADB no tablet para suporte, diagnósticos ou emergências de bancada sem perda de conexão.

---

## 6. Políticas de Bloqueio de APKs Externos e Bluetooth

Uma vez provisionado como Device Owner, o painel web oferece:
* **Bloqueio de Instaladores de APKs (Fontes Desconhecidas):** Ativa `UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES` e `UserManager.DISALLOW_INSTALL_APPS`, impedindo o usuário de instalar qualquer APK manual, lojas de terceiros ou downloads via navegador. Apenas o MDM corporativo pode instalar aplicativos.
* **Bloqueio de Bluetooth e Compartilhamento de Arquivos:** Ativa `UserManager.DISALLOW_BLUETOOTH_SHARING`, `UserManager.DISALLOW_BLUETOOTH` e desliga o rádio Bluetooth, impedindo recebimento ou envio de APKs e arquivos por proximidade.
* **Proteção Ativa contra Bootloop:** Pacotes vitais do sistema operacional (Configurações, Launcher, SystemUI, Teclado) são protegidos permanentemente e imunes a suspensão ou bloqueio.

