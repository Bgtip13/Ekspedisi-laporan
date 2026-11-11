/* Helper umum: angka, rupiah, tanggal. Logika parser dipertahankan dari versi lama. */
export function num(x: unknown): number { const n = Number(x); return isFinite(n) ? n : 0; }

export function toNumber(raw: unknown): number | null {
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

export const fmtRp = (n: number) => "Rp " + Math.round(num(n)).toLocaleString("id-ID");
export const fmtRpShort = (n: number) => {
  const v = Math.round(num(n));
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1).replace(".", ",") + " M";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(".", ",") + " jt";
  if (Math.abs(v) >= 1e3) return Math.round(v / 1e3) + " rb";
  return String(v);
};
export const norm = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ─── Tanggal ─── */
const M_ID: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", mei: "05", jun: "06", jul: "07", agu: "08", aug: "08", sep: "09", okt: "10", oct: "10", nov: "11", des: "12", dec: "12" };
export type DateMode = "auto" | "dmy" | "mdy";

const cleanDate = (s: string) => String(s ?? "").replace(/[\u00A0\u202F\u2007\u200B\uFEFF]/g, " ").replace(/\s+/g, " ").trim();
function fixYear(raw: string): number { let y = Number(raw); if (String(raw).length <= 2) y += y >= 70 ? 1900 : 2000; return y; }
function isoOf(y: number, mo: number, d: number): string {
  if (!(y >= 1990 && y <= 2100) || !(mo >= 1 && mo <= 12) || !(d >= 1 && d <= 31)) return "";
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "";
  return String(y).padStart(4, "0") + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function numParts(t: string) {
  const m = t.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})/);
  return m ? { a: Number(m[1]), b: Number(m[2]), y: fixYear(m[3]) } : null;
}
export function parseDate(s: string, mode: DateMode): string {
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
export function detectMode(dates: string[]): DateMode {
  let dmy = 0, mdy = 0;
  for (const s of dates) {
    const p = numParts(cleanDate(s));
    if (!p) continue;
    if (p.a > 12 && p.b <= 12) dmy++; else if (p.b > 12 && p.a <= 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}
export const isoLocal = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const dayISO = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return isoLocal(d); };
export function fmtDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${Number(d)} ${bulan[Number(m) - 1] || m} ${y.slice(2)}`;
}

/* ─── Jam & koordinat (untuk tab Peta) ─── */
/** "14:05", "14.05", "2:05 PM", "14:05:33" → menit sejak 00:00, atau null */
export function parseJam(s: string): number | null {
  const t = String(s || "").trim();
  const m = t.match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = Number(m[1]); const mi = Number(m[2]); const sec = Number(m[3] || 0);
  const ap = (m[4] || "").toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi + sec / 60;
}
export function fmtDurasi(menit: number): string {
  const m = Math.round(Math.abs(menit));
  if (m < 1) return "< 1 mnt";
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h} j ${r} mnt` : `${h} j`) : `${r} mnt`;
}
/** Ambil lat,lng dari "-6.9,110.4", URL Google Maps (@lat,lng / q=lat,lng / !3d..!4d..) */
export function parseLatLng(raw: string): { lat: number; lng: number } | null {
  const s = decodeURIComponent(String(raw || "").trim().replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
  if (!s) return null;
  const pats = [/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/];
  for (const p of pats) {
    const m = s.match(p);
    if (m) {
      const lat = Number(m[1]), lng = Number(m[2]);
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) return { lat, lng };
    }
  }
  return null;
}
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtDateLong(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return isoLocal(dt);
}
