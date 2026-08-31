$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$port = 5174
$url = "http://127.0.0.1:$port"
$server = $null

function Test-DemoServer {
  try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

try {
  if (-not (Test-DemoServer)) {
    $server = Start-Process -FilePath "pnpm.cmd" `
      -ArgumentList @("exec", "vite", "--host", "127.0.0.1", "--port", "$port") `
      -WorkingDirectory $root `
      -WindowStyle Hidden `
      -PassThru

    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
      if (Test-DemoServer) {
        $ready = $true
        break
      }
      Start-Sleep -Seconds 1
    }

    if (-not $ready) {
      throw "No fue posible iniciar Vite en $url"
    }
  }

  $env:DEMO_SKIP_WEBSERVER = "true"
  $env:DEMO_BASE_URL = $url
  pnpm exec playwright test -c playwright.demo.config.ts
  exit $LASTEXITCODE
} finally {
  Remove-Item Env:\DEMO_SKIP_WEBSERVER -ErrorAction SilentlyContinue
  Remove-Item Env:\DEMO_BASE_URL -ErrorAction SilentlyContinue

  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
