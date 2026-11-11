"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Item, PhotoMap, Range } from "./types";
import { rowsToItems } from "./parse";
import { DateMode, dayISO, detectMode, parseDate, shiftISO, toNumber } from "./utils";

// Endpoint Apps Script yang sama dengan versi lama (centang & edit tunai tetap tertulis ke sheet)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIKbUY23rS_3PbJydzZlVjEhLz0ItF6jNbxenmoZL39_TFXuYw0RfZqCgrmK64pKw/exec";

export type Preset = "yesterday" | "today" | "custom";

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

  const [tgl, setTgl] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTgl(dayISO(-1)); }, []);
  const preset: Preset = tgl === dayISO(-1) ? "yesterday" : tgl === dayISO(0) ? "today" : "custom";
  const applyPreset = (p: Preset) => { if (p === "yesterday") setTgl(dayISO(-1)); else if (p === "today") setTgl(dayISO(0)); };
  const shiftDay = (n: number) => setTgl((t) => shiftISO(t || dayISO(-1), n));
  const range: Range = useMemo(() => ({ a: tgl, b: tgl }), [tgl]);
  const rangeActive = !!tgl;

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
    tgl, setTgl, shiftDay, range, rangeActive, preset, applyPreset, dateMode, setDateMode, detectedMode,
  };
}
export type Report = ReturnType<typeof useReport>;
