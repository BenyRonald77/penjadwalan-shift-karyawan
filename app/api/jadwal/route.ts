import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ambilJadwalMinggu,
  validasiHipotesis,
  type JadwalRow,
} from "@/lib/shift";
import { seninMinggu, tambahHari, today } from "@/lib/format";

const TGL_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/jadwal?minggu=YYYY-MM-DD — data grid mingguan. */
export async function GET(req: NextRequest) {
  const minggu = req.nextUrl.searchParams.get("minggu") ?? today();
  if (!TGL_RE.test(minggu)) {
    return NextResponse.json({ error: "parameter minggu harus format YYYY-MM-DD" }, { status: 400 });
  }
  const mingguMulai = seninMinggu(minggu);
  const { mingguSelesai, rows } = await ambilJadwalMinggu(minggu);
  const templates = await prisma.shiftTemplate.findMany({ orderBy: { id: "asc" } });
  const dates: string[] = [];
  for (let d = 0; d < 7; d++) dates.push(tambahHari(mingguMulai, d));
  return NextResponse.json({ mingguMulai, mingguSelesai, dates, templates, jadwal: rows });
}

/**
 * POST /api/jadwal — assign manual.
 * Body: { karyawan_id, tanggal, shift_template_id, force? }
 * Divalidasi terhadap aturan; melanggar -> 409 (kecuali force=true).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const karyawanId = Number(body?.karyawan_id ?? body?.karyawanId);
  const templateId = Number(body?.shift_template_id ?? body?.templateId);
  const tanggal = body?.tanggal;
  const force = body?.force === true;

  if (!Number.isInteger(karyawanId) || karyawanId <= 0) {
    return NextResponse.json({ error: "karyawan_id tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return NextResponse.json({ error: "shift_template_id tidak valid" }, { status: 400 });
  }
  if (typeof tanggal !== "string" || !TGL_RE.test(tanggal)) {
    return NextResponse.json({ error: "tanggal harus format YYYY-MM-DD" }, { status: 400 });
  }
  const karyawan = await prisma.karyawan.findUnique({ where: { id: karyawanId } });
  if (!karyawan) return NextResponse.json({ error: "karyawan tidak ditemukan" }, { status: 404 });
  const template = await prisma.shiftTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "template shift tidak ditemukan" }, { status: 404 });

  const { mingguMulai, rows } = await ambilJadwalMinggu(tanggal);
  const baru: JadwalRow = {
    id: -1,
    karyawanId: karyawan.id,
    karyawanNama: karyawan.nama,
    maksJamMingguKaryawan: karyawan.maksJamMinggu,
    tanggal,
    templateId: template.id,
    templateNama: template.nama,
    jamMulai: template.jamMulai,
    jamSelesai: template.jamSelesai,
    kebutuhanMinimum: template.kebutuhanMinimum,
  };
  const pelanggaran = await validasiHipotesis([...rows, baru], mingguMulai);
  if (pelanggaran.length > 0 && !force) {
    return NextResponse.json(
      { error: "Penjadwalan melanggar aturan", pelanggaran },
      { status: 409 }
    );
  }

  const created = await prisma.jadwalShift.create({
    data: { karyawanId, tanggal, templateId, status: "terjadwal" },
  });
  return NextResponse.json({ jadwal: created, pelanggaranDiabaikan: force ? pelanggaran : [] }, { status: 201 });
}
