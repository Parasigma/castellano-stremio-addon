# Instalador automático del Addon Castellano para Stremio (Windows).
# Instala: Node.js, Git, Jackett, FlareSolverr y la propia app, y deja todo listo.
#
# Uso rápido en un PC nuevo (pega esto en PowerShell):
#   irm https://raw.githubusercontent.com/Parasigma/castellano-stremio-addon/main/install.ps1 -OutFile "$env:TEMP\inst.ps1"; & "$env:TEMP\inst.ps1"
#
# Opciones:
#   -InstallDir <ruta>      Carpeta de instalación (def: %USERPROFILE%\castellano-stremio-addon)
#   -SkipFlaresolverr       No instalar FlareSolverr (~310 MB)

param(
  [string]$RepoUrl = 'https://github.com/Parasigma/castellano-stremio-addon.git',
  [string]$InstallDir = "$env:USERPROFILE\castellano-stremio-addon",
  [switch]$SkipFlaresolverr
)

$ErrorActionPreference = 'Stop'

function Info($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "   OK  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "   !   $m" -ForegroundColor Yellow }

# --- 1. Elevar a administrador si hace falta -----------------------------
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
  Write-Host "Se necesitan permisos de administrador. Acepta el aviso de Windows..." -ForegroundColor Yellow
  $argList = @('-ExecutionPolicy','Bypass','-NoProfile','-File',"`"$PSCommandPath`"",
               '-InstallDir',"`"$InstallDir`"")
  if ($SkipFlaresolverr) { $argList += '-SkipFlaresolverr' }
  Start-Process powershell -Verb RunAs -ArgumentList $argList
  exit
}

Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Instalador · Addon Castellano para Stremio" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

# --- 2. Comprobar winget -------------------------------------------------
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget no está disponible. Abre Microsoft Store, actualiza 'Instalador de aplicaciones' y reintenta."
}

function Ensure-App($id, $name, $probeCmd) {
  if ($probeCmd -and (Get-Command $probeCmd -ErrorAction SilentlyContinue)) { Ok "$name ya instalado"; return }
  Info "Instalando $name..."
  winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Ok "$name instalado"
}

# --- 3. Prerrequisitos ---------------------------------------------------
Ensure-App 'OpenJS.NodeJS.LTS'   'Node.js'     'node'
Ensure-App 'Git.Git'             'Git'         'git'
Ensure-App 'Jackett.Jackett'     'Jackett'     $null
Ensure-App 'Cloudflare.cloudflared' 'Cloudflared (túnel)' 'cloudflared'

# Refrescar PATH para esta sesión (Node/Git recién instalados).
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
            [Environment]::GetEnvironmentVariable('Path','User')

function Find-Npm {
  $c = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  foreach ($p in @("$env:ProgramFiles\nodejs\npm.cmd", "$env:ProgramFiles(x86)\nodejs\npm.cmd")) {
    if (Test-Path $p) { return $p }
  }
  throw "No se encontró npm. Cierra y vuelve a abrir PowerShell y reintenta."
}

# --- 4. Descargar / actualizar el código ---------------------------------
# Evita el error "dubious ownership": como el instalador corre elevado, la
# carpeta clonada queda en propiedad de Administradores; marcamos los repos como
# seguros para que git pull funcione luego al ejecutarse como usuario normal.
git config --global --add safe.directory '*' 2>$null

# Si se ejecuta dentro del propio repo, instala ahí; si no, clona.
$here = $PSScriptRoot
if ($here -and (Test-Path (Join-Path $here 'package.json')) -and (Test-Path (Join-Path $here 'src\index.js'))) {
  $InstallDir = $here
  if (Test-Path (Join-Path $here '.git')) { Info "Actualizando repo en $InstallDir"; git -C $InstallDir pull --ff-only | Out-Null }
  Ok "Usando el código de $InstallDir"
} elseif (Test-Path (Join-Path $InstallDir '.git')) {
  Info "Actualizando repo existente en $InstallDir"
  git -C $InstallDir pull --ff-only | Out-Null
  Ok "Actualizado"
} else {
  Info "Clonando el código en $InstallDir"
  git clone $RepoUrl $InstallDir | Out-Null
  Ok "Clonado"
}
Set-Location $InstallDir

# --- 5. Dependencias del addon -------------------------------------------
Info "Instalando dependencias del addon (npm install)..."
$npm = Find-Npm
& $npm install --no-fund --no-audit --omit=optional | Out-Null
Ok "Dependencias instaladas"

