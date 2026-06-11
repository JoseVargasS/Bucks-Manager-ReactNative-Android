# Bucks Manager Android - Configurar Google Sign-In

Esto es un paso de desarrollador que se hace una sola vez para que la app pueda pedir permiso a Google Drive y Google Sheets. El usuario final solo abre la app, toca "Acceder con Google" y usa su propia cuenta.

La app usa Google Sign-In nativo de Android, no un redirect web con custom URI. Por eso no necesitas configurar `com.josev.bucksmanager:/oauthredirect`.

## 1. Habilitar APIs

En Google Cloud Console, abre tu proyecto y habilita:

- Google Drive API
- Google Sheets API

## 2. Configurar pantalla de consentimiento

En `APIs & Services > OAuth consent screen`:

- User type: `External`
- App name: `Bucks Manager`
- User support email: tu email
- Developer contact email: tu email
- Scopes:
  - `https://www.googleapis.com/auth/drive.metadata.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- Test users: agrega tu email mientras estas probando

## 3. Crear OAuth client Android

En `APIs & Services > Credentials > Create Credentials > OAuth client ID`, crea un cliente tipo `Android`.

Usa estos valores:

| Campo | Valor |
| --- | --- |
| Package name | `com.josev.bucksmanager` |
| SHA-1 fingerprint | El SHA-1 real de tu keystore debug o release |

Para ver el SHA-1 debug en esta maquina:

```powershell
cd "C:\Users\JoseV\Desktop\Bucks Manager Android"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\android\gradlew.bat signingReport
```

Copia el SHA-1 que aparece para `Variant: debug`.

## 4. Variables de entorno

El archivo `.env` debe estar en la raiz del proyecto y no se sube a git:

```env
GOOGLE_ANDROID_CLIENT_ID=tu-client-id-android.apps.googleusercontent.com
GOOGLE_WEB_CLIENT_ID=tu-client-id-web.apps.googleusercontent.com
```

`GOOGLE_ANDROID_CLIENT_ID` se usa para validar que la app tiene credenciales configuradas. `GOOGLE_WEB_CLIENT_ID` es recomendado por Google Sign-In para solicitar tokens con scopes adicionales.

## 5. Probar en tu telefono

```powershell
cd "C:\Users\JoseV\Desktop\Bucks Manager Android"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
npm run android
```

La app debe abrir con una pantalla minimalista y el boton `Acceder con Google`. Despues de autorizar, busca una hoja compatible en tu Drive o crea una nueva.
