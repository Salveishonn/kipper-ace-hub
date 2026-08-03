# Smoke-test Vercel production. Never prints secrets.
$ErrorActionPreference = 'Continue'
$ua = 'Mozilla/5.0'
$base = 'https://kipper-ace-hub.vercel.app'
$hosts = @(
  $base,
  'https://kipper-ace-mlaa6pnr9-salveishonn1.vercel.app',
  'https://www.kipperseguros.com',
  'https://kipperseguros.com'
)

function Get-HtmlTitle([string]$html) {
  if ($html -match '<title>([^<]+)</title>') { return $Matches[1] }
  return 'NO_TITLE'
}

function Get-Asset([string]$html) {
  $m = [regex]::Match($html, 'src="(/assets/[^"]+\.js)"')
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

Write-Host '=== HOST CHECKS ==='
foreach ($h in $hosts) {
  $tmp = Join-Path $env:TEMP 'smoke-host.html'
  $code = & curl.exe -sL --user-agent $ua -o $tmp -w '%{http_code}' $h
  $html = if (Test-Path $tmp) { [IO.File]::ReadAllText($tmp) } else { '' }
  Write-Host ("{0} HTTP={1} TITLE={2} LEN={3}" -f $h, $code, (Get-HtmlTitle $html), $html.Length)
}

Write-Host '=== SPA ROUTES ==='
foreach ($path in @('/', '/sumate', '/login', '/admin/login', '/servicios', '/contacto')) {
  $code = & curl.exe -sL --user-agent $ua -o NUL -w '%{http_code}' ($base + $path)
  Write-Host ("ROUTE {0} -> {1}" -f $path, $code)
}

Write-Host '=== BUNDLE SUPABASE MARKERS (no secrets) ==='
$tmp = Join-Path $env:TEMP 'smoke-host.html'
$jsFile = Join-Path $env:TEMP 'smoke-app.js'
& curl.exe -sL --user-agent $ua -o $tmp $base | Out-Null
$html = [IO.File]::ReadAllText($tmp)
$asset = Get-Asset $html
if (-not $asset) { Write-Host 'NO_JS_ASSET'; exit 2 }
& curl.exe -sL --user-agent $ua -o $jsFile ($base + $asset) | Out-Null
$js = [IO.File]::ReadAllText($jsFile)
Write-Host ("ASSET={0} JS_LEN={1}" -f $asset, $js.Length)
Write-Host ("HAS_qefzut={0}" -f $js.Contains('qefzutfaawsegmwgaynj'))
Write-Host ("HAS_bmaozc={0}" -f $js.Contains('bmaozcfolgwqhbqhqbnr'))
Write-Host ("HAS_supabase_co={0}" -f $js.Contains('supabase.co'))
Write-Host ("HAS_anon_jwt_pattern={0}" -f [regex]::IsMatch($js, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.'))
Write-Host ("HAS_google_reviews={0}" -f $js.Contains('google_reviews'))
Write-Host ("HAS_Cotizar={0}" -f $js.Contains('Cotizar'))
Write-Host ("HAS_KipperScrollStory_chunk={0}" -f $js.Contains('KipperScrollStory'))

$jwtClaims = 'MISSING'
$m = [regex]::Match($js, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
$key = $null
if ($m.Success) {
  $key = $m.Value
  $payload = $key.Split('.')[1]
  $mod = $payload.Length % 4
  if ($mod -ne 0) { $payload += ('=' * (4 - $mod)) }
  $jwtClaims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.Replace('-', '+').Replace('_', '/')))
}
Write-Host ("EMBEDDED_JWT_CLAIMS={0}" -f $jwtClaims)

Write-Host '=== SUPABASE PUBLIC API ==='
$sbUrl = 'https://qefzutfaawsegmwgaynj.supabase.co'
if ($key -and $jwtClaims -match 'qefzutfaawsegmwgaynj') {
  $headers = @{
    apikey = $key
    Authorization = "Bearer $key"
  }
  try {
    Invoke-RestMethod -Uri ($sbUrl + '/auth/v1/health') -Headers @{ apikey = $key } -TimeoutSec 20 | Out-Null
    Write-Host 'AUTH_HEALTH=OK'
  } catch {
    Write-Host ("AUTH_HEALTH_FAIL={0}" -f $_.Exception.Message)
  }
  try {
    $r = Invoke-WebRequest -Uri ($sbUrl + '/rest/v1/google_reviews_cache?select=fetched_at,rating,user_ratings_total&order=fetched_at.desc&limit=1') -Headers $headers -TimeoutSec 20
    Write-Host ("REVIEWS_CACHE_STATUS={0} BODY_LEN={1}" -f ([int]$r.StatusCode), $r.Content.Length)
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'n/a' }
    Write-Host ("REVIEWS_CACHE_FAIL status={0}" -f $code)
  }
  try {
    $r2 = Invoke-WebRequest -Uri ($sbUrl + '/rest/v1/producer_applications?select=id&limit=1') -Headers $headers -TimeoutSec 20
    Write-Host ("PRODUCER_APPS_SELECT_STATUS={0} (expect RLS deny/empty for anon)" -f ([int]$r2.StatusCode))
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'n/a' }
    Write-Host ("PRODUCER_APPS_SELECT status={0}" -f $code)
  }
  try {
    $r3 = Invoke-WebRequest -Uri ($sbUrl + '/storage/v1/bucket') -Headers $headers -TimeoutSec 20
    Write-Host ("STORAGE_BUCKETS_STATUS={0}" -f ([int]$r3.StatusCode))
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'n/a' }
    Write-Host ("STORAGE_BUCKETS status={0}" -f $code)
  }
  # Public object probe via known logo path pattern if referenced in bundle
  $storageUrls = [regex]::Matches($js, 'https://qefzutfaawsegmwgaynj\.supabase\.co/storage/v1/object/public/[^\"'']+') | ForEach-Object { $_.Value } | Select-Object -Unique
  Write-Host ("PUBLIC_STORAGE_URLS={0}" -f $storageUrls.Count)
  foreach ($su in ($storageUrls | Select-Object -First 3)) {
    $sc = & curl.exe -sL --user-agent $ua -o NUL -w '%{http_code}' $su
    Write-Host ("STORAGE_ASSET HTTP={0}" -f $sc)
  }
} else {
  Write-Host 'SKIP_SUPABASE_API - publishable key not embedded for Kipper project'
}

Write-Host '=== LOGIN SHELLS ==='
foreach ($path in @('/login', '/admin/login')) {
  $tmp2 = Join-Path $env:TEMP 'smoke-login.html'
  & curl.exe -sL --user-agent $ua -o $tmp2 ($base + $path) | Out-Null
  $h2 = [IO.File]::ReadAllText($tmp2)
  Write-Host ("LOGIN_SHELL {0} TITLE={1} LEN={2}" -f $path, (Get-HtmlTitle $h2), $h2.Length)
}

Write-Host 'SMOKE_DONE'
