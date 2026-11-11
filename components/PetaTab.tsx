"use client";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import type { Report } from "@/lib/useReport";
import { cn, fmtDateShort, fmtDurasi, haversineKm, parseJam, parseLatLng } from "@/lib/utils";
import { Card, Empty, Icon } from "./ui";
import { FilterBar } from "./FilterBar";
import type { Stop } from "./MapView";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-xs text-slate-400">Memuat peta…</div> });

type Route = { id: string; armada: string; tgl: string; driver: string; stops: Stop[]; totalMenit: number | null; totalKm: number; tanpaGps: number };

export function PetaTab({ r }: { r: Report }) {
  const { filtered, items, dt } = r;

  const routes = useMemo<Route[]>(() => {
    const m = new Map<string, typeof filtered>();
    filtered.forEach((it) => {
      const d = dt(it.tgl) || "tanpa-tanggal";
      const k = d + "|" + it.armada;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    });
    const out: Route[] = [];
    m.forEach((list, id) => {
      const pts = list
        .map((it) => ({ it, ll: parseLatLng(it.gps), t: parseJam(it.jam) }))
        .filter((x): x is { it: typeof x.it; ll: { lat: number; lng: number }; t: number | null } => !!x.ll)
        .sort((a, b) => (a.t ?? 1e9) - (b.t ?? 1e9) || a.it._sheetRow - b.it._sheetRow);
      if (!pts.length) return;
      let totalKm = 0;
      const stops: Stop[] = pts.map((p, i) => {
        const prev = pts[i - 1];
        let selisih = "", km = "";
        if (prev) {
          if (p.t != null && prev.t != null) selisih = fmtDurasi(p.t - prev.t);
          const d = haversineKm(prev.ll, p.ll); totalKm += d;
          km = d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1) + " km";
        }
        return { n: i + 1, key: p.it._key, lat: p.ll.lat, lng: p.ll.lng, toko: p.it.toko, jam: p.it.jam, selisih, km };
      });
      const ts = pts.map((p) => p.t).filter((t): t is number => t != null);
      const [tgl, armada] = [id.split("|")[0], id.slice(id.indexOf("|") + 1)];
      out.push({
        id, armada, tgl, driver: [...new Set(pts.map((p) => p.it.driver).filter(Boolean))].join(", "),
        stops, totalMenit: ts.length > 1 ? Math.max(...ts) - Math.min(...ts) : null, totalKm, tanpaGps: list.length - pts.length,
      });
    });
    return out.sort((a, b) => a.tgl.localeCompare(b.tgl) || a.armada.localeCompare(b.armada, "id", { numeric: true }));
  }, [filtered, dt]);

  const [sel, setSel] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const route = routes.find((x) => x.id === sel) ?? routes[0];
  const onSelect = useCallback((k: string) => setActive(k), []);
  const totalGps = routes.reduce((s, x) => s + x.stops.length, 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar r={r} total={items.length} shown={filtered.length} label="kiriman" />

      {routes.length === 0 ? (
        <Empty title="Belum ada titik lokasi" text="Tidak ada kiriman ber-koordinat pada periode ini. Koordinat dibaca dari kolom GPS (format “-6.99,110.42” atau tautan Google Maps) yang diisi driver." />
      ) : (
        <>
          <Card className="no-print p-3">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Pilih rute · {routes.length} rute, {totalGps} titik</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {routes.map((x) => (
                <button key={x.id} type="button" onClick={() => { setSel(x.id); setActive(null); }}
                  className={cn("shrink-0 rounded-xl border px-3 py-2 text-left transition", route?.id === x.id ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
                  <span className="block text-xs font-bold">{x.armada}</span>
                  <span className={cn("block text-[10px]", route?.id === x.id ? "text-slate-300" : "text-slate-400")}>{x.tgl === "tanpa-tanggal" ? "Tanpa tanggal" : fmtDateShort(x.tgl)} · {x.stops.length} titik</span>
                </button>
              ))}
            </div>
          </Card>

          {route && (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] sm:gap-4">
              <Card className="overflow-hidden">
                <div className="h-[55vh] min-h-[320px] lg:h-[620px]">
                  <MapView stops={route.stops} activeKey={active} onSelect={onSelect} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600" />Awal</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-900" />Singgah</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-600" />Akhir</span>
                  <span className="ml-auto">Jarak garis lurus, bukan jarak jalan</span>
                </div>
              </Card>

              <Card className="flex max-h-[620px] flex-col overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-900">{route.armada}</p>
                  <p className="text-[11px] text-slate-400">{route.driver || "Driver —"}{route.tgl !== "tanpa-tanggal" ? ` · ${fmtDateShort(route.tgl)}` : ""}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    {[["Titik", String(route.stops.length)], ["Durasi", route.totalMenit != null ? fmtDurasi(route.totalMenit) : "—"], ["Jarak", route.totalKm ? route.totalKm.toFixed(1) + " km" : "—"]].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-slate-50 px-2 py-1.5"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className="text-xs font-bold tabular-nums text-slate-800">{v}</p></div>
                    ))}
                  </div>
                  {route.tanpaGps > 0 && <p className="mt-2 text-[10px] text-amber-600">{route.tanpaGps} kiriman tanpa koordinat tidak ditampilkan.</p>}
                </div>
                <ol className="flex-1 overflow-y-auto">
                  {route.stops.map((s, i) => (
                    <li key={s.key}>
                      {s.selisih || s.km ? (
                        <div className="flex items-center gap-2 bg-slate-50/70 py-1.5 pl-[22px] pr-4 text-[10px] text-slate-500">
                          <Icon name="route" className="h-3 w-3 text-blue-500" />
                          <span>{s.selisih ? <b className="font-semibold text-blue-700">{s.selisih}</b> : "selisih jam —"}</span>
                          {s.km && <span className="text-slate-400">· ± {s.km}</span>}
                        </div>
                      ) : null}
                      <button type="button" onClick={() => setActive(s.key)} className={cn("flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50", active === s.key && "bg-blue-50/60")}>
                        <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white", i === 0 ? "bg-emerald-600" : i === route.stops.length - 1 ? "bg-red-600" : "bg-slate-900")}>{s.n}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{s.toko || "—"}</span><span className="flex items-center gap-1 text-[11px] tabular-nums text-slate-400"><Icon name="clock" className="h-3 w-3" />{s.jam || "jam —"}</span></span>
                      </button>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
