param(
  [string]$OutputDir = "dist",
  [string]$PackageName = "minimal-translation-chrome-extension.zip"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root $OutputDir
$staging = Join-Path $dist "package"
$zipPath = Join-Path $dist $PackageName

$includePaths = @(
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "popup.css",
  "options.html",
  "options.js",
  "options.css",
  "assets"
)

if (-not (Test-Path $dist)) {
  New-Item -ItemType Directory -Path $dist | Out-Null
}

if (Test-Path $staging) {
  Remove-Item -Recurse -Force $staging
}

New-Item -ItemType Directory -Path $staging | Out-Null

foreach ($relativePath in $includePaths) {
  $source = Join-Path $root $relativePath
  if (-not (Test-Path $source)) {
    throw "Missing required release path: $relativePath"
  }

  $destination = Join-Path $staging $relativePath
  $parent = Split-Path -Parent $destination
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  if ((Get-Item $source) -is [System.IO.DirectoryInfo]) {
    Copy-Item -Recurse -Force $source $destination
  } else {
    Copy-Item -Force $source $destination
  }
}

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath

Write-Output "Packaged release to $zipPath"
