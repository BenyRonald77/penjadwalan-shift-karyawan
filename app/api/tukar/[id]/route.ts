import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ambilJadwalMinggu, selisihPelanggaran, validasiHipotesis } from "@/lib/shift";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.tukarShift.findUnique({
    where: { id },
    include: {
      jadwalAsal: { include: { template: true } },
      karyawanPemohon: true,
      karyawanPengganti: true,
    },
  });
  if (!row) return NextResponse.json({ error: "pengajuan tidak ditemukan" }, { status: 404 });
  return NextResponse.json(row);
}

/**
 * PATCH /api/tukar/[id] — { keputusan: "setujui" | "tolak" }.
 * Disetujui: jadwal_asal berpindah ke pengganti setelah validasi ulang aturan
 * (melanggar -> 409). Ditolak: status saja yang berubah.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json().catch(() => null);
  const keputusan = body?.keputusan;

  const pengajuan = await prisma.tukarShift.findUnique({
    where: { id },
    include: { jadwalAsal: true, karyawanPengganti: true },
  });
  if (!pengajuan) return NextResponse.json({ error: "pengajuan tidak ditemukan" }, { status: 404 });
  if (pengajuan.status !== "pending") {
    return NextResponse.json({ error: `pengajuan sudah ${pengajuan.status}` }, { status: 409 });
  }
  if (keputusan !== "setujui" && keputusan !== "tolak") {
    return NextResponse.json({ error: 'keputusan harus "setujui" atau "tolak"' }, { status: 400 });
  }

  if (keputusan === "tolak") {
    const updated = await prisma.tukarShift.update({ where: { id }, data: { status: "ditolak" } });
    return NextResponse.json(updated);
  }

  // setujui: validasi ulang seolah jadwal sudah berpindah ke pengganti
  const { mingguMulai, rows } = await ambilJadwalMinggu(pengajuan.jadwalAsal.tanggal);
  const hipotesis = rows.map((r) =>
    r.id === pengajuan.jadwalAsalId
      ? {
          ...r,
          karyawanId: pengajuan.karyawanPenggantiId,
          karyawanNama: pengajuan.karyawanPengganti.nama,
          maksJamMingguKaryawan: pengajuan.karyawanPengganti.maksJamMinggu,
        }
      : r
  );
  const sebelum = await validasiHipotesis(rows, mingguMulai);
  const sesudah = await validasiHipotesis(hipotesis, mingguMulai);
  const pelanggaran = selisihPelanggaran(sebelum, sesudah);
  if (pelanggaran.length > 0) {
    return NextResponse.json(
      { error: "Persetujuan tukar shift melanggar aturan", pelanggaran },
      { status: 409 }
    );
  }

  await prisma.jadwalShift.update({
    where: { id: pengajuan.jadwalAsalId },
    data: { karyawanId: pengajuan.karyawanPenggantiId },
  });
  const updated = await prisma.tukarShift.update({ where: { id }, data: { status: "disetujui" } });
  return NextResponse.json(updated);
}
