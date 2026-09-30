import { prisma } from "@/lib/prisma";
import { seninMinggu, tambahHari } from "@/lib/format";

export type Pelanggaran = {
  tipe: "jam_berlebih" | "jeda_kurang" | "kekurangan_personel";
  pesan: string;
  karyawanId?: number;
  karyawanNama?: string;
  tanggal?: string;
  templateId?: number;
  templateNama?: string;
};

export type AturanKerja = {
  maksJamMinggu: number;
  jedaMinimalJam: number;
  kebutuhanMinPerJam: number;
};

export type JadwalRow = {
  id: number;
  karyawanId: number;
  karyawanNama: string;
  maksJamMingguKaryawan: number;
  tanggal: string;
  templateId: number;
  templateNama: string;
  jamMulai: string;
  jamSelesai: string;
  kebutuhanMinimum: number;
};

function jamKeMenit(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Validasi format HH:MM dengan jam 00-23 dan menit 00-59. */
export function jamValid(hhmm: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return false;
  const h = Number(m[1]);
  const mn = Number(m[2]);
  return h >= 0 && h <= 23 && mn >= 0 && mn <= 59;
}

/** Durasi shift dalam jam; jam_selesai <= jam_mulai berarti lewat tengah malam. */
export function durasiJam(jamMulai: string, jamSelesai: string): number {
  const a = jamKeMenit(jamMulai);
  let b = jamKeMenit(jamSelesai);
  if (b <= a) b += 24 * 60;
  return (b - a) / 60;
}

/** Menit absolut relatif ke Senin 00:00 minggu berjalan. */
function intervalAbsolut(tanggal: string, mingguMulai: string, jamMulai: string, jamSelesai: string) {
  const [y1, m1, d1] = mingguMulai.split("-").map(Number);
  const [y2, m2, d2] = tanggal.split("-").map(Number);
  const base = Date.UTC(y1, m1 - 1, d1);
  const cur = Date.UTC(y2, m2 - 1, d2);
  const hariKe = Math.round((cur - base) / 86400000);
  const a = jamKeMenit(jamMulai);
  let b = jamKeMenit(jamSelesai);
  if (b <= a) b += 24 * 60;
  return { mulai: hariKe * 1440 + a, selesai: hariKe * 1440 + b };
}

export async function getAturanKerja(): Promise<AturanKerja> {
  const rows = await prisma.aturan.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    maksJamMinggu: Number(map["MAKS_JAM_MINGGU"] ?? 40) || 40,
    jedaMinimalJam: Number(map["JEDA_MINIMAL_JAM"] ?? 11) || 11,
    kebutuhanMinPerJam: Number(map["KEBUTUHAN_MIN_PER_JAM"] ?? 2) || 2,
  };
}

export async function ambilJadwalMinggu(minggu: string): Promise<{ mingguMulai: string; mingguSelesai: string; rows: JadwalRow[] }> {
  const mingguMulai = seninMinggu(minggu);
  const mingguSelesai = tambahHari(mingguMulai, 6);
  const data = await prisma.jadwalShift.findMany({
    where: { tanggal: { gte: mingguMulai, lte: mingguSelesai } },
    include: { karyawan: true, template: true },
    orderBy: [{ tanggal: "asc" }, { id: "asc" }],
  });
  const rows: JadwalRow[] = data.map((j) => ({
    id: j.id,
    karyawanId: j.karyawanId,
    karyawanNama: j.karyawan.nama,
    maksJamMingguKaryawan: j.karyawan.maksJamMinggu,
    tanggal: j.tanggal,
    templateId: j.templateId,
    templateNama: j.template.nama,
    jamMulai: j.template.jamMulai,
    jamSelesai: j.template.jamSelesai,
    kebutuhanMinimum: j.template.kebutuhanMinimum,
  }));
  return { mingguMulai, mingguSelesai, rows };
}

export type TemplateInfo = { id: number; nama: string; kebutuhanMinimum: number };

