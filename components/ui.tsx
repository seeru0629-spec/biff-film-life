import type { ReactNode } from "react";
import { likeFilm, unlikeFilm } from "@/app/actions";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[14px] border border-border bg-card ${className}`}>{children}</div>
  );
}

export function SectionBadge({
  children,
  tone = "red",
}: {
  children: ReactNode;
  tone?: "red" | "ink" | "yellow" | "blue" | "gray";
}) {
  const tones: Record<string, string> = {
    red: "bg-biff-red-bg text-biff-red-dark",
    ink: "bg-ink-2 text-festival-yellow",
    yellow: "bg-festival-yellow-bg text-festival-yellow-text",
    blue: "bg-watch-blue-bg text-watch-blue",
    gray: "bg-skeleton-2 text-text-muted",
  };
  return (
    <span className={`whitespace-nowrap rounded-[4px] px-1.5 py-1 text-[9.5px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatusDot({ color }: { color: string }) {
  return <span className="inline-block h-[7px] w-[7px] flex-none rounded-full" style={{ background: color }} />;
}

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-border bg-card px-5 py-9 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-skeleton-2">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C4BCB1" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <path d="M3 10h18M8 3v4M16 3v4M12 14v4M10 16h4" />
        </svg>
      </div>
      <div className="mb-1.5 text-[15px] font-bold">{title}</div>
      <div className="mb-4 text-[12.5px] leading-relaxed text-text-faint">{description}</div>
      {ctaLabel && ctaHref ? (
        <a
          href={ctaHref}
          className="inline-flex rounded-[10px] bg-biff-red px-5 py-3 text-[13.5px] font-bold text-white"
        >
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}

export function HeartButton({
  token,
  filmId,
  liked,
  count,
  size = "sm",
}: {
  token: string;
  filmId: string;
  liked: boolean;
  count: number;
  size?: "sm" | "lg";
}) {
  const sizeCls = size === "lg" ? "px-3.5 py-2.5 text-[13px]" : "px-2.5 py-1.5 text-[12px]";
  return (
    <form action={(liked ? unlikeFilm : likeFilm).bind(null, token, filmId)}>
      <button
        className={`flex items-center gap-1 rounded-full font-semibold ${sizeCls} ${
          liked ? "bg-biff-red-bg text-biff-red-dark" : "border border-border-2 bg-card text-text-muted"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s-7.5-4.6-10-9.2C.4 8.4 2 4.5 5.8 4c2.2-.3 4 .9 6.2 3.4C14.2 4.9 16 3.7 18.2 4c3.8.5 5.4 4.4 3.8 7.8C19.5 16.4 12 21 12 21z" />
        </svg>
        {count > 0 && <span className="tabular">{count}</span>}
      </button>
    </form>
  );
}

export function StarDisplay({
  avg,
  count,
  size = "sm",
  showCount = true,
}: {
  avg: number;
  count: number;
  size?: "sm" | "lg";
  showCount?: boolean;
}) {
  if (count === 0) return null;
  const textCls = size === "lg" ? "text-[15px]" : "text-[12px]";
  return (
    <span className={`flex items-center gap-1 font-bold text-[#F2994A] ${textCls}`}>
      <svg width={size === "lg" ? 15 : 12} height={size === "lg" ? 15 : 12} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5l2.9 6.06 6.6.77-4.85 4.63 1.25 6.6L12 17.4l-5.9 3.16 1.25-6.6L2.5 9.33l6.6-.77L12 2.5z" />
      </svg>
      {avg.toFixed(1)}
      {showCount && <span className="font-medium text-text-faint">({count})</span>}
    </span>
  );
}

export function ErrorState({ message = "네트워크 상태를 확인한 뒤 다시 시도해 주세요." }: { message?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-biff-red-border bg-card p-5">
      <span className="mt-1.5 h-[9px] w-[9px] flex-none rounded-full bg-warn-red" />
      <div className="flex-1">
        <div className="mb-1 text-[14px] font-bold">정보를 불러오지 못했어요</div>
        <div className="text-[12.5px] leading-relaxed text-text-muted">{message}</div>
      </div>
    </div>
  );
}
