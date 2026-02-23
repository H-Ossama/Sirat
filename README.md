# Sirat

Sirat is a mobile-first Islamic companion application focused on daily worship, prayer support, Quran reading, adhkar, duas, hadith, and personal progress tracking.

This repository contains the active app built with React, TypeScript, Vite, and Capacitor for Android deployment.

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Capacitor 7 (Android)
- Tailwind CSS 4

## Project Structure

- `app/`: Active web + Android (Capacitor) application
- `app/src/`: Frontend source code (screens, components, services, hooks)
- `app/android/`: Native Android project generated and managed through Capacitor
- `OLD_APP/`: Legacy Flutter codebase kept for reference only

## Core Features

- Daily prayer experience and worship-focused home screen
- Quran reading with tafsir integration
- Hadith browsing and sharing
- Duas and adhkar collections
- Tasbih tools and religious utilities (calendar, qibla, zakat)
- User progress elements (deeds, garden, badges, streaks)
- Android widgets and deep-link based navigation

## Prerequisites

Before running the project, ensure the following are installed:

- Node.js 20+
- npm 10+
- Android Studio (for Android SDK and emulator/device tools)
- Java 17 (recommended for modern Android Gradle setups)

## Local Development

From the repository root:

```bash
cd app
npm install
npm run dev
```

The Vite dev server runs the web app locally.

## Build and Android Sync

To build the web bundle and sync native Android assets:

```bash
cd app
npm run build
npx cap sync android
```

You can also use the provided scripts:

```bash
npm run cap:sync
npm run cap:run
```

## Run on Android

```bash
cd app
npx cap run android
```

This command builds and deploys to a connected device or emulator (based on your local Capacitor and Android tooling state).

## Environment Variables

Application secrets and runtime keys should be managed through `.env` files in `app/`.

Currently referenced:

- `VITE_YOUTUBE_API_KEY`

Do not commit real secrets.

## Versioning

- Android system version is defined in `app/android/app/build.gradle` via `versionName`.
- In-app About version label is defined in `app/src/components/SettingsScreen.tsx`.

Keep both aligned for consistent user-facing version information.

## Release Notes

For distribution outside Google Play, publish signed APKs through GitHub Releases and implement in-app update prompts that point users directly to the latest release asset.

## Contributing

1. Create a feature branch from `main`.
2. Keep changes focused and documented.
3. Run build checks before opening a pull request.
4. Use clear commit messages.

## License

No license file is currently defined in this repository. Add one if you plan to open-source the project publicly.
