import { NextRequest, NextResponse } from "next/server";
import { generateMinggu } from "@/lib/shift";
import { today } from "@/lib/format";

const TGL_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/jadwal/generate — generator jadwal mingguan otomatis (idempoten).
 * Body: { minggu_mulai: "YYYY-MM-DD" } (dinormalisasi ke Senin).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const minggu = body?.minggu_mulai ?? body?.mingguMulai ?? today();
  if (typeof minggu !== "string" || !TGL_RE.test(minggu)) {
    return NextResponse.json({ error: "minggu_mulai harus format YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const hasil = await generateMinggu(minggu);
    return NextResponse.json({ ok: true, ...hasil }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "gagal generate" }, { status: 400 });
  }
}
