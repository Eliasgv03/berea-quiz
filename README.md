# Berea

Berea is an offline-first Bible quiz application focused on careful Scripture study. The project currently includes a large Spanish question bank for Genesis, with support for filtering by difficulty and category, local progress tracking, explanations after each answer, and a mobile app experience built with Expo.

The codebase is organized as a monorepo so the backend, web prototype, and mobile application can evolve together.

## Project Structure

```text
backend/   Python API prototype and canonical question tooling
frontend/  Next.js web prototype
mobile/    Expo React Native mobile app
```

## Features

- Spanish Bible quiz experience with accented, polished copy.
- Question feedback with context, explanation, and Bible reference.
- Randomized answer order on every round.
- Filters for book, difficulty, and category.
- Local statistics stored on device with AsyncStorage.
- Light and dark themes.
- Offline-ready mobile question data bundled inside the app.
- EAS Build configuration for Android APK and production app bundle builds.

## Mobile App

The mobile app is the main experience.

### Requirements

- Node.js 20+
- npm
- Expo CLI through `npx expo`
- EAS CLI for cloud builds:

```powershell
npm install -g eas-cli
```

### Install

```powershell
cd mobile
npm install
```

### Run Locally

Run in the browser:

```powershell
cd mobile
npx expo start --web
```

Run on a physical phone with Expo Go:

```powershell
cd mobile
npx expo start --tunnel -c
```

Then scan the QR code with Expo Go. Pressing `a` requires Android Studio and a configured Android SDK.

### Validate

```powershell
cd mobile
npx tsc --noEmit
npx expo-doctor
npx expo export:embed --eager --platform android --dev false
```

### Build Android APK

The `preview` EAS profile generates an APK that can be downloaded and installed manually.

```powershell
cd mobile
eas build -p android --profile preview --clear-cache
```

After the build finishes, open the EAS build URL and download the APK artifact.

## Web Prototype

```powershell
cd frontend
npm install
npm run dev
```

The web prototype runs at `http://localhost:3000`.

## Backend Prototype

```powershell
python backend/server.py
```

The Python API runs at `http://localhost:8000`.

Available endpoints:

- `GET /api/questions`
- `GET /api/scoreboard`
- `POST /api/scoreboard`

## Question Data

The canonical question set lives in the backend and is mirrored into the mobile app as bundled JSON files under:

```text
mobile/src/data/genesis/
```

The app currently ships Genesis questions split by category:

- Events
- Places
- Memory
- People
- Theology

More books can be added later by introducing new data folders and wiring them into the book filter.
