"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { fmtTimeRange, fmtMonthDay } from "@/lib/format";
import { weekdayKor } from "@/lib/festival";
import { findTravelWarnings } from "@/lib/travel";
import type { TimetableItem, VenueTravelTime } from "@/lib/types";

type DayGroup = { date: string; items: TimetableItem[] };

function reportSaveImageError(message: string, extra?: Record<string, unknown>) {
  try {
    fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        routeType: "client-save-image",
        extra: { userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined, ...extra },
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 리포팅 실패가 저장 기능에 영향을 주면 안 됨
  }
}

export function SaveImageSheet({
  groups,
  travelMatrix,
  initialDate,
}: {
  groups: DayGroup[];
  travelMatrix: VenueTravelTime[];
  /** "이 날짜만" 범위로 저장할 때 쓸 날짜 — 지금 화면에 보이는 날짜. 없으면 groups[0](가장 이른 날짜)로 대체. */
  initialDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"day" | "all">("day");
  const [ratio, setRatio] = useState<"feed" | "story">("feed");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [includeWarnings, setIncludeWarnings] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stillDataUrls, setStillDataUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const isStory = ratio === "story";

  const dayGroup = groups.find((g) => g.date === initialDate) ?? groups[0];
  const activeGroups = scope === "day" || isStory ? (dayGroup ? [dayGroup] : []) : groups;
  const activeStillUrls = Array.from(
    new Set(activeGroups.flatMap((g) => g.items.map((i) => i.still_image_url).filter((u): u is string => !!u)))
  );
  const stillsReady = activeStillUrls.every((u) => u in stillDataUrls);

  // 캡처 시점에 프록시 URL을 새로 fetch하지 않고 이미 로드된 데이터로 바로
  // 그릴 수 있도록 미리 base64로 변환해둔다 (stillsReady로 캡처 전 대기).
  useEffect(() => {
    const urls = Array.from(new Set(groups.flatMap((g) => g.items.map((i) => i.still_image_url).filter((u): u is string => !!u))));
    const missing = urls.filter((u) => !(u in stillDataUrls));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (url) => {
        try {
          const res = await fetch(`/api/img-proxy?url=${encodeURIComponent(url)}`);
          if (!res.ok) {
            reportSaveImageError(`stillcut fetch not ok: ${res.status}`, { url });
            return [url, ""] as const;
          }
          const blob = await res.blob();
          if (!blob.type.startsWith("image/") || blob.size === 0) {
            reportSaveImageError(`stillcut blob invalid: type=${blob.type} size=${blob.size}`, { url });
            return [url, ""] as const;
          }
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return [url, dataUrl] as const;
        } catch (e) {
          reportSaveImageError(`stillcut fetch threw: ${e instanceof Error ? e.message : String(e)}`, { url });
          return [url, ""] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setStillDataUrls((prev) => {
        const next = { ...prev };
        for (const [url, dataUrl] of entries) next[url] = dataUrl; // "" 실패도 settled로 기록해 무한 대기 방지
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  function handleRatio(v: "feed" | "story") {
    setRatio(v);
    if (v === "story") setScope("day");
  }

  async function handleSave() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const missingStillCount = activeStillUrls.filter((u) => !stillDataUrls[u]).length;
      if (missingStillCount > 0) {
        reportSaveImageError(`save completed but ${missingStillCount}/${activeStillUrls.length} stillcuts missing`);
      }
      // html-to-image는 SVG foreignObject에 이미지를 그려 넣는 방식인데, iOS
      // Safari(WebKit)는 이 경로로 들어간 raster 이미지를 에러 없이 조용히
      // 누락시키는 버그가 있어(실기기로 확인함) html2canvas(DOM을 직접 캔버스에
      // 그리는 방식)로 교체했다.
      const canvas = await html2canvas(exportRef.current, { scale: 1, backgroundColor: bg, useCORS: true });
      const dataUrl = canvas.toDataURL("image/png");
      // iOS Safari는 data URL을 가리키는 <a download>를 클릭하면 다운로드 대신
      // 그 URL로 페이지 자체가 이동해버리는 경우가 있어, 자동 다운로드 대신
      // 미리보기를 띄우고 길게 눌러 저장하도록 안내한다 (데스크톱/안드로이드는
      // 미리보기의 "다운로드" 버튼으로 기존 방식도 함께 시도할 수 있다).
      setPreviewUrl(dataUrl);
    } catch (e) {
      reportSaveImageError(`capture threw: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  function downloadPreview() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    const filenameDate = scope === "day" || isStory ? dayGroup?.date : groups[0]?.date;
    a.download = `부국쨈_시간표_${filenameDate ?? "export"}${isStory ? "_9x16" : ""}.png`;
    a.click();
  }

  function closePreview() {
    setPreviewUrl(null);
    setOpen(false);
  }

  const bg = theme === "dark" ? "#1B1815" : "#FAF8F4";
  const fg = theme === "dark" ? "#ffffff" : "#1B1815";
  const fgDim = theme === "dark" ? "rgba(255,255,255,.55)" : "#6B6259";
  const fgDim2 = theme === "dark" ? "rgba(255,255,255,.35)" : "#8C8378";
  const cardBg = theme === "dark" ? "rgba(255,255,255,.06)" : "#fff";
  const codeBadgeBg = theme === "dark" ? "rgba(245,197,24,.18)" : "#FDECC8";

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
                disabled={busy || !stillsReady}
                className="flex-1 rounded-xl bg-biff-red py-4 text-center text-[14.5px] font-bold text-white disabled:opacity-60"
              >
                {busy ? "생성 중…" : stillsReady ? "이미지 저장" : "스틸컷 불러오는 중…"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 px-4 pb-8 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[15px] font-bold text-white">저장할 이미지</span>
            <button onClick={closePreview} className="text-[13px] font-medium text-white/70">
              닫기
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="시간표 이미지" className="max-h-full max-w-full rounded-[14px] object-contain" />
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="text-center text-[12.5px] text-white/70">
              저장이 안 되면 이미지를 길게 눌러 &quot;사진에 추가&quot;를 선택해주세요
            </div>
            <button
              onClick={downloadPreview}
              className="w-full rounded-xl bg-biff-red py-4 text-center text-[14.5px] font-bold text-white"
            >
              다운로드
            </button>
          </div>
        </div>
      )}

      {/* 오프스크린 캡처 대상 — 일부 모바일 브라우저는 뷰포트에서 아주 멀리(-99999px)
          떨어진 fixed 요소를 컴포지팅/래스터화하지 못하는 경우가 있어, 화면 밖으로
          미는 대신 크기 0인 overflow:hidden 컨테이너로 실제 렌더링만 감춘다. */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden" }}>
        <div ref={exportRef} style={{ width: 1080, background: bg, color: fg, display: "flex", flexDirection: "column" }}>
          {activeGroups.map((g) => {
            const warnings = includeWarnings ? findTravelWarnings(g.items, travelMatrix) : [];
            const sorted = [...g.items].sort((a, b) => a.start_time.localeCompare(b.start_time));
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
                        {s.still_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              stillDataUrls[s.still_image_url] ||
                              `/api/img-proxy?url=${encodeURIComponent(s.still_image_url)}`
                            }
                            alt=""
                            style={{ width: 200, height: 126, borderRadius: 12, objectFit: "cover", flex: "none" }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                            <span style={{ fontWeight: 700, fontSize: 36, color: "#F5C518", fontVariantNumeric: "tabular-nums" }}>
                              {fmtTimeRange(s.start_time, s.end_time)}
                            </span>
                            {s.booking_code && (
                              <span
                                style={{
                                  flex: "none",
                                  fontWeight: 800,
                                  fontSize: 24,
                                  color: "#B8380B",
                                  background: codeBadgeBg,
                                  borderRadius: 999,
                                  padding: "4px 16px",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {s.booking_code}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 44, marginBottom: 10, lineHeight: 1.25 }}>{s.title}</div>
                          <div style={{ fontSize: 26, color: fgDim }}>{s.venue_name}</div>
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
