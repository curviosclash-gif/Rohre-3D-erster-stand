param(
  [int]$Port = 4177,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerScript = $null
$ServerProcess = $null

function Test-PortAvailable {
  param([int]$CandidatePort)

  $Listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $CandidatePort)
  try {
    $Listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    $Listener.Stop()
  }
}

Push-Location $RepoRoot
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js wurde nicht gefunden. Bitte Node im PATH verfuegbar machen."
  }

  while (-not (Test-PortAvailable -CandidatePort $Port)) {
    $Port += 1
  }

  Write-Host "Plan-Map Export wird erzeugt..."
  node scripts/export-plan-map.mjs

  $ServerScript = Join-Path ([System.IO.Path]::GetTempPath()) "curvios-plan-map-server-$PID.mjs"
  @'
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2]);
const port = Number(process.argv[3]);
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
]);

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || "/").split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, "");
  const absolute = path.resolve(root, normalized || "tools/plan-map/index.html");
  return absolute.startsWith(root) ? absolute : null;
}

const server = http.createServer(async (request, response) => {
  const absolutePath = resolveRequestPath(request.url);
  if (!absolutePath) {
    response.writeHead(403).end("forbidden");
    return;
  }

  try {
    const data = await fs.readFile(absolutePath);
    response.writeHead(200, {
      "content-type": contentTypes.get(path.extname(absolutePath)) || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(data);
  } catch {
    response.writeHead(404).end("not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Curvios Plan Map: http://127.0.0.1:${port}/tools/plan-map/index.html\n`);
});
'@ | Set-Content -Path $ServerScript -Encoding UTF8

  $ServerProcess = Start-Process -FilePath "node" `
    -ArgumentList @($ServerScript, $RepoRoot, $Port) `
    -WorkingDirectory $RepoRoot `
    -WindowStyle Hidden `
    -PassThru

  $Url = "http://127.0.0.1:$Port/tools/plan-map/index.html"
  Write-Host "Plan-Map laeuft unter $Url"

  if (-not $NoOpen) {
    Start-Process $Url
  }

  Write-Host "Enter beendet den lokalen Plan-Map-Server."
  [void][Console]::ReadLine()
} finally {
  if ($ServerProcess -and -not $ServerProcess.HasExited) {
    Stop-Process -Id $ServerProcess.Id -Force
  }
  if ($ServerScript -and (Test-Path $ServerScript)) {
    Remove-Item -LiteralPath $ServerScript -Force
  }
  Pop-Location
}
