# 文件作用：一键启动主 CLI、图后端、图前端三服务，并自动注入图转发环境变量。

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = "D:/Agent/dagent"
$graphServerDir = Join-Path $repoRoot "apps/weave-graph-server"
$graphWebDir = Join-Path $repoRoot "apps/weave-graph-web"
$logPath = Join-Path $graphServerDir ".run.log"
$webLogPath = Join-Path $graphWebDir ".run.log"
$pidFile = Join-Path $repoRoot "scripts/.weave-graph-dev-pids.json"
$showBackendLogWindow = $true

function Remove-FileSafely {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  try {
    Remove-Item $Path -Force -ErrorAction Stop
  } catch {
    # 文件被占用时回退为清空，避免启动阶段直接失败。
    try {
      Clear-Content $Path -Force -ErrorAction Stop
    } catch {
      throw "cannot prepare log file: $Path"
    }
  }
}

# 启动前先尝试按 PID 文件停止上一轮服务，避免残留进程占端口。
$stopScript = Join-Path $repoRoot "scripts/stop-weave-graph-all.ps1"
if (Test-Path $stopScript) {
  try {
    & $stopScript | Out-Null
  } catch {
    Write-Host "[warn] pre-stop failed, continue with stale process cleanup"
  }
}

# 启动前清理历史残留的 graph-web vite 进程，避免 5173 被旧进程占用导致假启动成功。
$staleWebProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match "^(node|pnpm)(\.exe)?$" -and
    $_.CommandLine -match "apps[\\/]weave-graph-web" -and
    $_.CommandLine -match "vite"
  }

foreach ($proc in $staleWebProcesses) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host "[cleanup] stopped stale graph-web process PID=$($proc.ProcessId)"
  } catch {
    Write-Host "[warn] failed to stop stale graph-web process PID=$($proc.ProcessId)"
  }
}

# 清理历史残留 graph-server 进程，避免 ingest 端口和 .run.log 被占用。
$staleServerProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match "^(node|pnpm)(\.exe)?$" -and
    $_.CommandLine -match "apps[\\/]weave-graph-server"
  }

foreach ($proc in $staleServerProcesses) {
  try {
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    Write-Host "[cleanup] stopped stale graph-server process PID=$($proc.ProcessId)"
  } catch {
    Write-Host "[warn] failed to stop stale graph-server process PID=$($proc.ProcessId)"
  }
}

Remove-FileSafely -Path $logPath
Remove-FileSafely -Path $webLogPath

Write-Host "[start] starting graph backend..."
$graphServerProc = Start-Process -FilePath "powershell" -ArgumentList @(
  "-Command",
  "`$env:WEAVE_GRAPH_MANAGED='1'; Set-Location '$graphServerDir'; pnpm dev *> .run.log"
) -WindowStyle Hidden -PassThru

$token = ""
$port = ""
$deadline = (Get-Date).AddSeconds(20)

while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 300

  try {
    Get-Process -Id $graphServerProc.Id -ErrorAction Stop | Out-Null
  } catch {
    throw "graph backend exited unexpectedly, check $logPath"
  }

  if (-not (Test-Path $logPath)) {
    continue
  }

  $content = Get-Content $logPath -Raw
  if ($content -match "ingest=http://127\.0\.0\.1:(\d+)/ingest/runtime-event token=([a-f0-9]+)") {
    $port = $Matches[1]
    $token = $Matches[2]
    break
  }
}

if (-not $port -or -not $token) {
  throw "graph backend startup timeout: cannot parse port/token from $logPath"
}

$ingestUrl = "http://127.0.0.1:$port/ingest/runtime-event"
$graphWebUrl = "http://127.0.0.1:5173/?port=$port&token=$token"

Write-Host "[ok] graph backend ready: ingest=$ingestUrl"

$backendLogProc = $null
if ($showBackendLogWindow) {
  $backendLogProc = Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$env:WEAVE_GRAPH_MANAGED='1'; Set-Location '$graphServerDir'; Write-Host '[graph-backend-log] live tail: .run.log'; Get-Content .run.log -Wait -Tail 30"
  ) -PassThru
}

Write-Host "[start] starting graph frontend..."
$graphWebProc = Start-Process -FilePath "powershell" -ArgumentList @(
  "-Command",
  "`$env:WEAVE_GRAPH_MANAGED='1'; Set-Location '$graphWebDir'; pnpm dev -- --host 127.0.0.1 --port 5173 --strictPort *> .run.log"
) -WindowStyle Hidden -PassThru

$webReady = $false
$webDeadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $webDeadline) {
  Start-Sleep -Milliseconds 400

  try {
    Get-Process -Id $graphWebProc.Id -ErrorAction Stop | Out-Null
  } catch {
    throw "graph frontend exited unexpectedly, check $webLogPath"
  }

  try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 2
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
      $webReady = $true
      break
    }
  } catch {
    # wait until frontend is ready
  }
}

if (-not $webReady) {
  throw "graph frontend startup timeout: http://127.0.0.1:5173 is not reachable"
}

Write-Host "[start] starting main CLI (with graph forwarding env)..."
$cliProc = Start-Process -FilePath "powershell" -ArgumentList @(
  "-NoExit",
  "-Command",
  "`$env:WEAVE_GRAPH_MANAGED='1'; Set-Location '$repoRoot'; `$env:WEAVE_GRAPH_INGEST_URL='$ingestUrl'; `$env:WEAVE_GRAPH_TOKEN='$token'; Write-Host '[weave-cli] graph forwarding is enabled'; Write-Host '[weave-cli] type your question and press Enter to interact'; pnpm dev"
) -PassThru

Start-Sleep -Seconds 2
foreach ($procRef in @(
  @{ Name = "graph-backend"; Id = $graphServerProc.Id },
  @{ Name = "graph-frontend"; Id = $graphWebProc.Id },
  @{ Name = "main-cli"; Id = $cliProc.Id }
)) {
  try {
    Get-Process -Id $procRef.Id -ErrorAction Stop | Out-Null
  } catch {
    throw "$($procRef.Name) exited unexpectedly during startup, check logs"
  }
}

$pids = @{
  graphServerPid = $graphServerProc.Id
  graphWebPid = $graphWebProc.Id
  cliPid = $cliProc.Id
  backendLogPid = if ($backendLogProc) { $backendLogProc.Id } else { $null }
  ingestUrl = $ingestUrl
  graphWebUrl = $graphWebUrl
  token = $token
  startedAt = (Get-Date).ToString("o")
}

$pids | ConvertTo-Json -Depth 5 | Set-Content -Path $pidFile -Encoding UTF8

Write-Host ""
Write-Host "[done] all services started"
Write-Host "- graph frontend URL: $graphWebUrl"
Write-Host "- graph backend log: $logPath"
Write-Host "- graph frontend log: $webLogPath"
Write-Host "- main CLI interaction: opened in a new PowerShell window"
if ($backendLogProc) {
  Write-Host "- backend event log window: opened (PID=$($backendLogProc.Id))"
}
Write-Host "- PID file: $pidFile"

Start-Process $graphWebUrl | Out-Null
Write-Host "- browser opened: $graphWebUrl"
