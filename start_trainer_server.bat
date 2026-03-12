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

node "%ROOT%\scripts\trainer-server.mjs"
set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Trainer server exited with code %EXIT_CODE%.
  echo If dependency is missing, run: npm i -D ws
  pause
)
exit /b %EXIT_CODE%
