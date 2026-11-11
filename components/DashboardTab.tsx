"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Report } from "@/lib/useReport";
import { fmtDateShort, fmtRp, fmtRpShort } from "@/lib/utils";
import { Card, Empty, KategoriBadge, SectionHead, Stat } from "./ui";
import { FilterBar } from "./FilterBar";

export function DashboardTab({ r }: { r: Report }) {
  const { filtered, items, getTunai, checked, dt } = r;

  const s = useMemo(() => {
    let total = 0, cek = 0, nCek = 0, nBayar = 0, transfer = 0;
    const kat = new Map<string, number>();
    const arm = new Map<string, { prima: number; ecer: number; total: number; n: number }>();
    const hari = new Map<string, number>();
    const toko = new Set<string>();
    filtered.forEach((it) => {
      const v = getTunai(it);
      total += v; transfer += it.transfer;
      if (v > 0 || it.transfer > 0) nBayar++;
      if (checked[it._key]) { cek += v; nCek++; }
      if (it.toko) toko.add(it.toko.toLowerCase());
      const k = it.kategori || "—";
      kat.set(k, (kat.get(k) || 0) + v);
      const e = arm.get(it.armada) || { prima: 0, ecer: 0, total: 0, n: 0 };
      const kl = (it.kategori || "").toLowerCase();
      if (kl === "prima") e.prima += v; else if (kl === "ecer") e.ecer += v;
      e.total += v; e.n++; arm.set(it.armada, e);
      const d = dt(it.tgl); if (d) hari.set(d, (hari.get(d) || 0) + v);
    });
    return {
      total, cek, nCek, nBayar, transfer, tokoUnik: toko.size,
      kategori: [...kat.entries()].map(([kategori, t]) => ({ kategori, total: t })).sort((a, b) => b.total - a.total),
      armada: [...arm.entries()].map(([armada, v]) => ({ armada, ...v })).sort((a, b) => a.armada.localeCompare(b.armada, "id", { numeric: true })),
      harian: [...hari.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tgl, total]) => ({ tgl, label: fmtDateShort(tgl), total })),
    };
  }, [filtered, getTunai, checked, dt]);

  const pct = s.total > 0 ? Math.min(100, Math.round((s.cek / s.total) * 100)) : 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar r={r} total={items.length} shown={filtered.length} label="kiriman" />

      {filtered.length === 0 ? (
        <Empty title={items.length === 0 ? "Spreadsheet masih kosong" : "Tidak ada data pada periode ini"} text={items.length === 0 ? "Belum ada data pengiriman yang bisa ditampilkan." : "Coba ubah rentang tanggal di atas."} />
      ) : (
        <>
          <Card className="grid grid-cols-2 overflow-hidden lg:grid-cols-4 [&>*]:border-slate-100 [&>*:nth-child(odd)]:border-r [&>*:nth-child(-n+2)]:border-b lg:[&>*]:border-b-0 lg:[&>*]:border-r lg:[&>*:last-child]:border-r-0">
            <Stat label="Total Tunai" value={fmtRp(s.total)} sub={<>{filtered.length} kiriman · {s.nBayar} ada bayar</>} icon="wallet" tone="blue" />
            <Stat label="Sudah Dicek" value={fmtRp(s.cek)} sub={<>{s.nCek} kiriman · {pct}%</>} icon="clipboard" tone="emerald" />
            <Stat label="Belum Dicek" value={fmtRp(s.total - s.cek)} sub={<>{filtered.length - s.nCek} kiriman menunggu</>} icon="clock" tone="amber" />
            <Stat label="Armada" value={String(s.armada.length)} sub={<>{s.tokoUnik} toko · transfer {fmtRp(s.transfer)}</>} icon="truck" tone="slate" />
          </Card>

          <Card className="p-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold uppercase tracking-[0.08em]">Progres pengecekan</span><span className="tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
          </Card>

          {s.harian.length > 1 && (
            <Card className="overflow-hidden">
              <SectionHead title="Tren Harian" hint="Total tunai per hari dalam periode" />
              <div className="h-56 px-2 py-3 sm:h-64 sm:px-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.harian} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} minTickGap={16} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtRpShort(Number(v))} width={52} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v) => [fmtRp(Number(v)), "Tunai"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 sm:gap-4">
            <Card className="flex flex-col overflow-hidden lg:col-span-2">
              <SectionHead title="Per Kategori" hint="Distribusi tunai" />
              <div className="flex-1 divide-y divide-slate-100">
                {s.kategori.map((k) => {
                  const p = s.total > 0 ? Math.round((k.total / s.total) * 100) : 0;
                  return (
                    <div key={k.kategori} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <KategoriBadge value={k.kategori} />
                        <span className="text-sm font-bold tabular-nums text-slate-900">{fmtRp(k.total)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-400" style={{ width: `${p}%` }} /></div>
                        <span className="w-8 text-right text-[10px] text-slate-400">{p}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Total</span>
                <span className="text-xs font-bold tabular-nums text-slate-900">{fmtRp(s.total)}</span>
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden lg:col-span-3">
              <SectionHead title="Per Armada" hint="Perbandingan tunai Prima vs Ecer" />
              <div className="max-h-[60vh] flex-1 overflow-auto print-flow">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] uppercase tracking-[0.06em] text-slate-400 backdrop-blur">
                    <tr><th className="px-4 py-2.5 font-semibold">Armada</th><th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Prima</th><th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Ecer</th><th className="px-4 py-2.5 text-right font-semibold">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {s.armada.map((a) => (
                      <tr key={a.armada} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5"><span className="font-semibold text-slate-800">{a.armada}</span><span className="ml-1.5 text-[10px] text-slate-400">{a.n} kiriman</span></td>
                        <td className="hidden px-3 py-2.5 text-right tabular-nums text-slate-500 sm:table-cell">{fmtRp(a.prima)}</td>
                        <td className="hidden px-3 py-2.5 text-right tabular-nums text-slate-500 sm:table-cell">{fmtRp(a.ecer)}</td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">{fmtRp(a.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
