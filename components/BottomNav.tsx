"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  films: <path d="M3 4h18v16H3zM8 4v16M16 4v16M3 12h18" />,
  schedule: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" />,
  food: (
    <path
      d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10M17 3c-1.5 2-2 4-2 6h4c0-2-.5-4-2-6zM17 9v12"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

const TABS: { key: keyof typeof ICONS; label: string; href: (t: string) => string }[] = [
  { key: "home", label: "홈", href: (t) => `/s/${t}` },
  { key: "films", label: "상영작", href: (t) => `/s/${t}/films` },
  { key: "schedule", label: "시간표", href: (t) => `/s/${t}/schedule` },
  { key: "food", label: "맛집", href: (t) => `/s/${t}/food` },
];

export function BottomNav({ token }: { token: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-white/95 pt-2 backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)]">
      {TABS.map((tab) => {
        const href = tab.href(token);
        const active = href === `/s/${token}` ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            className={`flex flex-col items-center gap-1 pb-2 ${
              active ? "text-biff-red" : "text-icon-muted"
            }`}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              {ICONS[tab.key]}
            </svg>
            <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
