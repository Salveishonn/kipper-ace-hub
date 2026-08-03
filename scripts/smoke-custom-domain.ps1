# Smoke-test custom domain after DNS cutover. Never prints secrets.
$ErrorActionPreference = 'Continue'
$ua = 'Mozilla/5.0'
$apex = 'https://kipperseguros.com'
$www = 'https://www.kipperseguros.com'

function Get-Title([string]$html) {
  if ($html -match '<title>([^<]+)</title>') { return $Matches[1] }
  return 'NO_TITLE'
}

Write-Host '=== HTTPS / CERT / REDIRECT ==='
foreach ($url in @($apex, "$apex/", $www, "$www/", "$www/sumate", "$www/login")) {
  $headersFile = Join-Path $env:TEMP 'smoke-headers.txt'
  $bodyFile = Join-Path $env:TEMP 'smoke-body.html'
  Remove-Item $headersFile, $bodyFile -Force -ErrorAction SilentlyContinue
  $code = & curl.exe -sS -D $headersFile -o $bodyFile --user-agent $ua -w '%{http_code}|%{url_effective}|%{ssl_verify_result}' --max-redirs 0 $url 2>$null
  if (-not $code) {
    # follow redirects for effective final
    $code = & curl.exe -sS -D $headersFile -o $bodyFile --user-agent $ua -w '%{http_code}|%{url_effective}|%{ssl_verify_result}' -L --max-redirs 5 $url
    "FOLLOW $url => $code"
  } else {
    "NOFOLLOW $url => $code"
  }
  if (Test-Path $headersFile) {
    $hdr = Get-Content $headersFile -Raw
    $loc = if ($hdr -match '(?im)^Location:\s*(.+)$') { $Matches[1].Trim() } else { '' }
    $server = if ($hdr -match '(?im)^Server:\s*(.+)$') { $Matches[1].Trim() } else { '' }
    $hsts = if ($hdr -match '(?im)^Strict-Transport-Security:') { 'yes' } else { 'no' }
    "  location=$loc server=$server hsts=$hsts"
  }
}

Write-Host '=== WWW 308 CHECK (no follow) ==='
$hdrFile = Join-Path $env:TEMP 'www-headers.txt'
$code = & curl.exe -sS -D $hdrFile -o NUL --user-agent $ua -w '%{http_code}' --max-redirs 0 "$www/sumate"
$hdr = Get-Content $hdrFile -Raw
$loc = if ($hdr -match '(?im)^Location:\s*(.+)$') { $Matches[1].Trim() } else { '' }
"WWW_SUMATE status=$code location=$loc"

Write-Host '=== APEX ROUTES ==='
$routes = @(
  '/', '/seguros', '/servicios', '/nosotros', '/comunidad', '/contacto',
  '/cotizar', '/academy', '/sumate', '/login', '/admin/login', '/admin', '/productor'
)
foreach ($path in $routes) {
  $tmp = Join-Path $env:TEMP 'route.html'
  $code = & curl.exe -sS -L --user-agent $ua -o $tmp -w '%{http_code}' --max-redirs 5 ($apex + $path)
  $html = if (Test-Path $tmp) { [IO.File]::ReadAllText($tmp) } else { '' }
  $title = Get-Title $html
  $server = (& curl.exe -sSI -L --user-agent $ua --max-redirs 5 ($apex + $path) | Select-String -Pattern '^server:' -CaseSensitive:$false | Select-Object -First 1)
  "ROUTE $path -> $code title=$title $server"
}

Write-Host '=== COMUNIDAD SLUG ==='
# discover a slug from public blog/posts if present in homepage HTML/JS
$htmlHome = [IO.File]::ReadAllText((Join-Path $env:TEMP 'route.html'))
# fetch homepage again
& curl.exe -sS -L --user-agent $ua -o (Join-Path $env:TEMP 'home.html') $apex | Out-Null
$home = [IO.File]::ReadAllText((Join-Path $env:TEMP 'home.html'))
$asset = ([regex]::Match($home, 'src="(/assets/index-[^"]+\.js)"')).Groups[1].Value
$slug = $null
if ($asset) {
  $jsFile = Join-Path $env:TEMP 'home.js'
  & curl.exe -sS -L --user-agent $ua -o $jsFile ($apex + $asset) | Out-Null
  $js = [IO.File]::ReadAllText($jsFile)
  $m = [regex]::Match($js, '/comunidad/([a-z0-9-]+)')
  if ($m.Success) { $slug = $m.Groups[1].Value }
}
if (-not $slug) {
  # probe via supabase public posts if key embedded
  $key = ([regex]::Match($js, 'sb_publishable_[A-Za-z0-9_-]+')).Value
  if ($key) {
    $bodyFile = Join-Path $env:TEMP 'posts.json'
    & curl.exe -sS -o $bodyFile -w '%{http_code}' `
      -H "apikey: $key" -H "Authorization: Bearer $key" -H 'Accept: application/json' `
      'https://qefzutfaawsegmwgaynj.supabase.co/rest/v1/blog_posts?select=slug&limit=1' | Out-Null
    # try common table names
    foreach ($table in @('blog_posts','posts','community_posts','novedades')) {
      $code = & curl.exe -sS -o $bodyFile -w '%{http_code}' `
        -H "apikey: $key" -H "Authorization: Bearer $key" -H 'Accept: application/json' `
        ("https://qefzutfaawsegmwgaynj.supabase.co/rest/v1/${table}?select=slug&limit=1")
      $body = [IO.File]::ReadAllText($bodyFile)
      if ($code -eq '200' -and $body -match '"slug"\s*:\s*"([^"]+)"') {
        $slug = $Matches[1]
        "SLUG_FROM_TABLE=$table slug=$slug"
        break
      }
    }
  }
}
if ($slug) {
  $code = & curl.exe -sS -L --user-agent $ua -o NUL -w '%{http_code}' ($apex + '/comunidad/' + $slug)
  "COMUNIDAD_SLUG /$slug -> $code"
} else {
  Write-Host 'COMUNIDAD_SLUG=none_found (will still hit /comunidad)'
}

