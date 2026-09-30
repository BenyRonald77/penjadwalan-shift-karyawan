import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { durasiJam, jamValid } from "@/lib/shift";

export async function GET() {
  const rows = await prisma.shiftTemplate.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.nama !== "string" || body.nama.trim() === "") {
    return NextResponse.json({ error: "nama wajib diisi" }, { status: 400 });
  }
  const { jam_mulai, jamMulai, jam_selesai, jamSelesai } = body ?? {};
  const jm = jam_mulai ?? jamMulai;
  const js = jam_selesai ?? jamSelesai;
  if (!jamValid(jm) || !jamValid(js)) {
    return NextResponse.json({ error: "jam_mulai dan jam_selesai harus format HH:MM" }, { status: 400 });
  }
  if (durasiJam(jm, js) <= 0 || durasiJam(jm, js) > 24) {
    return NextResponse.json({ error: "durasi shift tidak valid" }, { status: 400 });
  }
  const butuh = body.kebutuhan_minimum ?? body.kebutuhanMinimum ?? 2;
  if (!Number.isInteger(butuh) || butuh < 1) {
    return NextResponse.json({ error: "kebutuhan_minimum harus bilangan >= 1" }, { status: 400 });
  }
  const created = await prisma.shiftTemplate.create({
    data: { nama: body.nama.trim(), jamMulai: jm, jamSelesai: js, kebutuhanMinimum: butuh },
  });
  return NextResponse.json(created, { status: 201 });
}
