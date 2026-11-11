"use client";
import { useMemo } from "react";
import type { Item } from "@/lib/types";
import type { Report } from "@/lib/useReport";
import { fmtRp } from "@/lib/utils";
import { Card, Empty, Icon, KategoriBadge, SectionHead, Stat } from "./ui";
import { FilterBar } from "./FilterBar";

const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];

/** Rincian toko yang ada pembayaran: per armada (dengan driver & helper) + total uang tiap driver. */
export function BayarTab({ r }: { r: Report }) {
  const { filtered, items, getTunai } = r;

  const d = useMemo(() => {
    const paid = filtered.filter((it) => getTunai(it) > 0 || it.transfer > 0);
    const arm = new Map<string, Item[]>();
    const drv = new Map<string, { nama: string; armada: Set<string>; helper: Set<string>; toko: number; tunai: number; transfer: number }>();
    let tunai = 0, transfer = 0;
    paid.forEach((it) => {
      if (!arm.has(it.armada)) arm.set(it.armada, []);
      arm.get(it.armada)!.push(it);
      const nama = it.driver || "Tanpa driver";
      const e = drv.get(nama) || { nama, armada: new Set<string>(), helper: new Set<string>(), toko: 0, tunai: 0, transfer: 0 };
      e.armada.add(it.armada); if (it.helper) e.helper.add(it.helper);
      e.toko++; e.tunai += getTunai(it); e.transfer += it.transfer;
      drv.set(nama, e);
      tunai += getTunai(it); transfer += it.transfer;
    });
    return {
      paid, tunai, transfer,
      armada: [...arm.entries()].map(([armada, list]) => ({
        armada, list,
        drivers: uniq(list.map((i) => i.driver)), helpers: uniq(list.map((i) => i.helper)),
        tunai: list.reduce((s, i) => s + getTunai(i), 0), transfer: list.reduce((s, i) => s + i.transfer, 0),
      })).sort((a, b) => a.armada.localeCompare(b.armada, "id", { numeric: true })),
      driver: [...drv.values()].sort((a, b) => b.tunai - a.tunai),
    };
  }, [filtered, getTunai]);

  const maxDrv = Math.max(1, ...d.driver.map((x) => x.tunai));

  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar r={r} total={items.length} shown={filtered.length} label="kiriman" />

      {d.paid.length === 0 ? (
        <Empty title="Tidak ada toko yang bayar" text="Belum ada pembayaran (tunai/transfer) pada tanggal ini. Coba pilih tanggal lain." />
      ) : (
        <>
          <Card className="grid grid-cols-2 overflow-hidden lg:grid-cols-4 [&>*]:border-slate-100 [&>*:nth-child(odd)]:border-r [&>*:nth-child(-n+2)]:border-b lg:[&>*]:border-b-0 lg:[&>*]:border-r lg:[&>*:last-child]:border-r-0">
            <Stat label="Total Tunai" value={fmtRp(d.tunai)} sub="uang cash dari toko" icon="wallet" tone="blue" />
            <Stat label="Total Transfer" value={fmtRp(d.transfer)} sub="pembayaran via transfer" icon="clipboard" tone="emerald" />
            <Stat label="Toko Bayar" value={String(d.paid.length)} sub={`dari ${filtered.length} kiriman`} icon="store" tone="amber" />
            <Stat label="Driver" value={String(d.driver.length)} sub={`${d.armada.length} armada`} icon="truck" tone="slate" />
          </Card>

          {/* Uang tiap driver */}
          <Card className="overflow-hidden">
            <SectionHead title="Uang Tiap Driver" hint="Total tunai yang dibawa tiap driver" />
            <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
              {d.driver.map((x, i) => (
                <div key={x.nama} className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{x.nama.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{x.nama}</p>
                      <p className="truncate text-[11px] text-slate-400">{[...x.armada].join(", ")}{x.helper.size ? ` · Helper ${[...x.helper].join(", ")}` : ""}</p>
                    </div>
                    {i === 0 && d.driver.length > 1 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">Tertinggi</span>}
                  </div>
                  <p className="mt-3 text-xl font-bold tabular-nums text-slate-900">{fmtRp(x.tunai)}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round((x.tunai / maxDrv) * 100)}%` }} /></div>
                  <p className="mt-2 text-[11px] text-slate-500">{x.toko} toko bayar{x.transfer > 0 && <> · transfer <b className="font-semibold text-slate-700">{fmtRp(x.transfer)}</b></>}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Per armada */}
          {d.armada.map((g) => (
            <Card key={g.armada} className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white"><Icon name="truck" className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{g.armada}</p>
                  <p className="text-[11px] text-slate-500">
                    <span className="text-slate-400">Driver</span> <b className="font-semibold text-slate-700">{g.drivers.join(", ") || "—"}</b>
                    <span className="text-slate-400"> · Helper</span> <b className="font-semibold text-slate-700">{g.helpers.join(", ") || "—"}</b>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Total tunai</p>
                  <p className="text-sm font-bold tabular-nums text-slate-900">{fmtRp(g.tunai)}</p>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {g.list.map((it, i) => (
                  <li key={it._key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/70">
                    <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-slate-300">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{it.toko || "—"}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                        <KategoriBadge value={it.kategori} />
                        {it.jam && <span className="tabular-nums">{it.jam}</span>}
                        {it.bayar && <span>{it.bayar}{it.type ? ` · ${it.type}` : ""}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-slate-900">{getTunai(it) > 0 ? fmtRp(getTunai(it)) : <span className="text-slate-300">—</span>}</p>
                      {it.transfer > 0 && <p className="text-[10px] tabular-nums text-emerald-600">Transfer {fmtRp(it.transfer)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs">
                <span className="whitespace-nowrap font-semibold uppercase tracking-[0.06em] text-slate-500">{g.list.length} toko bayar</span>
                <span className="tabular-nums text-slate-600">Tunai <b className="font-bold text-slate-900">{fmtRp(g.tunai)}</b>{g.transfer > 0 && <> · Transfer <b className="font-bold text-slate-900">{fmtRp(g.transfer)}</b></>}</span>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