# --- 6. FlareSolverr (opcional, para trackers con Cloudflare) ------------
$fsDir = Join-Path $InstallDir 'flaresolverr'
if ($SkipFlaresolverr) {
  Warn "FlareSolverr omitido (-SkipFlaresolverr)."
} elseif (Test-Path (Join-Path $fsDir 'flaresolverr.exe')) {
  Ok "FlareSolverr ya instalado"
} else {
  try {
    Info "Descargando FlareSolverr para Windows (~310 MB, puede tardar)..."
    $rel = Invoke-RestMethod 'https://api.github.com/repos/FlareSolverr/FlareSolverr/releases/latest' -Headers @{ 'User-Agent'='installer' }
    $asset = $rel.assets | Where-Object { $_.name -like '*windows*x64*.zip' } | Select-Object -First 1
    if (-not $asset) { throw "No hay binario de Windows en la última release." }
    $zip = Join-Path $env:TEMP $asset.name
    Invoke-WebRequest $asset.browser_download_url -OutFile $zip
    Info "Descomprimiendo FlareSolverr..."
    Expand-Archive -Path $zip -DestinationPath $InstallDir -Force
    Remove-Item $zip -ErrorAction SilentlyContinue
    if (Test-Path (Join-Path $fsDir 'flaresolverr.exe')) { Ok "FlareSolverr instalado en $fsDir" }
    else { Warn "FlareSolverr descomprimido pero no se encontró el .exe en la ruta esperada." }
  } catch {
    Warn "No se pudo instalar FlareSolverr automáticamente: $($_.Exception.Message)"
    Warn "Es opcional; puedes añadirlo luego (ver docs/GUIA-COMPLETA.md, sección 3.2)."
  }
}

# --- 7. Conectar FlareSolverr con Jackett (best-effort) ------------------
if (-not $SkipFlaresolverr -and (Test-Path (Join-Path $fsDir 'flaresolverr.exe'))) {
  try {
    $cfgPath = "$env:ProgramData\Jackett\ServerConfig.json"
    if (Test-Path $cfgPath) {
      $cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
      if ($cfg.PSObject.Properties.Name -contains 'FlareSolverrUrl') { $cfg.FlareSolverrUrl = 'http://localhost:8191' }
      else { $cfg | Add-Member -NotePropertyName 'FlareSolverrUrl' -NotePropertyValue 'http://localhost:8191' -Force }
      Get-Service Jackett* -ErrorAction SilentlyContinue | Stop-Service -ErrorAction SilentlyContinue
      $cfg | ConvertTo-Json -Depth 10 | Set-Content $cfgPath -Encoding UTF8
      Get-Service Jackett* -ErrorAction SilentlyContinue | Start-Service -ErrorAction SilentlyContinue
      Ok "Jackett configurado para usar FlareSolverr (http://localhost:8191)"
    }
  } catch { Warn "No se pudo configurar FlareSolverr en Jackett automáticamente (hazlo en su web)." }
}

# --- 8. Accesos directos (inicio automático y escritorio) ----------------
$wsh = New-Object -ComObject WScript.Shell
function New-Shortcut($lnkPath, $target, $args, $workDir, $iconPath) {
  $s = $wsh.CreateShortcut($lnkPath)
  $s.TargetPath = $target
  if ($args) { $s.Arguments = $args }
  if ($workDir) { $s.WorkingDirectory = $workDir }
  if ($iconPath) { $s.IconLocation = $iconPath }
  $s.Save()
}

$startup = [Environment]::GetFolderPath('Startup')
$desktop = [Environment]::GetFolderPath('Desktop')

# Inicio automático del addon y de FlareSolverr.
New-Shortcut (Join-Path $startup 'Addon Castellano.lnk') (Join-Path $InstallDir 'iniciar.bat') '' $InstallDir $null
if (-not $SkipFlaresolverr -and (Test-Path (Join-Path $fsDir 'flaresolverr.exe'))) {
  New-Shortcut (Join-Path $startup 'FlareSolverr.lnk') (Join-Path $fsDir 'flaresolverr.exe') '' $fsDir $null
}
# Accesos en el escritorio.
New-Shortcut (Join-Path $desktop 'Iniciar Addon Castellano.lnk') (Join-Path $InstallDir 'iniciar.bat') '' $InstallDir $null
New-Shortcut (Join-Path $desktop 'Dashboard Addon (web).lnk') 'http://localhost:7000' '' $null $null
Ok "Accesos directos creados (inicio automático + escritorio)"

# --- 9. Arrancar servicios y mostrar siguientes pasos --------------------
if (-not $SkipFlaresolverr -and (Test-Path (Join-Path $fsDir 'flaresolverr.exe'))) {
  Start-Process (Join-Path $fsDir 'flaresolverr.exe') -WorkingDirectory $fsDir -WindowStyle Minimized -ErrorAction SilentlyContinue
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  ¡INSTALACIÓN COMPLETADA!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host @"

Carpeta de la app: $InstallDir

SIGUIENTES PASOS:
  1) Arranca el addon: doble clic en 'Iniciar Addon Castellano' (escritorio)
     o ejecuta  iniciar.bat  en la carpeta.
  2) Abre el panel:  http://localhost:7000
  3) Pestaña 'Servidores debrid' -> pega tus tokens de Real Debrid / TorBox.
  4) Pestaña 'Indexadores' -> Jackett ya está en http://127.0.0.1:9117
     (coge su API Key de la web de Jackett y pégala) -> Probar conexión.
  5) En Jackett (http://127.0.0.1:9117) -> '+ Add Indexer' -> añade trackers
     españoles (DonTorrent, MejorTorrent, Wolfmax4K...). FlareSolverr ya está
     listo para los que tengan Cloudflare.
  6) Pestaña 'Instalar en Stremio' -> copia la URL e instálala en tu TV.

Documentación completa: docs\GUIA-COMPLETA.md
"@ -ForegroundColor White

Write-Host "Pulsa una tecla para salir..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
