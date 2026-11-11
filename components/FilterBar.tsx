"use client";
import type { Report } from "@/lib/useReport";
import { cn, fmtDateLong } from "@/lib/utils";
import { Card, Icon } from "./ui";

/** Filter satu tanggal — dipakai bersama oleh semua tab. */
export function FilterBar({ r, total, shown, label = "data" }: { r: Report; total: number; shown: number; label?: string }) {
  const { tgl, setTgl, shiftDay, preset, applyPreset, dateMode, setDateMode, detectedMode, hiddenNoDate } = r;
  const chip = (k: "yesterday" | "today", lbl: string) => (
    <button key={k} type="button" onClick={() => applyPreset(k)} aria-pressed={preset === k}
      className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition", preset === k ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{lbl}</button>
  );
  const arrow = "grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95";
  return (
    <Card className="no-print p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => shiftDay(-1)} aria-label="Hari sebelumnya" className={arrow}><Icon name="chevron" className="h-4 w-4 rotate-90" /></button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-100">
            <Icon name="calendar" className="h-4 w-4 shrink-0 text-slate-400" />
            <input type="date" value={tgl} onChange={(e) => e.target.value && setTgl(e.target.value)} aria-label="Pilih tanggal" className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none" />
          </div>
          <button type="button" onClick={() => shiftDay(1)} aria-label="Hari berikutnya" className={arrow}><Icon name="chevron" className="h-4 w-4 -rotate-90" /></button>
        </div>
        <div className="flex gap-1">{chip("yesterday", "Kemarin")}{chip("today", "Hari ini")}</div>

        <div className="ml-auto flex items-center gap-3">
          <label className="hidden items-center gap-1.5 text-[11px] text-slate-400 lg:flex">
            Format tgl
            <select value={dateMode} onChange={(e) => setDateMode(e.target.value as typeof dateMode)} className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="auto">Otomatis ({detectedMode === "mdy" ? "MM/DD" : "DD/MM"})</option>
              <option value="dmy">DD/MM/YYYY</option>
              <option value="mdy">MM/DD/YYYY</option>
            </select>
          </label>
          <span className="text-[11px] text-slate-400"><b className="font-semibold text-slate-700">{shown}</b>{shown !== total ? ` dari ${total}` : ""} {label}</span>
        </div>
      </div>
      {tgl && <p className="mt-2 text-[11px] text-slate-400">Menampilkan data <b className="font-semibold text-slate-600">{fmtDateLong(tgl)}</b></p>}
      {hiddenNoDate.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-100">
          <span aria-hidden="true">⚠</span><span>{hiddenNoDate.length} baris disembunyikan karena format TANGGAL tidak dikenali (contoh: {hiddenNoDate[0]?.tgl}).</span>
        </p>
      )}
    </Card>
  );
}
