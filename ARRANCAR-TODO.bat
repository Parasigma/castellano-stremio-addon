@echo off
REM ============================================================
REM  Lanzador unico del Addon Castellano para Stremio.
REM  Doble clic: arranca Jackett, FlareSolverr, el addon y el tunel
REM  (solo lo que no este ya en marcha) y abre el panel en el navegador.
REM ============================================================
title Arrancar TODO - Addon Castellano
cd /d "%~dp0"
if not exist "%~dp0package.json" goto nofolder

echo ============================================================
echo   Arrancando el Addon Castellano (todo en uno)...
echo ============================================================
echo.

REM --- Jackett (puerto 9117, es un servicio) ---
call :isup 9117
if %errorlevel%==0 (echo  [OK] Jackett ya esta en marcha) else (echo  - Arrancando Jackett... & net start JackettService >nul 2>&1)

REM --- FlareSolverr (puerto 8191) ---
call :isup 8191
if %errorlevel%==0 goto fsok
if exist "%~dp0flaresolverr\flaresolverr.exe" goto fsstart
echo  [!] No encuentro flaresolverr.exe (carpeta "flaresolverr"). Saltando.
goto fsdone
:fsstart
echo  - Arrancando FlareSolverr...
start "FlareSolverr" /min "%~dp0flaresolverr\flaresolverr.exe"
goto fsdone
:fsok
echo  [OK] FlareSolverr ya esta en marcha
:fsdone

REM --- Addon (puerto 7000) ---
call :isup 7000
if %errorlevel%==0 (echo  [OK] El addon ya esta en marcha) else (echo  - Arrancando el addon... & start "Addon Castellano - NO CERRAR" cmd /k npm start)

REM --- Tunel (cloudflared) ---
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if %errorlevel%==0 (echo  [OK] El tunel ya esta en marcha) else (echo  - Arrancando el tunel... & start "Tunel - NO CERRAR" "%~dp0tunel.bat")

echo.
echo Esperando a que arranque todo (12 segundos)...
timeout /t 12 /nobreak >nul

echo Abriendo el panel en el navegador...
start "" "http://localhost:7000"

echo.
echo ============================================================
echo   LISTO. Se han abierto varias ventanas (Addon, Tunel,
echo   FlareSolverr): DEJALAS ABIERTAS (puedes minimizarlas).
echo   Para APAGAR todo, cierra esas ventanas.
echo ------------------------------------------------------------
echo   Panel:   http://localhost:7000
echo   URL TV:  panel - pestana "Instalar" (seccion 3)
echo ============================================================
pause
exit /b 0

:isup
REM Comprueba si el puerto %1 acepta conexion (0 = en marcha, 1 = parado).
powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient;try{$c.Connect('127.0.0.1',%1);exit 0}catch{exit 1}finally{$c.Close()}" >nul 2>&1
exit /b %errorlevel%

:nofolder
echo ERROR: ejecuta este .bat DENTRO de la carpeta del addon
echo (normalmente %USERPROFILE%\castellano-stremio-addon).
pause
exit /b 1
