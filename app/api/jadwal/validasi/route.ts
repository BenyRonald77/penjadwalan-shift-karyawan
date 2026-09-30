import { NextRequest, NextResponse } from "next/server";
import { validasiMinggu } from "@/lib/shift";
import { today } from "@/lib/format";

const TGL_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/jadwal/validasi?minggu=YYYY-MM-DD — daftar pelanggaran minggu itu. */
export async function GET(req: NextRequest) {
  const minggu = req.nextUrl.searchParams.get("minggu") ?? today();
  if (!TGL_RE.test(minggu)) {
    return NextResponse.json({ error: "parameter minggu harus format YYYY-MM-DD" }, { status: 400 });
  }
  const hasil = await validasiMinggu(minggu);
  return NextResponse.json(hasil);
}
