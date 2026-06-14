@echo off
REM Descarga los ultimos cambios desde GitHub y reinstala dependencias.
title Actualizar Addon Castellano
cd /d "%~dp0"
echo Descargando cambios desde GitHub...
git pull
echo Actualizando dependencias...
call npm install --no-fund --no-audit
echo.
echo Listo. Vuelve a arrancar el addon con iniciar.bat
pause
