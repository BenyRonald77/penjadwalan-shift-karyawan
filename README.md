# Penjadwalan Shift Karyawan

Aplikasi penjadwalan shift karyawan: master data karyawan & template shift,
generator jadwal mingguan otomatis yang menghormati aturan jam kerja,
deteksi pelanggaran otomatis, dan pengajuan tukar shift dengan approval.
UI berbahasa Indonesia.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## Halaman

- `/` — Dashboard: ringkasan karyawan, template, jadwal minggu ini, pengajuan pending, dan daftar pelanggaran.
- `/jadwal` — Grid jadwal mingguan (7 hari × template shift), navigasi prev/next minggu,
  tombol generate otomatis, form tambah jadwal manual, dan badge pelanggaran.
- `/karyawan` — CRUD karyawan (nama, jabatan, maks jam/minggu).
- `/shift-template` — CRUD template shift (nama, jam mulai/selesai, kebutuhan minimum).
- `/aturan` — Ubah aturan: MAKS_JAM_MINGGU, JEDA_MINIMAL_JAM, KEBUTUHAN_MIN_PER_JAM.
- `/tukar` — Daftar pengajuan tukar shift + tombol setujui/tolak.

## API

- `GET/POST /api/karyawan`, `GET/PUT/DELETE /api/karyawan/[id]`
- `GET/POST /api/shift-template`, `GET/PUT/DELETE /api/shift-template/[id]`
- `GET/POST /api/aturan` (upsert berdasarkan key)
- `GET /api/jadwal?minggu=YYYY-MM-DD` — data grid mingguan
- `POST /api/jadwal` — assign manual; divalidasi, melanggar → 409 (override dengan `force: true`)
- `POST /api/jadwal/generate` — `{ minggu_mulai }`; round-robin, idempoten
- `GET /api/jadwal/validasi?minggu=` — daftar pelanggaran
- `GET/POST /api/tukar` — ajukan tukar shift (status pending)
- `GET/PATCH /api/tukar/[id]` — `{ keputusan: "setujui" | "tolak" }`; persetujuan
  memindahkan jadwal ke pengganti setelah validasi ulang (melanggar → 409)

## Aturan Bisnis

1. Jam kerja mingguan ≤ min(maks_jam_minggu karyawan, aturan MAKS_JAM_MINGGU).
2. Jeda antar shift ≥ aturan JEDA_MINIMAL_JAM (shift malam lewat tengah malam dihitung benar).
3. Tiap slot tanggal+template terisi ≥ kebutuhan minimum template.
4. Generate bersifat idempoten: jadwal minggu tsb dihapus lalu dibuat ulang.
5. Minggu dinormalisasi ke hari Senin; tanggal TEXT `YYYY-MM-DD`, jam TEXT `HH:MM`.
