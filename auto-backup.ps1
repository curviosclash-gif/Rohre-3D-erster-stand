# auto-backup.ps1 — Wird automatisch bei Terminal-Start ausgefuehrt
# Setup: Einmalig in PowerShell-Profil eintragen (siehe unten)
#
# Einmalig einrichten:
#   notepad $PROFILE
#   Folgende Zeile eintragen:
#     . "C:\Users\gunda\Desktop\Rohre-3D-erster-stand\auto-backup.ps1"

$projectPath = "C:\Users\gunda\Desktop\Rohre-3D-erster-stand"
$markerFile = "$projectPath\.last_auto_backup"

# Nur einmal pro Tag automatisch sichern
$today = Get-Date -Format "yyyy-MM-dd"
$lastBackup = if (Test-Path $markerFile) { Get-Content $markerFile } else { "" }

if ($lastBackup -ne $today) {
    Write-Host "[Auto-Backup] Erstelle Git-Sicherung..." -ForegroundColor Cyan
    Push-Location $projectPath
    git add -A 2>$null
    git commit -m "auto: Tages-Backup $today" 2>$null
    Pop-Location
    Set-Content $markerFile $today
    Write-Host "[Auto-Backup] Fertig." -ForegroundColor Green
}
