@echo off
REM Tunel con URL FIJA usando Tailscale Funnel (gratis, HTTPS valido, sin avisos).
REM Deja esta ventana ABIERTA. La URL no cambia entre reinicios.
title Tunel FIJO (Tailscale) - NO CERRAR
cd /d "%~dp0"

where tailscale >nul 2>&1
if errorlevel 1 (
  echo ============================================================
  echo  Tailscale no esta instalado.
  echo  1) Descargalo e instalalo desde:  https://tailscale.com/download
  echo  2) Inicia sesion en Tailscale (crear cuenta gratis).
  echo  3) Vuelve a ejecutar este funnel.bat
  echo ============================================================
  pause
  exit /b 1
)

echo ============================================================
echo   TUNEL FIJO (Tailscale)  -  NO CIERRES ESTA VENTANA
echo ============================================================
echo.
echo  Exponiendo el reproductor (puerto 7001) con una URL FIJA.
echo  Cuando aparezca la URL  https://....ts.net , copiala y pegala
echo  en el addon:  Panel -> pestana Reproductor -> "URL publica fija"
echo  (solo la primera vez; despues queda guardada y NO cambia).
echo.
echo  Si es la primera vez, Tailscale puede pedirte activar 'Funnel'
echo  con un enlace; abrelo y acepta.
echo.

tailscale funnel 7001

echo.
echo El tunel se ha cerrado.
pause
