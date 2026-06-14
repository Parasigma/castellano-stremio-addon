@echo off
REM Instalador del Addon Castellano para Stremio.
REM Doble clic para instalar/actualizar todo (pedira permisos de administrador).
title Instalador - Addon Castellano para Stremio
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0install.ps1" %*
