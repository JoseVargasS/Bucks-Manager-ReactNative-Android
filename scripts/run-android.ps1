$ErrorActionPreference = "Stop"

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

$deviceLines = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" }
$physicalDevice = $deviceLines |
  ForEach-Object { ($_ -split "\s+")[0] } |
  Where-Object { $_ -and ($_ -notlike "emulator-*") } |
  Select-Object -First 1

if (-not $physicalDevice) {
  Write-Error "No hay un celular fisico autorizado por ADB. Conecta el telefono por USB, activa Depuracion USB y acepta el permiso RSA. Luego ejecuta npm run android otra vez."
}

expo run:android --device $physicalDevice
