# PRD — Penjadwalan Shift Karyawan

## Ringkasan
Aplikasi penjadwalan shift karyawan: master data karyawan & template shift, generator
jadwal mingguan otomatis yang menghormati aturan jam kerja, deteksi pelanggaran otomatis,
serta pengajuan tukar shift dengan approval.

## Stack
Next.js 14 + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS. UI berbahasa Indonesia.

## Model Data
- **Karyawan**: nama, jabatan, maks_jam_minggu (default 40).
- **ShiftTemplate**: nama (mis. Pagi/Siang/Malam), jam_mulai (HH:MM), jam_selesai (HH:MM),
  kebutuhan_minimum (jumlah karyawan minimum per template per hari).
- **JadwalShift**: karyawan_id, tanggal (TEXT YYYY-MM-DD), shift_template_id,
  status (default "terjadwal").
- **Aturan**: key unik + value TEXT. Key: `MAKS_JAM_MINGGU` (default "40"),
  `JEDA_MINIMAL_JAM` (default "11"), `KEBUTUHAN_MIN_PER_JAM` (default "2").
- **TukarShift**: jadwal_asal_id, karyawan_pemohon_id, karyawan_pengganti_id,
  status (pending/disetujui/ditolak), alasan, dibuat_pada (ISO TEXT).

## Fungsionalitas
- **F0 — Setup**: schema Prisma, seed (6 karyawan, 3 template: Pagi 08:00–16:00,
  Siang 14:00–22:00, Malam 22:00–06:00; aturan default maks 40 jam/minggu, jeda minimal
  11 jam, kebutuhan min 2; beberapa jadwal contoh), layout, dashboard.
- **F1 — Master data**: CRUD karyawan, shift template, dan aturan (halaman + API).
- **F2 — Generator jadwal otomatis**: `POST /api/jadwal/generate` {minggu_mulai: YYYY-MM-DD}
  → assign karyawan ke setiap template per hari secara round-robin sambil menghormati
  aturan (maks jam/minggu, jeda minimal antar shift, kebutuhan minimum).
  Idempoten: generate ulang untuk minggu yang sama tidak duplikat
  (jadwal minggu itu dihapus lalu dibuat ulang). `GET /api/jadwal?minggu=YYYY-MM-DD`.
- **F3 — Validasi pelanggaran**: `GET /api/jadwal/validasi?minggu=` → daftar pelanggaran:
  (a) karyawan melebihi maks jam/minggu; (b) jeda antar shift < JEDA_MINIMAL_JAM;
  (c) slot tanggal+template dengan karyawan < kebutuhan minimum.
  `POST /api/jadwal` manual juga divalidasi → 409 berisi daftar pelanggaran
  (bisa dioverride dengan `force: true`). Halaman menampilkan pelanggaran dengan highlight.
- **F4 — Tukar shift**: `POST /api/tukar` {jadwal_asal_id, karyawan_pengganti_id, alasan}
  → status pending. `PATCH /api/tukar/[id]` {keputusan: "setujui"|"tolak"} → jika disetujui,
  jadwal_asal berpindah ke pengganti setelah validasi ulang aturan (melanggar → 409).
  Halaman daftar pengajuan + tombol setujui/tolak.
- **F5 — Tampilan jadwal mingguan**: halaman `/jadwal` berupa grid 7 hari × template shift
  dengan nama karyawan, filter minggu (prev/next), badge pelanggaran.

## Aturan Bisnis
1. Jam kerja mingguan per karyawan ≤ min(karyawan.maks_jam_minggu, aturan MAKS_JAM_MINGGU).
2. Jeda antara akhir satu shift dan awal shift berikutnya ≥ aturan JEDA_MINIMAL_JAM
   (shift malam yang melewati tengah malam dihitung dengan benar).
3. Setiap slot tanggal+template terisi ≥ template.kebutuhan_minimum karyawan.
4. Durasi shift = selisih jam_selesai − jam_mulai; jika jam_selesai ≤ jam_mulai,
   dianggap lewat tengah malam (+24 jam).
5. Minggu selalu dinormalisasi ke hari Senin.
6. Tukar shift yang disetujui memindahkan kepemilikan jadwal; penolakan tidak mengubah apa pun.
