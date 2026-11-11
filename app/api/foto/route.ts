export const dynamic = "force-dynamic";

const ALLOWED_SIZES = new Set(["w200", "w400", "w800"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  const size = url.searchParams.get("sz") || "w200";

  // ID file Drive hanya huruf/angka/-/_. Ini juga mencegah proxy dipakai untuk URL lain.
  if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) {
    return new Response("ID tidak valid", { status: 400 });
  }

  const sz = ALLOWED_SIZES.has(size) ? size : "w200";

  try {
    const upstream = await fetch(
      "https://drive.google.com/thumbnail?id=" + id + "&sz=" + sz,
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" },
    );
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !upstream.body || !type.startsWith("image/")) {
      return new Response("Gambar tidak tersedia", { status: 404 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("Gagal mengambil gambar", { status: 502 });
  }
}
