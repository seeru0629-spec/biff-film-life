"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { fmtTimeRange, fmtMonthDay } from "@/lib/format";
import { weekdayKor } from "@/lib/festival";
import { findTravelWarnings } from "@/lib/travel";
import type { ScreeningWithDetails, VenueTravelTime } from "@/lib/types";

type DayGroup = { date: string; screenings: ScreeningWithDetails[] };

export function SaveImageSheet({
  groups,
  travelMatrix,
}: {
  groups: DayGroup[];
  travelMatrix: VenueTravelTime[];
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"day" | "all">("day");
  const [ratio, setRatio] = useState<"feed" | "story">("feed");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [includeWarnings, setIncludeWarnings] = useState(true);
  const [busy, setBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const isStory = ratio === "story";

  const activeGroups = scope === "day" || isStory ? groups.slice(0, 1) : groups;

  function handleRatio(v: "feed" | "story") {
    setRatio(v);
    if (v === "story") setScope("day");
  }

  async function handleSave() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(exportRef.current, { pixelRatio: 1, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `부국쨈_시간표_${groups[0]?.date ?? "export"}${isStory ? "_9x16" : ""}.png`;
      a.click();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const bg = theme === "dark" ? "#1B1815" : "#FAF8F4";
  const fg = theme === "dark" ? "#ffffff" : "#1B1815";
  const fgDim = theme === "dark" ? "rgba(255,255,255,.55)" : "#6B6259";
  const fgDim2 = theme === "dark" ? "rgba(255,255,255,.35)" : "#8C8378";
  const cardBg = theme === "dark" ? "rgba(255,255,255,.06)" : "#fff";

  return (
    <>
      <div className="fixed inset-x-0 bottom-[82px] z-30 flex gap-2.25 bg-gradient-to-t from-surface via-surface/95 to-transparent px-4 pb-3.5 pt-3.5">
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink-2 py-3.75 text-[14px] font-bold text-white"
        >
          이미지로 저장
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <div className="relative w-full rounded-t-[22px] bg-surface px-4 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9.5 rounded-full bg-border-3" />
            <div className="mb-3.5 text-[17px] font-bold">이미지로 저장</div>

            <div className="mb-4.5 flex gap-3">
              <div className="flex-1 space-y-3">
                <div>
                  <div className="mb-1.75 text-[11px] font-semibold text-text-faint">비율</div>
                  <div className="flex gap-1.5">
                    {(["feed", "story"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => handleRatio(v)}
                        className={`flex-1 rounded-lg py-2.5 text-[12px] font-semibold ${
                          ratio === v ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
                        }`}
                      >
                        {v === "feed" ? "기본" : "9:16 스토리"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.75 text-[11px] font-semibold text-text-faint">범위</div>
                  <div className="flex gap-1.5">
                    {(["day", "all"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setScope(v)}
                        disabled={v === "all" && isStory}
                        className={`flex-1 rounded-lg py-2.5 text-[12px] font-semibold disabled:opacity-40 ${
                          scope === v ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
                        }`}
                      >
                        {v === "day" ? "이 날짜만" : "전체 기간"}
                      </button>
                    ))}
                  </div>
                  {isStory && <div className="mt-1.5 text-[10.5px] text-text-faint">스토리는 하루 단위로 저장돼요</div>}
                </div>
                <div>
                  <div className="mb-1.75 text-[11px] font-semibold text-text-faint">테마</div>
                  <div className="flex gap-1.5">
                    {(["dark", "light"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setTheme(v)}
                        className={`flex-1 rounded-lg py-2.5 text-[12px] font-semibold ${
                          theme === v ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
                        }`}
                      >
                        {v === "dark" ? "다크" : "라이트"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIncludeWarnings((v) => !v)}
              className="mb-4 flex w-full items-center justify-between rounded-[11px] border border-border bg-card px-3.5 py-3.25"
            >
              <span className="text-[13px] font-medium">이동시간 경고도 포함</span>
              <span
                className="relative h-6.5 w-11 flex-none rounded-full"
                style={{ background: includeWarnings ? "#E0362B" : "#DCD5CB" }}
              >
                <span
                  className="absolute top-0.75 h-5 w-5 rounded-full bg-white transition-all"
                  style={{ left: includeWarnings ? "22px" : "3px" }}
                />
              </span>
            </button>

            <div className="flex gap-2.25">
              <button
                onClick={handleSave}
                disabled={busy}
                className="flex-1 rounded-xl bg-biff-red py-4 text-center text-[14.5px] font-bold text-white disabled:opacity-60"
              >
                {busy ? "생성 중…" : "이미지 저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 오프스크린 캡처 대상 */}
      <div style={{ position: "fixed", top: 0, left: -99999, width: 1080 }}>
        <div ref={exportRef} style={{ width: 1080, background: bg, color: fg, display: "flex", flexDirection: "column" }}>
          {activeGroups.map((g) => {
            const warnings = includeWarnings ? findTravelWarnings(g.screenings, travelMatrix) : [];
            const sorted = [...g.screenings].sort((a, b) => a.start_time.localeCompare(b.start_time));
            return (
              <div
                key={g.date}
                style={{
                  padding: isStory ? "88px 64px" : "80px 72px",
                  position: "relative",
                  overflow: "hidden",
                  ...(isStory ? { width: 1080, height: 1920, display: "flex", flexDirection: "column" } : {}),
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: -180,
                    top: -180,
                    width: 620,
                    height: 620,
                    borderRadius: "50%",
                    background: "#E0362B",
                    opacity: 0.2,
                  }}
                />
                <div style={{ position: "relative", flex: "none" }}>
                  <div style={{ fontWeight: 700, fontSize: 26, letterSpacing: "0.22em", color: "#F5C518", marginBottom: 26 }}>
                    31st BIFF · MY TIMETABLE
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 76, marginBottom: 18 }}>
                    {fmtMonthDay(g.date).replace(".", "월 ")}일 {weekdayKor(g.date)}요일
                  </div>
                  <div style={{ fontSize: 30, color: fgDim, fontVariantNumeric: "tabular-nums" }}>
                    {g.date} · {sorted.length}편 관람
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: 26,
                    padding: "36px 0",
                    ...(isStory ? { flex: 1, minHeight: 0, overflow: "hidden", justifyContent: "center" } : {}),
                  }}
                >
                  {sorted.map((s, i) => (
                    <div key={s.id}>
                      <div
                        style={{
                          display: "flex",
                          gap: 32,
                          alignItems: "center",
                          background: cardBg,
                          borderRadius: 20,
                          padding: 26,
                          borderLeft: "8px solid #E0362B",
                        }}
                      >
                        {s.film.still_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/img-proxy?url=${encodeURIComponent(s.film.still_image_url)}`}
                            crossOrigin="anonymous"
                            alt=""
                            style={{ width: 200, height: 126, borderRadius: 12, objectFit: "cover", flex: "none" }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 36, color: "#F5C518", fontVariantNumeric: "tabular-nums", marginBottom: 12 }}>
                            {fmtTimeRange(s.start_time, s.end_time)}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 44, marginBottom: 10 }}>{s.film.title_kor}</div>
                          <div style={{ fontSize: 26, color: fgDim }}>{s.venue.name}</div>
                        </div>
                      </div>
                      {warnings.some((w) => w.fromScreeningId === s.id) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 0 0 26px" }}>
                          <span style={{ width: 18, height: 18, borderRadius: 99, background: "#D92D20", flex: "none" }} />
                          {(() => {
                            const w = warnings.find((w) => w.fromScreeningId === s.id)!;
                            return (
                              <span style={{ fontWeight: 700, fontSize: 26, color: "#FF7A70" }}>
                                이동시간 촉박 · {w.gapMin}분 (필요 {w.requiredMin}분)
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 34,
                    borderTop: `2px solid ${theme === "dark" ? "rgba(255,255,255,.14)" : "#E7E1D8"}`,
                    ...(isStory ? { flex: "none" } : {}),
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 24, color: fgDim }}>부국쨈 [BIFF-JJAM]</span>
                  <span style={{ fontSize: 22, color: fgDim2, fontVariantNumeric: "tabular-nums" }}>2026-10-06 → 10-15</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
