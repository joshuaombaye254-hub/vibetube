# Android setup

VibeTube's web application uses server-side functions for YouTube Data API requests and Supabase account data. The Capacitor Android shell therefore loads the deployed HTTPS VibeTube site; it is not a self-contained offline copy of the server.

## Requirements

- Node.js 22 or newer
- Android Studio with an installed Android SDK
- A deployed VibeTube site using HTTPS
- The server environment configured as described in `.env.example`

## Configure the Android shell

1. Install dependencies with `npm install`.
2. Build the web application with `npm run build`.
3. Set `CAPACITOR_SERVER_URL` to the deployed VibeTube HTTPS URL in your local environment. Do not commit a real production URL if it is private.
4. Add the Android platform once: `npm run cap:add:android`.
5. Sync the project: `npm run cap:sync`.
6. Open Android Studio: `npm run cap:open`.
7. Select a device or emulator and run the app.

For example, in PowerShell:

```powershell
$env:CAPACITOR_SERVER_URL = "https://your-vibetube-domain.example"
npm run build
npm run cap:add:android
npm run cap:sync
npm run cap:open
```

Use your real deployed domain instead of the example URL. Keep HTTPS enabled; cleartext traffic is disabled in the Capacitor configuration.

## Release checklist

- Confirm the deployed site is accessible from the Android device.
- Confirm Supabase redirect URLs include the production site and the app's authentication return flow.
- Test sign-up, email confirmation, sign-in, password reset, favorites, history and sign-out on a physical device.
- Test offline files using media VibeTube owns or is licensed to distribute. YouTube videos remain embedded and cannot be downloaded by VibeTube.
- Replace the default app icon and splash assets with final brand-approved assets if needed.
- Review Android permissions and the Google Play Data safety declaration before publishing.

## Current limitation

The current download manager stores authorized media in browser IndexedDB. Native Android Filesystem integration and long-running background downloads have not been implemented or device-tested yet. Do not advertise native background downloads as supported until that work is completed.
