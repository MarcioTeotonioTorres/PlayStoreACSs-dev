@echo off
title Restaurador de Apps Essenciais via ADB
color 0A

echo =====================================================================
echo    RESTAURADOR DE APLICATIVOS ESSENCIAIS VIA ADB
echo    Camera, Files, Gravador de Voz, Calculadora e Relogio
echo =====================================================================
echo.

set ADB=adb
where adb >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "%~dp0adb.exe" (
        set ADB="%~dp0adb.exe"
    ) else if exist "C:\platform-tools\adb.exe" (
        set ADB="C:\platform-tools\adb.exe"
    ) else if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
        set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    )
)

echo [1/3] Verificando comunicacao com o tablet via USB...
%ADB% wait-for-device
echo Tablet detectado com sucesso:
%ADB% devices -l
echo.

set ADMIN=com.mdm.corporativo/.receptor.ReceptorAdministradorDispositivo

echo [2/3] Restaurando pacotes de fabrica do sistema...
echo.

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
    com.sec.android.app.myfiles
    com.tcl.soundrecorder
    com.android.soundrecorder
    com.google.android.soundrecorder
    com.jrdcom.soundrecorder
    com.tcl.calculator
    com.google.android.calculator
    com.android.calculator2
    com.jrdcom.calculator
    com.sec.android.app.popupcalculator
    com.tcl.deskclock
    com.google.android.deskclock
    com.android.deskclock
    com.jrdcom.deskclock
    com.sec.android.app.clockpackage
    com.tcl.gallery
    com.android.gallery3d
    com.google.android.apps.photos
    com.tcl.notes
    com.android.chrome
    br.gov.saude.esus.territorio
    br.gov.datasus.esusatendimentomobile
    br.gov.saude.acs
    com.whatsapp
    com.whatsapp.w4b
) do (
    echo Restaurando: %%P
    %ADB% shell cmd package install-existing %%P >nul 2>&1
    %ADB% shell pm install-existing %%P >nul 2>&1
    %ADB% shell cmd package set-application-hidden --user 0 %%P false >nul 2>&1
    %ADB% shell dpm set-application-hidden %ADMIN% %%P false >nul 2>&1
    %ADB% shell pm unsuspend %%P >nul 2>&1
    %ADB% shell pm unhide %%P >nul 2>&1
    %ADB% shell pm default-state --user 0 %%P >nul 2>&1
    %ADB% shell pm enable %%P >nul 2>&1
)

echo.
echo [3/3] Reiniciando servico MDM e atualizando politicas...
%ADB% shell am start-foreground-service -n com.mdm.corporativo/.servico.ServicoSegundoPlanoMdm >nul 2>&1
%ADB% shell am broadcast -a com.mdm.corporativo.FORCAR_SINCRONIZACAO >nul 2>&1

echo.
echo =====================================================================
echo    RESTAURACAO CONCLUIDA COM SUCESSO!
echo    Verifique no tablet: Camera, Files, Gravador, Calculadora e Relogio.
echo =====================================================================
echo.
pause
