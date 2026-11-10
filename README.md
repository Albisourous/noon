# Sleeple

Daily sleep-score check-in app. HealthKit → score → friends leaderboard.
See `DESIGN.md` for the system design.

## Layout

- `mobile/` — Expo + React Native (iOS) app

## Backend

None yet — the app runs local-only: HealthKit → on-device scoring →
AsyncStorage. Friends/board data is placeholder demo data.

## Run the app

```bash
cd mobile
npx expo run:ios   # first build: prebuilds ios/, installs pods, compiles
npx expo start     # subsequent dev sessions
```

HealthKit requires a dev build — Expo Go will NOT work.

## Check-in flow

App opens → local noon reminder scheduled → "Check in" reads the most
recent completed sleep session from HealthKit → score computed on-device
→ persisted in AsyncStorage → board shows you + placeholder friends for
your local wake date.
