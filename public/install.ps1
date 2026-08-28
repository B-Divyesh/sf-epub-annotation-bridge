$ErrorActionPreference = "Stop"
$repo = "B-Divyesh/sf-epub-annotation-bridge"
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
$asset = $release.assets | Where-Object { $_.name -match '\.msi$' } | Select-Object -First 1
$sums = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS' } | Select-Object -First 1
if (-not $asset -or -not $sums) { throw "A Windows release with checksums is not available yet." }

$work = Join-Path $env:TEMP "epub-annotation-bridge-install"
New-Item -ItemType Directory -Force -Path $work | Out-Null
$installer = Join-Path $work $asset.name
$sumFile = Join-Path $work "SHA256SUMS"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installer
Invoke-WebRequest -Uri $sums.browser_download_url -OutFile $sumFile
$line = Get-Content $sumFile | Where-Object { $_ -match "\s\*?$([regex]::Escape($asset.name))$" } | Select-Object -First 1
if (-not $line) { throw "The release checksum does not list $($asset.name)." }
$expected = ($line -split '\s+')[0].ToLowerInvariant()
$actual = (Get-FileHash -Algorithm SHA256 $installer).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "The downloaded file failed its SHA-256 check." }

Write-Host "Verified $($asset.name). Starting the Windows installer."
Start-Process msiexec.exe -ArgumentList "/i `"$installer`"" -Wait
