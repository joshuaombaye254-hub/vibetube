import { saveOfflineFile, offlineKey } from "./offline-store";

/**
 * Client-side download engine for AUTHORIZED files only.
 * Streams the file with progress, supports pause (abort keeping bytes),
 * resume (HTTP Range), cancel and delete. Completed files are stored in
 * IndexedDB for offline playback.
 */

export type EngineStatus = "downloading" | "paused" | "completed" | "failed" | "cancelled";

export type EngineState = {
  id: string;
  videoId: string;
  quality: string;
  received: number;
  total: number | null;
  status: EngineStatus;
  error?: string;
};

type StartOptions = {
  id: string;
  videoId: string;
  quality: string;
  url: string;
  expectedSize?: number | null;
  onPersist?: (state: EngineState) => void;
};

const states = new Map<string, EngineState>();
const controllers = new Map<string, AbortController>();
const buffers = new Map<string, BlobPart[]>();
const pausedFlags = new Set<string>();

let listeners: ((snapshot: EngineState[]) => void)[] = [];

function notify() {
  const snapshot = [...states.values()];
  for (const fn of listeners) fn(snapshot);
}

export function subscribeEngine(fn: (snapshot: EngineState[]) => void): () => void {
  listeners.push(fn);
  fn([...states.values()]);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getEngineState(id: string): EngineState | undefined {
  return states.get(id);
}

export function startDownload(opts: StartOptions): void {
  void runDownload(opts, false);
}

export function resumeDownload(opts: StartOptions): void {
  void runDownload(opts, true);
}

async function runDownload(opts: StartOptions, resume: boolean): Promise<void> {
  const { id, videoId, quality, url, expectedSize, onPersist } = opts;

  // Stop any existing attempt for this record.
  controllers.get(id)?.abort();
  controllers.delete(id);

  const prior = states.get(id);
  const carry = resume && prior?.status === "paused" ? prior.received : 0;

  const state: EngineState = {
    id,
    videoId,
    quality,
    received: carry,
    total: expectedSize ?? prior?.total ?? null,
    status: "downloading",
  };
  states.set(id, state);
  notify();

  const controller = new AbortController();
  controllers.set(id, controller);

  try {
    const headers: Record<string, string> = {};
    if (carry > 0) headers["Range"] = `bytes=${carry}-`;

    const res = await fetch(url, { signal: controller.signal, headers });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }
    if (carry > 0 && res.status === 200) {
      // Server ignored the Range request; start over cleanly.
      buffers.set(id, []);
      state.received = 0;
    }
    const length = res.headers.get("Content-Length");
    state.total = carry > 0 && res.status === 206 ? (length ? Number(length) + carry : state.total) : length ? Number(length) : state.total;

    if (!buffers.has(id)) buffers.set(id, []);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Streaming is not supported in this browser.");

    let lastNotify = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        buffers.get(id)!.push(value as BlobPart);
        state.received += value.byteLength;
        const now = Date.now();
        if (now - lastNotify > 150) {
          lastNotify = now;
          notify();
        }
      }
    }

    const parts = buffers.get(id) ?? [];
    const blob = new Blob(parts, { type: "video/mp4" });
    buffers.delete(id);
    await saveOfflineFile(offlineKey(videoId, quality), blob);
    state.status = "completed";
    state.received = blob.size;
    state.total = blob.size;
    states.set(id, state);
    notify();
    onPersist?.(state);
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    if (aborted && pausedFlags.has(id)) {
      pausedFlags.delete(id);
      state.status = "paused";
    } else if (aborted) {
      state.status = "cancelled";
      buffers.delete(id);
    } else {
      state.status = "failed";
      state.error = error instanceof Error ? error.message : "Download failed";
      buffers.delete(id);
    }
    states.set(id, state);
    notify();
    onPersist?.(state);
  } finally {
    controllers.delete(id);
  }
}

export function pauseDownload(id: string): void {
  const state = states.get(id);
  if (!state || state.status !== "downloading") return;
  pausedFlags.add(id);
  controllers.get(id)?.abort();
  controllers.delete(id);
  const current = states.get(id)!;
  current.status = "paused";
  states.set(id, current);
  notify();
}

export function cancelDownload(id: string): void {
  pausedFlags.delete(id);
  controllers.get(id)?.abort();
  controllers.delete(id);
  buffers.delete(id);
  const state = states.get(id);
  if (state) {
    state.status = "cancelled";
    states.set(id, state);
  }
  notify();
}

export function forgetDownload(id: string): void {
  pausedFlags.delete(id);
  controllers.get(id)?.abort();
  controllers.delete(id);
  buffers.delete(id);
  states.delete(id);
  notify();
}
