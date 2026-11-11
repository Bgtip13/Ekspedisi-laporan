"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Stop = { n: number; key: string; lat: number; lng: number; toko: string; jam: string; selisih: string; km: string };

/** Peta Leaflet (OpenStreetMap): titik bernomor + garis jalur antar titik. */
export default function MapView({ stops, activeKey, onSelect }: { stops: Stop[]; activeKey: string | null; onSelect: (key: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([-7.0, 110.4], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const ro = new ResizeObserver(() => map.current?.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers(); markers.current = {};
    if (!stops.length) return;
    const pts: L.LatLngExpression[] = stops.map((s) => [s.lat, s.lng]);
    if (pts.length > 1) {
      L.polyline(pts, { color: "#ffffff", weight: 8, opacity: 0.9 }).addTo(g);
      L.polyline(pts, { color: "#2563eb", weight: 4, opacity: 0.9, dashArray: "1 9", lineCap: "round" }).addTo(g);
      // panah arah di tengah tiap ruas
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i], b = stops[i + 1];
        const ang = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
        L.marker([(a.lat + b.lat) / 2, (a.lng + b.lng) / 2], {
          interactive: false,
          icon: L.divIcon({ className: "", iconSize: [14, 14], iconAnchor: [7, 7], html: `<div style="transform:rotate(${ang}deg);color:#1d4ed8;font-size:14px;line-height:14px;text-shadow:0 0 3px #fff">▲</div>` }),
        }).addTo(g);
      }
    }
    stops.forEach((s, i) => {
      const first = i === 0, last = i === stops.length - 1 && stops.length > 1;
      const bg = first ? "#059669" : last ? "#dc2626" : "#0f172a";
      const mk = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 15], html: `<div style="width:30px;height:30px;border-radius:9999px;background:${bg};color:#fff;font:700 12px system-ui;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${s.n}</div>` }),
      }).addTo(g);
      const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
      mk.bindPopup(`<div style="font:12px system-ui;min-width:150px"><b>${s.n}. ${esc(s.toko || "Titik")}</b><br/>Jam: ${esc(s.jam || "—")}${s.selisih ? `<br/>Dari titik sebelumnya: <b>${esc(s.selisih)}</b>` : ""}${s.km ? `<br/>Jarak ± ${esc(s.km)}` : ""}<br/><a target="_blank" rel="noreferrer" href="https://www.google.com/maps?q=${s.lat},${s.lng}">Buka di Google Maps</a></div>`);
      mk.on("click", () => onSelect(s.key));
      markers.current[s.key] = mk;
    });
    m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
  }, [stops, onSelect]);

  useEffect(() => {
    if (!activeKey) return;
    const mk = markers.current[activeKey];
    if (mk && map.current) { map.current.panTo(mk.getLatLng()); mk.openPopup(); }
  }, [activeKey]);

  return <div ref={el} className="h-full w-full" />;
}
