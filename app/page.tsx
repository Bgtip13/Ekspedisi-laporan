"use client";
import { useState } from "react";
import { useReport } from "@/lib/useReport";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui";
import { DashboardTab } from "@/components/DashboardTab";
import { RincianTab } from "@/components/RincianTab";
import { PetaTab } from "@/components/PetaTab";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "rincian", label: "Rincian Toko", icon: "store" },
  { id: "peta", label: "Peta Rute", icon: "map" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const r = useReport();
  const [tab, setTab] = useState<TabId>("dashboard");
  const busy = r.loading || r.refreshing;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo CV Prima Mandiri Distribusi" className="h-full w-full object-contain p-1" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-base">Laporan Ekspedisi</h1>
            <p className="truncate text-[10px] text-slate-400 sm:text-[11px]">CV Prima Mandiri Distribusi</p>
          </div>

          {/* Tab untuk layar lebar */}
          <nav className="mx-auto hidden gap-1 rounded-xl bg-slate-100 p-1 md:flex" aria-label="Menu utama">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}
                className={cn("flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition", tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
                <Icon name={t.icon} className="h-4 w-4" />{t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <span title={r.last ? `Terakhir diperbarui ${r.last}` : undefined}
              className={cn("hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold lg:inline-flex",
                r.err ? "border-red-200/70 bg-red-50 text-red-600" : busy ? "border-blue-200/70 bg-blue-50 text-blue-700" : "border-emerald-200/70 bg-emerald-50 text-emerald-700")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", r.err ? "bg-red-500" : busy ? "animate-pulse bg-blue-500" : "bg-emerald-500")} />
              {r.err ? "Terputus" : busy ? "Memuat" : r.last ? `Terhubung · ${r.last}` : "Terhubung"}
            </span>
            <button type="button" onClick={r.refresh} disabled={busy} title="Muat ulang data" aria-label="Muat ulang data"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-50">
              <Icon name="refresh" className={cn("h-4 w-4", busy && "animate-spin")} />
            </button>
            <button type="button" onClick={() => window.print()} title="Cetak laporan" aria-label="Cetak"
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:inline-flex">
              <Icon name="print" className="h-4 w-4" />Cetak
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-3 py-3 sm:px-6 sm:py-5">
        <div className="mb-3 hidden print:block">
          <h1 className="text-lg font-bold">Laporan Ekspedisi — {TABS.find((t) => t.id === tab)?.label}</h1>
          <p suppressHydrationWarning className="text-xs text-slate-500">Dicetak {new Date().toLocaleString("id-ID")}</p>
        </div>

        {r.err && (
          <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <span aria-hidden="true">⚠</span><div><b className="font-semibold">Gagal memuat data.</b> {r.err}</div>
          </div>
        )}

        {r.loading ? (
          <div className="grid place-items-center py-24 text-xs text-slate-400"><Icon name="refresh" className="mb-2 h-5 w-5 animate-spin" />Memuat data…</div>
        ) : (
          <div key={tab} className="panel-in">
            {tab === "dashboard" && <DashboardTab r={r} />}
            {tab === "rincian" && <RincianTab r={r} />}
            {tab === "peta" && <PetaTab r={r} />}
          </div>
        )}

        <p className="no-print pt-4 text-center text-[10px] text-slate-400">Data tersinkron otomatis tiap 60 detik{r.last ? ` · terakhir ${r.last}` : ""}</p>
      </main>

      {/* Navigasi bawah untuk HP */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Menu utama">
        <div className="grid grid-cols-3">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); window.scrollTo({ top: 0 }); }} aria-current={tab === t.id ? "page" : undefined}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition", tab === t.id ? "text-slate-900" : "text-slate-400")}>
              <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", tab === t.id && "bg-slate-900 text-white")}><Icon name={t.icon} className="h-4 w-4" /></span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
