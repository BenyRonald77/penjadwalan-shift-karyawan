import { PrismaClient } from "@prisma/client";
import { seninMinggu, tambahHari, today } from "../lib/format";

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.karyawan.count();
  if (n > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  const karyawanData = [
    { nama: "Budi Santoso", jabatan: "Operator", maksJamMinggu: 40 },
    { nama: "Siti Aminah", jabatan: "Operator", maksJamMinggu: 40 },
    { nama: "Agus Wijaya", jabatan: "Teknisi", maksJamMinggu: 40 },
    { nama: "Dewi Lestari", jabatan: "Operator", maksJamMinggu: 32 },
    { nama: "Rudi Hartono", jabatan: "Supervisor", maksJamMinggu: 40 },
    { nama: "Maya Putri", jabatan: "Operator", maksJamMinggu: 40 },
  ];
  for (const k of karyawanData) await prisma.karyawan.create({ data: k });

  const templateData = [
    { nama: "Pagi", jamMulai: "08:00", jamSelesai: "16:00", kebutuhanMinimum: 2 },
    { nama: "Siang", jamMulai: "14:00", jamSelesai: "22:00", kebutuhanMinimum: 2 },
    { nama: "Malam", jamMulai: "22:00", jamSelesai: "06:00", kebutuhanMinimum: 2 },
  ];
  for (const t of templateData) await prisma.shiftTemplate.create({ data: t });

  const aturanData = [
    { key: "MAKS_JAM_MINGGU", value: "40" },
    { key: "JEDA_MINIMAL_JAM", value: "11" },
    { key: "KEBUTUHAN_MIN_PER_JAM", value: "2" },
  ];
  for (const a of aturanData) await prisma.aturan.create({ data: a });

  // Jadwal contoh minggu berjalan: Pagi terisi penuh, Siang/Malam sebagian (ada kekurangan personel)
  const minggu = seninMinggu(today());
  const karyawan = await prisma.karyawan.findMany({ orderBy: { id: "asc" } });
  const templates = await prisma.shiftTemplate.findMany({ orderBy: { id: "asc" } });
  const pagi = templates.find((t) => t.nama === "Pagi")!;
  const siang = templates.find((t) => t.nama === "Siang")!;
  const malam = templates.find((t) => t.nama === "Malam")!;

  const contoh: { k: number; d: number; t: number }[] = [];
  for (let d = 0; d < 5; d++) {
    contoh.push({ k: 0, d, t: pagi.id });
    contoh.push({ k: 1, d, t: pagi.id });
    contoh.push({ k: 2, d, t: siang.id }); // siang hanya 1 orang -> kekurangan personel
    if (d < 2) contoh.push({ k: 3, d, t: malam.id }); // malam hanya 2 hari pertama
  }
  for (const c of contoh) {
    await prisma.jadwalShift.create({
      data: {
        karyawanId: karyawan[c.k].id,
        tanggal: tambahHari(minggu, c.d),
        templateId: c.t,
        status: "terjadwal",
      },
    });
  }

  console.log(`seed selesai: ${karyawanData.length} karyawan, ${templateData.length} template, ${aturanData.length} aturan, ${contoh.length} jadwal contoh`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
