"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Item, PhotoMap, Range } from "./types";
import { rowsToItems } from "./parse";
import { DateMode, dayISO, detectMode, isoLocal, parseDate, toNumber } from "./utils";

// Endpoint Apps Script yang sama dengan versi lama (centang & edit tunai tetap tertulis ke sheet)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIKbUY23rS_3PbJydzZlVjEhLz0ItF6jNbxenmoZL39_TFXuYw0RfZqCgrmK64pKw/exec";

export type Preset = "all" | "yesterday" | "today" | "7" | "30" | "month" | "custom";

export function useReport() {
  /* ── data ── */
  const [rows, setRows] = useState<string[][]>([]);
  const [photos, setPhotos] = useState<PhotoMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [last, setLast] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ekspedisi", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengambil data.");
      setRows(data.rows || []); setPhotos(data.photos || {});
      setLast(new Date().toLocaleTimeString("id-ID")); setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengambil data dari spreadsheet.");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  const refresh = () => { setRefreshing(true); load(); };

  /* ── centang & edit tunai (localStorage + sheet) ── */
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tunaiEdit, setTunaiEdit] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- baca localStorage hanya di client (hindari hydration mismatch) */
  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem("exp_checked") || "{}")); } catch {}
    try { setTunaiEdit(JSON.parse(localStorage.getItem("exp_tunai_edit") || "{}")); } catch {}
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => { if (hydrated) try { localStorage.setItem("exp_checked", JSON.stringify(checked)); } catch {} }, [checked, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem("exp_tunai_edit", JSON.stringify(tunaiEdit)); } catch {} }, [tunaiEdit, hydrated]);

  const post = async (body: object) => {
    try { await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(body) }); } catch (e) { console.error(e); }
  };
  const toggleCheck = (it: Item) => { const nv = !checked[it._key]; setChecked((p) => ({ ...p, [it._key]: nv })); post({ action: "checkRow", row: it._sheetRow, value: nv }); };
  const toggleCheckAll = (list: Item[]) => {
    const all = list.length > 0 && list.every((it) => checked[it._key]);
    setChecked((p) => { const n = { ...p }; list.forEach((it) => { n[it._key] = !all; }); return n; });
    list.forEach((it) => post({ action: "checkRow", row: it._sheetRow, value: !all }));
  };
  const saveTunai = (it: Item, raw: string) => {
    const n = toNumber(raw);
    if (n !== null && n >= 0) { setTunaiEdit((p) => ({ ...p, [it._key]: n })); post({ action: "updateCell", row: it._sheetRow, col: "TUNAI", value: n }); }
  };
  const getTunai = useCallback((it: Item) => tunaiEdit[it._key] ?? it.tunai, [tunaiEdit]);

  /* ── item & filter tanggal ── */
  const items = useMemo(() => rowsToItems(rows), [rows]);
  const [dateMode, setDateMode] = useState<DateMode>("auto");
  const detectedMode = useMemo(() => detectMode(items.map((it) => it.tgl)), [items]);
  const mode: DateMode = dateMode === "auto" ? detectedMode : dateMode;
  const dt = useCallback((s: string) => parseDate(s, mode), [mode]);

  const [tglAwal, setTglAwal] = useState("");
  const [tglAkhir, setTglAkhir] = useState("");
  const [preset, setPreset] = useState<Preset>("yesterday");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const y = dayISO(-1); setTglAwal(y); setTglAkhir(y); }, []);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    if (p === "all") { setTglAwal(""); setTglAkhir(""); }
    else if (p === "yesterday") { const s = dayISO(-1); setTglAwal(s); setTglAkhir(s); }
    else if (p === "today") { const s = dayISO(0); setTglAwal(s); setTglAkhir(s); }
    else if (p === "7") { const d = new Date(now); d.setDate(d.getDate() - 6); setTglAwal(isoLocal(d)); setTglAkhir(isoLocal(now)); }
    else if (p === "30") { const d = new Date(now); d.setDate(d.getDate() - 29); setTglAwal(isoLocal(d)); setTglAkhir(isoLocal(now)); }
    else if (p === "month") { setTglAwal(isoLocal(new Date(now.getFullYear(), now.getMonth(), 1))); setTglAkhir(isoLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0))); }
  };
  const setCustom = (a: string, b: string) => { setTglAwal(a); setTglAkhir(b); setPreset("custom"); };

  const range: Range = useMemo(() => {
    let a = tglAwal, b = tglAkhir;
    if (a && b && a > b) [a, b] = [b, a];
    return { a, b };
  }, [tglAwal, tglAkhir]);
  const rangeActive = !!(range.a || range.b);

  const filtered = useMemo(() => items.filter((it) => {
    if (!rangeActive) return true;
    const k = dt(it.tgl);
    if (!k) return false;
    if (range.a && k < range.a) return false;
    if (range.b && k > range.b) return false;
    return true;
  }), [items, rangeActive, range, dt]);
  const hiddenNoDate = useMemo(() => (rangeActive ? items.filter((it) => !dt(it.tgl)) : []), [items, rangeActive, dt]);

  return {
    loading, refreshing, err, last, refresh, photos,
    items, filtered, hiddenNoDate, dt,
    checked, toggleCheck, toggleCheckAll, getTunai, saveTunai, tunaiEdit,
    range, rangeActive, preset, applyPreset, setCustom, dateMode, setDateMode, detectedMode,
  };
}
export type Report = ReturnType<typeof useReport>;
