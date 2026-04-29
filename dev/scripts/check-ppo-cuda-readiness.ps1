param(
    [string]$Python = "python\.venv\Scripts\python.exe"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$pythonPath = Join-Path $repoRoot $Python

if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw "Python executable not found: $pythonPath"
}

$torchProbe = & $pythonPath -c "import json, torch; print(json.dumps({'torchVersion': torch.__version__, 'cudaAvailable': torch.cuda.is_available(), 'cudaVersion': torch.version.cuda, 'deviceCount': torch.cuda.device_count(), 'devices': [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]}))"
$torch = $torchProbe | ConvertFrom-Json

$nvidiaSmi = $null
$nvidiaSmiAvailable = $false
try {
    $nvidiaSmi = & nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>$null
    $nvidiaSmiAvailable = $LASTEXITCODE -eq 0
} catch {
    $nvidiaSmiAvailable = $false
}

$recommendation = if ($torch.cudaAvailable -eq $true) {
    "cuda-benchmark-allowed"
} elseif ($nvidiaSmiAvailable) {
    "install-separate-cuda-venv-before-benchmark"
} else {
    "cpu-only"
}

$report = [ordered]@{
    ok = $true
    generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    generatedBy = "dev/scripts/check-ppo-cuda-readiness.ps1"
    python = $pythonPath
    torch = $torch
    nvidiaSmiAvailable = $nvidiaSmiAvailable
    nvidiaSmi = $nvidiaSmi
    recommendation = $recommendation
    policy = "Do not switch PPO device to CUDA until a separate CUDA environment and CPU-vs-CUDA 2/4/6-env wallclock benchmark are green."
}

$report | ConvertTo-Json -Depth 8
