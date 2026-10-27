# VibeTube Video Discovery

Build a complete, production-ready video discovery application called VibeTube, inspired by SnapTube.



The project must support both a responsive website and an installable Android application.



TECHNOLOGY:



- React

- TypeScript

- Tailwind CSS

- Supabase for authentication and database storage

- YouTube Data API v3 for video discovery

- Official YouTube embedded player for playback

- Capacitor for Android packaging

- Vercel for website deployment



DESIGN:

Create a premium mobile-first interface using black backgrounds, red accents, modern typography, rounded video thumbnails, and smooth animations.



PAGES:



1. Home

2. Search

3. Trending

4. Music

5. Categories

6. Video Player

7. Downloads

8. Favorites

9. Watch History

10. Profile

11. Settings



YOUTUBE INTEGRATION:



- Search for real YouTube videos.

- Display actual video titles, thumbnails, and channel information.

- Use the official YouTube embedded player.

- Include related videos where permitted.

- Handle API quotas and errors.

- Follow YouTube API policies and playback requirements.



VIDEO PLAYER:



- Display the video player at the top.

- Show title, channel, and description.

- Include Like, Favorite, Share, and Download actions.

- Display related videos underneath.



DOWNLOAD MANAGER:



- Support actual downloads of video files that the app owns or is authorized to distribute.

- Offer 360p, 480p, 720p, and 1080p only when the authorized source provides those versions.

- Display progress, file size, and download status.

- Allow pausing, resuming, cancelling, and deleting downloads where supported.

- Support offline playback of completed downloads.

- Save files using appropriate Android storage APIs.

- Never scrape YouTube or extract, convert, or download YouTube audiovisual streams without authorization.

- Clearly explain when a video cannot be downloaded.



ANDROID:



- Configure the project for Capacitor.

- Prepare Android-specific download and file-storage functionality.

- Handle Android permissions correctly.

- Make navigation and touch interactions work smoothly.

- Support an installable Android build.



WEBSITE:



- Make every page responsive on desktop and mobile.

- Prepare the app for Vercel deployment.

- Support installation as a Progressive Web App where appropriate.

- Ensure that browser downloads work for authorized files.



SECURITY:



- Protect API credentials.

- Use secure backend functions where needed.

- Configure Supabase authentication and access policies.

- Never expose service-role keys in frontend code.



IMPLEMENTATION:

Build the project in stages.

First, implement the interface and navigation.

Then integrate YouTube search and playback.

Then implement authentication, favorites, history, and authorized downloads.

Finally, prepare the Android build and website deployment.



Do not use fake functionality or claim that a feature works until it has been implemented and tested.

Preserve existing project functionality when making updates.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a436e78e-15fb-4b48-9b0d-b8b6cfde88e9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```


## Environment configuration

Copy `.env.example` to `.env` and fill in the project-specific values. The repository's `.env` is intentionally ignored by Git; never commit real secrets.

Required server values:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose it through a `VITE_` variable
- `YOUTUBE_API_KEY` — server-only YouTube Data API v3 key

The browser also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A Supabase publishable key is designed for public client use; row-level security remains essential.

## Supabase setup

Apply `drizzle/migrations/0000_vibetube_core_schema.sql` to the connected Supabase project's SQL editor or migration workflow; it creates the **private** Storage bucket named `authorized-media`. Only trusted administrators should add records to `public.authorized_media` and upload the matching licensed media. The app intentionally refuses downloads for ordinary YouTube videos.

## Android

See [ANDROID-SETUP.md](./ANDROID-SETUP.md). The Capacitor shell loads the deployed HTTPS site because YouTube discovery and authenticated data use server-side functions. Native Android file storage/background downloads are not yet complete.

## Verified status

See [roadmap.md](./roadmap.md) for the implementation checklist and external setup still required. A source-code feature is not considered production-verified until it has been tested with the real Supabase project, API credentials and target devices.
