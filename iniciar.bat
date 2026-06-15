@echo off
REM Arranca el Addon Castellano para Stremio.
title Addon Castellano para Stremio
cd /d "%~dp0"

if not exist "%~dp0package.json" (
  echo ERROR: no encuentro la app en esta carpeta ^(%~dp0^).
  echo Ejecuta este .bat DENTRO de la carpeta del addon, normalmente:
  echo    %USERPROFILE%\castellano-stremio-addon
  pause
  exit /b 1
)

echo Arrancando el addon... (deja esta ventana abierta mientras ves la TV)
echo Panel: http://localhost:7000
npm start
pause