Write-Host '=== BUNDLE / SUPABASE ==='
& curl.exe -sS -L --user-agent $ua -o (Join-Path $env:TEMP 'home.html') $apex | Out-Null
$home = [IO.File]::ReadAllText((Join-Path $env:TEMP 'home.html'))
$asset = ([regex]::Match($home, 'src="(/assets/index-[^"]+\.js)"')).Groups[1].Value
& curl.exe -sS -L --user-agent $ua -o (Join-Path $env:TEMP 'app.js') ($apex + $asset) | Out-Null
$js = [IO.File]::ReadAllText((Join-Path $env:TEMP 'app.js'))
"TITLE=$(Get-Title $home)"
"HAS_qefzut=$($js.Contains('qefzutfaawsegmwgaynj'))"
"HAS_bmaozc=$($js.Contains('bmaozcfolgwqhbqhqbnr'))"
"HAS_sb_publishable=$($js.Contains('sb_publishable_'))"
"HAS_service_role=$($js.Contains('service_role') -or $js.Contains('sb_secret_'))"
$key = ([regex]::Match($js, 'sb_publishable_[A-Za-z0-9_-]+')).Value
$sb = 'https://qefzutfaawsegmwgaynj.supabase.co'
if ($key) {
  $authCode = & curl.exe -sS -o NUL -w '%{http_code}' -H "apikey: $key" "$sb/auth/v1/health"
  "AUTH_HEALTH=$authCode"
  $revFile = Join-Path $env:TEMP 'reviews.json'
  $revCode = & curl.exe -sS -o $revFile -w '%{http_code}' `
    -H "apikey: $key" -H "Authorization: Bearer $key" `
    "$sb/rest/v1/google_reviews_cache?select=fetched_at,rating,user_ratings_total,reviews&order=fetched_at.desc&limit=1"
  $revBody = [IO.File]::ReadAllText($revFile)
  $revBodyRedacted = [regex]::Replace($revBody, 'sb_publishable_[A-Za-z0-9_-]+', '[SB_PUB]')
  # language heuristic: look for common Spanish words in review text without dumping full payload size only
  $spanishHints = @('que','para','muy','con','una','los','las','excelente','atención','atencion','recomiendo','servicio')
  $esHits = 0
  foreach ($w in $spanishHints) { if ($revBody -match ("(?i)\b{0}\b" -f [regex]::Escape($w))) { $esHits++ } }
  "REVIEWS_CACHE=$revCode LEN=$($revBody.Length) SPANISH_HINTS=$esHits"
  $fnCode = & curl.exe -sS -o NUL -w '%{http_code}' -H "apikey: $key" -H "Authorization: Bearer $key" "$sb/functions/v1/google-reviews"
  "REVIEWS_FN=$fnCode"
  $stCode = & curl.exe -sS -o NUL -w '%{http_code}' -H "apikey: $key" -H "Authorization: Bearer $key" "$sb/storage/v1/bucket"
  "STORAGE_BUCKETS=$stCode"
}
$logo = & curl.exe -sS -o NUL -w '%{http_code}' -L ($apex + '/og-kipper.png')
"OG_PNG=$logo"

Write-Host '=== DEPLOY SHA VIA VERCEL HEADER / HTML ==='
# Compare with known production via vercel.app title/asset parity
$vTitle = Get-Title ((& curl.exe -sS -L --user-agent $ua 'https://kipper-ace-hub.vercel.app'))
"VERCEL_APP_TITLE=$vTitle"
"APEX_TITLE=$(Get-Title $home)"

Write-Host 'SMOKE_CUSTOM_DONE'
