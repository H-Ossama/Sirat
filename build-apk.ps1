# Configuration
$ProjectRoot = Get-Location
$ReleaseFolder = Join-Path $ProjectRoot "RELEASES"
$PackageJsonPath = Join-Path $ProjectRoot "app/package.json"
$AndroidAppPath = Join-Path $ProjectRoot "app/android/app"
$KeystorePath = Join-Path $AndroidAppPath "release.keystore"

Write-Host "--- Me3raj Production Build Process ---" -ForegroundColor Cyan

# 0. Check/Create Keystore
if (-not (Test-Path $KeystorePath)) {
    Write-Host "Keystore missing. Generating a new one..." -ForegroundColor Yellow
    # Note: Password matches what we put in build.gradle
    keytool -genkey -v -keystore $KeystorePath -alias me3raj_alias -keyalg RSA -keysize 2048 -validity 10000 `
      -storepass me3raj123 -keypass me3raj123 `
      -dname "CN=Me3raj, OU=Dev, O=Me3rajApps, L=Rabat, S=Rabat, C=MA" -noprompt
    Write-Host "Keystore created at $KeystorePath" -ForegroundColor Green
}

# 1. Get current version for naming
$packageJson = Get-Content $PackageJsonPath | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Building version: v$version" -ForegroundColor White

# 2. Build Web Assets
Write-Host "`n[1/3] Building Web Assets..." -ForegroundColor Yellow
Set-Location "$ProjectRoot/app"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Web build failed"; exit $LASTEXITCODE }

# 3. Sync with Capacitor
Write-Host "`n[2/3] Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "Capacitor sync failed"; exit $LASTEXITCODE }

# 4. Build RELEASE APK
Write-Host "`n[3/3] Generating Signed RELEASE APK..." -ForegroundColor Yellow
Set-Location "$ProjectRoot/app/android"
.\gradlew assembleRelease

if ($LASTEXITCODE -eq 0) {
    # 5. Handle output and renaming
    if (-not (Test-Path $ReleaseFolder)) { New-Item -ItemType Directory -Path $ReleaseFolder | Out-Null }
    
    $sourceApk = Join-Path $AndroidAppPath "build/outputs/apk/release/app-release.apk"
    $targetApkName = "Me3raj-v$version.apk"
    $targetApkPath = Join-Path $ReleaseFolder $targetApkName

    if (Test-Path $sourceApk) {
        Copy-Item $sourceApk $targetApkPath -Force
        Write-Host "`n===============================================" -ForegroundColor Green
        Write-Host "Success! Signed APK is ready for distribution." -ForegroundColor Green
        Write-Host "File: $targetApkName" -ForegroundColor White
        Write-Host "Location: $ReleaseFolder" -ForegroundColor White
        Write-Host "===============================================" -ForegroundColor Green
    } else {
        Write-Error "Build finished but could not locate the output APK at $sourceApk"
    }
} else {
    Write-Error "Gradle release build failed"
    exit $LASTEXITCODE
}

Set-Location $ProjectRoot
