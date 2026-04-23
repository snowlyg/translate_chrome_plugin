param(
  [string]$OutputDir = "dist",
  [string]$PackageName = "minimal-translation-chrome-extension.zip",
  [string]$Bump = "",
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root $OutputDir
$staging = Join-Path $dist "package"
$zipPath = Join-Path $dist $PackageName
$manifestPath = Join-Path $root "manifest.json"
$readmePaths = @(
  (Join-Path $root "README.md"),
  (Join-Path $root "README.en.md")
)

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

function Write-Utf8File {
  param(
    [string]$Path,
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Get-ManifestVersion {
  param(
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    throw "Missing manifest file: $Path"
  }

  $manifest = Get-Content -Raw -Path $Path | ConvertFrom-Json
  $currentVersion = [string]$manifest.version
  if (-not ($currentVersion -match '^\d+\.\d+\.\d+$')) {
    throw "Unsupported manifest version format: $currentVersion"
  }

  return $currentVersion
}

function Get-NextVersion {
  param(
    [string]$CurrentVersion,
    [string]$BumpType,
    [string]$TargetVersion
  )

  if ($TargetVersion) {
    if (-not ($TargetVersion -match '^\d+\.\d+\.\d+$')) {
      throw "Target version must use major.minor.patch format: $TargetVersion"
    }

    return $TargetVersion
  }

  $selectedBump = $BumpType
  if (-not $selectedBump) {
    $choice = Read-Host "Select version bump [patch/minor/major] (default: patch)"
    $selectedBump = $choice.Trim().ToLowerInvariant()
    if (-not $selectedBump) {
      $selectedBump = "patch"
    }
  }

  if ($selectedBump -notin @("patch", "minor", "major")) {
    throw "Version bump must be patch, minor, or major: $selectedBump"
  }

  $parts = $CurrentVersion.Split(".") | ForEach-Object { [int]$_ }
  switch ($selectedBump) {
    "major" {
      $parts[0] += 1
      $parts[1] = 0
      $parts[2] = 0
    }
    "minor" {
      $parts[1] += 1
      $parts[2] = 0
    }
    default {
      $parts[2] += 1
    }
  }

  return "$($parts[0]).$($parts[1]).$($parts[2])"
}

function Set-ManifestVersion {
  param(
    [string]$Path,
    [string]$NextVersion
  )

  $content = Get-Content -Raw -Path $Path
  $updated = [regex]::Replace(
    $content,
    '"version"\s*:\s*"\d+\.\d+\.\d+"',
    "`"version`": `"$NextVersion`"",
    1
  )

  if ($updated -eq $content) {
    throw "Could not update manifest version in $Path"
  }

  Write-Utf8File -Path $Path -Content $updated
}

function Set-ReadmeVersion {
  param(
    [string]$Path,
    [string]$NextVersion
  )

  if (-not (Test-Path $Path)) {
    throw "Missing README file: $Path"
  }

  $content = Get-Content -Raw -Path $Path
  $updated = [regex]::Replace(
    $content,
    'Current version:\s*`\d+\.\d+\.\d+`',
    "Current version: ``$NextVersion``",
    1
  )

  if ($updated -eq $content) {
    throw "Could not update README version in $Path"
  }

  Write-Utf8File -Path $Path -Content $updated
}

function Compare-Version {
  param(
    [string]$Left,
    [string]$Right
  )

  $leftParts = $Left.Split(".") | ForEach-Object { [int]$_ }
  $rightParts = $Right.Split(".") | ForEach-Object { [int]$_ }

  for ($index = 0; $index -lt 3; $index++) {
    if ($leftParts[$index] -gt $rightParts[$index]) {
      return 1
    }
    if ($leftParts[$index] -lt $rightParts[$index]) {
      return -1
    }
  }

  return 0
}

$currentVersion = Get-ManifestVersion -Path $manifestPath
$nextVersion = Get-NextVersion -CurrentVersion $currentVersion -BumpType $Bump -TargetVersion $Version

if ((Compare-Version -Left $nextVersion -Right $currentVersion) -le 0) {
  throw "Next version must be greater than current version: $currentVersion"
}

Set-ManifestVersion -Path $manifestPath -NextVersion $nextVersion
foreach ($readmePath in $readmePaths) {
  Set-ReadmeVersion -Path $readmePath -NextVersion $nextVersion
}

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

Write-Output "Version bumped $currentVersion -> $nextVersion"
Write-Output "Packaged release to $zipPath"
