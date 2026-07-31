# Build SP Courtside for Windows and copy artifacts to D:\sp\releases\windows
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$AppDir = Join-Path $RepoRoot "apps\courtside"
$OutDir = Join-Path $RepoRoot "releases\windows"
$Version = "0.1.2"

# Prefer in-repo cargo target (avoid Cursor sandbox CARGO_TARGET_DIR)
$env:CARGO_TARGET_DIR = Join-Path $AppDir "src-tauri\target"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "Building Tauri release (CARGO_TARGET_DIR=$env:CARGO_TARGET_DIR)..."
Set-Location $AppDir
npm exec -- pnpm tauri build
if ($LASTEXITCODE -ne 0) { throw "tauri build failed with exit $LASTEXITCODE" }

$ReleaseRoot = Join-Path $env:CARGO_TARGET_DIR "release"
$Exe = Join-Path $ReleaseRoot "sp-courtside.exe"
$Nsis = Get-ChildItem (Join-Path $ReleaseRoot "bundle\nsis") -Filter "*.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
$Msi = Get-ChildItem (Join-Path $ReleaseRoot "bundle\msi") -Filter "*.msi" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not (Test-Path $Exe)) { throw "Missing exe: $Exe" }

Copy-Item $Exe (Join-Path $OutDir "SP-Courtside.exe") -Force
if ($Nsis) {
  Copy-Item $Nsis.FullName (Join-Path $OutDir "SP-Courtside-Setup-$Version.exe") -Force
}
if ($Msi) {
  Copy-Item $Msi.FullName (Join-Path $OutDir "SP-Courtside-$Version.msi") -Force
}

Write-Host ""
Write-Host "Artifacts in $OutDir :"
Get-ChildItem $OutDir | Format-Table Name, Length, LastWriteTime -AutoSize
