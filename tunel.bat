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
echo   Tunel publico para Stremio  -  NO CIERRES esta ventana
echo ============================================================
echo  La URL aparecera abajo en unos segundos y tambien en el
echo  panel del addon: http://localhost:7000  (pestana Instalar, seccion 3)
echo.
powershell -NoProfile -Command "cloudflared tunnel --no-autoupdate --url http://localhost:7001 2>&1 | Tee-Object -FilePath 'config\tunnel.log'"
pause
