param(
  [string] $Checkpoint = "data\training\ppo\bt93j\runs\20260426T175502Z-bt93j-user-owned-1m-proof-longrun\artifact_manifest.json"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$logRoot = Join-Path $repoRoot "logs\training\user-owned-survival-3m"
$artifactRoot = "data\training\ppo\user-owned-survival-3m"
$config = "python\configs\ppo_user_owned_survival_3m_longrun.json"
$pythonVenv = Join-Path $repoRoot "python\.venv\Scripts\python.exe"
$pythonExe = if (Test-Path $pythonVenv) { $pythonVenv } else { "python" }
$stamp = Get-Date -Format "yyyyMMddTHHmmss"
$stdout = Join-Path $logRoot "$stamp.stdout.log"
$stderr = Join-Path $logRoot "$stamp.stderr.log"
$launchJson = Join-Path $logRoot "$stamp.launch.json"

New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $repoRoot $artifactRoot) | Out-Null

$arguments = @(
  "-u",
  "python\train.py",
  "--profile", "bt93j",
  "--run-kind", "bt93j-user-owned-1m-proof-longrun",
  "--phase-id", "user-owned-survival-3m",
  "--config", $config,
  "--artifact-root", $artifactRoot,
  "--checkpoint", $Checkpoint,
  "--total-timesteps", "3000000",
  "--longrun-start-progress", "0"
)

$process = Start-Process `
  -FilePath $pythonExe `
  -ArgumentList $arguments `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

$metadata = [ordered]@{
  ok = $true
  pid = $process.Id
  startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  repoRoot = [string]$repoRoot
  python = [string]$pythonExe
  command = "$pythonExe $($arguments -join ' ')"
  config = $config
  artifactRoot = $artifactRoot
  checkpoint = $Checkpoint
  stdout = $stdout
  stderr = $stderr
  targetTrainingTimesteps = 3000000
  maxStepsPerEpisode = 36000
  capAssumption = "10 minutes * 60 steps/second = 36000 steps"
  detached = $true
  planOwned = $false
  launchJson = $launchJson
}

$metadata | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 $launchJson
$metadata | ConvertTo-Json -Depth 4
