# This script updates the version number in both package.json and build.gradle files.
# Usage: .\set-version.ps1 "1.2.0"

param (
    [Parameter(Mandatory=$true)]
    [string]$NewVersion
)

$PackageJsonPath = "app/package.json"
$BuildGradlePath = "app/android/app/build.gradle"

# 1. Update package.json
if (Test-Path $PackageJsonPath) {
    Write-Host "Updating $PackageJsonPath to $NewVersion..." -ForegroundColor Cyan
    $content = Get-Content $PackageJsonPath -Raw
    # Update version while preserving original formatting
    $content = $content -replace '(?m)^(\s*"version":\s*)"[^"]+"', ('$1' + "`"$NewVersion`"")
    # Use UTF8 without BOM for standard compliance
    [System.IO.File]::WriteAllText((Get-Item $PackageJsonPath).FullName, $content, (New-Object System.Text.UTF8Encoding($false)))
} else {
    Write-Error "Could not find $PackageJsonPath"
}

# 2. Update build.gradle (versionName and increment versionCode)
if (Test-Path $BuildGradlePath) {
    Write-Host "Updating $BuildGradlePath..." -ForegroundColor Cyan
    $content = Get-Content $BuildGradlePath -Raw

    # Update versionName while preserving original whitespace/formatting
    $content = $content -replace '(?m)^(\s*versionName\s+)"[^"]+"', ('$1' + "`"$NewVersion`"")
    Write-Host "  Set versionName to $NewVersion" -ForegroundColor Gray

    # Increment versionCode while preserving original whitespace/formatting
    if ($content -match '(?m)^\s*versionCode\s+(\d+)') {
        $oldCode = [int]$matches[1]
        $newCode = $oldCode + 1
        $content = $content -replace '(?m)^(\s*versionCode\s+)\d+', ('$1' + "$newCode")
        Write-Host "  Incremented versionCode to $newCode" -ForegroundColor Gray
    }

    # Use UTF8 without BOM
    [System.IO.File]::WriteAllText((Get-Item $BuildGradlePath).FullName, $content, (New-Object System.Text.UTF8Encoding($false)))
} else {
    Write-Error "Could not find $BuildGradlePath"
}

Write-Host "Done! Version updated to $NewVersion." -ForegroundColor Green
