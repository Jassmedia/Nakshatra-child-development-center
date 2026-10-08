# =============================================================================
# Nakshatra CDC - one-shot local setup for Windows (Docker Desktop + Supabase CLI)
#
#   Right-click PowerShell -> Run as administrator is NOT needed. From any folder:
#     powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
#
# What it does (safe to run again; every step skips work that is already done):
#   1. checks Windows, Node.js, npm, Git, Docker Desktop (installs Node/Docker via winget if missing)
#   2. finds the project (this folder, or a nakshatra-cdc folder / ZIP in Downloads, Desktop, Documents)
#   3. npm ci
#   4. starts Docker Desktop and waits until it is ready
#   5. npx supabase start  (applies supabase/migrations)
#   6. writes .env.local from `supabase status` (backs up an existing one; never prints the secret key)
#   7. npm run seed:demo
#   8. starts `npm run dev` in a new window, checks http://localhost:3000 answers, opens the browser
# =============================================================================
param([string]$ProjectPath = "")

$ErrorActionPreference = "Continue"   # native tools write progress to stderr; we check exit codes instead

function Say($msg)  { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "`nSTOPPED: $msg" -ForegroundColor Red; exit 1 }
function Has($cmd)  { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path", "User")
}
function Is-Nakshatra($dir) {
  $pkg = Join-Path $dir "package.json"
  if (-not (Test-Path $pkg)) { return $false }
  try { return ((Get-Content $pkg -Raw | ConvertFrom-Json).name -eq "nakshatra-cdc") } catch { return $false }
}

# --- 1. Inspect the computer --------------------------------------------------------
Say "Inspecting this computer"
$os = Get-CimInstance Win32_OperatingSystem
Ok "$($os.Caption) (build $($os.BuildNumber))"
$hasWinget = Has "winget"

if (-not (Has "node")) {
  if (-not $hasWinget) { Fail "Node.js is missing. Install Node.js 22 LTS from https://nodejs.org and run this again." }
  Warn "Node.js missing - installing Node.js LTS with winget"
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  Refresh-Path
  if (-not (Has "node")) { Fail "Node.js installed but not on PATH yet. Close this window, open a new one, run again." }
}
$nodeVer = [version]((node -v).TrimStart("v"))
if ($nodeVer -lt [version]"20.9.0") { Fail "Node.js $nodeVer is too old (need 20.9+, 22 LTS recommended). Update from https://nodejs.org" }
Ok "Node.js $nodeVer"
Ok "npm $(npm -v)"
if (Has "git") { Ok "$(git --version)" } else { Warn "Git not installed (not needed to run the app)" }

if (-not (Has "docker")) {
  if (-not $hasWinget) { Fail "Docker Desktop is missing. Install it from https://www.docker.com/products/docker-desktop and run this again." }
  Warn "Docker Desktop missing - installing with winget (it may ask for permission)"
  winget install --id Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements
  Fail "Docker Desktop was installed. RESTART Windows, open Docker Desktop once (accept its terms), then run this script again."
}
Ok "Docker CLI found"

# --- 2. Find the project ------------------------------------------------------------
Say "Finding the nakshatra-cdc project"
$proj = $null
$candidates = @($ProjectPath, (Join-Path $PSScriptRoot ".."), (Get-Location).Path) | Where-Object { $_ }
foreach ($c in $candidates) { if (Is-Nakshatra $c) { $proj = (Resolve-Path $c).Path; break } }

$searchRoots = @("Downloads", "Desktop", "Documents") | ForEach-Object { Join-Path $env:USERPROFILE $_ } | Where-Object { Test-Path $_ }
if (-not $proj) {
  foreach ($pkg in Get-ChildItem $searchRoots -Recurse -Depth 4 -Filter package.json -ErrorAction SilentlyContinue) {
    if ($pkg.FullName -match "node_modules") { continue }
    if (Is-Nakshatra $pkg.DirectoryName) { $proj = $pkg.DirectoryName; break }
  }
}
if (-not $proj) {
  $zip = Get-ChildItem $searchRoots -Recurse -Depth 2 -Filter "*akshatra*.zip" -ErrorAction SilentlyContinue |
         Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $zip) { Fail "Could not find the project folder or ZIP. Run again with: -ProjectPath 'C:\path\to\nakshatra-cdc'" }
  $dest = Join-Path $env:USERPROFILE "Projects\nakshatra-cdc"
  Warn "Extracting $($zip.FullName) to $dest"
  Expand-Archive -Path $zip.FullName -DestinationPath $dest -Force
  $pkg = Get-ChildItem $dest -Recurse -Depth 3 -Filter package.json | Where-Object { Is-Nakshatra $_.DirectoryName } | Select-Object -First 1
  if (-not $pkg) { Fail "The ZIP did not contain the nakshatra-cdc project (no matching package.json)." }
  $proj = $pkg.DirectoryName
}
Ok $proj
Set-Location $proj
foreach ($f in "supabase\config.toml", "supabase\migrations", "scripts\seed-demo.mjs", ".env.example") {
  if (-not (Test-Path $f)) { Fail "Project looks incomplete: $f is missing." }
}
Ok "$((Get-ChildItem supabase\migrations -Filter *.sql).Count) migration files found"

