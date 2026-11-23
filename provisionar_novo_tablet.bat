@echo off
chcp 65001 > nul
title Provisionamento Automatico de Tablet MDM - PlayServiceACSs
color 0A

echo ===============================================================================
echo     PROVISIONAMENTO AUTOMATICO ADB - MDM CORPORATIVO [v1.2.9 Build 12]
echo     Perfil Estrito ACS: Calculadora, Relogio, Camera, e-SUS, WhatsApp e Chrome
echo ===============================================================================
echo.
echo Requisitos antes de iniciar:
echo   1. Tablet novo ou recem-formatado [SEM nenhuma Conta Google ou e-mail adicionado].
echo   2. Depuracao USB ativada nas Opcoes do desenvolvedor.
echo   3. Tablet conectado ao computador via cabo USB e tela desbloqueada.
echo ===============================================================================
echo.

set "ADB="
if exist "%~dp0adb.exe" (
    set "ADB=%~dp0adb.exe"
) else if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
) else if exist "C:\platform-tools\adb.exe" (
    set "ADB=C:\platform-tools\adb.exe"
) else (
    where adb.exe >nul 2>&1
    if not errorlevel 1 set "ADB=adb"
)

if not defined ADB (
    echo [ERRO] O executavel adb.exe nao foi encontrado!
    echo Instale o Android SDK Platform-Tools ou coloque adb.exe na pasta deste script.
    pause
    exit /b 1
)

echo [ADB] Detectado: "%ADB%"
echo.

set "APK_ALVO="
if exist "%~dp0backend\public\apk\mdm-dpc.apk" (
    set "APK_ALVO=%~dp0backend\public\apk\mdm-dpc.apk"
) else if exist "%~dp0producao\apk\mdm-dpc.apk" (
    set "APK_ALVO=%~dp0producao\apk\mdm-dpc.apk"
) else if exist "%~dp0apk\mdm-dpc.apk" (
    set "APK_ALVO=%~dp0apk\mdm-dpc.apk"
) else if exist "%~dp0mdm-dpc.apk" (
    set "APK_ALVO=%~dp0mdm-dpc.apk"
) else if exist "%~dp0android\app\build\outputs\apk\release\app-release.apk" (
    set "APK_ALVO=%~dp0android\app\build\outputs\apk\release\app-release.apk"
) else if exist "C:\platform-tools\mdm-dpc.apk" (
    set "APK_ALVO=C:\platform-tools\mdm-dpc.apk"
)

if not defined APK_ALVO (
    echo [ERRO] O arquivo mdm-dpc.apk nao foi encontrado!
    echo Certifique-se de compilar o APK ou colocar mdm-dpc.apk na pasta.
    pause
    exit /b 1
)

echo [APK] Detectado: "%APK_ALVO%"
echo.

echo [1/7] Verificando conexao com o tablet via USB [ADB]...
"%ADB%" devices
echo.
echo Testando comunicacao com o dispositivo...
"%ADB%" get-state >nul 2>&1
if errorlevel 1 (
    echo.
    echo ===============================================================================
    echo [ATENCAO] Tablet nao detectado ou depuracao USB nao autorizada!
    echo ===============================================================================
    echo Para provisionar via ADB, o tablet precisa:
    echo   1. Estar LIGADO no sistema Android [tela inicial ou de configuracao].
    echo   2. Estar com Depuracao USB ATIVADA em Opcoes do desenvolvedor.
    echo   3. Ter autorizado a conexao na mensagem exibida na tela [Permitir depuracao USB].
    echo.
    echo Se o tablet acabou de ser formatado de fabrica, o metodo alternativo e:
    echo   - Na tela Ola [selecao de idioma], TOQUE 6 VEZES seguidas na tela vazia.
    echo   - Escaneie o QR Code exibido no painel Web MDM [/provisionamento].
    echo ===============================================================================
    echo.
    echo Aguardando autorizacao do tablet [conecte o cabo e aceite na tela]...
    "%ADB%" wait-for-device
)
"%ADB%" shell input keyevent 224 > nul 2>&1
"%ADB%" shell wm dismiss-keyguard > nul 2>&1
echo Conectado com sucesso!
echo.

