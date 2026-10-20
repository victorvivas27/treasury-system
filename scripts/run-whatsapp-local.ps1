param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('backend', 'frontend')]
  [string]$Component,
  [Parameter(Mandatory = $true)]
  [uri]$PublicUrl
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ($PublicUrl.Scheme -ne 'https' -or $PublicUrl.UserInfo -or $PublicUrl.Query -or $PublicUrl.Fragment -or
    $PublicUrl.AbsolutePath -ne '/' -or
    $PublicUrl.Host -notmatch '\.(ngrok-free\.app|ngrok-free\.dev|ngrok\.app|ngrok\.dev|trycloudflare\.com)$') {
  throw 'Usa exclusivamente el origen HTTPS del tunel local, sin ruta, query ni fragmento.'
}
$origin = $PublicUrl.GetLeftPart([System.UriPartial]::Authority)
$settings = @{}
foreach ($line in Get-Content -LiteralPath (Join-Path $root 'backend/.env')) {
  if ($line -match '^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$') {
    $settings[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
  }
}
if ($settings['DB_HOST'] -notin @('localhost', '127.0.0.1', '::1') -or
    $settings['DB_PORT'] -notmatch '^\d+$' -or $settings['DB_NAME'] -notmatch '^[A-Za-z0-9_-]+$') {
  throw 'La base de desarrollo debe estar en loopback y tener puerto/nombre validos.'
}
$recipients = @($settings['WHATSAPP_TEST_RECIPIENTS'].Split(',') | ForEach-Object { $_.Trim() })
if ($recipients.Count -ne 1) { throw 'La prueba exige exactamente un destinatario.' }
# Normalize the one authorized recipient in process memory; do not modify .env.
if ($recipients[0] -match '^[1-9][0-9]{7,14}$') { $recipients[0] = '+' + $recipients[0] }
if ($recipients[0] -notmatch '^\+[1-9][0-9]{7,14}$') { throw 'Destinatario de prueba invalido.' }

$overrides = @{
  APP_PROFILE = 'dev'
  SPRING_PROFILES_ACTIVE = 'dev'
  SPRING_PROFILES_INCLUDE = ''
  SPRING_DATASOURCE_URL = "jdbc:postgresql://127.0.0.1:$($settings['DB_PORT'])/$($settings['DB_NAME'])"
  SPRING_DATASOURCE_USERNAME = $settings['DB_USER']
  SPRING_DATASOURCE_PASSWORD = $settings['DB_PASSWORD']
  SPRING_JPA_HIBERNATE_DDL_AUTO = 'validate'
  SERVER_ADDRESS = '127.0.0.1'
  PORT = '5055'
  APP_PUBLIC_URL = $origin
  FRONTEND_URL = $origin
  APP_CORS_ALLOWED_ORIGINS = $origin
  APP_CORS_ALLOWED_ORIGIN_PATTERNS = ''
  APP_CORS_OFFICIAL_ORIGINS = $origin
  APP_BOOTSTRAP_ALLOW_LOCAL_WITHOUT_KEY = 'false'
  REFRESH_COOKIE_SECURE = 'true'
  WHATSAPP_ENABLED = 'true'
  WHATSAPP_MODE = 'test'
  # Handshake/webhooks enabled, but no real outbound messages before approval.
  WHATSAPP_PROVIDER = 'mock'
  WHATSAPP_TEST_RECIPIENTS = $recipients[0]
  WHATSAPP_INVITATION_HOURS = '24'
  GCS_ENABLED = 'false'
  WEB_PUSH_ENABLED = 'false'
  SPRING_MAIL_HOST = '127.0.0.1'
  SPRING_MAIL_PORT = '9'
  SPRING_MAIL_PROPERTIES_MAIL_SMTP_CONNECTIONTIMEOUT = '500'
  SPRING_MAIL_PROPERTIES_MAIL_SMTP_TIMEOUT = '500'
  VITE_API_URL = '/tesoreria/api/v1'
  WHATSAPP_LOCAL_PUBLIC_URL = $origin
}
$previous = @{}
foreach ($key in $overrides.Keys) {
  $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
  [Environment]::SetEnvironmentVariable($key, $overrides[$key], 'Process')
}
Push-Location $root
try {
  if ($Component -eq 'backend') {
    Set-Location backend
    & .\gradlew.bat bootRun
  } else {
    Set-Location frontend
    & node node_modules/vite/bin/vite.js --config vite.whatsapp-local.config.ts
  }
  if ($LASTEXITCODE -ne 0) { throw "El componente $Component termino con error." }
} finally {
  Pop-Location
  foreach ($key in $previous.Keys) {
    [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process')
  }
}
