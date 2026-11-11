"use client";
import type { Report, Preset } from "@/lib/useReport";
import { cn, fmtDateShort } from "@/lib/utils";
import { Btn, Card, Icon } from "./ui";

const PRESETS: [Preset, string][] = [["yesterday", "Kemarin"], ["today", "Hari ini"], ["7", "7 hari"], ["30", "30 hari"], ["month", "Bulan ini"], ["all", "Semua"]];

/** Filter tanggal manual — dipakai bersama oleh semua tab. */
export function FilterBar({ r, total, shown, label = "data" }: { r: Report; total: number; shown: number; label?: string }) {
  const { range, rangeActive, preset, applyPreset, setCustom, dateMode, setDateMode, detectedMode, hiddenNoDate } = r;
  return (
    <Card className="no-print p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-100">
          <Icon name="calendar" className="h-4 w-4 shrink-0 text-slate-400" />
          <input type="date" value={range.a} onChange={(e) => setCustom(e.target.value, range.b)} aria-label="Tanggal awal" className="min-w-0 bg-transparent text-xs text-slate-700 focus:outline-none" />
          <span className="text-slate-300">–</span>
          <input type="date" value={range.b} onChange={(e) => setCustom(range.a, e.target.value)} aria-label="Tanggal akhir" className="min-w-0 bg-transparent text-xs text-slate-700 focus:outline-none" />
        </div>

        <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {PRESETS.map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => applyPreset(k)} aria-pressed={preset === k}
              className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
                preset === k ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{lbl}</button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="hidden items-center gap-1.5 text-[11px] text-slate-400 lg:flex">
            Format tgl
            <select value={dateMode} onChange={(e) => setDateMode(e.target.value as typeof dateMode)} className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="auto">Otomatis ({detectedMode === "mdy" ? "MM/DD" : "DD/MM"})</option>
              <option value="dmy">DD/MM/YYYY</option>
              <option value="mdy">MM/DD/YYYY</option>
            </select>
          </label>
          <span className="text-[11px] text-slate-400">
            <b className="font-semibold text-slate-700">{shown}</b>{shown !== total ? ` dari ${total}` : ""} {label}
          </span>
        </div>
      </div>

      {rangeActive && (
        <p className="mt-2 text-[11px] text-slate-400">
          Periode <b className="font-semibold text-slate-600">{range.a ? fmtDateShort(range.a) : "awal"}</b> s/d <b className="font-semibold text-slate-600">{range.b ? fmtDateShort(range.b) : "akhir"}</b>
          <Btn variant="soft" onClick={() => applyPreset("all")} className="ml-2 !min-h-0 !px-2 !py-0.5 text-[10px]"><Icon name="x" className="h-3 w-3" />Reset</Btn>
        </p>
      )}
      {hiddenNoDate.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-100">
          <span aria-hidden="true">⚠</span>
          <span>{hiddenNoDate.length} baris disembunyikan karena format TANGGAL tidak dikenali (contoh: {hiddenNoDate[0]?.tgl}).</span>
        </p>
      )}
    </Card>
  );
}