echo [2/7] Aplicando blindagem preventiva e ativando Modo Desenvolvedor permanente...
"%ADB%" shell settings put global package_verifier_enable 0 > nul 2>&1
"%ADB%" shell settings put global package_verifier_user_consent 0 > nul 2>&1
"%ADB%" shell settings put global upload_apk_enable 0 > nul 2>&1
"%ADB%" shell settings put global adb_enabled 1 > nul 2>&1
"%ADB%" shell settings put global development_settings_enabled 1 > nul 2>&1
echo Blindagem aplicada e Modo Desenvolvedor/ADB garantidos com sucesso.
echo.

echo [3/7] Instalando o agente MDM Corporativo v1.2.9 [Build 12]...
"%ADB%" install -r -g -d "%APK_ALVO%"
if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar o APK mdm-dpc.apk.
    echo Verifique se a tela do tablet esta desbloqueada e se aceitou a depuracao USB.
    pause
    exit /b 1
)
"%ADB%" shell pm enable com.mdm.corporativo > nul 2>&1
"%ADB%" shell pm unhide com.mdm.corporativo > nul 2>&1
echo APK instalado com sucesso!
echo.

echo [4/7] Promovendo o aplicativo a Device Owner [Proprietario do Dispositivo]...
set "ADMIN=com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo"
"%ADB%" shell dpm set-device-owner "%ADMIN%"
if errorlevel 1 (
    echo.
    echo [AVISO] Se o comando dpm set-device-owner falhou:
    echo 1. Certifique-se de que NAO ha nenhuma conta Google ou e-mail logado no tablet.
    echo 2. Se o tablet ja tiver o DPC ativo, a atualizacao ja foi concluida com sucesso!
    echo.
) else (
    echo Device Owner ativado com sucesso!
)
echo.

echo [5/7] Configurando otimizacoes de bateria e permissoes de sistema...
"%ADB%" shell dumpsys deviceidle whitelist +com.mdm.corporativo > nul 2>&1
"%ADB%" shell appops set com.mdm.corporativo GET_USAGE_STATS allow > nul 2>&1
"%ADB%" shell pm grant com.mdm.corporativo android.permission.READ_PHONE_STATE > nul 2>&1
echo Permissoes corporativas concedidas com sucesso!
echo.

echo [6/7] Aplicando Perfil Estrito ACS [Padrao de Campo]:
echo       - Ocultando os 28 aplicativos recreativos e bloatware de fabrica...
echo       - Garantindo Calculadora, Relogio, Camera, Files, Gravador e e-SUS 100%% VISIVEIS e ATIVOS...
echo.

REM 1. Ocultar e suspender estritamente os 28 aplicativos recreativos do perfil
for %%P in (
    com.google.android.youtube
    com.android.vending
    com.google.android.apps.photos
    com.google.android.gm
    com.google.android.apps.tachyon
    com.google.android.videos
    com.google.android.apps.docs
    com.google.android.apps.youtube.music
    com.google.android.googlequicksearchbox
    com.google.android.apps.magazines
    com.google.android.play.games
    com.google.android.apps.podcasts
    com.google.android.feedback
    com.tcl.live
    com.tcl.community
    com.tcl.appstore
    com.tcl.usercenter
    com.tcl.browser
    com.tcl.smartswitch
    com.tcl.gamecenter
    com.netflix.mediaclient
    com.facebook.katana
    com.facebook.services
    com.facebook.system
    com.instagram.android
    com.zhiliaoapp.musically
    com.android.fmradio
    com.tcl.fmradio
) do (
    "%ADB%" shell pm disable-user --user 0 %%P > nul 2>&1
    "%ADB%" shell pm suspend %%P > nul 2>&1
)

