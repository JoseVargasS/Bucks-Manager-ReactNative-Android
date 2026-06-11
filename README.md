# Bucks Manager Android

React Native/Expo Android migration of the original Bucks Manager Google Apps Script app.

Bucks Manager is a personal finance app where each user's private Google Sheet works as the database. The Android app is designed to let a user sign in with Google, find or create a compatible spreadsheet, and manage income/expense data without a custom backend.

## Current Status

- Expo SDK 56 / React Native 0.85 / TypeScript.
- Android-first app shell with Bucks Manager visual parity.
- Demo mode works without Google credentials.
- Google Drive + Google Sheets API service layer is implemented and ready for OAuth client IDs.
- Local skills are installed under `.agents/skills` for Expo, Android CLI, Android edge-to-edge, R8 analysis, frontend design, and accessibility.

## Features

- Monthly transaction list with KPIs.
- Add/edit/delete transactions.
- Undo delete in demo mode.
- Frequent income editor.
- Advanced search filters.
- Analysis screen with KPI cards and lightweight native charts.
- CSV/PDF export through Android sharing.
- Light/dark theme.
- Google Sheets repository layer for:
  - scanning compatible Sheets in Drive
  - creating a new Bucks Manager spreadsheet
  - initializing required tabs and headers
  - reading/writing transactions
  - creating monthly summary rows with formulas

## Google Sheet Contract

The app expects two tabs:

- `INGRESOS Y GASTOS`
- `RESUMEN POR MES`

`INGRESOS Y GASTOS` columns:

| Column | Header |
| --- | --- |
| A | Fecha |
| B | Monto |
| C | Detalle |
| D | Tipo |
| E | HORA DE CREACIÓN |

`RESUMEN POR MES` columns:

| Column | Header |
| --- | --- |
| A | MES |
| B | INGRESO FRECUENTE |
| C | INGRESO NO FRECUENTE |
| D | TOTAL INGRESOS |
| E | GASTO FRECUENTE |
| F | GASTO NO FRECUENTE |
| G | TOTAL GASTOS |
| H | NETO MENSUAL |
| I | NETO SIN ING FRECUENTE |

Supported transaction types:

- `INGRESO FRECUENTE`
- `INGRESO NO FRECUENTE`
- `GASTO FRECUENTE`
- `GASTO NO FRECUENTE`

## Setup

Install dependencies:

```powershell
npm install
```

Start Expo:

```powershell
npm run android
```

If Node is not on `PATH` in the current shell, a portable Node runtime was used during setup:

```powershell
$env:Path='C:\tmp\node-v24.16.0-win-x64;' + $env:Path
npx expo start --localhost --port 8081
```

## Google OAuth

The app runs in demo mode until OAuth IDs are configured.

1. Create a Google Cloud project.
2. Enable Google Drive API and Google Sheets API.
3. Configure OAuth consent.
4. Create an Android OAuth client for package:
   - `com.josev.bucksmanager`
5. Add the SHA-1 for the debug/release keystore.
6. Optionally create a web OAuth client for Expo Go testing.
7. Set these constants in `App.tsx`:
   - `GOOGLE_ANDROID_CLIENT_ID`
   - `GOOGLE_WEB_CLIENT_ID`

Scopes used:

- `https://www.googleapis.com/auth/drive.metadata.readonly`
- `https://www.googleapis.com/auth/spreadsheets`

Drive scanning can require Google OAuth verification before Play Store release. If verification becomes a blocker, switch onboarding to user-selected spreadsheet access instead of scanning all spreadsheets.

## Useful Commands

Type-check:

```powershell
npx tsc --noEmit
```

Check Expo dependency compatibility:

```powershell
npx expo install --check
```

Start Metro on localhost:

```powershell
npx expo start --localhost --port 8081
```

## Project Structure

```text
App.tsx
src/
  api/googleWorkspace.ts
  data/demoData.ts
  domain/bucksLogic.ts
  types.ts
```

## Notes

- Do not commit OAuth client secrets, user spreadsheet IDs, Expo logs, `.expo/`, or `node_modules/`.
- Keep UI changes aligned with the original Bucks Manager GAS interface.
- Use `GOOGLE-SETUP.md` for a shorter OAuth checklist.
