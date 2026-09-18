"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { clearSchedule, removeManyFromSchedule } from "@/app/actions";

type SelectionCtx = {
  selecting: boolean;
  selected: Set<string>;
  toggle: (id: string) => void;
  enterSelecting: () => void;
  exitSelecting: () => void;
};

const ScheduleSelectionContext = createContext<SelectionCtx | null>(null);

export function useScheduleSelection() {
  const ctx = useContext(ScheduleSelectionContext);
  if (!ctx) throw new Error("useScheduleSelection must be used within ScheduleSelectionProvider");
  return ctx;
}

export function ScheduleSelectionProvider({ children }: { children: ReactNode }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function enterSelecting() {
    setSelecting(true);
    setSelected(new Set());
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  return (
    <ScheduleSelectionContext.Provider value={{ selecting, selected, toggle, enterSelecting, exitSelecting }}>
      {children}
    </ScheduleSelectionContext.Provider>
  );
}

export function ScheduleToolbar({ token }: { token: string }) {
  const { selecting, selected, enterSelecting, exitSelecting } = useScheduleSelection();
  const [pending, startTransition] = useTransition();

  function handleClearAll() {
    if (!confirm("담은 회차를 전부 뺄까요? 되돌릴 수 없어요.")) return;
    startTransition(() => {
      clearSchedule(token);
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (!confirm(`선택한 ${ids.length}개 회차를 뺄까요?`)) return;
    startTransition(() => {
      removeManyFromSchedule(token, ids);
      exitSelecting();
    });
  }

  if (selecting) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={exitSelecting}
          disabled={pending}
          className="rounded-full border border-border-2 bg-card px-3 py-1.5 text-[11.5px] font-semibold text-text-muted disabled:opacity-40"
        >
          취소
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={selected.size === 0 || pending}
          className="rounded-full bg-biff-red px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-40"
        >
          {selected.size > 0 ? `${selected.size}개 삭제` : "삭제할 항목 선택"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={enterSelecting}
        disabled={pending}
        className="rounded-full border border-border-2 bg-card px-3 py-1.5 text-[11.5px] font-semibold text-text-muted disabled:opacity-40"
      >
        선택 삭제
      </button>
      <button
        onClick={handleClearAll}
        disabled={pending}
        className="rounded-full border border-border-2 bg-card px-3 py-1.5 text-[11.5px] font-semibold text-text-muted disabled:opacity-40"
      >
        전체 삭제
      </button>
    </div>
  );
}