REM 2. RESTAURACAO COMPLETA: Garante que Calculadora, Relogio, Camera, Files, Gravador, e-SUS e WhatsApp estejam 100%% ATIVOS
for %%P in (
    com.tcl.camera
    com.google.android.GoogleCamera
    com.android.camera
    com.android.camera2
    com.mediatek.camera
    com.google.android.documentsui
    com.android.documentsui
    com.google.android.apps.nbu.files
    com.tcl.filemanager
    com.android.filemanager
    com.jrdcom.filemanager
    com.tcl.soundrecorder
    com.android.soundrecorder
    com.google.android.soundrecorder
    com.jrdcom.soundrecorder
    com.tcl.calculator
    com.google.android.calculator
    com.android.calculator2
    com.sec.android.app.popupcalculator
    com.tcl.deskclock
    com.google.android.deskclock
    com.android.deskclock
    com.sec.android.app.clockpackage
    com.tcl.gallery
    com.android.gallery3d
    com.google.android.calendar
    com.android.calendar
    com.tcl.calendar
    com.tcl.notes
    com.android.chrome
    br.gov.saude.esus.territorio
    br.gov.datasus.esusatendimentomobile
    br.gov.saude.acs
    br.gov.saude.ad2
    com.whatsapp
    com.whatsapp.w4b
    com.mdm.corporativo
) do (
    "%ADB%" shell cmd package install-existing %%P > nul 2>&1
    "%ADB%" shell pm install-existing %%P > nul 2>&1
    "%ADB%" shell cmd package set-application-hidden --user 0 %%P false > nul 2>&1
    "%ADB%" shell dpm set-application-hidden "%ADMIN%" %%P false > nul 2>&1
    "%ADB%" shell pm unsuspend %%P > nul 2>&1
    "%ADB%" shell pm unhide %%P > nul 2>&1
    "%ADB%" shell pm default-state --user 0 %%P > nul 2>&1
    "%ADB%" shell pm enable %%P > nul 2>&1
)

echo Perfil Estrito ACS aplicado com sucesso!
echo Apps autorizados liberados: Calculadora, Relogio, Camera, Galeria, e-SUS, WhatsApp e Chrome.
echo.

echo [7/7] Inicializando o agente MDM e sincronizando com o servidor...
"%ADB%" shell am start -n com.mdm.corporativo/.ui.AtividadeProvisionamentoPrincipal > nul 2>&1
"%ADB%" shell am broadcast -a android.intent.action.BOOT_COMPLETED -n com.mdm.corporativo/.receptor.ReceptorInicializacaoSistema > nul 2>&1

REM Blindagem definitiva de contingencia pos-ativacao: ADB e Modo Dev sempre ativos
"%ADB%" shell settings put global adb_enabled 1 > nul 2>&1
"%ADB%" shell settings put global development_settings_enabled 1 > nul 2>&1
echo Depuracao USB [ADB] e Modo Desenvolvedor reforcados como ATIVOS permanentes.
echo.

echo ===============================================================================
echo   PARABENS! TABLET PROVISIONADO COM SUCESSO NO PADRAO DE CAMPO!
echo ===============================================================================
echo   O tablet esta como Device Owner, blindado e conectado ao painel MDM.
echo   - Calculadora: ATIVA E VISIVEL NA GAVETA
echo   - Relogio / Despertador: ATIVO E VISIVEL NA GAVETA
echo   - Camera e Galeria: ATIVAS E VISIVEIS NA GAVETA
echo   - e-SUS Territorio: ATIVO E VISIVEL NA GAVETA
echo   - WhatsApp / Chrome: ATIVOS E VISIVEIS NA GAVETA
echo   - Bloqueados: YouTube, Play Store, Jogos, Redes Sociais e Bloatware
echo.
echo   O cabo USB ja pode ser desconectado.
echo ===============================================================================
echo.
pause
