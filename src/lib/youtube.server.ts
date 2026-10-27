/**
 * Worker-safe YouTube Data API v3 helpers.
 * All calls happen inside server-function handlers; the API key never leaves the server.
 */

const YT_BASE = "https://www.googleapis.com/youtube/v3";

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnail: string;
  duration: string; // ISO 8601, e.g. PT4M13S
  views: number;
  likes: number;
  publishedAt: string;
  tags?: string[];
};

export class YouTubeError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

type CacheEntry = { expires: number; data: unknown };

// In-memory cache (per worker instance) keeps quota spend low on repeat visits.
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;

export function clearYouTubeCache() {
  cache.clear();
}

export async function ytFetch<T>(
  path: string,
  params: Record<string, string | undefined>,
  ttlMs: number = CACHE_TTL_MS,
): Promise<T> {
  const apiKey = process.env["YOUTUBE_API_KEY"];
  if (!apiKey) {
    throw new YouTubeError(
      "The video service is not configured yet. A YouTube Data API key is needed to load real videos.",
      "NO_API_KEY",
    );
  }

  const url = new URL(`${YT_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  url.searchParams.set("key", apiKey);

  const cacheKey = url.toString();
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    return hit.data as T;
  }

  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  let res: Response;
  try {
    res = await fetch(cacheKey, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new YouTubeError("Could not reach the video service. Check your connection and try again.", "NETWORK");
  }

  if (!res.ok) {
    let reason = "";
    let message = res.statusText;
    try {
      const body = (await res.json()) as {
        error?: { message?: string; errors?: { reason?: string }[] };
      };
      reason = body.error?.errors?.[0]?.reason ?? "";
      message = body.error?.message ?? message;
    } catch {
      // keep defaults
    }
    if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
      throw new YouTubeError(
        "Today's YouTube quota has been used up. Discovery refreshes automatically once the quota resets at midnight Pacific Time.",
        "QUOTA_EXCEEDED",
      );
    }
    if (reason === "keyInvalid" || reason === "API_KEY_INVALID" || res.status === 403) {
      throw new YouTubeError(
        "The video service rejected the request. Double-check the YouTube API key and that YouTube Data API v3 is enabled.",
        "KEY_INVALID",
      );
    }
    throw new YouTubeError(`The video service returned an error (${res.status}). Please try again.`, "API_ERROR");
  }

  const data = (await res.json()) as T;
  cache.set(cacheKey, { expires: Date.now() + ttlMs, data });
  return data;
}

export type YtVideoResource = {
  id: string | { videoId?: string };
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    tags?: string[];
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
  statistics?: { viewCount?: string; likeCount?: string };
  contentDetails?: { duration?: string };
};

export function mapVideo(item: YtVideoResource): VideoItem | null {
  const id = typeof item.id === "string" ? item.id : item.id?.videoId;
  const snippet = item.snippet;
  if (!id || !snippet) return null;
  const thumbs = snippet.thumbnails ?? {};
  const thumbnail =
    thumbs.maxres?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? "";
  return {
    id,
    title: snippet.title ?? "Untitled",
    description: snippet.description ?? "",
    channelId: snippet.channelId ?? "",
    channelTitle: snippet.channelTitle ?? "",
    thumbnail,
    duration: item.contentDetails?.duration ?? "",
    views: Number(item.statistics?.viewCount ?? 0),
    likes: Number(item.statistics?.likeCount ?? 0),
    publishedAt: snippet.publishedAt ?? "",
    tags: snippet.tags,
  };
}

export function mapSearchIds(items: YtVideoResource[]): string[] {
  return items
    .map((i) => (typeof i.id === "string" ? i.id : i.id?.videoId))
    .filter((id): id is string => Boolean(id));
}

export async function hydrateVideos(ids: string[]): Promise<VideoItem[]> {
  if (ids.length === 0) return [];
  const data = await ytFetch<{ items?: YtVideoResource[] }>("videos", {
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    maxResults: String(Math.min(ids.length, 50)),
  });
  return (data.items ?? []).map(mapVideo).filter((v): v is VideoItem => v !== null);
}

export type VideoPage = { items: VideoItem[]; nextPageToken?: string; totalResults?: number };
