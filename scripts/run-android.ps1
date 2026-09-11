$ErrorActionPreference = "Stop"

$variant = if ($args.Count -gt 0) { $args[0] } else { "" }

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

$deviceLines = adb devices -l | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice(\s|$)" }
$physicalLines = $deviceLines | Where-Object { $_ -notmatch "^emulator-" }

if (-not $physicalLines) {
  Write-Error "No hay un celular fisico autorizado por ADB. Conecta el telefono por USB, activa Depuracion USB y acepta el permiso RSA. Luego ejecuta npm run android otra vez."
}

$physicalLine = $physicalLines | Select-Object -First 1
$physicalSerial = ($physicalLine -split "\s+")[0]
$modelMatch = [regex]::Match($physicalLine, "model:(\S+)")
$deviceName = if ($modelMatch.Success) { $modelMatch.Groups[1].Value } else { "Device $physicalSerial" }

if ($physicalLines.Count -gt 1) {
  Write-Warning "Hay varios celulares conectados. Usando $deviceName ($physicalSerial)."
}

# Build with gradle directly instead of expo run:android to avoid its broken
# adb install that hangs on streamed install for some devices.
$androidDir = Join-Path $PSScriptRoot "..\android"
if ($variant -eq "release") {
  # Release: full 4 ABIs from gradle.properties (Play Store / reparto general).
  Write-Host "Building release APK (all ABIs) ..."
  Push-Location $androidDir
  try { & .\gradlew.bat assembleRelease --build-cache --quiet } finally { Pop-Location }
  $apk = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\release\app-release.apk"
} else {
  # Debug: solo arm64-v8a (tu celular fisico). Compilar 1 ABI en vez de 4
  # baja el APK de ~180 MB a ~50 MB y el tiempo a menos de la mitad.
  Write-Host "Building debug APK (arm64-v8a only) ..."
  Push-Location $androidDir
  try { & .\gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a --build-cache --quiet } finally { Pop-Location }
  $apk = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\debug\app-debug.apk"
}

if (-not (Test-Path $apk)) {
  Write-Error "APK not found after build: $apk"
}

# Install via push + pm install (bypasses streamed-install hang)
Write-Host "Installing on $deviceName ($physicalSerial) ..."
$remotePath = "/data/local/tmp/bucks-install.apk"
adb -s $physicalSerial push $apk $remotePath
$result = adb -s $physicalSerial shell pm install -r -d $remotePath 2>&1
adb -s $physicalSerial shell rm $remotePath | Out-Null

if ($result -match "Success") {
  Write-Host "Installed. Starting app ..."
  adb -s $physicalSerial shell monkey -p com.kuskalabs.quipu -c android.intent.category.LAUNCHER 1 | Out-Null
} else {
  Write-Error "Install failed: $result"
}
