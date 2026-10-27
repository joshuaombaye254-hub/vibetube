# VibeTube — implementation status

This document distinguishes source-code presence from verified production readiness. A checkbox is marked complete only where the corresponding code exists; runtime and deployment checks still require the project's external credentials and target environment.

## Stage 1 — Interface and navigation
- [x] Dark interface with red accent tokens
- [x] Shared app shell with desktop sidebar and mobile bottom navigation
- [x] Routes: Home, Search, Trending, Music, Categories, Watch, Downloads, Favorites, History, Profile, Settings, Auth and Reset Password
- [x] App icons and web app manifest
- [ ] End-to-end responsive and accessibility testing on real devices

## Stage 2 — YouTube integration
- [x] Server-side YouTube Data API v3 helpers; API key is not exposed to browser code
- [x] Search, most-popular charts, music category, category listings, video details and keyword-based related videos
- [x] Official YouTube privacy-enhanced embedded player
- [x] Five-minute in-memory response cache and quota-aware error messages
- [ ] Configure `YOUTUBE_API_KEY` in the deployment environment
- [ ] Verify quota, regional results and playback on the deployed domain

## Stage 3 — Accounts, library and authorized downloads
- [x] Supabase email/password sign-up, sign-in and password reset UI
- [x] Server-side authenticated profile, favorites, watch history and download-record functions
- [x] SQL migration for profiles, favorites, history, downloads, row-level security and the private authorized-media allowlist
- [x] Signed URLs are issued only for active allowlisted media
- [x] YouTube video downloads are blocked with an explanation
- [x] Browser download manager and IndexedDB offline playback implementation
- [ ] Apply the SQL migration to the connected Supabase project and verify RLS policies
- [ ] Configure `SUPABASE_SERVICE_ROLE_KEY` server-side for signed authorized-media delivery
- [ ] Upload licensed media to the private `authorized-media` storage bucket and populate the allowlist through trusted admin tooling
- [ ] Test download resume, cancellation, storage limits and offline playback across browsers

## Stage 4 — Android and deployment
- [x] Capacitor project configuration and Android setup guide
- [x] Android package scripts and dependencies declared
- [ ] Install dependencies and generate the native Android platform
- [ ] Configure a production HTTPS `CAPACITOR_SERVER_URL`
- [ ] Implement native Android Filesystem storage and background download handling
- [ ] Test Android authentication redirects, device storage and playback on physical devices
- [ ] Complete production deployment, security review and release validation

## External setup required

The repository cannot supply project secrets or deploy itself. Before live discovery works, configure `YOUTUBE_API_KEY`. Before authenticated features work, configure Supabase URL and publishable key, apply the SQL migration, and configure the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never put service-role or YouTube API secrets in `VITE_` variables or commit them.

## Policy boundary

Downloads are restricted to VibeTube-owned or explicitly licensed files in the private allowlist. YouTube audiovisual streams must not be scraped, extracted, converted or downloaded. YouTube playback uses the official embedded player.
