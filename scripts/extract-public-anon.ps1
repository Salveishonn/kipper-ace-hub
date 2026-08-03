# Extract the public Supabase anon JWT from deployed frontend bundles.
# Never prints the key; only lengths / JWT payload claims / save confirmation.
$ErrorActionPreference = 'Stop'

function Get-AssetPaths([string]$html) {
  $rx = [regex]'/assets/[^"''>]+\.js'
  return @($rx.Matches($html) | ForEach-Object { $_.Value } | Select-Object -Unique)
}

function Try-ExtractFromHost([string]$hostUrl) {
  Write-Host "HOST=$hostUrl"
  $htmlFile = Join-Path $env:TEMP 'kipper-host.html'
  $jsFile = Join-Path $env:TEMP 'kipper-host.js'
  & curl.exe -sL --user-agent 'Mozilla/5.0' -o $htmlFile $hostUrl
  $html = [System.IO.File]::ReadAllText($htmlFile)
  Write-Host "HTML_LEN=$($html.Length)"
  $assets = Get-AssetPaths $html
  Write-Host "ASSET_COUNT=$($assets.Count)"
  foreach ($a in $assets) {
    & curl.exe -sL --user-agent 'Mozilla/5.0' -o $jsFile ($hostUrl.TrimEnd('/') + $a)
    $js = [System.IO.File]::ReadAllText($jsFile)
    if ($js -notmatch 'qefzutfaawsegmwgaynj') { continue }
    Write-Host "MATCH_PROJECT_IN $a"
    $m = [regex]::Match($js, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
    if (-not $m.Success) { continue }
    $key = $m.Value
    $payload = $key.Split('.')[1]
    $mod = $payload.Length % 4
    if ($mod -ne 0) { $payload += ('=' * (4 - $mod)) }
    $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.Replace('-', '+').Replace('_', '/')))
    Write-Host "JWT_PAYLOAD=$json"
    Write-Host "KEY_LEN=$($key.Length)"
    if ($json -match 'qefzutfaawsegmwgaynj') {
      [System.IO.File]::WriteAllText((Join-Path $env:TEMP 'vite_anon.txt'), $key)
      Write-Host 'SAVED_ANON_FOR_KIPPER'
      return $true
    }
  }
  return $false
}

$hosts = @(
  'https://kipperseguros.com',
  'https://www.kipperseguros.com',
  'https://kipper-ace-hub.lovable.app',
  'https://kipper-ace-hub.vercel.app'
)

$found = $false
foreach ($h in $hosts) {
  if (Try-ExtractFromHost $h) { $found = $true; break }
}
Write-Host "FOUND=$found"
if (-not $found) { exit 2 }
