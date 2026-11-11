"use client";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Report } from "@/lib/useReport";
import { fmtRp, fmtRpShort } from "@/lib/utils";
import { Card, Empty, Icon, KategoriBadge, SectionHead, Stat } from "./ui";
import { FilterBar } from "./FilterBar";

export function DashboardTab({ r }: { r: Report }) {
  const { filtered, items, getTunai, checked } = r;

  const s = useMemo(() => {
    let total = 0, cek = 0, nCek = 0, nBayar = 0, transfer = 0, nRetur = 0;
    const kat = new Map<string, { total: number; n: number }>();
    const arm = new Map<string, { prima: number; ecer: number; lain: number; total: number; n: number }>();
    const drv = new Map<string, { total: number; n: number; armada: Set<string> }>();
    const tokoMap = new Map<string, { toko: string; total: number; kategori: string; armada: string }>();
    filtered.forEach((it) => {
      const v = getTunai(it);
      total += v; transfer += it.transfer;
      if (v > 0 || it.transfer > 0) nBayar++;
      if (it.retur) nRetur++;
      if (checked[it._key]) { cek += v; nCek++; }
      const k = it.kategori || "—";
      const ke = kat.get(k) || { total: 0, n: 0 }; ke.total += v; ke.n++; kat.set(k, ke);
      const e = arm.get(it.armada) || { prima: 0, ecer: 0, lain: 0, total: 0, n: 0 };
      const kl = (it.kategori || "").toLowerCase();
      if (kl === "prima") e.prima += v; else if (kl === "ecer") e.ecer += v; else e.lain += v;
      e.total += v; e.n++; arm.set(it.armada, e);
      const dn = it.driver || "Tanpa driver";
      const de = drv.get(dn) || { total: 0, n: 0, armada: new Set<string>() }; de.total += v; de.n++; de.armada.add(it.armada); drv.set(dn, de);
      if (v > 0) { const tk = it.toko + "|" + it.armada; const te = tokoMap.get(tk) || { toko: it.toko, total: 0, kategori: it.kategori, armada: it.armada }; te.total += v; tokoMap.set(tk, te); }
    });
    return {
      total, cek, nCek, nBayar, transfer, nRetur,
      kategori: [...kat.entries()].map(([kategori, v]) => ({ kategori, ...v })).sort((a, b) => b.total - a.total),
      armada: [...arm.entries()].map(([armada, v]) => ({ armada, ...v })).sort((a, b) => a.armada.localeCompare(b.armada, "id", { numeric: true })),
      driver: [...drv.entries()].map(([nama, v]) => ({ nama, total: v.total, n: v.n, armada: [...v.armada].join(", ") })).sort((a, b) => b.total - a.total),
      topToko: [...tokoMap.values()].sort((a, b) => b.total - a.total).slice(0, 6),
    };
  }, [filtered, getTunai, checked]);

  const pct = s.total > 0 ? Math.min(100, Math.round((s.cek / s.total) * 100)) : 0;
  const maxDrv = Math.max(1, ...s.driver.map((d) => d.total));
  const maxToko = Math.max(1, ...s.topToko.map((d) => d.total));

  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar r={r} total={items.length} shown={filtered.length} label="kiriman" />

      {filtered.length === 0 ? (
        <Empty title={items.length === 0 ? "Spreadsheet masih kosong" : "Tidak ada data pada tanggal ini"} text={items.length === 0 ? "Belum ada data pengiriman yang bisa ditampilkan." : "Coba pilih tanggal lain di atas."} />
      ) : (
        <>
          <Card className="grid grid-cols-2 overflow-hidden lg:grid-cols-4 [&>*]:border-slate-100 [&>*:nth-child(odd)]:border-r [&>*:nth-child(-n+2)]:border-b lg:[&>*]:border-b-0 lg:[&>*]:border-r lg:[&>*:last-child]:border-r-0">
            <Stat label="Total Tunai" value={fmtRp(s.total)} sub={<>{filtered.length} kiriman · {s.nBayar} ada bayar</>} icon="wallet" tone="blue" />
            <Stat label="Sudah Dicek" value={fmtRp(s.cek)} sub={<>{s.nCek} kiriman · {pct}%</>} icon="clipboard" tone="emerald" />
            <Stat label="Belum Dicek" value={fmtRp(s.total - s.cek)} sub={<>{filtered.length - s.nCek} kiriman menunggu</>} icon="clock" tone="amber" />
            <Stat label="Armada" value={String(s.armada.length)} sub={<>{s.driver.length} driver · transfer {fmtRp(s.transfer)}</>} icon="truck" tone="slate" />
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span className="font-semibold uppercase tracking-[0.08em]">Progres pengecekan</span>
              <span className="flex items-center gap-3">
                {s.nRetur > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">↩ {s.nRetur} retur</span>}
                <span className="tabular-nums font-semibold text-slate-700">{s.nCek}/{filtered.length} · {pct}%</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
          </Card>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 sm:gap-4">
            <Card className="overflow-hidden lg:col-span-3">
              <SectionHead title="Tunai per Armada" hint="Prima vs Ecer" />
              <div className="h-64 px-2 py-3 sm:px-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.armada} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="armada" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtRpShort(Number(v))} width={52} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v, n) => [fmtRp(Number(v)), String(n)]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="prima" name="Prima" stackId="a" fill="#2563eb" maxBarSize={44} />
                    <Bar dataKey="ecer" name="Ecer" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden lg:col-span-2">
              <SectionHead title="Per Kategori" hint="Distribusi tunai" />
              <div className="flex-1 divide-y divide-slate-100">
                {s.kategori.map((k) => {
                  const p = s.total > 0 ? Math.round((k.total / s.total) * 100) : 0;
                  return (
                    <div key={k.kategori} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2"><KategoriBadge value={k.kategori} /><span className="text-[11px] text-slate-400">{k.n} kiriman</span></span>
                        <span className="text-sm font-bold tabular-nums text-slate-900">{fmtRp(k.total)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-500" style={{ width: `${p}%` }} /></div>
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
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 sm:gap-4">
            <Card className="overflow-hidden">
              <SectionHead title="Uang per Driver" hint="Diurutkan dari tunai terbesar" />
              <div className="divide-y divide-slate-100">
                {s.driver.map((d, i) => (
                  <div key={d.nama} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2"><p className="truncate text-[13px] font-semibold text-slate-800">{d.nama}</p><p className="text-sm font-bold tabular-nums text-slate-900">{fmtRp(d.total)}</p></div>
                      <div className="mt-1.5 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((d.total / maxDrv) * 100)}%` }} /></div><span className="text-[10px] text-slate-400">{d.armada} · {d.n}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <SectionHead title="Toko Bayar Terbesar" hint="6 toko dengan tunai tertinggi" />
              {s.topToko.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-slate-400">Belum ada toko yang bayar tunai.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {s.topToko.map((t, i) => (
                    <div key={t.toko + t.armada} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon name="store" className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2"><p className="truncate text-[13px] font-semibold text-slate-800">{t.toko || "—"}</p><p className="text-sm font-bold tabular-nums text-slate-900">{fmtRp(t.total)}</p></div>
                        <div className="mt-1.5 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={i === 0 ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-slate-400"} style={{ width: `${Math.round((t.total / maxToko) * 100)}%` }} /></div><span className="text-[10px] text-slate-400">{t.armada}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="overflow-hidden">
            <SectionHead title="Rekap Armada" hint="Tunai Prima, Ecer, dan total" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/95 text-[10px] uppercase tracking-[0.06em] text-slate-400">
                  <tr><th className="px-4 py-2.5 font-semibold">Armada</th><th className="px-3 py-2.5 text-right font-semibold">Kiriman</th><th className="px-3 py-2.5 text-right font-semibold">Prima</th><th className="px-3 py-2.5 text-right font-semibold">Ecer</th><th className="px-4 py-2.5 text-right font-semibold">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.armada.map((a) => (
                    <tr key={a.armada} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{a.armada}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{a.n}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-500">{fmtRp(a.prima)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-500">{fmtRp(a.ecer)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">{fmtRp(a.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/80 font-bold text-slate-900">
                  <tr><td className="px-4 py-2.5 text-[10px] uppercase tracking-[0.06em] text-slate-500">Total</td><td className="px-3 py-2.5 text-right tabular-nums">{filtered.length}</td><td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{fmtRp(s.armada.reduce((x, a) => x + a.prima, 0))}</td><td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{fmtRp(s.armada.reduce((x, a) => x + a.ecer, 0))}</td><td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{fmtRp(s.total)}</td></tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
