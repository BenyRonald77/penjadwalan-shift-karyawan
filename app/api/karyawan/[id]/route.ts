import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.karyawan.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "karyawan tidak ditemukan" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json().catch(() => null);
  const existing = await prisma.karyawan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "karyawan tidak ditemukan" }, { status: 404 });
  if (body?.nama !== undefined && (typeof body.nama !== "string" || body.nama.trim() === "")) {
    return NextResponse.json({ error: "nama tidak valid" }, { status: 400 });
  }
  const maks = body?.maks_jam_minggu ?? body?.maksJamMinggu;
  if (maks !== undefined && (!Number.isInteger(maks) || maks <= 0 || maks > 168)) {
    return NextResponse.json({ error: "maks_jam_minggu harus bilangan 1-168" }, { status: 400 });
  }
  const updated = await prisma.karyawan.update({
    where: { id },
    data: {
      ...(body?.nama !== undefined ? { nama: body.nama.trim() } : {}),
      ...(body?.jabatan !== undefined
        ? { jabatan: typeof body.jabatan === "string" && body.jabatan.trim() !== "" ? body.jabatan.trim() : null }
        : {}),
      ...(maks !== undefined ? { maksJamMinggu: maks } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const existing = await prisma.karyawan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "karyawan tidak ditemukan" }, { status: 404 });
  await prisma.karyawan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
