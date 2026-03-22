@echo off
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "WRAPPER=%ROOT%\dev\bin\start_training_bridge.bat"

if not exist "%WRAPPER%" (
  echo Missing wrapper script: "%WRAPPER%"
  exit /b 1
)

call "%WRAPPER%" %*
exit /b %ERRORLEVEL%
