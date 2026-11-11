"use client";
import { useMemo, useState } from "react";
import type { Item } from "@/lib/types";
import type { Report } from "@/lib/useReport";
import { cn, fmtRp } from "@/lib/utils";
import { Btn, BuktiThumb, Card, Empty, Icon, KategoriBadge } from "./ui";
import { FilterBar } from "./FilterBar";

function mapsUrl(gps: string) {
  if (!gps) return "";
  if (gps.startsWith("http")) return gps;
  const g = gps.replace(/\s/g, "");
  return g.includes(",") ? "https://www.google.com/maps?q=" + encodeURIComponent(g) : "";
}

export function RincianTab({ r }: { r: Report }) {
  const { filtered, items, getTunai, checked, toggleCheck, toggleCheckAll, saveTunai, tunaiEdit, photos } = r;
  const [q, setQ] = useState("");
  const [semua, setSemua] = useState(false);          // default: hanya toko yang ada bayar
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const query = q.trim().toLowerCase();
  const list = useMemo(() => filtered.filter((it) => {
    if (!semua && !(getTunai(it) > 0 || it.transfer > 0)) return false;
    if (query && ![it.toko, it.driver, it.helper, it.armada, it.kategori, it.bayar, it.type, it.ket, it.retur, it.tgl].join(" ").toLowerCase().includes(query)) return false;
    return true;
  }), [filtered, semua, query, getTunai]);

  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    list.forEach((it) => { if (!m.has(it.armada)) m.set(it.armada, []); m.get(it.armada)!.push(it); });
    return [...m.entries()]
      .map(([armada, l]) => ({ armada, list: l, sub: l.reduce((s, it) => s + getTunai(it), 0), nCek: l.filter((it) => checked[it._key]).length }))
      .sort((a, b) => a.armada.localeCompare(b.armada, "id", { numeric: true }));
  }, [list, getTunai, checked]);

  const total = list.reduce((s, it) => s + getTunai(it), 0);
  const fotoOf = (foto: string) => {
    if (!foto) return null;
    const id = photos[(foto.split("/").pop() || foto).trim()];
    return id ? { thumb: "/api/foto?id=" + encodeURIComponent(id) + "&sz=w200", open: "https://drive.google.com/open?id=" + id } : null;
  };
  const setAll = (v: boolean) => { const n: Record<string, boolean> = {}; groups.forEach((g) => { n[g.armada] = v; }); setOpen(n); };

  const startEdit = (it: Item) => { setEditing(it._key); setEditVal(String(getTunai(it))); };
  const commit = (it: Item) => { saveTunai(it, editVal); setEditing(null); };

  const Tunai = ({ it }: { it: Item }) => {
    if (editing === it._key) return (
      <div className="flex items-center justify-end gap-1">
        <input autoFocus inputMode="numeric" value={editVal} onChange={(e) => setEditVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(it); if (e.key === "Escape") setEditing(null); }}
          className="w-28 rounded-lg border border-blue-400 px-2 py-1.5 text-right text-sm tabular-nums outline-none ring-2 ring-blue-100" />
        <button type="button" onClick={() => commit(it)} aria-label="Simpan" className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Icon name="check" className="h-4 w-4" /></button>
        <button type="button" onClick={() => setEditing(null)} aria-label="Batal" className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><Icon name="x" className="h-4 w-4" /></button>
      </div>
    );
    const v = getTunai(it), edited = tunaiEdit[it._key] !== undefined;
    return (
      <button type="button" onClick={() => startEdit(it)} title="Ketuk untuk ubah nominal"
        className={cn("inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-sm transition hover:bg-amber-50 hover:ring-1 hover:ring-amber-200", edited ? "font-bold text-blue-700" : "font-semibold text-slate-900")}>
        {v > 0 ? fmtRp(v) : <span className="text-slate-300">—</span>}
        {edited && <span className="rounded bg-blue-50 px-1 text-[9px] text-blue-600 ring-1 ring-inset ring-blue-100">✎</span>}
      </button>
    );
  };

  const Bukti = ({ it }: { it: Item }) => {
    if (!it.foto && !it.pod) return <span className="text-slate-300">—</span>;
    const f = fotoOf(it.foto), p = fotoOf(it.pod);
    return (
      <div className="flex items-start gap-3">
        {it.foto && <BuktiThumb thumb={f?.thumb || ""} open={f?.open || ""} label="Uang" tone="uang" />}
        {it.pod && <BuktiThumb thumb={p?.thumb || ""} open={p?.open || ""} label="POD" tone="pod" />}
      </div>
    );
  };
  const Gps = ({ gps }: { gps: string }) => {
    if (!gps) return null;
    const u = mapsUrl(gps);
    return u
      ? <a href={u} target="_blank" rel="noreferrer" className="inline-flex max-w-[200px] items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"><Icon name="pin" className="h-3 w-3 shrink-0" /><span className="truncate">Lihat lokasi</span></a>
      : <span className="text-[11px] text-slate-500">{gps}</span>;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <FilterBar r={r} total={items.length} shown={filtered.length} label="kiriman" />

      <Card className="no-print flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari toko, driver, armada…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Hapus" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"><Icon name="x" className="h-3.5 w-3.5" /></button>}
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-slate-600">
          <input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-slate-900" />
          Tampilkan juga yang tidak bayar
        </label>
        <div className="ml-auto flex gap-1.5">
          <Btn onClick={() => setAll(true)}>Buka semua</Btn>
          <Btn onClick={() => setAll(false)}>Tutup semua</Btn>
        </div>
      </Card>

      {groups.length === 0 ? (
        <Empty title="Tidak ada toko yang cocok" text={semua ? "Tidak ada kiriman pada periode ini." : "Tidak ada toko dengan pembayaran pada periode ini. Ubah tanggal, atau centang “Tampilkan juga yang tidak bayar”."} />
      ) : (
        <>
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span><b className="font-semibold text-slate-800">{list.length}</b> toko · {groups.length} armada</span>
            <span>Total <b className="font-bold tabular-nums text-slate-900">{fmtRp(total)}</b></span>
          </div>

          {groups.map((g) => {
            const isOpen = !!open[g.armada];
            const all = g.list.every((it) => checked[it._key]);
            const pct = Math.round((g.nCek / g.list.length) * 100);
            return (
              <Card key={g.armada} className="overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                  <button type="button" onClick={() => setOpen((p) => ({ ...p, [g.armada]: !p[g.armada] }))} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition", isOpen ? "bg-slate-900 text-white ring-slate-900" : "bg-slate-100 text-slate-500 ring-slate-200/70")}><Icon name="truck" className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5"><span className="truncate text-sm font-bold text-slate-900">{g.armada}</span><Icon name="chevron" className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} /></span>
                      <span className="mt-0.5 flex items-center gap-2 whitespace-nowrap text-[11px] text-slate-400">
                        <span>{g.list.length} toko</span>
                        <span className="h-1 w-12 overflow-hidden rounded-full bg-slate-100"><span className={cn("block h-full rounded-full", all ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${pct}%` }} /></span>
                        <span className={cn("whitespace-nowrap", all && "text-emerald-600")}>{g.nCek}/{g.list.length} dicek</span>
                      </span>
                    </span>
                  </button>
                  <label className="no-print flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:border-slate-300">
                    <input type="checkbox" checked={all} onChange={() => toggleCheckAll(g.list)} aria-label={`Centang semua ${g.armada}`} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />
                    <span className="hidden sm:inline">Semua</span>
                  </label>
                  <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-slate-400">Subtotal</p><p className="text-sm font-bold tabular-nums text-slate-900">{fmtRp(g.sub)}</p></div>
                </div>

                {isOpen && (
                  <>
                    {/* HP: kartu */}
                    <div className="space-y-2 border-t border-slate-100 bg-slate-50/40 p-2.5 md:hidden">
                      {g.list.map((it) => (
                        <div key={it._key} className={cn("rounded-xl border p-3", checked[it._key] ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white")}>
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={!!checked[it._key]} onChange={() => toggleCheck(it)} aria-label={`Cek ${it.toko}`} className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 accent-emerald-600" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 text-sm font-semibold leading-snug text-slate-800">{it.toko || "—"}</p>
                                <Tunai it={it} />
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium tabular-nums">{it.tgl}{it.jam ? ` · ${it.jam}` : ""}</span>
                                <KategoriBadge value={it.kategori} />
                              </div>
                              <p className="mt-1.5 text-[11px] text-slate-600"><span className="text-slate-400">Driver</span> <b className="font-semibold">{it.driver || "—"}</b>{it.helper && <> <span className="text-slate-400">· Helper</span> <b className="font-semibold">{it.helper}</b></>}</p>
                              <p className="text-[11px] text-slate-600"><span className="text-slate-400">Bayar</span> {it.bayar || "—"}{it.type ? " · " + it.type : ""}{it.transfer > 0 && <> · <span className="text-slate-400">Transfer</span> <b className="font-semibold">{fmtRp(it.transfer)}</b></>}</p>
                              {(it.foto || it.pod) && <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2"><Bukti it={it} /></div>}
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3"><Gps gps={it.gps} />{it.retur && <span className="text-[10px] text-amber-600">↩ Retur: {it.retur}</span>}</div>
                              {it.ket && <p className="mt-1 text-[11px] italic text-slate-500">{it.ket}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* PC: tabel */}
                    <div className="print-flow hidden max-h-[70vh] overflow-auto border-t border-slate-100 md:block">
                      <table className="w-full min-w-[1040px] text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-white/95 text-[10px] uppercase tracking-[0.06em] text-slate-400 shadow-[0_1px_0_0_#e2e8f0] backdrop-blur">
                          <tr>{["Cek", "Tanggal", "Nama Toko", "Kategori", "Driver", "Pembayaran", "Tunai", "Transfer", "Bukti", "Lokasi / Retur", "Keterangan"].map((h, i) => <th key={h} className={cn("whitespace-nowrap px-3 py-2.5 font-semibold", (i === 6 || i === 7) && "text-right")}>{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {g.list.map((it) => (
                            <tr key={it._key} className={cn(checked[it._key] ? "bg-emerald-50/60" : "hover:bg-slate-50/80")}>
                              <td className="px-3 py-2"><input type="checkbox" checked={!!checked[it._key]} onChange={() => toggleCheck(it)} aria-label={`Cek ${it.toko}`} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" /></td>
                              <td className="whitespace-nowrap px-3 py-2"><span className="block font-medium tabular-nums text-slate-800">{it.tgl || "—"}</span>{it.jam && <span className="block text-[10px] tabular-nums text-slate-400">{it.jam}</span>}</td>
                              <td className="max-w-[220px] px-3 py-2"><span className="block truncate font-medium text-slate-800" title={it.toko}>{it.toko || "—"}</span></td>
                              <td className="px-3 py-2"><KategoriBadge value={it.kategori} /></td>
                              <td className="max-w-[160px] px-3 py-2"><span className="block truncate text-slate-700" title={it.driver}>{it.driver || "—"}</span>{it.helper && <span className="block truncate text-[10px] text-slate-400">+ {it.helper}</span>}</td>
                              <td className="whitespace-nowrap px-3 py-2"><span className="block text-slate-700">{it.bayar || "—"}</span>{it.type && <span className="block text-[10px] text-slate-400">{it.type}</span>}</td>
                              <td className="px-3 py-2 text-right"><Tunai it={it} /></td>
                              <td className="px-3 py-2 text-right tabular-nums">{it.transfer > 0 ? <span className="font-medium text-slate-700">{fmtRp(it.transfer)}</span> : <span className="text-slate-300">—</span>}</td>
                              <td className="px-3 py-2"><Bukti it={it} /></td>
                              <td className="px-3 py-2"><Gps gps={it.gps} />{it.retur && <span className="mt-0.5 block text-[10px] text-amber-600">↩ {it.retur}</span>}{!it.gps && !it.retur && <span className="text-slate-300">—</span>}</td>
                              <td className="max-w-[180px] px-3 py-2"><span className="block truncate text-[11px] text-slate-500" title={it.ket}>{it.ket || "—"}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}
