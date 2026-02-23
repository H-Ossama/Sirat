# Build APK Script for Capacitor Android App

Write-Host "Starting APK Build Process..." -ForegroundColor Cyan

# 1. Build Web Assets
Write-Host "`n[1/3] Building Web Assets..." -ForegroundColor Yellow
Set-Location "app"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Web build failed"; exit $LASTEXITCODE }

# 2. Sync with Capacitor
Write-Host "`n[2/3] Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "Capacitor sync failed"; exit $LASTEXITCODE }

# 3. Build APK
Write-Host "`n[3/3] Generating APK via Gradle..." -ForegroundColor Yellow
Set-Location "android"
.\gradlew assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSuccess! APK generated successfully." -ForegroundColor Green
    $apkPath = Join-Path (Get-Location) "app/build/outputs/apk/debug/app-debug.apk"
    Write-Host "Location: $apkPath" -ForegroundColor White
} else {
    Write-Error "Gradle build failed"
    exit $LASTEXITCODE
}

Set-Location "..\.."
