$ErrorActionPreference = "Stop"

# Emergency APK installer — bypasses Expo's broken adb spawn.
# Uses push + pm install to avoid the streamed-install hang on some devices.
# Usage: .\scripts\install-apk.ps1 [path-to-apk]
# Defaults to the release APK if no path is given.

$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"

$apk = if ($args.Count -gt 0) { $args[0] } else {
  Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\release\app-release.apk"
}

if (-not (Test-Path $apk)) {
  Write-Error "APK not found: $apk"
}

$deviceLines = adb devices -l | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice(\s|$)" }
$physicalLines = $deviceLines | Where-Object { $_ -notmatch "^emulator-" }

if (-not $physicalLines) {
  Write-Error "No hay un celular autorizado por ADB."
}

$serial = ($physicalLines | Select-Object -First 1) -split "\s+" | Select-Object -First 1
Write-Host "Installing on $serial ..."

# Push to device first, then install from local storage.
# Direct "adb install" hangs on streamed install for some devices.
$remotePath = "/data/local/tmp/bucks-install.apk"
adb -s $serial push $apk $remotePath
$result = adb -s $serial shell pm install -r -d $remotePath 2>&1
adb -s $serial shell rm $remotePath | Out-Null

if ($result -match "Success") {
  Write-Host "Installed successfully."
} else {
  Write-Error "Install failed: $result"
}
