param(
  [string] $RunDir = "data\training\ppo\user-owned-survival-3m-4env\runs\20260427T071928Z-bt93j-user-owned-1m-proof-longrun",
  [int] $CheckpointInterval = 100000,
  [int] $PollSeconds = 20
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runPath = Join-Path $repoRoot $RunDir
$snapshotRoot = Join-Path $runPath "longrun_snapshots"
$logRoot = Join-Path $repoRoot "logs\training\user-owned-survival-stop"
$stamp = Get-Date -Format "yyyyMMddTHHmmss"
$stopJson = Join-Path $logRoot "$stamp.stop.json"

New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

function Get-CompletedSnapshotSteps {
  if (-not (Test-Path $snapshotRoot)) {
    return @()
  }
  Get-ChildItem -LiteralPath $snapshotRoot -Directory |
    Where-Object {
      (Test-Path (Join-Path $_.FullName "snapshot_manifest.json")) -and
      (Test-Path (Join-Path $_.FullName "eval_snapshot.json"))
    } |
    ForEach-Object {
      if ($_.Name -match '^step_(\d+)$') { [int]$Matches[1] }
    } |
    Sort-Object
}

$existingSteps = @(Get-CompletedSnapshotSteps)
$latestStep = if ($existingSteps.Count -gt 0) { [int]$existingSteps[-1] } else { 0 }
$targetStep = $latestStep + $CheckpointInterval

$status = [ordered]@{
  ok = $false
  startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  repoRoot = $repoRoot
  runDir = $RunDir
  latestStepAtStart = $latestStep
  targetStep = $targetStep
  checkpointInterval = $CheckpointInterval
  pollSeconds = $PollSeconds
  stopJson = $stopJson
}
$status | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $stopJson

while ($true) {
  $targetDir = Join-Path $snapshotRoot ("step_{0:D7}" -f $targetStep)
  $manifest = Join-Path $targetDir "snapshot_manifest.json"
  $eval = Join-Path $targetDir "eval_snapshot.json"
  if ((Test-Path $manifest) -and (Test-Path $eval)) {
    $evalPayload = Get-Content -Raw -LiteralPath $eval | ConvertFrom-Json
    $status["targetSnapshot"] = $targetDir
    $status["technicalStopOk"] = $evalPayload.technicalStopGate.ok
    $status["avgStepsObserved"] = $evalPayload.diagnostics.survivalKpis.avgStepsPerEpisodeObserved
    $status["completedEpisodeLengths"] = @($evalPayload.eval.completedEpisodeLengths)
    $status["runtimeErrors"] = $evalPayload.diagnostics.failureSemantics.runtimeErrorCount
    break
  }
  Start-Sleep -Seconds $PollSeconds
}

$runId = Split-Path $runPath -Leaf
$processes = Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -match 'python|node') -and
    (
      $_.CommandLine -match [regex]::Escape($RunDir) -or
      $_.CommandLine -match [regex]::Escape($runId) -or
      $_.CommandLine -match 'user-owned-survival-3m-4env'
    )
  } |
  Select-Object ProcessId,ParentProcessId,Name,CommandLine

$stopped = @()
foreach ($proc in ($processes | Sort-Object Name -Descending)) {
  Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
  $stopped += [ordered]@{
    pid = $proc.ProcessId
    parentPid = $proc.ParentProcessId
    name = $proc.Name
  }
}

Start-Sleep -Seconds 2
$remaining = Get-CimInstance Win32_Process |
  Where-Object {
    ($_.Name -match 'python|node') -and
    (
      $_.CommandLine -match [regex]::Escape($RunDir) -or
      $_.CommandLine -match [regex]::Escape($runId) -or
      $_.CommandLine -match 'user-owned-survival-3m-4env'
    )
  } |
  Select-Object ProcessId,ParentProcessId,Name

$status["ok"] = $remaining.Count -eq 0
$status["stoppedAt"] = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$status["stoppedProcesses"] = @($stopped)
$status["remainingProcesses"] = @($remaining)
$status | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $stopJson
