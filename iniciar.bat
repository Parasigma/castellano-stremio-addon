@echo off
REM Arranca el Addon Castellano para Stremio.
title Addon Castellano para Stremio
cd /d "%~dp0"
echo Arrancando el addon... (deja esta ventana abierta mientras ves la TV)
echo Panel: http://localhost:7000
npm start
pause