/** Validasi murni atas daftar jadwal (tidak menyentuh DB). */
export function validasiRows(
  rows: JadwalRow[],
  aturan: AturanKerja,
  mingguMulai: string,
  templates: TemplateInfo[]
): Pelanggaran[] {
  const out: Pelanggaran[] = [];

  // (a) total jam per karyawan
  const jamPerKaryawan = new Map<number, { nama: string; jam: number; maks: number }>();
  for (const r of rows) {
    const cur = jamPerKaryawan.get(r.karyawanId) ?? {
      nama: r.karyawanNama,
      jam: 0,
      maks: Math.min(r.maksJamMingguKaryawan, aturan.maksJamMinggu),
    };
    cur.jam += durasiJam(r.jamMulai, r.jamSelesai);
    jamPerKaryawan.set(r.karyawanId, cur);
  }
  for (const [id, v] of jamPerKaryawan) {
    if (v.jam > v.maks) {
      out.push({
        tipe: "jam_berlebih",
        pesan: `${v.nama} terjadwal ${v.jam.toFixed(1)} jam/minggu, melebihi batas ${v.maks} jam.`,
        karyawanId: id,
        karyawanNama: v.nama,
      });
    }
  }

  // (b) jeda antar shift per karyawan
  const perKaryawan = new Map<number, JadwalRow[]>();
  for (const r of rows) {
    const arr = perKaryawan.get(r.karyawanId) ?? [];
    arr.push(r);
    perKaryawan.set(r.karyawanId, arr);
  }
  for (const [id, arr] of perKaryawan) {
    const iv = arr
      .map((r) => ({ r, ...intervalAbsolut(r.tanggal, mingguMulai, r.jamMulai, r.jamSelesai) }))
      .sort((x, y) => x.mulai - y.mulai);
    for (let i = 1; i < iv.length; i++) {
      const jedaJam = (iv[i].mulai - iv[i - 1].selesai) / 60;
      if (jedaJam < aturan.jedaMinimalJam) {
        out.push({
          tipe: "jeda_kurang",
          pesan: `${iv[i].r.karyawanNama}: jeda antara shift ${iv[i - 1].r.tanggal} (${iv[i - 1].r.templateNama}) dan ${iv[i].r.tanggal} (${iv[i].r.templateNama}) hanya ${jedaJam.toFixed(1)} jam, minimal ${aturan.jedaMinimalJam} jam.`,
          karyawanId: id,
          karyawanNama: iv[i].r.karyawanNama,
          tanggal: iv[i].r.tanggal,
        });
      }
    }
  }

  // (c) kebutuhan minimum per slot tanggal+template (termasuk slot kosong)
  for (let d = 0; d < 7; d++) {
    const tanggal = tambahHari(mingguMulai, d);
    for (const t of templates) {
      const terisi = rows.filter((r) => r.tanggal === tanggal && r.templateId === t.id).length;
      if (terisi < t.kebutuhanMinimum) {
        out.push({
          tipe: "kekurangan_personel",
          pesan: `${tanggal} shift ${t.nama}: terisi ${terisi} karyawan, butuh minimum ${t.kebutuhanMinimum}.`,
          tanggal,
          templateId: t.id,
          templateNama: t.nama,
        });
      }
    }
  }

  return out;
}

export async function validasiMinggu(minggu: string) {
  const aturan = await getAturanKerja();
  const templates = await prisma.shiftTemplate.findMany({ orderBy: { id: "asc" } });
  const { mingguMulai, mingguSelesai, rows } = await ambilJadwalMinggu(minggu);
  const pelanggaran = validasiRows(rows, aturan, mingguMulai, templates);
  return { mingguMulai, mingguSelesai, aturan, totalJadwal: rows.length, pelanggaran };
}

