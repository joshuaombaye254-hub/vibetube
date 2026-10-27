import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import type { VideoItem } from "@/lib/youtube.server";
import { Play, X } from "lucide-react";

const cardVariants = cva("group no-tap-highlight relative", {
  variants: {
    variant: {
      grid: "flex flex-col",
      row: "flex gap-3 sm:gap-4",
      compact: "flex gap-2",
    },
  },
  defaultVariants: { variant: "grid" },
});

export type VideoCardProps = VariantProps<typeof cardVariants> & {
  video: Pick<VideoItem, "id" | "title" | "channelTitle" | "thumbnail" | "duration" | "views" | "publishedAt">;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
};

function Thumb({ video, className }: { video: VideoCardProps["video"]; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted",
        "aspect-video w-full shrink-0",
        className,
      )}
    >
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
      ) : null}
      {video.duration ? (
        <span className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          {formatDuration(video.duration)}
        </span>
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary shadow-glow">
          <Play className="h-5 w-5 translate-x-[1px] fill-primary-foreground text-primary-foreground" />
        </span>
      </div>
    </div>
  );
}

export function VideoCard({ video, variant, onRemove, removeLabel, className }: VideoCardProps) {
  const to = "/watch/$videoId";
  const meta = (
    <div className="min-w-0">
      <Link
        to={to}
        params={{ videoId: video.id }}
        className="line-clamp-2 font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
      >
        {video.title}
      </Link>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        {video.channelTitle}
        {video.views ? ` · ${formatViews(video.views)}` : ""}
      </p>
      {video.publishedAt ? (
        <p className="text-xs text-muted-foreground/70">{timeAgo(video.publishedAt)}</p>
      ) : null}
    </div>
  );

  const removeButton = onRemove ? (
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel ?? "Remove"}
      className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <X className="h-4 w-4" />
    </button>
  ) : null;

  if (variant === "row" || variant === "compact") {
    return (
      <div className={cn(cardVariants({ variant }), className)}>
        <Link to={to} params={{ videoId: video.id }} className="w-[168px] shrink-0 sm:w-[240px]">
          <Thumb video={video} />
        </Link>
        <div className="relative min-w-0 flex-1 pt-0.5">
          {removeButton}
          {meta}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(cardVariants({ variant }), className)}>
      {removeButton}
      <Link to={to} params={{ videoId: video.id }}>
        <Thumb video={video} />
      </Link>
      <div className="mt-2.5">{meta}</div>
    </div>
  );
}

export function VideoCardSkeleton({ variant = "grid" }: { variant?: "grid" | "row" }) {
  if (variant === "row") {
    return (
      <div className="flex gap-3 sm:gap-4">
        <div className="skeleton-shimmer aspect-video w-[168px] shrink-0 rounded-xl sm:w-[240px]" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
          <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
          <div className="skeleton-shimmer h-3 w-1/3 rounded-md" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <div className="skeleton-shimmer aspect-video w-full rounded-xl" />
      <div className="mt-2.5 space-y-2">
        <div className="skeleton-shimmer h-4 w-5/6 rounded-md" />
        <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
      </div>
    </div>
  );
}
