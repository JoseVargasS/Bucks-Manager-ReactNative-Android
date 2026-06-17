$ErrorActionPreference = "Stop"

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

$env:ANDROID_SERIAL = $physicalSerial
expo run:android --device $deviceName
