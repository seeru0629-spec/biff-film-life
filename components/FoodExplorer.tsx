"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { Restaurant, Venue } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    kakao?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

const CENTUM_CITY = { lat: 35.1691, lng: 129.1306 };

const VENUE_MARKER_SVG =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="34" viewBox="0 0 26 34">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0z" fill="#1D4ED8"/>
      <circle cx="13" cy="13" r="6" fill="white"/>
    </svg>`
  );

export function FoodExplorer({ restaurants, venues }: { restaurants: Restaurant[]; venues: Venue[] }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Record<string, { marker: any; info: any; position: any }>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openInfoRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(restaurants.map((r) => r.category).filter(Boolean))) as string[];
  const filtered = category ? restaurants.filter((r) => r.category === category) : restaurants;

  useEffect(() => {
    if (!ready || !mapDivRef.current || !window.kakao) return;
    window.kakao.maps.load(() => {
      const { kakao } = window;
      const map = new kakao.maps.Map(mapDivRef.current, {
        center: new kakao.maps.LatLng(CENTUM_CITY.lat, CENTUM_CITY.lng),
        level: 5,
      });
      mapRef.current = map;

      const venueImage = new kakao.maps.MarkerImage(VENUE_MARKER_SVG, new kakao.maps.Size(26, 34));
      for (const v of venues) {
        if (v.lat == null || v.lng == null) continue;
        const position = new kakao.maps.LatLng(v.lat, v.lng);
        const marker = new kakao.maps.Marker({ position, map, image: venueImage, zIndex: 2 });
        const info = new kakao.maps.InfoWindow({
          content: `<div style="font-family:Pretendard,sans-serif;padding:6px 10px;font-size:12px;font-weight:700;color:#1D4ED8;white-space:nowrap">🎬 ${v.name}</div>`,
        });
        kakao.maps.event.addListener(marker, "click", () => info.open(map, marker));
      }

      for (const r of restaurants) {
        const position = new kakao.maps.LatLng(r.lat, r.lng);
        const marker = new kakao.maps.Marker({ position, map, zIndex: 1 });
        const info = new kakao.maps.InfoWindow({
          content: `<div style="font-family:Pretendard,sans-serif;padding:6px 10px;min-width:140px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${r.name}</div>
            <div style="font-size:11.5px;color:#6B6259">${[r.category, r.walk_note].filter(Boolean).join(" · ")}</div>
          </div>`,
        });
        kakao.maps.event.addListener(marker, "click", () => {
          map.panTo(position);
          info.open(map, marker);
          openInfoRef.current = info;
        });
        markersRef.current[r.id] = { marker, info, position };
      }
    });
  }, [ready, restaurants, venues]);

  function focusRestaurant(id: string) {
    const entry = markersRef.current[id];
    const map = mapRef.current;
    if (!entry || !map) return;
    map.panTo(entry.position);
    openInfoRef.current?.close();
    entry.info.open(map, entry.marker);
    openInfoRef.current = entry.info;
    mapDivRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={mapDivRef} className="h-[280px] w-full bg-[#E3E7E0]" />

      <div className="px-4 pt-4">
        <div className="mb-3.5 flex gap-1.75 overflow-x-auto">
          <button
            onClick={() => setCategory(null)}
            className={`flex-none rounded-full px-3.25 py-2.25 text-[12px] font-semibold ${
              !category ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
            }`}
          >
            전체 {restaurants.length}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-none whitespace-nowrap rounded-full px-3.25 py-2.25 text-[12px] font-medium ${
                category === c ? "bg-ink-2 text-white" : "border border-border-2 bg-card text-text-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2.25">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-[13px] border border-border bg-card p-3.5">
              <button onClick={() => focusRestaurant(r.id)} className="flex flex-1 items-center gap-3 text-left">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-biff-red-bg text-[12px] font-bold text-biff-red-dark">
                  {r.category?.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 text-[14px] font-semibold">{r.name}</div>
                  <div className="text-[12px] text-text-faint">{r.walk_note}</div>
                </div>
              </button>
              {r.google_map_url && (
                <a
                  href={r.google_map_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-none rounded-full p-2 text-icon-faint"
                  aria-label="카카오맵에서 열기"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="m15 3 6 0 0 6" />
                    <path d="M10 14 21 3" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
