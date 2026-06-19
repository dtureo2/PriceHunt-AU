# PriceHunt AU — Deploy to Raspberry Pi at 192.168.1.104
# Usage:  .\deploy.ps1 [-User pi] [-Port 22] [-AppPort 3000]
# Prereqs: OpenSSH client, Node 18+ locally, SSH key auth to Pi OR provide password when prompted

param(
  [string]$PiHost  = "192.168.1.104",
  [string]$User    = "pi",
  [int]   $Port    = 22,
  [int]   $AppPort = 3000,
  [string]$AppDir  = "/opt/pricehunt-au"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=== PriceHunt AU Deploy ===" -ForegroundColor Cyan
Write-Host "Target: ${User}@${PiHost}:${Port}  →  ${AppDir}  (port ${AppPort})"
Write-Host ""

# ── 1. Build ─────────────────────────────────────────────────────────────────

Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
Set-Location $ScriptDir
npm ci --prefer-offline
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

Write-Host "[2/4] Building Next.js (standalone)..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) { throw "next build failed" }

# ── 2. Package standalone output ──────────────────────────────────────────────

Write-Host "[3/4] Packaging standalone build..." -ForegroundColor Yellow
$StandaloneDir = Join-Path $ScriptDir ".next\standalone"
$StaticDir     = Join-Path $ScriptDir ".next\static"
$PublicDir     = Join-Path $ScriptDir "public"

# Copy static assets into standalone (required by Next.js standalone)
$targetStatic = Join-Path $StandaloneDir ".next\static"
$targetPublic = Join-Path $StandaloneDir "public"
Copy-Item -Recurse -Force $StaticDir  $targetStatic
if (Test-Path $PublicDir) { Copy-Item -Recurse -Force $PublicDir $targetPublic }

# Create tar on Windows (requires tar.exe, available on Win10+)
$TarPath = Join-Path $env:TEMP "pricehunt-au.tar.gz"
Push-Location (Split-Path $StandaloneDir)
tar -czf $TarPath (Split-Path $StandaloneDir -Leaf)
Pop-Location
Write-Host "  Packaged → $TarPath"

# ── 3. Transfer & install ─────────────────────────────────────────────────────

Write-Host "[4/4] Deploying to Pi..." -ForegroundColor Yellow
$ssh = "ssh -p $Port ${User}@${PiHost}"
$scp = "scp -P $Port"

# Upload archive
& scp -P $Port $TarPath "${User}@${PiHost}:/tmp/pricehunt-au.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "scp failed — check SSH access to ${PiHost}" }

# Remote commands: stop service, replace files, restart
$remoteScript = @"
set -e
sudo mkdir -p $AppDir
sudo tar -xzf /tmp/pricehunt-au.tar.gz -C $AppDir --strip-components=1
rm /tmp/pricehunt-au.tar.gz

# Write systemd unit
sudo tee /etc/systemd/system/pricehunt-au.service > /dev/null <<'UNIT'
[Unit]
Description=PriceHunt AU — Baby Price Comparison
After=network.target

[Service]
Type=simple
User=$User
WorkingDirectory=$AppDir
Environment=NODE_ENV=production
Environment=PORT=$AppPort
ExecStart=/usr/bin/node $AppDir/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable pricehunt-au
sudo systemctl restart pricehunt-au
echo "Service status:"
sudo systemctl status pricehunt-au --no-pager -l
"@

& ssh -p $Port "${User}@${PiHost}" $remoteScript
if ($LASTEXITCODE -ne 0) { throw "Remote install failed" }

Write-Host ""
Write-Host "=== Deploy complete! ===" -ForegroundColor Green
Write-Host "App running at: http://${PiHost}:${AppPort}" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands on the Pi:"
Write-Host "  sudo systemctl status pricehunt-au"
Write-Host "  sudo journalctl -u pricehunt-au -f"
Write-Host "  sudo systemctl restart pricehunt-au"
