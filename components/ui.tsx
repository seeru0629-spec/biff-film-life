import type { ReactNode } from "react";

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
