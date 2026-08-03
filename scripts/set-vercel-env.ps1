# Sets Vercel VITE_* env vars from Kipper Supabase anon key. Never prints secret values.
# Auth: set SUPABASE_ACCESS_TOKEN env var first (https://supabase.com/dashboard/account/tokens)
#        for the account that owns project qefzutfaawsegmwgaynj.
$ErrorActionPreference = 'Stop'

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw 'SUPABASE_ACCESS_TOKEN is required. Create a personal access token in the Kipper Supabase account, then re-run.'
}

$outFile = Join-Path $env:TEMP 'sb-keys.json'
$errFile = Join-Path $env:TEMP 'sb-keys.err'

cmd /c "npx --yes supabase projects api-keys --project-ref qefzutfaawsegmwgaynj --output json > `"$outFile`" 2> `"$errFile`""
if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -lt 10) {
  $err = if (Test-Path $errFile) { Get-Content $errFile -Raw } else { '' }
  throw "Failed to fetch Supabase API keys. $err"
}

$raw = Get-Content $outFile -Raw
$start = $raw.IndexOf('[')
if ($start -lt 0) { throw 'Supabase keys response was not JSON array' }
$keys = $raw.Substring($start) | ConvertFrom-Json
$anon = ($keys | Where-Object { $_.name -eq 'anon' } | Select-Object -First 1).api_key
if (-not $anon -or $anon.Length -lt 20) { throw 'Could not resolve anon publishable key' }

Write-Host "ANON_OK len=$($anon.Length)"

function Set-VercelEnv {
  param([string]$Key, [string]$Value)
  foreach ($target in @('production', 'preview', 'development')) {
    npx vercel env rm $Key $target --yes --scope salveishonn1 2>$null | Out-Null
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $Value)
    cmd /c "type `"$tmp`" | npx vercel env add $Key $target --scope salveishonn1"
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
  Write-Host "SET_OK $Key"
}

Set-VercelEnv -Key 'VITE_SUPABASE_URL' -Value 'https://qefzutfaawsegmwgaynj.supabase.co'
Set-VercelEnv -Key 'VITE_SUPABASE_PUBLISHABLE_KEY' -Value $anon
Set-VercelEnv -Key 'VITE_SUPABASE_PROJECT_ID' -Value 'qefzutfaawsegmwgaynj'

Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
$anon = $null
$keys = $null

Write-Host '--- vercel env ls ---'
npx vercel env ls --scope salveishonn1
Write-Host 'DONE_ENV'
