"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, string[]> = {
  search: ["M21 21l-4.35-4.35", "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"],
  refresh: ["M20 11a8 8 0 0 0-13.7-5.7L4 7", "M4 4v3.5h3.5", "M4 13a8 8 0 0 0 13.7 5.7L20 17", "M20 20v-3.5h-3.5"],
  print: ["M7 9V3h10v6", "M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1", "M7 14h10v7H7z"],
  chevron: ["m6 9 6 6 6-6"],
  check: ["m5 13 4 4L19 7"],
  wallet: ["M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z", "M3 10h18", "M16.5 15h.01"],
  clipboard: ["M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6", "m9 13 2 2 4-4"],
  clock: ["M12 8v4.5l3 1.8", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"],
  truck: ["M2 5h11v11H2z", "M13 9h4.5l3.5 4v3h-8", "M6.5 19.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z", "M17.5 19.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"],
  pin: ["M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z", "M12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  calendar: ["M8 2v4M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"],
  inbox: ["M4 13h4l1.5 3h5L16 13h4", "M4 13 6.5 5h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Z"],
  external: ["M14 4h6v6", "M20 4l-9 9", "M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"],
  dashboard: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  store: ["M4 9l1.5-5h13L20 9", "M4 9v11h16V9", "M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9", "M10 20v-5h4v5"],
  map: ["M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z", "M9 4v14", "M15 6v14"],
  filter: ["M3 5h18l-7 8.2V20l-4 2v-8.8L3 5Z"],
  route: ["M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"],
};

export function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {(ICONS[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.18)]", className)}>{children}</div>;
}

const BTN: Record<string, string> = {
  primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
  ghost: "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
  soft: "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
};
export function Btn({ children, onClick, variant = "ghost", title, className = "", disabled }: { children: React.ReactNode; onClick?: () => void; variant?: keyof typeof BTN; title?: string; className?: string; disabled?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={cn("inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50", BTN[variant], className)}>
      {children}
    </button>
  );
}

export function KategoriBadge({ value }: { value: string }) {
  const v = (value || "").toLowerCase();
  const tone = v === "prima" ? "bg-blue-50 text-blue-700 ring-blue-200/70" : v === "ecer" ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70" : "bg-slate-50 text-slate-600 ring-slate-200";
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset", tone)}>{value || "—"}</span>;
}

export function Stat({ label, value, sub, icon, tone }: { label: string; value: string; sub: React.ReactNode; icon: string; tone: "blue" | "emerald" | "amber" | "slate" }) {
  const T = { blue: "bg-blue-50 text-blue-600 ring-blue-100", emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100", amber: "bg-amber-50 text-amber-600 ring-amber-100", slate: "bg-slate-100 text-slate-600 ring-slate-200/70" } as const;
  return (
    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1 ring-inset", T[tone])}><Icon name={icon} className="h-3.5 w-3.5" /></span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums leading-tight text-slate-900 sm:text-[22px]">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

export function SectionHead({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
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

export function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="inbox" className="h-6 w-6" /></span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-400">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

const BUKTI = { uang: { dot: "bg-blue-500", text: "text-blue-600" }, pod: { dot: "bg-amber-500", text: "text-amber-600" } } as const;

/** Thumbnail bukti uang/POD dari Drive (via /api/foto), dengan retry & fallback ke tautan. */
export function BuktiThumb({ thumb, open, label, tone }: { thumb: string; open: string; label: string; tone: keyof typeof BUKTI }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const t = BUKTI[tone];
  const caption = <span className={cn("flex items-center gap-1 text-[9px] font-bold uppercase leading-none tracking-wide", t.text)}><span className={cn("h-1 w-1 rounded-full", t.dot)} />{label}</span>;
  const wrap = (children: React.ReactNode, title: string) =>
    open
      ? <a href={open} target="_blank" rel="noreferrer" title={title} className="group inline-flex flex-col items-center gap-1">{children}</a>
      : <span title={title} className="group inline-flex flex-col items-center gap-1">{children}</span>;
  if (!thumb || failed) {
    return wrap(<>
      <span className="grid h-12 w-12 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition group-hover:border-blue-300 group-hover:text-blue-500"><Icon name="external" className="h-4 w-4" /></span>
      {caption}
    </>, open ? `Buka ${label} di Drive` : `${label} tidak tersedia`);
  }
  return wrap(<>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img key={attempt} src={thumb + (attempt ? `&retry=${attempt}` : "")} alt={label} loading="lazy"
      onError={() => { if (attempt < 2) setAttempt(attempt + 1); else setFailed(true); }}
      className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 object-cover transition group-hover:border-blue-300 group-hover:shadow-sm" />
    {caption}
  </>, `Buka ${label}`);
}
