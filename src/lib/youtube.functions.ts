import { createServerFn } from "@tanstack/react-start";
import {
  hydrateVideos,
  mapVideo,
  mapSearchIds,
  ytFetch,
  YouTubeError,
  type VideoPage,
  type VideoItem,
  type YtVideoResource,
} from "./youtube.server";

/**
 * Public, read-only YouTube discovery functions (no auth required):
 * they only surface public YouTube data and hold no secrets in responses.
 */

export type ListInput = { regionCode?: string; categoryId?: string; pageToken?: string; maxResults?: number };

// Keep public server functions bounded: YouTube search costs substantially more quota
// than ordinary reads, and callers must not be able to request unbounded result pages.
function boundedMaxResults(value: number | undefined, fallback: number): string {
  const n = Number.isFinite(value) ? Math.trunc(value as number) : fallback;
  return String(Math.min(50, Math.max(1, n)));
}

function safePageToken(value: string | undefined): string | undefined {
  const token = value?.trim();
  return token && token.length <= 500 ? token : undefined;
}

function safeRegionCode(value: string | undefined): string {
  return value && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : "KE";
}

function safeCategoryId(value: string | undefined): string | undefined {
  return value && /^\d{1,4}$/.test(value) ? value : undefined;
}

async function listPopular(data: ListInput, videoCategoryId?: string): Promise<VideoPage> {
  const res = await ytFetch<{ items?: YtVideoResource[]; nextPageToken?: string; pageInfo?: { totalResults?: number } }>(
    "videos",
    {
      part: "snippet,statistics,contentDetails",
      chart: "mostPopular",
      regionCode: safeRegionCode(data.regionCode),
      videoCategoryId: safeCategoryId(videoCategoryId || data.categoryId),
      maxResults: boundedMaxResults(data.maxResults, 24),
      pageToken: safePageToken(data.pageToken),
    },
  );
  return {
    items: (res.items ?? []).map(mapVideo).filter((v): v is VideoItem => v !== null),
    nextPageToken: res.nextPageToken,
    totalResults: res.pageInfo?.totalResults,
  };
}

export const getTrending = createServerFn({ method: "GET" })
  .inputValidator((input: ListInput | undefined) => input ?? {})
  .handler(async ({ data }) => listPopular(data));

export const getMusic = createServerFn({ method: "GET" })
  .inputValidator((input: ListInput | undefined) => input ?? {})
  .handler(async ({ data }) => listPopular(data, "10"));

export const getCategoryVideos = createServerFn({ method: "GET" })
  .inputValidator((input: ListInput) => {
    if (!input || !safeCategoryId(input.categoryId)) throw new Error("A valid YouTube category is required.");
    return input;
  })
  .handler(async ({ data }) => listPopular(data, data.categoryId));

export const searchVideos = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string; pageToken?: string; maxResults?: number }) => {
    if (!input || typeof input.q !== "string") throw new Error("A search query is required.");
    return {
      q: input.q.slice(0, 100),
      pageToken: safePageToken(input.pageToken),
      maxResults: Number.isFinite(input.maxResults) ? Math.trunc(input.maxResults as number) : 20,
    };
  })
  .handler(async ({ data }) => {
    const q = data.q.trim();
    if (!q) return { items: [] as VideoItem[], nextPageToken: undefined };
    const res = await ytFetch<{ items?: YtVideoResource[]; nextPageToken?: string; pageInfo?: { totalResults?: number } }>(
      "search",
      {
        part: "snippet",
        q,
        type: "video",
        maxResults: boundedMaxResults(data.maxResults, 20),
        pageToken: data.pageToken,
        safeSearch: "moderate",
      },
      2 * 60 * 1000,
    );
    const ids = mapSearchIds(res.items ?? []);
    const items = await hydrateVideos(ids);
    return { items, nextPageToken: res.nextPageToken, totalResults: res.pageInfo?.totalResults };
  });

export const getVideoDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => {
    if (!input || typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{11}$/.test(input.id)) {
      throw new Error("A valid YouTube video ID is required.");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const items = await hydrateVideos([data.id]);
    return items[0] ?? null;
  });

export const getRelatedVideos = createServerFn({ method: "GET" })
  .inputValidator((input: { videoId: string; title: string; channelId?: string }) => {
    if (!input || typeof input.videoId !== "string" || !/^[a-zA-Z0-9_-]{11}$/.test(input.videoId)) {
      throw new Error("A valid YouTube video ID is required.");
    }
    if (typeof input.title !== "string" || !input.title.trim()) throw new Error("A video title is required.");
    return { ...input, title: input.title.slice(0, 200) };
  })
  .handler(async ({ data }) => {
    // YouTube's relatedToVideoId endpoint was deprecated in 2023, so we build
    // a related list from the video's own keywords (API ToS-compliant search).
    const keywords = data.title
      .replace(/[|–—()\[\]{}-]/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^(the|and|for|with|from|official|video|hd|4k)$/i.test(w))
      .slice(0, 6)
      .join(" ");
    const query = keywords || data.title;
    try {
      const res = await ytFetch<{ items?: YtVideoResource[] }>("search", {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: "16",
      }, 10 * 60 * 1000);
      const ids = mapSearchIds(res.items ?? []).filter((id) => id !== data.videoId).slice(0, 12);
      return await hydrateVideos(ids);
    } catch (error) {
      if (error instanceof YouTubeError && error.code === "QUOTA_EXCEEDED") throw error;
      return [] as VideoItem[];
    }
  });