# --- 3. Dependencies ----------------------------------------------------------------
Say "Installing npm dependencies (first time takes a few minutes)"
if (Test-Path package-lock.json) { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { Fail "npm install failed - see the messages above." }
Ok "dependencies installed (Supabase CLI comes with them, used via npx)"

# --- 4. Docker running? -------------------------------------------------------------
Say "Making sure Docker Desktop is running"
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $exe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $exe)) { Fail "Docker is installed but Docker Desktop.exe was not found. Start Docker Desktop yourself, then run again." }
  Start-Process $exe
  Write-Host "    waiting for Docker (up to 3 minutes)" -NoNewline
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 2; Write-Host "." -NoNewline
    docker info *> $null; if ($LASTEXITCODE -eq 0) { break }
  }
  Write-Host ""
  docker info *> $null
  if ($LASTEXITCODE -ne 0) { Fail "Docker did not become ready. Open Docker Desktop, wait for 'Engine running', run again." }
}
Ok "Docker is running"

# --- 5. Local Supabase --------------------------------------------------------------
Say "Starting local Supabase (first time downloads images - can take 5-10 minutes)"
npx supabase start
if ($LASTEXITCODE -ne 0) { Fail "supabase start failed. Common fixes: Docker Desktop running? ports 54321-54324 free? Try: npx supabase stop; then run again." }

$raw = (npx supabase status -o json 2>$null) -join "`n"
$status = $raw.Substring($raw.IndexOf("{")) | ConvertFrom-Json
$apiUrl = $status.API_URL
$pubKey = if ($status.PUBLISHABLE_KEY) { $status.PUBLISHABLE_KEY } else { $status.ANON_KEY }
$secKey = if ($status.SECRET_KEY) { $status.SECRET_KEY } else { $status.SERVICE_ROLE_KEY }
if (-not $apiUrl -or -not $pubKey -or -not $secKey) { Fail "Could not read URL/keys from 'npx supabase status -o json'." }
Ok "Supabase API at $apiUrl"

# --- 6. .env.local --------------------------------------------------------------------
Say "Writing .env.local"
if (Test-Path .env.local) {
  $bak = ".env.local.backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
  Copy-Item .env.local $bak; Warn "existing .env.local backed up to $bak"
}
$cron = -join ((48..57) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
@"
# Generated by scripts/setup-windows.ps1 for LOCAL development only. Never commit this file.
NEXT_PUBLIC_SUPABASE_URL=$apiUrl
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$pubKey
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SECRET_KEY=$secKey
CRON_SECRET=$cron
"@ | Set-Content -Path .env.local -Encoding ASCII
Ok ".env.local written (secret key stored there, not shown)"

# --- 7. Demo data -------------------------------------------------------------------
Say "Loading demo data"
npm run seed:demo
if ($LASTEXITCODE -ne 0) { Fail "seed:demo failed - see the messages above." }

# --- 8. Run and verify --------------------------------------------------------------
Say "Starting the app (a new window opens - keep it open while you use the app)"
$busy = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($busy) { Warn "something is already listening on port 3000 - if it is not this app, close it first" }
else { Start-Process powershell -WorkingDirectory $proj -ArgumentList "-NoExit", "-Command", "npm run dev" }

Write-Host "    waiting for http://localhost:3000 (first page compile can take a minute)" -NoNewline
$up = $false
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 2; Write-Host "." -NoNewline
  try {
    $r = Invoke-WebRequest "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200) { $up = $true; break }
  } catch { }
}
Write-Host ""
if (-not $up) { Fail "The app did not answer on http://localhost:3000 - look at the 'npm run dev' window for the error." }
Ok "http://localhost:3000/login answers 200"
Start-Process "http://localhost:3000"

Write-Host @"

=====================================================================
 Nakshatra CDC is running:  http://localhost:3000
 Demo logins (password Demo@12345):
   admin@nakshatra.test        - admin
   meera@nakshatra.test        - therapist (also rahul@...)
   priya@nakshatra.test        - parent    (also imran@...)
 Supabase Studio (database UI): http://127.0.0.1:54323
 Stop:  close the 'npm run dev' window, then: npx supabase stop
 Next time: start Docker Desktop, then  npx supabase start  and  npm run dev
=====================================================================
"@ -ForegroundColor Green
