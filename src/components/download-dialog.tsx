import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Pause, Play, ShieldCheck, X } from "lucide-react";
import { getDownloadFileUrl, getDownloadOptions, createDownloadRecord, updateDownloadRecord, type DownloadRow } from "@/lib/user-data.functions";
import { subscribeEngine, startDownload, resumeDownload, pauseDownload, cancelDownload, forgetDownload, type EngineState } from "@/lib/download-engine";
import { formatBytes } from "@/lib/format";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: { videoId: string; title: string; channelTitle: string; thumbnailUrl?: string; duration?: string };
};

export function DownloadDialog({ open, onOpenChange, video }: Props) {
  const queryClient = useQueryClient();
  const [engine, setEngine] = useState<EngineState[]>([]);

  useEffect(() => subscribeEngine(setEngine), []);

  const options = useQuery({
    queryKey: ["download-options", video.videoId],
    queryFn: () => getDownloadOptions({ data: { videoId: video.videoId } }),
    enabled: open,
  });

  const start = useMutation({
    mutationFn: async (quality: string) => {
      // Resolve the allowlisted signed URL first so a failed authorization does
      // not leave a stale "downloading" row in the user's library.
      const url = await getDownloadFileUrl({ data: { videoId: video.videoId, quality } });
      const recordId = await createDownloadRecord({ data: { video, quality } });
      const optionsData = options.data;
      const expectedSize = optionsData?.options.find((o) => o.quality === quality)?.fileSizeBytes ?? null;
      startDownload({
        id: recordId,
        videoId: video.videoId,
        quality,
        url,
        expectedSize,
        onPersist: (state) => {
          void updateDownloadRecord({
            data: {
              id: state.id,
              status: state.status === "completed" ? "completed" : state.status,
              fileSizeBytes: state.status === "completed" ? state.received : undefined,
              error: state.error,
            },
          }).then(() => void queryClient.invalidateQueries({ queryKey: ["downloads"] }));
        },
      });
      return recordId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["downloads"] });
      toast.success("Download started");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not start the download"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border bg-popover p-0">
        <div className="p-6">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold text-foreground">Download</DialogTitle>
            <DialogDescription className="line-clamp-1 text-sm text-muted-foreground">
              {video.title}
            </DialogDescription>
          </DialogHeader>

          {options.isPending ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking download availability…
            </div>
          ) : options.isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {options.error instanceof Error ? options.error.message : "Something went wrong."}
            </p>
          ) : !options.data?.authorized ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/50 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">This video can't be downloaded</p>
                  <p className="mt-1.5 leading-relaxed">
                    VibeTube only offers downloads for videos the app owns or is authorized to distribute. This video
                    streams through the official YouTube player, and its streams can't be copied, converted or
                    extracted.
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70">
                Videos marked as downloadable by VibeTube will show quality options here (360p–1080p as provided by
                the authorized source).
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {options.data.options.map((o) => {
                const active = engine.find((e) => e.videoId === video.videoId && e.quality === o.quality);
                return (
                  <div
                    key={o.quality}
                    className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{o.quality}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.fileSizeBytes ? formatBytes(o.fileSizeBytes) : "MP4 video"}
                        {active ? ` · ${active.status}` : ""}
                      </p>
                    </div>
                    {active ? (
                      <div className="flex items-center gap-2">
                        {active.status === "downloading" ? (
                          <button
                            type="button"
                            aria-label="Pause download"
                            onClick={() => pauseDownload(active.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        ) : active.status === "paused" ? (
                          <button
                            type="button"
                            aria-label="Resume download"
                            onClick={() => {
                              void getDownloadFileUrl({ data: { videoId: video.videoId, quality: o.quality } }).then(
                                (url) =>
                                  resumeDownload({
                                    id: active.id,
                                    videoId: video.videoId,
                                    quality: o.quality,
                                    url,
                                    onPersist: undefined,
                                  }),
                              );
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : null}
                        {active.status === "downloading" || active.status === "paused" ? (
                          <button
                            type="button"
                            aria-label="Cancel download"
                            onClick={() => cancelDownload(active.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-primary">{active.status}</span>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => start.mutate(o.quality)}
                        disabled={start.isPending}
                        className="rounded-full"
                      >
                        {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Download"}
                      </Button>
                    )}
                  </div>
                );
              })}
              {engine.some((e) => e.status === "downloading") ? (
                <div className="pt-1">
                  {engine
                    .filter((e) => e.videoId === video.videoId && e.status === "downloading")
                    .map((e) => (
                      <div key={e.id}>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-primary transition-all"
                            style={{
                              width: e.total ? `${Math.min(100, (e.received / e.total) * 100)}%` : "12%",
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatBytes(e.received)}
                          {e.total ? ` of ${formatBytes(e.total)}` : ""} downloaded
                        </p>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { DownloadRow };
