@echo off
REM Abre el tunel publico (Cloudflare) para instalar el addon en movil/TV.
REM Deja esta ventana ABIERTA mientras uses la TV. Mientras siga abierta,
REM la URL del tunel NO cambia, aunque reinicies el addon.
title Tunel - Addon Castellano (NO CERRAR)
cd /d "%~dp0"

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo ERROR: cloudflared no esta instalado.
  echo Instalalo con:  winget install --id Cloudflare.cloudflared --exact
  echo  o vuelve a ejecutar INSTALAR.bat
  pause
  exit /b 1
)

echo ============================================================
echo   TUNEL ACTIVO  -  NO CIERRES ESTA VENTANA
echo ============================================================
echo.
echo  - La URL aparecera en unos 10-20 segundos en el panel del addon:
echo      http://localhost:7000   (pestana Instalar, seccion 3)
echo  - Esta ventana se quedara aparentemente quieta: es NORMAL.
echo  - Detalle/errores: abre el archivo  config\tunnel.log
echo.
echo Iniciando tunel...

REM Salida limpia al log (sin envoltura de PowerShell). El addon lee la URL de aqui.
cloudflared tunnel --no-autoupdate --url http://localhost:7001 > "config\tunnel.log" 2>&1

echo.
echo El tunel se ha cerrado. Revisa config\tunnel.log si hubo errores.
pause
