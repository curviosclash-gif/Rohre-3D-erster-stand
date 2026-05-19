@echo off
setlocal

cd /d "%~dp0"

echo === Curvios Clash - Map Tools ===
echo Starte separate Electron-App fuer Plan Map und Repo Map...
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo Fehler: npm wurde nicht gefunden.
    echo Bitte Node.js installieren oder npm in PATH verfuegbar machen.
    pause
    exit /b 1
)

if /I "%~1"=="--check" (
    echo Fuehre Map-Tools-Smoke-Test aus...
    echo.
    npm run app:maps:smoke
    exit /b %errorlevel%
)

npm run app:maps:start
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Map Tools konnte nicht gestartet werden. Exit-Code: %EXIT_CODE%
    pause
)

exit /b %EXIT_CODE%
