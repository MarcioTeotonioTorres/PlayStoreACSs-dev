@echo off
chcp 65001 > nul
title Provisionamento Automático de Tablet MDM - PlayServiceACSs
color 0A

echo ===============================================================================
echo     PROVISIONAMENTO AUTOMÁTICO ADB - MDM CORPORATIVO (v1.2.1)
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

echo [1/5] Verificando conexao com o tablet...
%ADB% wait-for-device
%ADB% devices
echo Conectado com sucesso!
echo.

echo [2/5] Instalando o agente MDM Corporativo v1.2.1...
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

echo [3/5] Promovendo o aplicativo a Device Owner (Proprietario do Dispositivo)...
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

echo [4/5] Otimizando bateria e liberando permissoes avancadas...
%ADB% shell dumpsys deviceidle whitelist +com.mdm.corporativo > nul 2>&1
%ADB% shell appops set com.mdm.corporativo GET_USAGE_STATS allow > nul 2>&1
echo Permissoes de telemetria e bateria concluidas!
echo.

echo [5/5] Inicializando o agente MDM na tela do tablet...
%ADB% shell am start -n com.mdm.corporativo/.ui.AtividadeProvisionamentoPrincipal > nul 2>&1
echo.

echo ===============================================================================
echo   PARABENS! TABLET PROVISIONADO COM SUCESSO!
echo ===============================================================================
echo   O tablet ja esta registrado como Device Owner e conectado a VPS.
echo   A partir de agora, o cabo USB NAO e mais necessario.
echo   Todos os apps (e-SUS Territorio, e-SUS AD) e politicas podem ser
echo   instalados e controlados remotamente pelo Painel Web.
echo ===============================================================================
echo.
pause
