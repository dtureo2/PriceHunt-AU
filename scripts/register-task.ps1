# register-task.ps1
# Registers a Windows Task Scheduler job that runs weekly-update.ps1
# every Sunday at 03:00.
#
# Run once as Administrator:
#   powershell -ExecutionPolicy Bypass -File .\scripts\register-task.ps1
#
# To remove the task:
#   Unregister-ScheduledTask -TaskName "PriceHunt AU Weekly Update" -Confirm:$false

$TaskName   = "PriceHunt AU Weekly Update"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScriptPath = Join-Path $ScriptDir "weekly-update.ps1"

# Verify the script exists
if (-not (Test-Path $ScriptPath)) {
  Write-Error "weekly-update.ps1 not found at: $ScriptPath"
  exit 1
}

# ── Build the scheduled task ──────────────────────────────────────────────────

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
  -WorkingDirectory (Split-Path $ScriptDir)

# Every Sunday at 03:00, starting from next Sunday
$trigger = New-ScheduledTaskTrigger `
  -Weekly `
  -DaysOfWeek Sunday `
  -At "03:00"

$settings = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
  -StartWhenAvailable `        # runs at next opportunity if machine was off at trigger time
  -WakeToRun:$false `
  -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
  -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType S4U `             # run whether or not user is logged in, no stored password
  -RunLevel Highest

# ── Register (replace if already exists) ──────────────────────────────────────

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed existing task."
}

Register-ScheduledTask `
  -TaskName  $TaskName `
  -Action    $action `
  -Trigger   $trigger `
  -Settings  $settings `
  -Principal $principal `
  -Description "Fetches live prices from Woolworths & Coles, rebuilds PriceHunt AU if changed, deploys to Pi." | Out-Null

Write-Host ""
Write-Host "Scheduled task registered successfully!" -ForegroundColor Green
Write-Host "  Name:     $TaskName"
Write-Host "  Schedule: Every Sunday at 03:00"
Write-Host "  Script:   $ScriptPath"
Write-Host ""
Write-Host "To run immediately for testing:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "To check last run result:"
Write-Host "  Get-ScheduledTaskInfo -TaskName '$TaskName' | Select LastRunTime, LastTaskResult"
Write-Host ""
Write-Host "To remove:"
Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
