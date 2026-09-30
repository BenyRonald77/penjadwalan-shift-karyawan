import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.karyawan.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nama !== "string" || body.nama.trim() === "") {
    return NextResponse.json({ error: "nama wajib diisi" }, { status: 400 });
  }
  const maks = body.maks_jam_minggu ?? body.maksJamMinggu ?? 40;
  if (!Number.isInteger(maks) || maks <= 0 || maks > 168) {
    return NextResponse.json({ error: "maks_jam_minggu harus bilangan 1-168" }, { status: 400 });
  }
  const created = await prisma.karyawan.create({
    data: {
      nama: body.nama.trim(),
      jabatan: typeof body.jabatan === "string" && body.jabatan.trim() !== "" ? body.jabatan.trim() : null,
      maksJamMinggu: maks,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
