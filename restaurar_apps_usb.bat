@echo off
chcp 65001 > nul
echo =====================================================================
echo    RESTAURAÇÃO IMEDIATA: CALCULADORA, RELÓGIO E APPS DE TRABALHO
echo =====================================================================
echo.
echo Conecte o tablet ao computador via cabo USB (com depuração ativada).
echo.

set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not exist %ADB% (
    set ADB="C:\platform-tools\adb.exe"
)

if not exist %ADB% (
    echo [ERRO] adb.exe nao encontrado no computador.
    echo Baixe o Android Platform-Tools ou use a atualizacao via VPS.
    pause
    exit /b 1
)

echo [1/3] Localizando tablet conectado via USB...
%ADB% devices
echo.

echo [2/3] Reativando e desocultando Calculadoras...
%ADB% shell pm unhide com.tcl.calculator > nul 2>&1
%ADB% shell pm unhide com.google.android.calculator > nul 2>&1
%ADB% shell pm unhide com.android.calculator2 > nul 2>&1
%ADB% shell pm unhide com.sec.android.app.popupcalculator > nul 2>&1
%ADB% shell pm unsuspend com.tcl.calculator > nul 2>&1
%ADB% shell pm unsuspend com.google.android.calculator > nul 2>&1
%ADB% shell pm unsuspend com.android.calculator2 > nul 2>&1
%ADB% shell pm unsuspend com.sec.android.app.popupcalculator > nul 2>&1
%ADB% shell pm enable com.tcl.calculator > nul 2>&1
%ADB% shell pm enable com.google.android.calculator > nul 2>&1
%ADB% shell pm enable com.android.calculator2 > nul 2>&1
echo   - Calculadoras reativadas com sucesso!

echo [3/3] Reativando e desocultando Relogio, Camera e e-SUS...
%ADB% shell pm unhide com.tcl.deskclock > nul 2>&1
%ADB% shell pm unhide com.google.android.deskclock > nul 2>&1
%ADB% shell pm unhide com.android.deskclock > nul 2>&1
%ADB% shell pm unsuspend com.tcl.deskclock > nul 2>&1
%ADB% shell pm unsuspend com.google.android.deskclock > nul 2>&1
%ADB% shell pm unsuspend com.android.deskclock > nul 2>&1
%ADB% shell pm enable com.tcl.deskclock > nul 2>&1
%ADB% shell pm enable com.google.android.deskclock > nul 2>&1

%ADB% shell pm unhide com.tcl.camera > nul 2>&1
%ADB% shell pm unhide com.android.camera > nul 2>&1
%ADB% shell pm unsuspend com.tcl.camera > nul 2>&1
%ADB% shell pm unsuspend com.android.camera > nul 2>&1
%ADB% shell pm enable com.tcl.camera > nul 2>&1
%ADB% shell pm enable com.android.camera > nul 2>&1

%ADB% shell pm unhide br.gov.saude.esus.territorio > nul 2>&1
%ADB% shell pm unsuspend br.gov.saude.esus.territorio > nul 2>&1
%ADB% shell pm enable br.gov.saude.esus.territorio > nul 2>&1

echo   - Relogio, Camera e e-SUS reativados com sucesso!
echo.
echo =====================================================================
echo   SUCESSO! Os aplicativos foram restaurados no tablet!
echo =====================================================================
echo.
pause

