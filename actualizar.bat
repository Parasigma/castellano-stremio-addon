@echo off
REM Descarga los ultimos cambios desde GitHub y reinstala dependencias.
title Actualizar Addon Castellano
cd /d "%~dp0"

REM Comprobacion: este .bat debe estar DENTRO de la carpeta del addon.
if not exist "%~dp0package.json" (
  echo ============================================================
  echo  ERROR: no encuentro la app en esta carpeta:
  echo  %~dp0
  echo.
  echo  Has ejecutado este .bat desde el sitio equivocado
  echo  ^(por ejemplo, desde Descargas^).
  echo.
  echo  SOLUCION: ve a la carpeta del addon, normalmente:
  echo     %USERPROFILE%\castellano-stremio-addon
  echo  y ejecuta alli actualizar.bat ^(o iniciar.bat^).
  echo ============================================================
  pause
  exit /b 1
)

echo ============================================================
echo   Actualizando el Addon Castellano para Stremio
echo ============================================================
echo.
echo [1/2] Descargando cambios desde GitHub...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo  AVISO: 'git pull' fallo. Intentando recuperar cambios locales...
  git stash
  git pull --ff-only
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
  echo   Hubo errores de npm. Comparte el archivo actualizar.log
)
echo ============================================================
pause
