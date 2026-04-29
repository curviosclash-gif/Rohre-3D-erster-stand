param(
  [string] $SourceRunDir = "data\training\ppo\user-owned-survival-3m\runs\20260427T052925Z-bt93j-user-owned-1m-proof-longrun",
  [int] $TargetTotalTimesteps = 3000000,
  [int] $CheckpointInterval = 100000,
  [int] $PollSeconds = 30
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$sourceRunPath = Join-Path $repoRoot $SourceRunDir
$snapshotRoot = Join-Path $sourceRunPath "longrun_snapshots"
$logRoot = Join-Path $repoRoot "logs\training\user-owned-survival-3m-4env"
$artifactRoot = "data\training\ppo\user-owned-survival-3m-4env"
$config = "python\configs\ppo_user_owned_survival_3m_4env_longrun.json"
$pythonVenv = Join-Path $repoRoot "python\.venv\Scripts\python.exe"
$pythonExe = if (Test-Path $pythonVenv) { $pythonVenv } else { "python" }
$stamp = Get-Date -Format "yyyyMMddTHHmmss"
$stdout = Join-Path $logRoot "$stamp.stdout.log"
$stderr = Join-Path $logRoot "$stamp.stderr.log"
$switchJson = Join-Path $logRoot "$stamp.switch.json"

New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot $artifactRoot) | Out-Null

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
if ($targetStep -gt $TargetTotalTimesteps) {
  throw "Next checkpoint $targetStep exceeds target total $TargetTotalTimesteps."
}

$status = [ordered]@{
  ok = $false
  startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  repoRoot = $repoRoot
  sourceRunDir = $SourceRunDir
  latestStepAtStart = $latestStep
  targetStep = $targetStep
  targetTotalTimesteps = $TargetTotalTimesteps
  checkpointInterval = $CheckpointInterval
  pollSeconds = $PollSeconds
  config = $config
  artifactRoot = $artifactRoot
  stdout = $stdout
  stderr = $stderr
  switchJson = $switchJson
}
$status | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $switchJson

while ($true) {
  $targetDir = Join-Path $snapshotRoot ("step_{0:D7}" -f $targetStep)
  $manifest = Join-Path $targetDir "snapshot_manifest.json"
  $eval = Join-Path $targetDir "eval_snapshot.json"
  if ((Test-Path $manifest) -and (Test-Path $eval)) {
    $evalPayload = Get-Content -Raw -LiteralPath $eval | ConvertFrom-Json
    if ($evalPayload.technicalStopGate.ok -ne $true) {
      throw "Target checkpoint $targetStep exists but technicalStopGate is not green."
    }
    break
  }
  Start-Sleep -Seconds $PollSeconds
}

$targetCheckpoint = Join-Path $snapshotRoot ("step_{0:D7}\snapshot_manifest.json" -f $targetStep)
$remainingTimesteps = $TargetTotalTimesteps - $targetStep
if ($remainingTimesteps -le 0) {
  throw "No remaining timesteps after checkpoint $targetStep."
}

$oldProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match 'python' -and
    $_.CommandLine -match 'data\\training\\ppo\\user-owned-survival-3m' -and
    $_.CommandLine -notmatch 'user-owned-survival-3m-4env'
  } |
  Select-Object -ExpandProperty ProcessId

foreach ($processId in $oldProcesses) {
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

$arguments = "-u python\train.py --profile bt93j --run-kind bt93j-user-owned-1m-proof-longrun --phase-id user-owned-survival-3m-4env --config `"$config`" --artifact-root `"$artifactRoot`" --checkpoint `"$targetCheckpoint`" --total-timesteps $remainingTimesteps --longrun-start-progress $targetStep --longrun-prior-run-dir `"$SourceRunDir`""

$process = Start-Process `
  -FilePath $pythonExe `
  -ArgumentList $arguments `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

$status["ok"] = $true
$status["switchedAt"] = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$status["checkpoint"] = $targetCheckpoint
$status["remainingTimesteps"] = $remainingTimesteps
$status["stoppedPids"] = @($oldProcesses)
$status["startedPid"] = $process.Id
$status["command"] = "$pythonExe $arguments"
$status | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $switchJson
