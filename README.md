# Gym Tracker

Cross-platform workout app for **iPhone** and **Android** (Expo / React Native).

**Product vision:** see [PRODUCT.md](./PRODUCT.md).

## Core loop

1. **Create / pick exercises** (library + custom)
2. **Log sets, reps, weight** in a session
3. **See growth over time** (volume, best load, session history)
4. **Occasional progression tips** after ~10 sessions of the same exercise within 3 months
5. **Same-muscle alternatives** if you dislike a machine/exercise

## Project path

```
H:\Programmering med Grok\Gym\gym-app
```

## Run

```powershell
cd "H:\Programmering med Grok\Gym\gym-app"
npm start
```

Install **Expo Go** on your phone and scan the QR code (same Wi‑Fi).

| Command | Purpose |
|---------|---------|
| `npm start` | Dev server + QR for phones |
| `npm run web` | Browser preview |
| `npm run android` | Android emulator |
| `npm run ios` | iOS (macOS only) |

## App map

| Area | Path |
|------|------|
| Home + tips | `app/(tabs)/index.tsx` |
| Growth list | `app/(tabs)/progress.tsx` |
| Exercise detail / alternatives | `app/exercise/[id].tsx` |
| Live logging | `app/workout/active.tsx` |
| Progress math | `lib/progress.ts` |
| Suggestions engine | `lib/suggestions.ts` |
| Product spec | `PRODUCT.md` |

## Data

Everything is stored **locally on device** (AsyncStorage). No account required for core features.
