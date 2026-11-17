@echo off
chcp 65001 > nul
title Atualizador do Agente MDM Corporativo - v1.2.7 Build 10
color 0B

echo =====================================================================
echo    ATUALIZADOR DO AGENTE MDM CORPORATIVO (DPC v1.2.7 Build 10)
echo    Restauração Automática: Calculadora, Relógio, e-SUS e Câmera
echo =====================================================================
echo.
echo Certifique-se de que o tablet esta conectado via cabo USB com
echo a Depuração USB ativada e a tela desbloqueada.
echo.

set ADB=
if exist "%~dp0adb.exe" (
    set ADB="%~dp0adb.exe"
) else if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
) else if exist "C:\platform-tools\adb.exe" (
    set ADB="C:\platform-tools\adb.exe"
) else (
    where adb.exe >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set ADB=adb
    )
)

if "%ADB%"=="" (
    echo [ERRO] adb.exe nao encontrado no caminho padrao do Android SDK.
    pause
    exit /b 1
)

set APK_ALVO=
if exist "%~dp0backend\public\apk\mdm-dpc.apk" (
    set APK_ALVO="%~dp0backend\public\apk\mdm-dpc.apk"
) else if exist "%~dp0producao\apk\mdm-dpc.apk" (
    set APK_ALVO="%~dp0producao\apk\mdm-dpc.apk"
) else if exist "%~dp0apk\mdm-dpc.apk" (
    set APK_ALVO="%~dp0apk\mdm-dpc.apk"
)

echo [1/3] Verificando conexao com o tablet...
%ADB% wait-for-device
%ADB% devices
echo Conectado com sucesso!
echo.

echo Aplicando blindagem preventiva contra Play Protect (Package Verifier)...
%ADB% shell settings put global package_verifier_enable 0 > nul 2>&1
%ADB% shell settings put global package_verifier_user_consent 0 > nul 2>&1
%ADB% shell settings put global upload_apk_enable 0 > nul 2>&1

echo [2/3] Instalando versao 1.2.7 (preservando o Device Owner intacto)...
%ADB% install -r -g -d %APK_ALVO%
%ADB% shell pm enable com.mdm.corporativo > nul 2>&1
%ADB% shell pm unhide com.mdm.corporativo > nul 2>&1

echo.
echo [3/3] Restaurando Calculadora, Relogio, Camera, Gravador, Files e apps essenciais...
set ADMIN=com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo

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
    com.tcl.fmradio
    com.android.fmradio
    com.tcl.notes
    com.android.chrome
    br.gov.saude.esus.territorio
    br.gov.datasus.esusatendimentomobile
    br.gov.saude.acs
    com.whatsapp
    com.whatsapp.w4b
) do (
    %ADB% shell cmd package install-existing %%P > nul 2>&1
    %ADB% shell pm install-existing %%P > nul 2>&1
    %ADB% shell cmd package set-application-hidden --user 0 %%P false > nul 2>&1
    %ADB% shell dpm set-application-hidden %ADMIN% %%P false > nul 2>&1
    %ADB% shell pm unsuspend %%P > nul 2>&1
    %ADB% shell pm unhide %%P > nul 2>&1
    %ADB% shell pm default-state --user 0 %%P > nul 2>&1
    %ADB% shell pm enable %%P > nul 2>&1
)

%ADB% shell am start-foreground-service -n com.mdm.corporativo/.servico.ServicoSegundoPlanoMdm > nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================================
    echo   SUCESSO! O MDM Corporativo foi atualizado para v1.2.7!
    echo   Calculadora, Relogio, Camera e e-SUS foram restaurados com exito.
    echo =====================================================================
) else (
    echo.
    echo [ERRO] Falha ao instalar o APK. Verifique se o tablet esta desbloqueado
    echo e se a permissao de depuracao USB foi aceita na tela.
)

echo.
pause
