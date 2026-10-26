@echo off
chcp 65001 > nul
echo =====================================================================
echo    ATUALIZADOR DO AGENTE MDM CORPORATIVO (DPC v1.2.2)
echo =====================================================================
echo.
echo Certifique-se de que o tablet esta conectado via cabo USB com
echo a Depuração USB ativada.
echo.

set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"

if not exist %ADB% (
    echo [ERRO] adb.exe nao encontrado no caminho padrao do Android SDK.
    pause
    exit /b 1
)

echo [1/2] Verificando conexao com o tablet...
%ADB% devices
echo.

echo [2/2] Instalando versao 1.2.2 (preservando o Device Owner intacto)...
%ADB% install -r "%~dp0backend\public\apk\mdm-dpc.apk"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================================
    echo   SUCESSO! O MDM Corporativo foi atualizado para v1.2.2!
    echo   Agora as instalacoes silenciosas pelo painel web funcionarao 100%%.
    echo =====================================================================
) else (
    echo.
    echo [ERRO] Falha ao instalar o APK. Verifique se o tablet esta desbloqueado
    echo e se a permissao de depuracao USB foi aceita na tela.
)

echo.
pause
