import { queryOptions } from "@tanstack/react-query";
import {
  getCategoryVideos,
  getMusic,
  getRelatedVideos,
  getTrending,
  getVideoDetails,
  searchVideos,
} from "./youtube.functions";

const STALE = 5 * 60 * 1000;

export const trendingOptions = (categoryId?: string, pageToken?: string) =>
  queryOptions({
    queryKey: ["youtube", "trending", categoryId ?? "all", pageToken ?? ""],
    queryFn: () => getTrending({ data: { categoryId, pageToken } }),
    staleTime: STALE,
  });

export const musicOptions = (pageToken?: string) =>
  queryOptions({
    queryKey: ["youtube", "music", pageToken ?? ""],
    queryFn: () => getMusic({ data: { pageToken } }),
    staleTime: STALE,
  });

export const categoryOptions = (youtubeCategoryId: string, pageToken?: string) =>
  queryOptions({
    queryKey: ["youtube", "category", youtubeCategoryId, pageToken ?? ""],
    queryFn: () => getCategoryVideos({ data: { categoryId: youtubeCategoryId, pageToken } }),
    staleTime: STALE,
  });

export const searchOptions = (q: string, pageToken?: string) =>
  queryOptions({
    queryKey: ["youtube", "search", q, pageToken ?? ""],
    queryFn: () => searchVideos({ data: { q, pageToken } }),
    staleTime: 2 * 60 * 1000,
    enabled: q.trim().length > 0,
  });

export const videoDetailsOptions = (id: string) =>
  queryOptions({
    queryKey: ["youtube", "video", id],
    queryFn: () => getVideoDetails({ data: { id } }),
    staleTime: STALE,
  });

export const relatedOptions = (videoId: string, title: string, channelId?: string) =>
  queryOptions({
    queryKey: ["youtube", "related", videoId],
    queryFn: () => getRelatedVideos({ data: { videoId, title, channelId } }),
    staleTime: 10 * 60 * 1000,
  });

// ---------- Infinite-scroll variants ----------

type PageParam = { pageParam: string };
type Page = { items: unknown[]; nextPageToken?: string };

export const searchInfiniteOptions = (q: string) => ({
  queryKey: ["youtube", "search-infinite", q],
  initialPageParam: "",
  queryFn: ({ pageParam }: PageParam) => searchVideos({ data: { q, pageToken: pageParam || undefined } }),
  getNextPageParam: (last: Page) => last.nextPageToken,
  enabled: q.trim().length > 0,
  staleTime: 2 * 60 * 1000,
});

export const trendingInfiniteOptions = () => ({
  queryKey: ["youtube", "trending-infinite"],
  initialPageParam: "",
  queryFn: ({ pageParam }: PageParam) => getTrending({ data: { pageToken: pageParam || undefined } }),
  getNextPageParam: (last: Page) => last.nextPageToken,
  staleTime: STALE,
});

export const musicInfiniteOptions = () => ({
  queryKey: ["youtube", "music-infinite"],
  initialPageParam: "",
  queryFn: ({ pageParam }: PageParam) => getMusic({ data: { pageToken: pageParam || undefined } }),
  getNextPageParam: (last: Page) => last.nextPageToken,
  staleTime: STALE,
});

export const categoryInfiniteOptions = (youtubeCategoryId: string) => ({
  queryKey: ["youtube", "category-infinite", youtubeCategoryId],
  initialPageParam: "",
  queryFn: ({ pageParam }: PageParam) =>
    getCategoryVideos({ data: { categoryId: youtubeCategoryId, pageToken: pageParam || undefined } }),
  getNextPageParam: (last: Page) => last.nextPageToken,
  staleTime: STALE,
});
