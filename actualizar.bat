@echo off
REM Descarga los ultimos cambios desde GitHub y reinstala dependencias.
title Actualizar Addon Castellano
cd /d "%~dp0"

echo ============================================================
echo   Actualizando el Addon Castellano para Stremio
echo ============================================================
echo.
echo [1/2] Descargando cambios desde GitHub...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo  AVISO: 'git pull' fallo. Puede que tengas cambios locales.
  echo  Prueba a ejecutar en esta carpeta:  git stash  y luego de nuevo este .bat
)
echo.
echo [2/2] Instalando dependencias...
echo  ^(Los avisos amarillos "npm warn deprecated" son NORMALES, no son errores^)
echo.
call npm install --no-fund --no-audit --omit=optional > actualizar.log 2>&1
type actualizar.log
echo.
echo ============================================================
findstr /C:"npm error" actualizar.log >nul
if errorlevel 1 (
  echo   ACTUALIZACION COMPLETADA. Reinicia el addon con iniciar.bat
) else (
  echo   Hubo errores de npm. Mira el detalle arriba o en actualizar.log
  echo   y comparte ese archivo para diagnosticarlo.
)
echo ============================================================
pause
