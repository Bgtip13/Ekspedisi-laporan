"use client";
import { useState, useEffect, useMemo, useCallback } from "react";

/* ═══ Helpers ═══ */
function num(x: any): number { const n = Number(x); return isFinite(n) ? n : 0; }
// Parser Rupiah: "Rp 2.443.000" / "2.443.000" / "1.234.567,50" / "(837.000)" / "837000"
function toNumber(raw: any): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/^-/.test(s)) { neg = true; s = s.replace(/^-/, ""); }
  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return null;
  const ld = s.lastIndexOf("."), lc = s.lastIndexOf(",");
  let intPart = s, decPart = "";
  if (ld >= 0 && lc >= 0) {
    const cut = Math.max(ld, lc);
    intPart = s.slice(0, cut).replace(/[.,]/g, "");
    decPart = s.slice(cut + 1);
  } else if (lc >= 0) {
    const p = s.split(",");
    if (p.length > 2 || p[p.length - 1].length === 3) intPart = s.replace(/,/g, "");
    else { intPart = p.slice(0, -1).join(""); decPart = p[p.length - 1]; }
  } else if (ld >= 0) {
    const p = s.split(".");
    if (p.length > 2 || p[p.length - 1].length === 3) intPart = s.replace(/\./g, "");
    else { intPart = p.slice(0, -1).join(""); decPart = p[p.length - 1]; }
  }
  const v = Number((intPart || "0") + (decPart ? "." + decPart : ""));
  if (!isFinite(v)) return null;
  return neg ? -v : v;
}
function fmtRp(n: number): string { return "Rp " + Math.round(num(n)).toLocaleString("id-ID"); }
function norm(s: string): string { return (s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function cn(...c: (string | false | null | undefined)[]): string { return c.filter(Boolean).join(" "); }

/* ─── Tanggal: parser tahan berbagai format Google Sheets ─── */
const M_ID: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", mei: "05", jun: "06", jul: "07", agu: "08", aug: "08", sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12" };

type DateMode = "auto" | "dmy" | "mdy";

function cleanDate(s: string): string {
  return String(s ?? "").replace(/[\u00A0\u202F\u2007\u200B\uFEFF]/g, " ").replace(/\s+/g, " ").trim();
}
function fixYear(raw: string): number {
  let y = Number(raw);
  if (String(raw).length <= 2) y += y >= 70 ? 1900 : 2000;
  return y;
}
function isoOf(y: number, mo: number, d: number): string {
  if (!(y >= 1990 && y <= 2100) || !(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31)) return "";
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "";
  return String(y).padStart(4, "0") + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function numParts(t: string): { a: number; b: number; y: number } | null {
  const m = t.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})/);
  if (!m) return null;
  return { a: Number(m[1]), b: Number(m[2]), y: fixYear(m[3]) };
}
function parseDate(s: string, mode: DateMode): string {
  const t = cleanDate(s);
  if (!t) return "";
  let m = t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m) return isoOf(Number(m[1]), Number(m[2]), Number(m[3]));
  m = t.match(/^(\d{1,2})[\s\-/.]*([A-Za-z]{3,})[\s\-/.,]*(\d{2,4})/);
  if (m) { const mo = M_ID[m[2].slice(0, 3).toLowerCase()]; if (mo) return isoOf(fixYear(m[3]), Number(mo), Number(m[1])); }
  m = t.match(/^([A-Za-z]{3,})[\s\-/.]*(\d{1,2})[\s\-/.,]*(\d{2,4})/);
  if (m) { const mo = M_ID[m[1].slice(0, 3).toLowerCase()]; if (mo) return isoOf(fixYear(m[3]), Number(mo), Number(m[2])); }
  const p = numParts(t);
  if (p) {
    const { a, b, y } = p;
    if (mode === "dmy") return isoOf(y, b, a);
    if (mode === "mdy") return isoOf(y, a, b);
    if (a > 12 && b <= 12) return isoOf(y, b, a);
    if (b > 12 && a <= 12) return isoOf(y, a, b);
    if (a > 12 && b > 12) return "";
    return isoOf(y, b, a);
  }
  if (/^\d{4,5}$/.test(t)) {
    const serial = Number(t);
    if (serial > 20000 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return isoOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }
  return "";
}
function detectMode(dates: string[]): DateMode {
  let dmy = 0, mdy = 0;
  for (const s of dates) {
    const p = numParts(cleanDate(s));
    if (!p) continue;
    if (p.a > 12 && p.b <= 12) dmy++;
    else if (p.b > 12 && p.a <= 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}
function dayISO(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function todayISO(): string { return dayISO(0); }
function fmtDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${Number(d)} ${bulan[Number(m) - 1] || m} ${y.slice(2)}`;
}

/* ═══ Ikon ═══ */
const ICONS: Record<string, string[]> = {
  search: ["M21 21l-4.35-4.35", "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"],
  refresh: ["M20 11a8 8 0 0 0-13.7-5.7L4 7", "M4 4v3.5h3.5", "M4 13a8 8 0 0 0 13.7 5.7L20 17", "M20 20v-3.5h-3.5"],
  print: ["M7 9V3h10v6", "M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1", "M7 14h10v7H7z"],
  funnel: ["M3 5h18l-7 8.2V20l-4 2v-8.8L3 5Z"],
  chevron: ["m6 9 6 6 6-6"],
  check: ["m5 13 4 4L19 7"],
  wallet: ["M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z", "M3 10h18", "M16.5 15h.01"],
  clipboard: ["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6", "m9 13 2 2 4-4"],
  clock: ["M12 8v4.5l3 1.8", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
  truck: ["M2 5h11v11H2z", "M13 9h4.5l3.5 4v3h-8", "M6.5 19.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z", "M17.5 19.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"],
  pin: ["M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z", "M12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  calendar: ["M8 2v4M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"],
  layers: ["M12 3 3 8l9 5 9-5-9-5Z", "m3 13 9 5 9-5", "m3 18 9 5 9-5"],
  inbox: ["M4 13h4l1.5 3h5L16 13h4", "M4 13 6.5 5h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Z"],
  spark: ["M12 3v4M12 17v4M3 12h4M17 12h4", "M6.5 6.5 9 9M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"],
  external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"],
};

function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {(ICONS[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* ═══ Komponen dasar ═══ */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.18)]", className)}>{children}</div>;
}

const BTN_VARIANTS: Record<string, string> = {
  primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
  ghost: "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
  soft: "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
  accent: "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700",
};

function Btn({ children, onClick, variant = "ghost", title, className = "", disabled }: { children: React.ReactNode; onClick?: () => void; variant?: keyof typeof BTN_VARIANTS; title?: string; className?: string; disabled?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs", BTN_VARIANTS[variant], className)}>
      {children}
    </button>
  );
}

function Th({ children, className = "", right }: { children: React.ReactNode; className?: string; right?: boolean }) {
  return <th className={cn("whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400", right ? "text-right" : "text-left", className)}>{children}</th>;
}
function Td({ children, className = "", right }: { children: React.ReactNode; className?: string; right?: boolean }) {
  return <td className={cn("px-3 py-2 text-xs text-slate-600", right ? "text-right tabular-nums" : "text-left", className)}>{children}</td>;
}

function KategoriBadge({ value }: { value: string }) {
  const v = (value || "").toLowerCase();
  const tone = v === "prima" ? "bg-blue-50 text-blue-700 ring-blue-200/70"
    : v === "ecer" ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70"
    : "bg-slate-50 text-slate-600 ring-slate-200";
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset", tone)}>{value || "—"}</span>;
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs",
        active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/70 hover:text-slate-800")}>
      {children}
    </button>
  );
}

function Stat({ label, value, sub, icon, tone }: { label: string; value: string; sub: React.ReactNode; icon: string; tone: "blue" | "emerald" | "amber" | "slate" }) {
  const TONES = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200/70",
  } as const;
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1 ring-inset", TONES[tone])}><Icon name={icon} className="h-3.5 w-3.5" /></span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums leading-tight text-slate-900 sm:text-[22px]">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

const BUKTI_TONE = {
  uang: { dot: "bg-blue-500", text: "text-blue-600" },
  pod: { dot: "bg-amber-500", text: "text-amber-600" },
} as const;

function BuktiThumb({ thumb, open, label, tone }: { thumb: string; open: string; label: string; tone: keyof typeof BUKTI_TONE }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const t = BUKTI_TONE[tone];
  const caption = (
    <span className={cn("flex items-center gap-1 text-[8px] font-bold uppercase leading-none tracking-wide", t.text)}>
      <span className={cn("h-1 w-1 rounded-full", t.dot)} />{label}
    </span>
  );

  const shell = "group inline-flex flex-col items-center gap-0.5";
  const wrap = (children: React.ReactNode, title: string, className: string) =>
    open
      ? <a href={open} target="_blank" rel="noreferrer" title={title} className={className}>{children}</a>
      : <span title={title} className={className}>{children}</span>;

  if (!thumb || failed) {
    return wrap(
      <>
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition group-hover:border-blue-300 group-hover:text-blue-500">
          <Icon name="external" className="h-3.5 w-3.5" />
        </span>
        {caption}
      </>,
      open ? `Buka ${label} di Drive` : `${label} tidak tersedia`,
      shell,
    );
  }

  return wrap(
    <>
      <img
        key={attempt}
        src={thumb + (attempt ? `&retry=${attempt}` : "")}
        alt={label}
        loading="lazy"
        onError={() => { if (attempt < 2) setAttempt(attempt + 1); else setFailed(true); }}
        className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-100 object-cover transition group-hover:border-blue-300 group-hover:shadow-sm"
      />
      {caption}
    </>,
    `Buka ${label}`,
    shell,
  );
}

function SectionHead({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ═══ Ekspedisi ═══ */
type EkspedisiProps = {
  rows: string[][];
  photos: Record<string, string>;
  err: string;
  last: string;
};

function EkspedisiView({ rows, photos, err, last }: EkspedisiProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [tglAwal, setTglAwal] = useState("");
  const [tglAkhir, setTglAkhir] = useState("");
  const [preset, setPreset] = useState("yesterday");
  const [dateMode, setDateMode] = useState<DateMode>("auto");
  const [q, setQ] = useState("");

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tunaiEdit, setTunaiEdit] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIKbUY23rS_3PbJydzZlVjEhLz0ItF6jNbxenmoZL39_TFXuYw0RfZqCgrmK64pKw/exec";

  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem("exp_checked") || "{}")); } catch {}
    try { setTunaiEdit(JSON.parse(localStorage.getItem("exp_tunai_edit") || "{}")); } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) { try { localStorage.setItem("exp_checked", JSON.stringify(checked)); } catch {} } }, [checked, hydrated]);
  useEffect(() => { if (hydrated) { try { localStorage.setItem("exp_tunai_edit", JSON.stringify(tunaiEdit)); } catch {} } }, [tunaiEdit, hydrated]);

  useEffect(() => { const y = dayISO(-1); setTglAwal(y); setTglAkhir(y); }, []);

  const saveToSheet = async (rowIdx: number, col: string, value: any) => {
    try { await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "updateCell", row: rowIdx, col, value }) }); } catch (e) { console.error(e); }
  };
  const saveCheckToSheet = async (rowIdx: number, v: boolean) => {
    try { await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "checkRow", row: rowIdx, value: v }) }); } catch (e) { console.error(e); }
  };
  const toggleCheck = (key: string, rowIdx: number) => { const nv = !checked[key]; setChecked((p) => ({ ...p, [key]: nv })); saveCheckToSheet(rowIdx, nv); };
  const toggleCheckAll = (list: any[]) => {
    const allChecked = list.every((it) => checked[it._key]);
    const nc = { ...checked };
    list.forEach((it) => { nc[it._key] = !allChecked; });
    setChecked(nc);
    list.forEach((it) => saveCheckToSheet(it._sheetRow, !allChecked));
  };
  const startEdit = (key: string, val: number) => { setEditingKey(key); setEditVal(String(val)); };
  const saveEdit = (key: string, sheetRow: number) => {
    const n = toNumber(editVal);
    if (n !== null && n >= 0) { setTunaiEdit((p) => ({ ...p, [key]: n })); saveToSheet(sheetRow, "TUNAI", n); }
    setEditingKey(null); setEditVal("");
  };

  const items = useMemo(() => {
    if (!rows.length) return [] as any[];
    const h = rows[0].map((c) => norm(c));
    const idx = (k: string) => h.findIndex((x) => x === k);
    const iTgl = idx("TANGGAL"), iJam = idx("JAM"), iKat = idx("KATEGORI"), iToko = idx("NAMATOKO"), iDrv = idx("NAMADRIVER"), iHlp = idx("NAMAHELPER"), iArm = idx("ARMADA"), iBay = idx("BAYAR"), iTyp = idx("TYPEBYR"), iTun = idx("TUNAI"), iTrf = idx("TRANSFER"), iFot = idx("FOTOUANG"), iPod = idx("POD"), iRet = idx("INFORETUR"), iKet = idx("KETERANGAN"), iGps = idx("GPS");
    return rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((r, i) => ({
      _key: String(i), _sheetRow: i + 1,
      tgl: (r[iTgl] || "").trim(), jam: (r[iJam] || "").trim(), kategori: (r[iKat] || "").trim(),
      toko: (r[iToko] || "").trim(), driver: (r[iDrv] || "").trim(), helper: (r[iHlp] || "").trim(),
      armada: (r[iArm] || "").trim() || "—", bayar: (r[iBay] || "").trim(), type: (r[iTyp] || "").trim(),
      tunai: toNumber(r[iTun] || "") || 0, transfer: toNumber(r[iTrf] || "") || 0,
      foto: (r[iFot] || "").trim(), pod: (r[iPod] || "").trim(), retur: (r[iRet] || "").trim(),
      ket: (r[iKet] || "").trim(), gps: (r[iGps] || "").trim(),
    }));
  }, [rows]);

  const detectedMode = useMemo(() => detectMode(items.map((it) => it.tgl)), [items]);
  const mode: DateMode = dateMode === "auto" ? detectedMode : dateMode;
  const dt = useCallback((s: string) => parseDate(s, mode), [mode]);

  const range = useMemo(() => {
    let a = tglAwal, b = tglAkhir;
    if (a && b && a > b) { const t = a; a = b; b = t; }
    return { a, b };
  }, [tglAwal, tglAkhir]);
  const active = !!(range.a || range.b);
  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => items.filter((it) => {
    if (active) {
      const k = dt(it.tgl);
      if (!k) return false;
      if (range.a && k < range.a) return false;
      if (range.b && k > range.b) return false;
    }
    if (query) {
      const hay = [it.toko, it.driver, it.helper, it.armada, it.kategori, it.bayar, it.type, it.ket, it.retur, it.tgl].join(" ").toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }), [items, active, range, dt, query]);
  const hiddenNoDate = useMemo(() => (active ? items.filter((it) => !dt(it.tgl)) : []), [items, active, dt]);

  const applyPreset = (p: string) => {
    setPreset(p);
    const now = new Date();
    const iso = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (p === "all") { setTglAwal(""); setTglAkhir(""); return; }
    if (p === "yesterday") { const s = dayISO(-1); setTglAwal(s); setTglAkhir(s); return; }
    if (p === "today") { const s = todayISO(); setTglAwal(s); setTglAkhir(s); return; }
    if (p === "7") { const d = new Date(now); d.setDate(d.getDate() - 6); setTglAwal(iso(d)); setTglAkhir(iso(now)); return; }
    if (p === "30") { const d = new Date(now); d.setDate(d.getDate() - 29); setTglAwal(iso(d)); setTglAkhir(iso(now)); return; }
    if (p === "month") { setTglAwal(iso(new Date(now.getFullYear(), now.getMonth(), 1))); setTglAkhir(iso(new Date(now.getFullYear(), now.getMonth() + 1, 0))); return; }
  };
  const resetFilters = () => { applyPreset("all"); setQ(""); };

  const getTunai = (it: any) => tunaiEdit[it._key] ?? it.tunai;
  const totalAll = useMemo(() => filtered.reduce((s, it) => s + getTunai(it), 0), [filtered, tunaiEdit]);
  const totalChecked = useMemo(() => filtered.filter((it) => checked[it._key]).reduce((s, it) => s + getTunai(it), 0), [filtered, checked, tunaiEdit]);
  const countChecked = useMemo(() => filtered.filter((it) => checked[it._key]).length, [filtered, checked]);
  const percentChecked = totalAll > 0 ? Math.min(100, Math.round((totalChecked / totalAll) * 100)) : 0;
  const perKategori = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((it) => { const k = it.kategori || "—"; m.set(k, (m.get(k) || 0) + getTunai(it)); });
    return Array.from(m.entries()).map(([kategori, total]) => ({ kategori, total })).sort((a, b) => b.total - a.total);
  }, [filtered, tunaiEdit]);
  const perArmada = useMemo(() => {
    const m = new Map<string, { prima: number; ecer: number; total: number }>();
    filtered.forEach((it) => {
      const e = m.get(it.armada) || { prima: 0, ecer: 0, total: 0 };
      const k = (it.kategori || "").toLowerCase();
      if (k === "prima") e.prima += getTunai(it); else if (k === "ecer") e.ecer += getTunai(it);
      e.total += getTunai(it); m.set(it.armada, e);
    });
    return Array.from(m.entries()).map(([armada, v]) => ({ armada, ...v })).sort((a, b) => a.armada.localeCompare(b.armada, "id", { numeric: true }));
  }, [filtered, tunaiEdit]);
  const groups = useMemo(() => {
    const m = new Map<string, any[]>();
    filtered.forEach((it) => { if (!m.has(it.armada)) m.set(it.armada, []); m.get(it.armada)!.push(it); });
    return Array.from(m.entries())
      .map(([armada, list]) => ({ armada, list, sub: list.reduce((s, it) => s + getTunai(it), 0), checkedCount: list.filter((it) => checked[it._key]).length }))
      .sort((a, b) => a.armada.localeCompare(b.armada, "id", { numeric: true }));
  }, [filtered, tunaiEdit, checked]);
  const setAllGroups = (open: boolean) => { const n: Record<string, boolean> = {}; groups.forEach((g) => { n[g.armada] = open; }); setExpanded(n); };

  const mapsUrl = (gps: string) => { if (!gps) return ""; if (gps.startsWith("http")) return gps; const g = gps.replace(/\s/g, ""); return g.includes(",") ? "https://www.google.com/maps?q=" + encodeURIComponent(g) : ""; };
  const fotoOf = (foto: string) => {
    if (!foto) return null;
    const fn = (foto.split("/").pop() || foto).trim();
    const id = photos[fn];
    return id ? { thumb: "/api/foto?id=" + encodeURIComponent(id) + "&sz=w200", open: "https://drive.google.com/open?id=" + id } : null;
  };

  // Foto uang & POD selalu ditampilkan berdampingan dengan label, masing-masing hanya bila ada.
  const BuktiCell = ({ foto, pod }: { foto: string; pod: string }) => {
    if (!foto && !pod) return <span className="text-slate-300">—</span>;
    const f = fotoOf(foto), p = fotoOf(pod);
    return (
      <div className="flex items-start gap-2.5">
        {foto && <BuktiThumb thumb={f?.thumb || ""} open={f?.open || ""} label="Uang" tone="uang" />}
        {pod && <BuktiThumb thumb={p?.thumb || ""} open={p?.open || ""} label="POD" tone="pod" />}
      </div>
    );
  };
  const GpsCell = ({ gps }: { gps: string }) => {
    if (!gps) return <span className="text-slate-300">—</span>;
    const u = mapsUrl(gps);
    return u
      ? <a href={u} target="_blank" rel="noreferrer" className="inline-flex max-w-[220px] items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"><Icon name="pin" className="h-3 w-3 shrink-0" /><span className="truncate" title={gps}>{gps}</span></a>
      : <span className="break-all text-[11px] text-slate-500">{gps}</span>;
  };
  const TunaiCell = ({ it }: { it: any }) => {
    if (editingKey === it._key) return (
      <div className="flex items-center justify-end gap-1">
        <input autoFocus type="text" inputMode="numeric" value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(it._key, it._sheetRow); if (e.key === "Escape") { setEditingKey(null); setEditVal(""); } }} className="w-24 rounded-md border border-blue-400 px-1.5 py-1 text-right text-xs tabular-nums outline-none ring-2 ring-blue-100" />
        <button onClick={() => saveEdit(it._key, it._sheetRow)} className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50" aria-label="Simpan"><Icon name="check" className="h-3.5 w-3.5" /></button>
        <button onClick={() => { setEditingKey(null); setEditVal(""); }} className="rounded p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Batal"><Icon name="x" className="h-3.5 w-3.5" /></button>
      </div>
    );
    const val = getTunai(it); const isEdited = tunaiEdit[it._key] !== undefined;
    return (
      <button type="button" onClick={() => startEdit(it._key, it.tunai)} title="Klik untuk mengubah nominal"
        className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] transition hover:bg-amber-50 hover:ring-1 hover:ring-amber-200 sm:text-xs",
          isEdited ? "font-bold text-blue-700" : "font-semibold text-slate-800")}>
        {val > 0 ? fmtRp(val) : <span className="text-slate-300">—</span>}
        {isEdited && <span className="rounded bg-blue-50 px-1 text-[9px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-100">✎</span>}
      </button>
    );
  };

  const presetList: [string, string][] = [["all", "Semua"], ["yesterday", "Kemarin"], ["today", "Hari Ini"], ["7", "7 Hari"], ["30", "30 Hari"], ["month", "Bulan Ini"]];
  const activeChips: string[] = [];
  if (range.a || range.b) activeChips.push(`${range.a ? fmtDateShort(range.a) : "awal"} → ${range.b ? fmtDateShort(range.b) : "akhir"}`);
  if (query) activeChips.push(`"${q.trim()}"`);

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="hidden print:block text-[11px] text-slate-600">
        Periode: {range.a ? fmtDateShort(range.a) : "awal"} – {range.b ? fmtDateShort(range.b) : "akhir"} · {filtered.length} dari {items.length} kiriman
        {query ? ` · pencarian "${q.trim()}"` : ""}
      </p>

      {/* ─── Panel Filter ─── */}
      <Card className="no-print p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white shadow-sm"><Icon name="funnel" className="h-3.5 w-3.5" /></span>
            <div>
              <p className="text-[13px] font-bold leading-tight text-slate-900">Filter Data</p>
              <p className="text-[11px] text-slate-400">Periode, format tanggal, dan pencarian</p>
            </div>
            {activeChips.length > 0 && (
              <span className="ml-1 hidden items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100 sm:inline-flex">
                {activeChips.join(" · ")}
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Cari toko, driver, armada…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-7 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Hapus pencarian" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><Icon name="x" className="h-3 w-3" /></button>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Cepat</span>
            <div className="flex flex-wrap gap-0.5 rounded-xl bg-slate-100/80 p-1">
              {presetList.map(([k, lbl]) => <Pill key={k} active={preset === k} onClick={() => applyPreset(k)}>{lbl}</Pill>)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Rentang</span>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-1.5 py-1">
              <Icon name="calendar" className="h-3.5 w-3.5 text-slate-400" />
              <input type="date" value={tglAwal} onChange={(e) => { setTglAwal(e.target.value); setPreset("custom"); }} aria-label="Tanggal awal" className="rounded-md bg-transparent px-0.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-xs" />
              <span className="text-slate-300">—</span>
              <input type="date" value={tglAkhir} onChange={(e) => { setTglAkhir(e.target.value); setPreset("custom"); }} aria-label="Tanggal akhir" className="rounded-md bg-transparent px-0.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-xs" />
            </div>

            <label className="ml-1 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="font-medium">Format</span>
              <select value={dateMode} onChange={(e) => setDateMode(e.target.value as DateMode)} className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="auto">Otomatis ({detectedMode === "mdy" ? "MM/DD" : "DD/MM"})</option>
                <option value="dmy">DD/MM/YYYY</option>
                <option value="mdy">MM/DD/YYYY</option>
              </select>
            </label>

            {(active || !!query) && <Btn variant="ghost" onClick={resetFilters} className="ml-0.5"><Icon name="x" className="h-3 w-3" />Reset</Btn>}

            <span className="ml-auto text-[11px] text-slate-400">
              {active || query ? <>Menampilkan <b className="font-semibold text-slate-700">{filtered.length}</b> dari {items.length} baris</> : <><b className="font-semibold text-slate-700">{items.length}</b> baris kiriman</>}
            </span>
          </div>
        </div>

        {hiddenNoDate.length > 0 && (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-100">
            <span aria-hidden="true">⚠</span>
            <span>{hiddenNoDate.length} baris disembunyikan karena format TANGGAL tidak dikenali (contoh: {hiddenNoDate[0]?.tgl}).</span>
          </p>
        )}
      </Card>

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <span aria-hidden="true">⚠</span>
          <div><b className="font-semibold">Gagal memuat data.</b> <span className="text-red-600">{err}</span></div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="inbox" className="h-6 w-6" /></span>
          <p className="mt-3 text-sm font-semibold text-slate-700">{items.length === 0 ? "Spreadsheet masih kosong" : "Tidak ada data yang cocok"}</p>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            {items.length === 0 ? "Belum ada data pengiriman yang bisa ditampilkan." : "Coba ubah periode, atau hapus kata kunci pencarian."}
          </p>
          {(active || !!query) && <Btn variant="soft" onClick={resetFilters} className="mt-4">Tampilkan semua data</Btn>}
        </Card>
      ) : (
        <>
          {/* ─── Ringkasan ─── */}
          <Card className="grid grid-cols-2 divide-slate-100 overflow-hidden sm:grid-cols-4 sm:divide-x">
            <div className="border-b border-r border-slate-100 sm:border-b-0"><Stat label="Total Tunai" value={fmtRp(totalAll)} sub={<>{filtered.length} kiriman dalam periode</>} icon="wallet" tone="blue" /></div>
            <div className="border-b border-slate-100 sm:border-b-0 sm:border-r"><Stat label="Sudah Dicek" value={fmtRp(totalChecked)} sub={<><span className="font-medium text-slate-500">{countChecked}</span> kiriman · {percentChecked}%</>} icon="clipboard" tone="emerald" /></div>
            <div className="border-r border-slate-100"><Stat label="Belum Dicek" value={fmtRp(totalAll - totalChecked)} sub={<><span className="font-medium text-slate-500">{filtered.length - countChecked}</span> kiriman menunggu</>} icon="clock" tone="amber" /></div>
            <Stat label="Armada" value={String(groups.length)} sub={<>{filtered.length} kiriman · {perKategori.length} kategori</>} icon="truck" tone="slate" />
          </Card>

          {/* ─── Rekap Kategori & Armada ─── */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <Card className="flex flex-col overflow-hidden lg:col-span-2">
              <SectionHead title="Per Kategori" hint="Distribusi tunai berdasarkan kategori" />
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80"><tr><Th>Kategori</Th><Th right>Total Tunai</Th><Th right className="hidden sm:table-cell">Porsi</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {perKategori.map((k) => (
                      <tr key={k.kategori} className="transition hover:bg-slate-50/70">
                        <Td><KategoriBadge value={k.kategori} /></Td>
                        <Td right className="font-semibold text-slate-800">{fmtRp(k.total)}</Td>
                        <Td right className="hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-slate-400" style={{ width: `${totalAll > 0 ? Math.round((k.total / totalAll) * 100) : 0}%` }} />
                            </div>
                            <span className="w-8 text-[10px] text-slate-400">{totalAll > 0 ? Math.round((k.total / totalAll) * 100) : 0}%</span>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Total</span>
                <span className="text-xs font-bold tabular-nums text-slate-900">{fmtRp(totalAll)}</span>
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden lg:col-span-3">
              <SectionHead title="Per Armada" hint="Perbandingan tunai Prima vs Ecer" />
              <div className="max-h-[60vh] flex-1 overflow-auto print-flow">
                <table className="w-full min-w-0 text-left text-xs sm:min-w-[420px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                    <tr><Th>Armada</Th><Th right className="hidden sm:table-cell">Prima</Th><Th right className="hidden sm:table-cell">Ecer</Th><Th right>Total</Th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {perArmada.map((a) => (
                      <tr key={a.armada} className="transition hover:bg-slate-50/70">
                        <Td className="font-semibold text-slate-800">{a.armada}</Td>
                        <Td right className="hidden text-slate-500 sm:table-cell">{fmtRp(a.prima)}</Td>
                        <Td right className="hidden text-slate-500 sm:table-cell">{fmtRp(a.ecer)}</Td>
                        <Td right className="font-bold text-slate-900">{fmtRp(a.total)}</Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50/80">
                    <tr>
                      <Td className="font-semibold text-slate-500">TOTAL</Td>
                      <Td right className="hidden font-bold text-slate-800 sm:table-cell">{fmtRp(perArmada.reduce((s, a) => s + a.prima, 0))}</Td>
                      <Td right className="hidden font-bold text-slate-800 sm:table-cell">{fmtRp(perArmada.reduce((s, a) => s + a.ecer, 0))}</Td>
                      <Td right className="font-bold text-slate-900">{fmtRp(totalAll)}</Td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>

          {/* ─── Detail ─── */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 px-0.5">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-bold text-slate-900">Detail Pengiriman</p>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">{filtered.length}</span>
              </div>
              <div className="no-print ml-auto flex gap-1.5">
                <Btn variant="ghost" onClick={() => setAllGroups(true)}>Buka semua</Btn>
                <Btn variant="ghost" onClick={() => setAllGroups(false)}>Tutup semua</Btn>
              </div>
            </div>

            {groups.map((g) => {
              const open = !!expanded[g.armada];
              const allChecked = g.list.every((it) => checked[it._key]);
              const progress = g.list.length > 0 ? Math.round((g.checkedCount / g.list.length) * 100) : 0;
              return (
                <Card key={g.armada} className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition hover:bg-slate-50/60 sm:px-4">
                    <button type="button" onClick={() => setExpanded((p) => ({ ...p, [g.armada]: !p[g.armada] }))} aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:gap-3">
                      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition", open ? "bg-slate-900 text-white ring-slate-900" : "bg-slate-100 text-slate-500 ring-slate-200/70")}>
                        <Icon name="truck" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold text-slate-900 sm:text-sm">{g.armada}</span>
                          <Icon name="chevron" className={cn("h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400 sm:text-[11px]">
                          <span>{g.list.length} kiriman</span>
                          <span className="hidden h-2.5 w-px bg-slate-200 sm:block" />
                          <span className="hidden items-center gap-1.5 sm:flex">
                            <span className="h-1 w-14 overflow-hidden rounded-full bg-slate-100"><span className={cn("block h-full rounded-full transition-all", allChecked ? "bg-emerald-500" : "bg-blue-500")} style={{ width: `${progress}%` }} /></span>
                            <span className={cn(allChecked ? "text-emerald-600" : "")}>{g.checkedCount}/{g.list.length} dicek</span>
                          </span>
                        </span>
                      </span>
                    </button>

                    <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={allChecked} onChange={() => toggleCheckAll(g.list)} aria-label={`Pilih semua kiriman ${g.armada}`} className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600" />
                      <span className="hidden sm:inline">Pilih semua</span>
                    </label>

                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Subtotal</p>
                      <p className="text-[13px] font-bold tabular-nums text-slate-900 sm:text-sm">{fmtRp(g.sub)}</p>
                    </div>
                  </div>

                  {open && (
                    <>
                      {/* ── HP: kartu per kiriman ── */}
                      <div className="space-y-2 border-t border-slate-100 bg-slate-50/40 p-2.5 panel-in md:hidden">
                        {g.list.map((it) => (
                          <div key={it._key} className={cn("rounded-xl border p-2.5 transition", checked[it._key] ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white")}>
                            <div className="flex items-start gap-2.5">
                              <input type="checkbox" checked={!!checked[it._key]} onChange={() => toggleCheck(it._key, it._sheetRow)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-600" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="min-w-0 text-[13px] font-semibold leading-snug text-slate-800">{it.toko}</p>
                                  <TunaiCell it={it} />
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 tabular-nums">{it.tgl}{it.jam ? ` · ${it.jam}` : ""}</span>
                                  <KategoriBadge value={it.kategori} />
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{it.armada}</span>
                                </div>

                                <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
                                  <p><span className="text-slate-400">Driver</span> <b className="font-semibold text-slate-700">{it.driver || "—"}</b>{it.helper ? <span className="text-slate-400"> · Helper</span> : null}{it.helper ? <> <b className="font-semibold text-slate-700">{it.helper}</b></> : null}</p>
                                  <p><span className="text-slate-400">Bayar</span> {it.bayar || "—"}{it.type ? " · " + it.type : ""}{it.transfer > 0 ? <> · <span className="text-slate-400">Transfer</span> <b className="font-semibold text-slate-700">{fmtRp(it.transfer)}</b></> : null}</p>
                                </div>

                                {(it.foto || it.pod) && (
                                  <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
                                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">Bukti</p>
                                    <BuktiCell foto={it.foto} pod={it.pod} />
                                  </div>
                                )}

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                  <GpsCell gps={it.gps} />
                                  {it.retur && <span className="text-[10px] text-amber-600">↩ Retur: {it.retur}</span>}
                                </div>
                                {it.ket && <p className="mt-1 text-[10px] italic text-slate-500">{it.ket}</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ── Tablet/desktop: tabel ── */}
                      <div className="hidden max-h-[70vh] overflow-auto border-t border-slate-100 print-flow md:block">
                        <table className="w-full min-w-[1180px] text-left text-xs">
                          <thead className="sticky top-0 z-10 bg-white/95 shadow-[0_1px_0_0_#e2e8f0] backdrop-blur">
                            <tr>
                              <Th className="w-9">☑</Th><Th>Tanggal</Th><Th>Nama Toko</Th><Th>Kategori</Th><Th>Driver</Th><Th>Armada</Th><Th>Pembayaran</Th><Th right>Tunai</Th><Th right>Transfer</Th><Th>Bukti Uang / POD</Th><Th>GPS / Retur</Th><Th>Keterangan</Th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {g.list.map((it) => (
                              <tr key={it._key} className={cn("transition-colors", checked[it._key] ? "bg-emerald-50/60" : "hover:bg-slate-50/80")}>
                                <Td><input type="checkbox" checked={!!checked[it._key]} onChange={() => toggleCheck(it._key, it._sheetRow)} className="h-4 w-4 rounded border-slate-300 accent-emerald-600" /></Td>
                                <Td className="whitespace-nowrap">
                                  <span className="block font-medium text-slate-800 tabular-nums">{it.tgl || "—"}</span>
                                  {it.jam && <span className="block text-[10px] text-slate-400 tabular-nums">{it.jam}</span>}
                                </Td>
                                <Td className="max-w-[220px]"><span className="block truncate font-medium text-slate-800" title={it.toko}>{it.toko || "—"}</span></Td>
                                <Td><KategoriBadge value={it.kategori} /></Td>
                                <Td className="max-w-[160px]">
                                  <span className="block truncate text-slate-700" title={it.driver}>{it.driver || "—"}</span>
                                  {it.helper && <span className="block truncate text-[10px] text-slate-400" title={it.helper}>+ {it.helper}</span>}
                                </Td>
                                <Td className="whitespace-nowrap text-slate-600">{it.armada}</Td>
                                <Td className="whitespace-nowrap">
                                  <span className="block text-slate-700">{it.bayar || "—"}</span>
                                  {it.type && <span className="block text-[10px] text-slate-400">{it.type}</span>}
                                </Td>
                                <Td right><TunaiCell it={it} /></Td>
                                <Td right>{it.transfer > 0 ? <span className="font-medium text-slate-700">{fmtRp(it.transfer)}</span> : <span className="text-slate-300">—</span>}</Td>
                                <Td><BuktiCell foto={it.foto} pod={it.pod} /></Td>
                                <Td>
                                  <GpsCell gps={it.gps} />
                                  {it.retur && <span className="mt-0.5 block text-[10px] text-amber-600">↩ {it.retur}</span>}
                                </Td>
                                <Td className="max-w-[180px]"><span className="block truncate text-[11px] text-slate-500" title={it.ket}>{it.ket || "—"}</span></Td>
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
          </div>

          <p className="no-print pb-2 text-center text-[10px] text-slate-400">
            Data tersinkron otomatis tiap 60 detik{last ? ` · terakhir ${last}` : ""}. Klik nominal tunai untuk mengubah.
          </p>
        </>
      )}
    </div>
  );
}

/* ═══ Home ═══ */
export default function Home() {
  const [rows, setRows] = useState<string[][]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [last, setLast] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ekspedisi", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengambil data.");
      setRows(data.rows || []); setPhotos(data.photos || {});
      setLast(new Date().toLocaleTimeString("id-ID")); setErr("");
    } catch (e: any) { setErr(e.message || "Gagal mengambil data dari spreadsheet."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const busy = loading || refreshing;

return (
    <div className="min-h-screen bg-[radial-gradient(1200px_500px_at_50%_-240px,#e6edf7_0%,transparent_70%)]">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-[13px] font-black tracking-tight text-white shadow-sm overflow-hidden">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain p-1" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-base">Laporan Ekspedisi</h1>
            <p className="truncate text-[10px] text-slate-400 sm:text-[11px]">CV Prima Mandiri Distribusi · Rekap harian pengiriman</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <span
              title={last ? `Terakhir diperbarui ${last}` : undefined}
              className={cn("hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:inline-flex",
                err ? "border-red-200/70 bg-red-50 text-red-600" : busy ? "border-blue-200/70 bg-blue-50 text-blue-700" : "border-emerald-200/70 bg-emerald-50 text-emerald-700")}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", err ? "bg-red-500" : busy ? "animate-pulse bg-blue-500" : "bg-emerald-500")} />
              {err ? "Terputus" : busy ? "Memuat" : last ? `Terhubung · ${last}` : "Terhubung"}
            </span>
            <button type="button" onClick={() => { setRefreshing(true); load(); }} disabled={busy} title="Muat ulang data" aria-label="Muat ulang data" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] disabled:opacity-50">
              <Icon name="refresh" className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
            </button>
            <button type="button" onClick={() => window.print()} title="Cetak laporan" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] sm:text-xs">
              <Icon name="print" className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-3 py-3 sm:px-6 sm:py-5">
        <div className="mb-3 hidden print:block">
          <h1 className="text-lg font-bold">Laporan Ekspedisi</h1>
          <p suppressHydrationWarning className="text-xs text-slate-500">Dicetak {new Date().toLocaleString("id-ID")}</p>
        </div>
        <EkspedisiView rows={rows} photos={photos} err={err} last={last} />
      </main>
    </div>
  );
}