/** Selisih pelanggaran: hanya yang BARU muncul di `sesudah` (identitas = tipe+karyawan+tanggal+template). */
export function selisihPelanggaran(sebelum: Pelanggaran[], sesudah: Pelanggaran[]): Pelanggaran[] {
  const kunci = (p: Pelanggaran) => [p.tipe, p.karyawanId ?? "", p.tanggal ?? "", p.templateId ?? ""].join("|");
  const ada = new Set(sebelum.map(kunci));
  return sesudah.filter((p) => !ada.has(kunci(p)));
}

/** Validasi hipotetis untuk POST manual / persetujuan tukar (tanpa tulis DB). */
export async function validasiHipotesis(rows: JadwalRow[], minggu: string) {
  const aturan = await getAturanKerja();
  const mingguMulai = seninMinggu(minggu);
  const templates = await prisma.shiftTemplate.findMany({ orderBy: { id: "asc" } });
  return validasiRows(rows, aturan, mingguMulai, templates);
}

/**
 * Generator jadwal mingguan: round-robin per hari × template,
 * menghormati maks jam/minggu, jeda minimal, dan kebutuhan minimum.
 * Idempoten: jadwal minggu tsb dihapus lalu dibuat ulang.
 */
export async function generateMinggu(minggu: string) {
  const mingguMulai = seninMinggu(minggu);
  const mingguSelesai = tambahHari(mingguMulai, 6);
  const aturan = await getAturanKerja();

  const karyawan = await prisma.karyawan.findMany({ orderBy: { id: "asc" } });
  const templates = await prisma.shiftTemplate.findMany({ orderBy: { id: "asc" } });
  if (karyawan.length === 0) throw new Error("Belum ada data karyawan.");
  if (templates.length === 0) throw new Error("Belum ada template shift.");

  await prisma.jadwalShift.deleteMany({
    where: { tanggal: { gte: mingguMulai, lte: mingguSelesai } },
  });

  // status per karyawan: akumulasi jam + interval shift yang sudah di-assign
  const status = new Map<number, { jam: number; iv: { mulai: number; selesai: number }[]; maks: number }>();
  for (const k of karyawan) {
    status.set(k.id, { jam: 0, iv: [], maks: Math.min(k.maksJamMinggu, aturan.maksJamMinggu) });
  }

  function cocok(karyawanId: number, mulai: number, selesai: number, durJam: number): boolean {
    const s = status.get(karyawanId)!;
    if (s.jam + durJam > s.maks) return false;
    for (const p of s.iv) {
      if (mulai < p.selesai && p.mulai < selesai) return false; // tumpang tindih
      const gap = mulai >= p.selesai ? (mulai - p.selesai) / 60 : (p.mulai - selesai) / 60;
      if (gap < aturan.jedaMinimalJam) return false;
    }
    return true;
  }

  const dibuat: { karyawanId: number; tanggal: string; templateId: number }[] = [];
  let rr = 0;
  for (let d = 0; d < 7; d++) {
    const tanggal = tambahHari(mingguMulai, d);
    for (const t of templates) {
      const durJam = durasiJam(t.jamMulai, t.jamSelesai);
      const { mulai, selesai } = intervalAbsolut(tanggal, mingguMulai, t.jamMulai, t.jamSelesai);
      let terisi = 0;
      for (let i = 0; i < karyawan.length && terisi < t.kebutuhanMinimum; i++) {
        const k = karyawan[(rr + i) % karyawan.length];
        if (cocok(k.id, mulai, selesai, durJam)) {
          const s = status.get(k.id)!;
          s.jam += durJam;
          s.iv.push({ mulai, selesai });
          dibuat.push({ karyawanId: k.id, tanggal, templateId: t.id });
          terisi++;
          rr++;
        }
      }
      rr++;
    }
  }

  if (dibuat.length > 0) {
    await prisma.jadwalShift.createMany({ data: dibuat.map((x) => ({ ...x, status: "terjadwal" })) });
  }
  return { mingguMulai, mingguSelesai, dibuat: dibuat.length };
}
