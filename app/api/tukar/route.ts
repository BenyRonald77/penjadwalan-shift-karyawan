import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nowIso } from "@/lib/format";

export async function GET() {
  const rows = await prisma.tukarShift.findMany({
    orderBy: { id: "desc" },
    include: {
      jadwalAsal: { include: { template: true } },
      karyawanPemohon: true,
      karyawanPengganti: true,
    },
  });
  return NextResponse.json(rows);
}

/**
 * POST /api/tukar — ajukan tukar shift.
 * Body: { jadwal_asal_id, karyawan_pengganti_id, alasan? } -> status pending.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const jadwalAsalId = Number(body?.jadwal_asal_id ?? body?.jadwalAsalId);
  const penggantiId = Number(body?.karyawan_pengganti_id ?? body?.karyawanPenggantiId);
  const alasan = typeof body?.alasan === "string" ? body.alasan.trim() : "";

  if (!Number.isInteger(jadwalAsalId) || jadwalAsalId <= 0) {
    return NextResponse.json({ error: "jadwal_asal_id tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(penggantiId) || penggantiId <= 0) {
    return NextResponse.json({ error: "karyawan_pengganti_id tidak valid" }, { status: 400 });
  }
  const jadwal = await prisma.jadwalShift.findUnique({ where: { id: jadwalAsalId } });
  if (!jadwal) return NextResponse.json({ error: "jadwal tidak ditemukan" }, { status: 404 });
  const pengganti = await prisma.karyawan.findUnique({ where: { id: penggantiId } });
  if (!pengganti) return NextResponse.json({ error: "karyawan pengganti tidak ditemukan" }, { status: 404 });
  if (jadwal.karyawanId === penggantiId) {
    return NextResponse.json({ error: "pengganti harus karyawan yang berbeda" }, { status: 400 });
  }
  const pendingAda = await prisma.tukarShift.findFirst({
    where: { jadwalAsalId, status: "pending" },
  });
  if (pendingAda) {
    return NextResponse.json({ error: "sudah ada pengajuan pending untuk jadwal ini" }, { status: 409 });
  }

  const created = await prisma.tukarShift.create({
    data: {
      jadwalAsalId,
      karyawanPemohonId: jadwal.karyawanId,
      karyawanPenggantiId: penggantiId,
      status: "pending",
      alasan: alasan || null,
      dibuatPada: nowIso(),
    },
    include: { karyawanPemohon: true, karyawanPengganti: true, jadwalAsal: { include: { template: true } } },
  });
  return NextResponse.json(created, { status: 201 });
}
