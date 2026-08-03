# Reads %TEMP%\vite_anon.txt and sets Vercel VITE_* env vars. Never prints key values.
$ErrorActionPreference = 'Stop'
$anonPath = Join-Path $env:TEMP 'vite_anon.txt'
if (-not (Test-Path $anonPath)) { throw "Missing $anonPath — run extract-public-anon.ps1 first" }
$anon = [System.IO.File]::ReadAllText($anonPath).Trim()
if ($anon.Length -lt 20) { throw 'anon key file empty' }
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

Remove-Item $anonPath -Force -ErrorAction SilentlyContinue
$anon = $null

Write-Host '--- vercel env ls ---'
npx vercel env ls --scope salveishonn1
Write-Host 'DONE_ENV'
