@echo off
setlocal

cd /d "%~dp0"

set "PORT=9998"
set "REPO_MAP_URL=http://localhost:%PORT%/tools/repo-map/index.html"

echo === Curvios Clash - Repo Map ===
echo Erzeuge aktuellen Repo-Map-Export...
echo.

node scripts/export-repo-map.mjs
if errorlevel 1 (
    echo.
    echo Repo-Map-Export fehlgeschlagen.
    pause
    exit /b 1
)

if /I "%~1"=="--check" (
    echo.
    echo Check OK: %REPO_MAP_URL%
    exit /b 0
)

echo.
echo Starte Repo-Map auf %REPO_MAP_URL%
echo Server laeuft in diesem Fenster. Ctrl+C beendet ihn.
echo.

start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1; Start-Process '%REPO_MAP_URL%'"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port %PORT% -MaxPortTries 1 -NoBrowser

pause
