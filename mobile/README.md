# Resu-Dog Mobile

The iPhone and Android app for Resu-Dog, built with Expo SDK 58 (React Native) and Expo Router. It uses the same API as the web app in `../frontend`, so all the AI work, rate limiting and privacy rules live in one place.

## What's in the app

| Tab | What it does |
| --- | --- |
| **Optimize** | Pick a resume (PDF, DOCX or TXT) from Files, iCloud Drive or Google Drive. Choose "For a job" (paste the job description) or "General polish". You get a job-match score, the rewritten resume with highlighted `[placeholders]` to fill in, a recruiter-style review, a skills-gap breakdown and a cover letter. Save as PDF or copy the text. |
| **Build CV** | Paste a job description, answer the role-specific questions ("Help me write this" gives fill-in-the-blank drafts), and get a CV written from your answers. |
| **About** | The no-fabrication promise, how it works, a data summary, and a link to the full privacy policy. |

Design: the merged "Coach × Clarity" direction in `../DESIGN-SPEC.md` (with its 20 acceptance tests). Controls are native via `@expo/ui` — SwiftUI on iOS, Jetpack Compose on Android — with SF Symbols / Material Symbols. It also follows the `mobile-ui-ios-android` skill:
- native tab bar and large titles
- 48pt touch targets and 16pt text in all inputs
- WCAG AA colours shared with the web app
- follows the phone's light/dark setting
- haptics on actions, and screen readers announce progress

## Run it locally

You need Node 20+ and, for iOS, Xcode with a simulator. For Android, you need Android Studio with an emulator. You can also use your own phone with **Expo Go** from the App Store or Play Store.

1. Start the API (the web app) from the repo root. Next binds to all interfaces, so phones on the same Wi-Fi can reach it:

   ```bash
   cd frontend && npm run dev
   ```

2. Start the app:

   ```bash
   cd mobile && npx expo start
   ```

   Press `i` for the iOS simulator or `a` for the Android emulator, or scan the QR code with your phone.

In development, the app finds the API automatically: it uses the computer running `expo start`, on port 3000. To point it somewhere else, set `EXPO_PUBLIC_API_URL` (see `.env.example`).

## Before the app stores

- **Host the API:** deploy `frontend/` (for example to Vercel) and set `EXPO_PUBLIC_API_URL` to its HTTPS address for production builds.
- **Identity:** `app.json` uses the placeholder bundle ID and package `com.resudog.app`. Change these to identifiers you own before your first build.
- **Brand assets:** the app icon and splash screen are still the Expo defaults.
- **Accounts:** you need an Apple Developer account ($99/yr) and a Google Play Console account ($25 once).
- **Build and submit:** use EAS: `npx eas-cli@latest build` then `npx eas-cli@latest submit`.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
