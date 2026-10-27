# VibeTube — YouTube Data API setup

The YouTube Data API v3 integration is implemented in `src/lib/youtube.server.ts` and
`src/lib/youtube.functions.ts`. The API key is read only on the server using
`process.env.YOUTUBE_API_KEY`; it must never be added to a `VITE_` variable or browser code.

## 1. Create a fresh key

If an API key has been pasted into a chat, issue a replacement in Google Cloud Console
before using it. Enable **YouTube Data API v3** and restrict the key to that API.

## 2. Local development

Copy `.env.example` to `.env` and set the real key in the local `.env` file:

```env
YOUTUBE_API_KEY=your_new_key_here
```

`.env` is ignored by Git and is not included in the source ZIP. Do not commit it or paste
the key into source files.

Install dependencies and start the app:

```bash
npm install
npm run dev
```

## 3. Production deployment

In the hosting provider's server-side environment/secrets settings, add:

- Name: `YOUTUBE_API_KEY`
- Value: the replacement Google API key

Redeploy after saving the secret. Do not use `VITE_YOUTUBE_API_KEY`, because `VITE_`
variables are exposed to browser bundles.

## 4. What the integration supports

- Public video search
- Most-popular/trending videos (default region: Kenya / `KE`)
- Music discovery (YouTube category 10)
- Category discovery
- Video detail lookup and related-video search
- Official YouTube embedded playback in the browser

Search is more quota-expensive than listing popular videos. The server code caches repeat
requests and caps page sizes at 50 results. Google Cloud Console shows the project's current
quota and usage.

## 5. Important limits

The API key only provides access to public YouTube Data API information. It does not grant
permission to download YouTube audiovisual streams. VibeTube must use the official YouTube
player for YouTube playback and offer downloads only for files VibeTube owns or is authorized
to distribute.
