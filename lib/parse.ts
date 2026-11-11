import type { Item } from "./types";
import { norm, toNumber } from "./utils";

/** Ubah baris CSV mentah → daftar Item. Pemetaan kolom sama persis dengan versi lama. */
export function rowsToItems(rows: string[][]): Item[] {
  if (!rows.length) return [];
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
}
