@echo off
echo ====================================
echo   Curvios Clash - Desktop App
echo ====================================
echo.
echo Projektpfad: %~dp0
echo.

if not exist "%~dp0electron\node_modules\electron" (
    echo Electron-Abhaengigkeiten fehlen. Fuehre Setup aus...
    call npm run app:setup
    if errorlevel 1 goto :fail
    echo.
)

call npm run app:start
if errorlevel 1 goto :fail
goto :end

:fail
echo.
echo Desktop-Start fehlgeschlagen.

:end
pause
