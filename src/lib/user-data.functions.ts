import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Authenticated server functions for favorites, history, downloads and profile. */

const videoMeta = z.object({
  videoId: z.string().min(1).max(64),
  title: z.string().min(1).max(300),
  channelId: z.string().max(64).optional(),
  channelTitle: z.string().min(1).max(200),
  thumbnailUrl: z.string().url().max(500).optional(),
  duration: z.string().max(16).optional(),
});

export type VideoMeta = z.infer<typeof videoMeta>;

export type FavoriteRow = {
  id: string;
  video_id: string;
  title: string;
  channel_id: string | null;
  channel_title: string;
  thumbnail_url: string | null;
  duration: string | null;
  created_at: string;
};

export type HistoryRow = FavoriteRow & { watched_at: string };

export type DownloadRow = {
  id: string;
  video_id: string;
  title: string;
  channel_title: string | null;
  thumbnail_url: string | null;
  quality: string;
  file_size_bytes: number | null;
  status: "queued" | "downloading" | "paused" | "completed" | "failed" | "cancelled";
  progress: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type DownloadQualityOption = { quality: string; fileSizeBytes: number | null };

// ---------- Profile ----------

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, settings, created_at")
      .eq("id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { username?: string; displayName?: string; avatarUrl?: string }) =>
      z
        .object({
          username: z
            .string()
            .regex(/^[a-z0-9_]{3,24}$/, "Use 3-24 lowercase letters, numbers or underscores")
            .optional(),
          displayName: z.string().min(1).max(60).optional(),
          avatarUrl: z.string().url().max(500).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, string> = {};
    if (data.username !== undefined) patch.username = data.username;
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;
    if (Object.keys(patch).length === 0) return true;
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) {
      if (error.code === "23505") throw new Error("That username is already taken.");
      throw new Error(error.message);
    }
    return true;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { settings: Record<string, unknown> }) =>
    z.object({ settings: z.record(z.string(), z.unknown()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Merge the provided keys into the existing settings object.
    const { data: current } = await context.supabase
      .from("profiles")
      .select("settings")
      .eq("id", context.userId)
      .single();
    const merged = { ...(current?.settings ?? {}), ...data.settings };
    const { error } = await context.supabase
      .from("profiles")
      .update({ settings: merged })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return merged;
  });

// ---------- Favorites ----------

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorites")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FavoriteRow[];
  });

export const isFavorite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { videoId: string }) => z.object({ videoId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("video_id", data.videoId);
    return (count ?? 0) > 0;
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { video: VideoMeta }) => z.object({ video: videoMeta }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("favorites").upsert(
      {
        user_id: context.userId,
        video_id: data.video.videoId,
        title: data.video.title,
        channel_id: data.video.channelId ?? null,
        channel_title: data.video.channelTitle,
        thumbnail_url: data.video.thumbnailUrl ?? null,
        duration: data.video.duration ?? null,
      },
      { onConflict: "user_id,video_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
    return true;
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { videoId: string }) => z.object({ videoId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("video_id", data.videoId);
    if (error) throw new Error(error.message);
    return true;
  });

// ---------- Watch history ----------

export const recordWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { video: VideoMeta }) => z.object({ video: videoMeta }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("watch_history").upsert(
      {
        user_id: context.userId,
        video_id: data.video.videoId,
        title: data.video.title,
        channel_id: data.video.channelId ?? null,
        channel_title: data.video.channelTitle,
        thumbnail_url: data.video.thumbnailUrl ?? null,
        duration: data.video.duration ?? null,
        watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,video_id" },
    );
    if (error) throw new Error(error.message);
    return true;
  });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("watch_history")
      .select("*")
      .eq("user_id", context.userId)
      .order("watched_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as HistoryRow[];
  });

export const removeHistoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { videoId: string }) => z.object({ videoId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("watch_history")
      .delete()
      .eq("user_id", context.userId)
      .eq("video_id", data.videoId);
    if (error) throw new Error(error.message);
    return true;
  });

export const clearHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("watch_history").delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return true;
  });

// ---------- Downloads ----------

export const listDownloads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("downloads")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DownloadRow[];
  });

export const createDownloadRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { video: VideoMeta; quality: string }) =>
    z.object({ video: videoMeta, quality: z.string().min(1).max(8) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("downloads")
      .insert({
        user_id: context.userId,
        video_id: data.video.videoId,
        title: data.video.title,
        channel_title: data.video.channelTitle,
        thumbnail_url: data.video.thumbnailUrl ?? null,
        quality: data.quality,
        status: "downloading",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row.id as string;
  });

export const updateDownloadRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; status?: DownloadRow["status"]; progress?: number; fileSizeBytes?: number; error?: string }) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["queued", "downloading", "paused", "completed", "failed", "cancelled"]).optional(),
          progress: z.number().int().min(0).max(100).optional(),
          fileSizeBytes: z.number().int().min(0).optional(),
          error: z.string().max(500).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.progress !== undefined) patch.progress = data.progress;
    if (data.fileSizeBytes !== undefined) patch.file_size_bytes = data.fileSizeBytes;
    if (data.error !== undefined) patch.error = data.error;
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    if (Object.keys(patch).length === 0) return true;
    const { error } = await context.supabase
      .from("downloads")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return true;
  });

export const removeDownloadRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("downloads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return true;
  });

export type DownloadOptionsResult = {
  authorized: boolean;
  title?: string;
  options: DownloadQualityOption[];
};

/**
 * Returns the quality options for a video ONLY when it is on the app's
 * authorized-media allowlist. Unauthorized videos (e.g. general YouTube
 * content) return authorized: false and the UI explains why downloading
 * isn't possible.
 */
export const getDownloadOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { videoId: string }) => z.object({ videoId: z.string().max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    // Verify the caller is authenticated first, then use the privileged client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: media, error } = await supabaseAdmin
      .from("authorized_media")
      .select("title, storage_paths, file_sizes, is_active")
      .eq("video_id", data.videoId)
      .single();
    if (error || !media || !media.is_active) {
      return { authorized: false, options: [] as DownloadQualityOption[] };
    }
    const sizes = (media.file_sizes ?? {}) as Record<string, number>;
    const options = Object.keys((media.storage_paths ?? {}) as Record<string, string>).map((quality) => ({
      quality,
      fileSizeBytes: sizes[quality] ?? null,
    }));
    void context.userId;
    return {
      authorized: true,
      title: media.title,
      options: options.sort((a, b) => parseInt(a.quality) - parseInt(b.quality)),
    };
  });

/** Short-lived signed URL for an authorized file (never exposes storage paths). */
export const getDownloadFileUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { videoId: string; quality: string }) =>
    z.object({ videoId: z.string().max(64), quality: z.string().max(8) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: media, error } = await supabaseAdmin
      .from("authorized_media")
      .select("storage_paths, is_active")
      .eq("video_id", data.videoId)
      .single();
    if (error || !media || !media.is_active) throw new Error("This video is not available for download.");
    const paths = (media.storage_paths ?? {}) as Record<string, string>;
    const path = paths[data.quality];
    if (!path) throw new Error("That quality is not available for this video.");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("authorized-media")
      .createSignedUrl(path, 120, { download: true });
    if (signError || !signed) throw new Error("Could not prepare the download. Please try again.");
    return signed.signedUrl;
  });

