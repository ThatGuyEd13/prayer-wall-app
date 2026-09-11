# Prayer Wall — running app

A real Expo (React Native) app built from the design handoff in the parent folder. Runs today in a browser (via react-native-web) and is the same codebase you'd build into real iOS/Android apps later.

## Run it

Node is installed locally in `../.tools/node` (not system-wide — nothing was changed outside this project).

```bash
cd app
export PATH="$PWD/../.tools/node/bin:$PATH"
npm run web       # opens at http://localhost:8081, live-reloads on save
```

To try it on an iPhone/Android via Expo Go instead of the browser:

```bash
npx expo start     # scan the QR code with the Expo Go app
```

## What's real vs. still a stand-in

- **Real, persistent data** — accounts, requests, and notifications are stored in the device's local storage (AsyncStorage) and survive reloads/restarts. This is per-device only; it does not sync between phones yet.
- **Real password + PIN hashing** (SHA-256 via `expo-crypto`), not plaintext.
- **SMS one-time codes are simulated** — "Text a code" generates a real 6-digit code and shows it in an on-screen banner instead of texting it, since there's no Twilio account wired up. Swap `requestCode` in `src/store.tsx` for a real Twilio Verify call when you're ready to go live (README in the parent folder recommends Twilio).
- **Account bootstrap**: the very first person to sign up becomes the church owner automatically (instead of hardcoding "Edward"). Whoever should be Rachel signs up next as a Member, and the owner promotes them to Lead pastor from Admin → People → Change. This reproduces the "only two real accounts at launch" rollout plan without baking fictional data into the app.
- **CSV export** downloads in the browser; on a real device build it uses the native share sheet (`expo-sharing`) instead.
- **Billing** is a static placeholder screen (no real Stripe/payment integration).

## Next steps toward production

1. Move `users`/`requests`/`notifications` from AsyncStorage to a real backend (Supabase or Firebase, per the parent README) so data syncs across devices and roles are enforced server-side, not just client-side.
2. Wire `requestCode` to Twilio Verify for real SMS.
3. Build real iOS/Android binaries with `eas build` once you have an Expo/EAS account.
