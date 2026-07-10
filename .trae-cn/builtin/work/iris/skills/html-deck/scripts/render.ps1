# html-deck :: render.ps1 — headless Chrome screenshot(s)
#
# Usage:
#   render.ps1 <html-file>                     # one PNG, slide 1
#   render.ps1 <html-file> <N>                 # N PNGs, slides 1..N, via #/k
#   render.ps1 <html-file> all                 # autodetect .slide count
#   render.ps1 <html-file> <N> <out-dir>       # custom output dir
#
# Requires: Google Chrome installed.

param(
    [Parameter(Position=0)]
    [string]$File,
    [Parameter(Position=1)]
    [string]$Count = "1",
    [Parameter(Position=2)]
    [string]$Out = ""
)

$ErrorActionPreference = "Stop"

# Find Chrome on Windows
$ChromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$Chrome = $null
foreach ($p in $ChromePaths) {
    if (Test-Path $p) {
        $Chrome = $p
        break
    }
}

if (-not $Chrome) {
    Write-Error "error: Chrome not found. Checked: $($ChromePaths -join ', ')"
    exit 1
}

if (-not $File) {
    Write-Error "usage: render.ps1 <html> [N|all] [out-dir]"
    exit 1
}

if (-not (Test-Path $File)) {
    Write-Error "error: $File not found"
    exit 1
}

$Abs = (Resolve-Path $File).Path
$Stem = [System.IO.Path]::GetFileNameWithoutExtension($File)
$FileDir = Split-Path -Parent $Abs

if ($Count -eq "all") {
    $content = Get-Content $File -Raw
    $matches = [regex]::Matches($content, 'class="slide"')
    $Count = if ($matches.Count -gt 0) { $matches.Count.ToString() } else { "1" }
}

if (-not $Out) {
    if ([int]$Count -gt 1) {
        $Out = Join-Path $FileDir "${Stem}-png"
        New-Item -ItemType Directory -Path $Out -Force | Out-Null
    }
}

function Render-One {
    param([string]$Url, [string]$Target)

    $targetDir = Split-Path -Parent $Target
    if ($targetDir -and -not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    & $Chrome `
        --headless=new `
        --disable-gpu `
        --hide-scrollbars `
        --no-sandbox `
        --virtual-time-budget=4000 `
        --window-size=1920,1080 `
        "--screenshot=$Target" `
        $Url 2>&1 | Out-Null

    Write-Host "  OK $Target"
}

if ($Count -eq "1") {
    $OutFile = if ($Out) { $Out } else { Join-Path $FileDir "$Stem.png" }
    Render-One "file:///$($Abs -replace '\\','/')" $OutFile
} else {
    $n = [int]$Count
    for ($i = 1; $i -le $n; $i++) {
        $url = "file:///$($Abs -replace '\\','/')#/$i"
        $target = Join-Path $Out ("{0}_{1:D2}.png" -f $Stem, $i)
        Render-One $url $target
    }
}

Write-Host "done: rendered $Count slide(s) from $File"
