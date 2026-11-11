export const dynamic = "force-dynamic";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSv4YvcmiT6ThR4FS4F6znSo7GSWOJ5hN4radzDrqMyikF2yisZybIMYSng9vgi6TAPUbD5mbKGXMJL/pub?gid=794983242&single=true&output=csv";
// Sebaiknya diisi lewat environment variable (Netlify/Vercel). Nilai lama dipertahankan sebagai cadangan agar tidak putus.
const DRIVE_API_KEY = process.env.DRIVE_API_KEY || "AIzaSyBp69hmKc1s7jtoUvXG8EtQUn5SdZXWqVw";
const FOLDER_ID_FOTO = "1n0rx70MJ9X6zUbinPVEHFHMJR8miOpvg";
const FOLDER_ID_POD = "1yhZvZdVT-ZdfrOjgQbuc1yxZko1hxc6Q";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch === "\r") { /* skip */ }
      else cur += ch;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function getDriveMap(folderId: string): Promise<Record<string, string>> {
  if (!DRIVE_API_KEY || DRIVE_API_KEY.startsWith("PASTE")) return {};
  try {
    const url = "https://www.googleapis.com/drive/v3/files?q=%27" + folderId + "%27%20in%20parents&fields=files(id,name)&pageSize=1000&key=" + DRIVE_API_KEY;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return {};
    const data: { files?: { id: string; name?: string }[] } = await res.json();
    const map: Record<string, string> = {};
    (data.files || []).forEach((f) => { if (f.name) map[f.name.trim()] = f.id; });
    return map;
  } catch { return {}; }
}

export async function GET() {
  try {
    const [csvRes, fotos, pods] = await Promise.all([
      fetch(CSV_URL, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }),
      getDriveMap(FOLDER_ID_FOTO),
      getDriveMap(FOLDER_ID_POD),
    ]);
    if (!csvRes.ok) return Response.json({ rows: [], error: "Spreadsheet gagal diambil (HTTP " + csvRes.status + ")" }, { status: 502 });
    const photos: Record<string, string> = { ...fotos, ...pods };
    return Response.json({ rows: parseCSV(await csvRes.text()), photos, updated: new Date().toISOString() });
  } catch (e) {
    return Response.json({ rows: [], error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
