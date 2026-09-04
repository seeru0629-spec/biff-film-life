"use client";

import { useState } from "react";

const STAR_PATH =
  "M12 2.5l2.9 6.06 6.6.77-4.85 4.63 1.25 6.6L12 17.4l-5.9 3.16 1.25-6.6L2.5 9.33l6.6-.77L12 2.5z";

export function StarRatingInput({ name = "rating", defaultValue = 0 }: { name?: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const fillPct = value >= n ? 100 : value >= n - 0.5 ? 50 : 0;
          return (
            <div key={n} className="relative h-7 w-7 flex-none">
              <svg className="absolute inset-0 h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="#DCD5CB" strokeWidth="1.5">
                <path d={STAR_PATH} />
              </svg>
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#F2994A">
                  <path d={STAR_PATH} />
                </svg>
              </div>
              <button
                type="button"
                aria-label={`${n - 0.5}점`}
                className="absolute inset-y-0 left-0 z-10 w-1/2"
                onClick={() => setValue(n - 0.5)}
              />
              <button
                type="button"
                aria-label={`${n}점`}
                className="absolute inset-y-0 right-0 z-10 w-1/2"
                onClick={() => setValue(n)}
              />
            </div>
          );
        })}
      </div>
      <span className="tabular text-[15px] font-bold text-text-muted">{value > 0 ? value.toFixed(1) : "-"}</span>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
