# weekly-update.ps1
# Fetches live prices, rebuilds if changed, deploys to the Raspberry Pi.
# Run manually or via Windows Task Scheduler (see register-task.ps1).

param(
  [string]$PiHost  = "192.168.1.104",
  [string]$User    = "dtureo",
  [string]$SshKey  = "E:\Dan\Claude\id_openssh_rsa",
  [int]   $AppPort = 8001,
  [string]$AppDir  = "/opt/pricehunt-au",
  [switch]$ForceRebuild   # pass -ForceRebuild to always rebuild even if no price changes
)

$ErrorActionPreference = "Stop"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$LogFile    = Join-Path $ScriptDir "update-log.txt"

function Log($msg) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
  Write-Host $line
  Add-Content -Path $LogFile -Value $line
}

# ── Refresh PATH so node/npm are available ──
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("PATH","User")

Set-Location $ProjectDir

Log ""
Log "=== PriceHunt AU Weekly Update ==="
Log "Project: $ProjectDir"
Log "Target:  ${User}@${PiHost}:${AppPort}"

# ── 1. Run the price updater ──────────────────────────────────────────────────

Log "[1/4] Running price updater..."
node "$ScriptDir\update-prices.mjs"
$updaterExit = $LASTEXITCODE

if ($updaterExit -eq 2) {
  Log "ERROR: Price updater failed with fatal error. Aborting."
  exit 2
}

$pricesChanged = ($updaterExit -eq 1) -or $ForceRebuild.IsPresent

if ($pricesChanged) {
  Log "[1/4] Prices changed — rebuild required."
} else {
  Log "[1/4] No price changes detected."
  Log "=== Nothing to deploy. Done. ==="
  exit 0
}

# ── 2. Build ──────────────────────────────────────────────────────────────────

Log "[2/4] Building Next.js (standalone)..."
$env:NODE_ENV = "production"
npm run build
if ($LASTEXITCODE -ne 0) {
  Log "ERROR: npm run build failed."
  exit 2
}
Log "[2/4] Build complete."

# ── 3. Package ────────────────────────────────────────────────────────────────

Log "[3/4] Packaging standalone build..."
$Standalone = Join-Path $ProjectDir ".next\standalone"
$TarPath    = Join-Path $env:TEMP "pricehunt-au.tar.gz"

Copy-Item -Recurse -Force (Join-Path $ProjectDir ".next\static") `
          (Join-Path $Standalone ".next\static")

$PublicDir = Join-Path $ProjectDir "public"
if (Test-Path $PublicDir) {
  Copy-Item -Recurse -Force $PublicDir (Join-Path $Standalone "public")
}

Push-Location (Split-Path $Standalone)
tar -czf $TarPath (Split-Path $Standalone -Leaf)
Pop-Location

$sizeMB = [math]::Round((Get-Item $TarPath).Length / 1MB, 2)
Log "[3/4] Packaged → $TarPath ($sizeMB MB)"

# ── 4. Transfer & deploy ──────────────────────────────────────────────────────

Log "[4/4] Uploading to Pi..."
scp -i $SshKey $TarPath "${User}@${PiHost}:/tmp/pricehunt-au.tar.gz"
if ($LASTEXITCODE -ne 0) {
  Log "ERROR: SCP upload failed."
  exit 2
}

Log "[4/4] Deploying on Pi..."
$remote = @"
set -e
sudo tar -xzf /tmp/pricehunt-au.tar.gz -C $AppDir --strip-components=1
rm -f /tmp/pricehunt-au.tar.gz
sudo systemctl restart pricehunt-au
sleep 4
curl -sf -o /dev/null -w 'HTTP %{http_code}' http://localhost:$AppPort/
"@

ssh -i $SshKey "${User}@${PiHost}" $remote
if ($LASTEXITCODE -ne 0) {
  Log "WARNING: Deploy returned non-zero exit — check Pi manually."
} else {
  Log "[4/4] Deploy successful."
}

Log "=== Weekly update complete. ==="
