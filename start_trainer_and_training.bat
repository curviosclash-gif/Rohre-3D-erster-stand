@echo off
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

cd /d "%ROOT%"
if errorlevel 1 (
  echo Invalid project path: "%ROOT%"
  pause
  exit /b 1
)

set TRAINER_HOST=127.0.0.1
set TRAINER_PORT=8765
set BRIDGE_URL=ws://%TRAINER_HOST%:%TRAINER_PORT%
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TRAIN_STAMP=DEEP_LEARNING_%%I"
if not defined TRAIN_STAMP set "TRAIN_STAMP=DEEP_LEARNING_%RANDOM%"

echo Starting trainer server in a new window...
start "Trainer Server" cmd /k "cd /d ""%ROOT%"" && node ""%ROOT%\scripts\trainer-server.mjs"""

echo Waiting for server startup...
timeout /t 2 /nobreak >nul

echo.
echo Starting bridge training...
echo Bridge URL: %BRIDGE_URL%
echo Stamp: %TRAIN_STAMP%
echo.

node "%ROOT%\scripts\training-run.mjs" --bridge-mode bridge --bridge-url %BRIDGE_URL% --bridge-connect-timeout-ms 5000 --bridge-strict true --bridge-require-ready-message true --stamp %TRAIN_STAMP% %*
set EXIT_CODE=%ERRORLEVEL%

echo.
if "%EXIT_CODE%"=="0" (
  echo Training finished successfully.
) else (
  echo Training failed with exit code %EXIT_CODE%.
)
echo.
echo Note: Trainer server window stays open. Close it manually when done.
pause
exit /b %EXIT_CODE%
