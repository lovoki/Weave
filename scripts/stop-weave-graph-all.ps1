# 文件作用：停止 start-weave-graph-all.ps1 启动的三服务进程。

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = "D:/Agent/dagent"
$pidFile = Join-Path $repoRoot "scripts/.weave-graph-dev-pids.json"

function Stop-ProcessTree {
  param([Parameter(Mandatory = $true)][int]$Id)

  $target = Get-Process -Id $Id -ErrorAction SilentlyContinue
  if (-not $target) {
    Write-Host "[warn] process already exited or cannot stop PID=$Id"
    return
  }

  try {
    taskkill /PID $Id /T /F *> $null
    if ($LASTEXITCODE -ne 0) {
      throw "taskkill failed"
    }
    Write-Host "[ok] stopped PID=$Id (tree)"
  } catch {
    Write-Host "[warn] process already exited or cannot stop PID=$Id"
  }
}

if (Test-Path $pidFile) {
  $state = Get-Content $pidFile -Raw | ConvertFrom-Json
  $backendLogPid = $null
  if ($state.PSObject.Properties.Name -contains "backendLogPid") {
    $backendLogPid = $state.backendLogPid
  }

  $targetPids = @($state.graphServerPid, $state.graphWebPid, $state.cliPid, $backendLogPid)
  foreach ($procId in $targetPids) {
    if (-not $procId) {
      continue
    }
    Stop-ProcessTree -Id ([int]$procId)
  }

  Remove-Item $pidFile -Force
  Write-Host "[done] cleaned PID file"
} else {
  Write-Host "[info] PID file not found: $pidFile"
}

# 兜底清理：关闭所有带 WEAVE_GRAPH_MANAGED 标记或关联 graph 子工程的残留进程。
$staleManagedProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $cmd = [string]($_.CommandLine)
    if (-not $cmd) {
      return $false
    }

    $isManaged = $cmd -match "WEAVE_GRAPH_MANAGED='1'"
    $isGraphServer = $cmd -match "apps[\\/]weave-graph-server"
    $isGraphWeb = $cmd -match "apps[\\/]weave-graph-web"
    $isGraphCli = $cmd -match "WEAVE_GRAPH_INGEST_URL"
    return $isManaged -or $isGraphServer -or $isGraphWeb -or $isGraphCli
  }

foreach ($proc in $staleManagedProcesses) {
  if (-not $proc.ProcessId) {
    continue
  }
  Stop-ProcessTree -Id ([int]$proc.ProcessId)
}

Write-Host "[done] graph-related process cleanup completed"
