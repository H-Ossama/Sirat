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
    $content = $content -replace '"version":\s*"[^"]+"', "`"version`": `"$NewVersion`""
    Set-Content $PackageJsonPath $content
} else {
    Write-Error "Could not find $PackageJsonPath"
}

# 2. Update build.gradle (versionName and increment versionCode)
if (Test-Path $BuildGradlePath) {
    Write-Host "Updating $BuildGradlePath..." -ForegroundColor Cyan
    $content = Get-Content $BuildGradlePath

    $newContent = @()
    foreach ($line in $content) {
        if ($line -match 'versionName\s+"[^"]+"') {
            $line = $line -replace 'versionName\s+"[^"]+"', "versionName `"$NewVersion`""
            Write-Host "  Set versionName to $NewVersion" -ForegroundColor Gray
        }
        elseif ($line -match 'versionCode\s+(\d+)') {
            $oldCode = [int]$matches[1]
            $newCode = $oldCode + 1
            $line = $line -replace 'versionCode\s+\d+', "versionCode $newCode"
            Write-Host "  Incremented versionCode to $newCode" -ForegroundColor Gray
        }
        $newContent += $line
    }
    Set-Content $BuildGradlePath ($newContent -join "`r`n")
} else {
    Write-Error "Could not find $BuildGradlePath"
}

Write-Host "Done! Version updated to $NewVersion." -ForegroundColor Green
