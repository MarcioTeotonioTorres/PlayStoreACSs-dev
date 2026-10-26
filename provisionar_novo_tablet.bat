@echo off
chcp 65001 > nul
title Provisionamento Automático de Tablet MDM - PlayServiceACSs
color 0A

echo ===============================================================================
echo     PROVISIONAMENTO AUTOMÁTICO ADB - MDM CORPORATIVO (v1.2.1)
echo     Perfil Estrito ACS: Chrome, e-SUS, WhatsApp, Agenda e Relogio
echo ===============================================================================
echo.
echo Requisitos antes de iniciar:
echo   1. Tablet novo ou recem-formatado (SEM nenhuma Conta Google adicionada).
echo   2. Depuracao USB ativada nas "Opcoes do desenvolvedor".
echo   3. Tablet conectado ao computador via cabo USB e tela desbloqueada.
echo ===============================================================================
echo.

set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

if not exist %ADB% (
    echo [ERRO] adb.exe nao foi localizado no caminho do Android SDK:
    echo        %ADB%
    pause
    exit /b 1
)

echo [1/6] Verificando conexao com o tablet...
%ADB% wait-for-device
%ADB% devices
echo Conectado com sucesso!
echo.

echo [2/6] Instalando o agente MDM Corporativo v1.2.1...
%ADB% install -r "%~dp0backend\public\apk\mdm-dpc.apk"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao instalar o APK mdm-dpc.apk.
    echo Verifique se a tela do tablet esta desbloqueada e se aceitou a depuracao USB.
    pause
    exit /b 1
)
echo APK instalado com sucesso!
echo.

echo [3/6] Promovendo o aplicativo a Device Owner (Proprietario do Dispositivo)...
%ADB% shell dpm set-device-owner com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ALERTA] Falha ao definir Device Owner.
    echo Certifique-se de que NAO ha nenhuma conta Google ou de e-mail logada no tablet.
    pause
    exit /b 1
)
echo Device Owner ativado com sucesso!
echo.

echo [4/6] Otimizando bateria e liberando permissoes avancadas...
%ADB% shell dumpsys deviceidle whitelist +com.mdm.corporativo > nul 2>&1
%ADB% shell appops set com.mdm.corporativo GET_USAGE_STATS allow > nul 2>&1
echo Permissoes de telemetria e bateria concluidas!
echo.

echo [5/6] Aplicando politica estrita de aplicativos autorizados...
echo       Ocultando YouTube, Play Store, Jogos e bloatware de fabrica...

set ADMIN=com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo

:: 1. Ocultar bloatware, redes sociais, lojas e apps recreativos
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
) do (
    %ADB% shell dpm set-application-hidden %ADMIN% %%P true > nul 2>&1
)

:: 2. Assegurar que os aplicativos autorizados estejam 100%% liberados e visíveis
for %%P in (
    com.android.chrome
    br.gov.saude.acs
    br.gov.saude.ad2
    com.whatsapp
    com.whatsapp.w4b
    com.google.android.calendar
    com.android.calendar
    com.tcl.calendar
    com.google.android.deskclock
    com.android.deskclock
    com.tcl.deskclock
    com.mdm.corporativo
) do (
    %ADB% shell dpm set-application-hidden %ADMIN% %%P false > nul 2>&1
)

echo Politica estrita aplicada com sucesso!
echo Apenas Chrome, e-SUS, WhatsApp, Agenda e Relogio ficarao visiveis ao usuario.
echo.

echo [6/6] Inicializando o agente MDM na tela do tablet...
%ADB% shell am start -n com.mdm.corporativo/.ui.AtividadeProvisionamentoPrincipal > nul 2>&1
echo.

echo ===============================================================================
echo   PARABENS! TABLET PROVISIONADO COM SUCESSO!
echo ===============================================================================
echo   O tablet ja esta configurado como Device Owner, blindado e conectado a VPS.
echo   - Apps Bloqueados: YouTube, Loja Play Store, Fotos, Jogos, etc.
echo   - Apps Permitidos: Google Chrome, e-SUS, WhatsApp, Agenda e Relogio.
echo.
echo   A partir de agora, o cabo USB NAO e mais necessario.
echo ===============================================================================
echo.
pause
