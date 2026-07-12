$ErrorActionPreference = "Stop"

# Emergency APK installer — bypasses Expo's broken adb spawn.
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
adb -s $serial install -r -d $apk
