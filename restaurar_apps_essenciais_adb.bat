@echo off
chcp 65001 > nul
title Restaurador de Apps Essenciais via ADB - Câmera, Files e Gravador
color 0A

echo =====================================================================
echo    RESTAURADOR DE APLICATIVOS ESSENCIAIS VIA ADB (USB)
echo    Câmera, Gerenciador de Arquivos (Files), Gravador de Voz, etc.
echo =====================================================================
echo.
echo Conecte o tablet ao computador via cabo USB.
echo Certifique-se de que a Depuração USB está ativada.
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
    echo [ERRO] adb.exe não foi encontrado no sistema.
    echo Instale o Android Platform Tools ou verifique o caminho do SDK.
    pause
    exit /b 1
)

echo [1/3] Aguardando dispositivo USB...
%ADB% wait-for-device
echo Dispositivo detectado:
%ADB% devices -l
echo.

set ADMIN=com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo

echo [2/3] Restaurando aplicativos essenciais (resolvendo estado desinstalado/oculto)...
echo.

set LISTA_PACOTES=^
 com.tcl.camera ^
 com.google.android.GoogleCamera ^
 com.android.camera ^
 com.android.camera2 ^
 com.mediatek.camera ^
 com.google.android.documentsui ^
 com.android.documentsui ^
 com.google.android.apps.nbu.files ^
 com.tcl.filemanager ^
 com.android.filemanager ^
 com.jrdcom.filemanager ^
 com.sec.android.app.myfiles ^
 com.tcl.soundrecorder ^
 com.android.soundrecorder ^
 com.google.android.soundrecorder ^
 com.jrdcom.soundrecorder ^
 com.tcl.calculator ^
 com.google.android.calculator ^
 com.android.calculator2 ^
 com.jrdcom.calculator ^
 com.sec.android.app.popupcalculator ^
 com.tcl.deskclock ^
 com.google.android.deskclock ^
 com.android.deskclock ^
 com.jrdcom.deskclock ^
 com.sec.android.app.clockpackage ^
 com.tcl.gallery ^
 com.android.gallery3d ^
 com.google.android.apps.photos ^
 com.tcl.fmradio ^
 com.android.fmradio ^
 com.tcl.notes ^
 com.android.chrome ^
 br.gov.saude.esus.territorio ^
 br.gov.datasus.esusatendimentomobile ^
 br.gov.saude.acs ^
 com.whatsapp ^
 com.whatsapp.w4b

for %%P in (%LISTA_PACOTES%) do (
    echo [RESTAURANDO] %%P...
    REM 1. Reinstala o app caso tenha sido desinstalado para o usuário 0 (resolve 'não está na lista')
    %ADB% shell cmd package install-existing %%P > nul 2>&1
    %ADB% shell pm install-existing %%P > nul 2>&1

    REM 2. Remove restrição de ocultamento (unhide) no nível de pacote e Device Owner
    %ADB% shell cmd package set-application-hidden --user 0 %%P false > nul 2>&1
    %ADB% shell dpm set-application-hidden %ADMIN% %%P false > nul 2>&1
    %ADB% shell pm unhide %%P > nul 2>&1

    REM 3. Remove suspensão (unsuspend)
    %ADB% shell cmd package unsuspend --user 0 %%P > nul 2>&1
    %ADB% shell pm unsuspend %%P > nul 2>&1

    REM 4. Restaura estado padrão e habilita
    %ADB% shell pm default-state --user 0 %%P > nul 2>&1
    %ADB% shell pm enable --user 0 %%P > nul 2>&1
)

echo.
echo [3/3] Sincronizando e reiniciando o serviço MDM...
%ADB% shell am start-foreground-service -n com.mdm.corporativo/.servico.ServicoSegundoPlanoMdm > nul 2>&1
%ADB% shell am broadcast -a com.mdm.corporativo.FORCAR_SINCRONIZACAO -n com.mdm.corporativo/.receptor.ReceptorBoot > nul 2>&1

echo.
echo =====================================================================
echo    OPERAÇÃO CONCLUÍDA!
echo.
echo    Verifique a tela inicial e a gaveta de aplicativos do tablet:
echo    - Câmera
echo    - Arquivos (Files / Gerenciador de Arquivos)
echo    - Gravador de Voz (Sound Recorder)
echo    - Calculadora e Relógio
echo =====================================================================
echo.
pause

