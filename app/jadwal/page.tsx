"use client";

import { useCallback, useEffect, useState } from "react";
import { formatTanggal, seninMinggu, tambahHari, today } from "@/lib/format";

type Template = { id: number; nama: string; jamMulai: string; jamSelesai: string; kebutuhanMinimum: number };
type Jadwal = { id: number; karyawanId: number; karyawanNama: string; tanggal: string; templateId: number; templateNama: string };
type Pelanggaran = { tipe: string; pesan: string; tanggal?: string; templateId?: number };
type Karyawan = { id: number; nama: string };

export default function JadwalPage() {
  const [minggu, setMinggu] = useState(seninMinggu(today()));
  const [dates, setDates] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [msg, setMsg] = useState("");
  // form manual
  const [fKar, setFKar] = useState("");
  const [fTgl, setFTgl] = useState(today());
  const [fTpl, setFTpl] = useState("");
  const [fForce, setFForce] = useState(false);

  const muat = useCallback(async () => {
    const [g, v, k] = await Promise.all([
      fetch(`/api/jadwal?minggu=${minggu}`).then((r) => r.json()),
      fetch(`/api/jadwal/validasi?minggu=${minggu}`).then((r) => r.json()),
      fetch("/api/karyawan").then((r) => r.json()),
    ]);
    setDates(g.dates ?? []);
    setTemplates(g.templates ?? []);
    setJadwal(g.jadwal ?? []);
    setPelanggaran(v.pelanggaran ?? []);
    setKaryawan(k ?? []);
  }, [minggu]);

  useEffect(() => { muat(); }, [muat]);

  async function generate() {
    setMsg("");
    if (!confirm(`Generate ulang jadwal minggu ${formatTanggal(minggu)}? Jadwal minggu ini akan diganti.`)) return;
    const res = await fetch("/api/jadwal/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minggu_mulai: minggu }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(`❌ ${j.error}`); return; }
    setMsg(`✅ Jadwal dibuat: ${j.dibuat} penugasan.`);
    muat();
  }

  async function assignManual(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/jadwal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ karyawan_id: Number(fKar), tanggal: fTgl, shift_template_id: Number(fTpl), force: fForce }),
    });
    const j = await res.json();
    if (res.status === 409) {
      setMsg(`⛔ Ditolak (409): ${(j.pelanggaran as Pelanggaran[]).map((p) => p.pesan).join(" | ")}`);
      return;
    }
    if (!res.ok) { setMsg(`❌ ${j.error}`); return; }
    setMsg("✅ Jadwal manual ditambahkan.");
    muat();
  }

  const selTanggal = (d: string, tId: number) => jadwal.filter((x) => x.tanggal === d && x.templateId === tId);
  const adaPelanggaranSlot = (d: string, tId: number) =>
    pelanggaran.some((p) => p.tanggal === d && p.templateId === tId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Jadwal Mingguan</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setMinggu(tambahHari(minggu, -7))} className="rounded bg-slate-200 px-3 py-1.5 hover:bg-slate-300">← Prev</button>
          <span className="text-sm font-medium">{formatTanggal(minggu)} – {formatTanggal(tambahHari(minggu, 6))}</span>
          <button onClick={() => setMinggu(tambahHari(minggu, 7))} className="rounded bg-slate-200 px-3 py-1.5 hover:bg-slate-300">Next →</button>
          <button onClick={generate} className="rounded bg-green-600 px-4 py-1.5 text-white hover:bg-green-700">⚙️ Generate Otomatis</button>
        </div>
      </div>
      {msg && <p className="rounded bg-slate-100 p-2 text-sm">{msg}</p>}

      {pelanggaran.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <h2 className="mb-2 font-semibold text-red-800">⚠️ {pelanggaran.length} pelanggaran terdeteksi</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-900">
            {pelanggaran.map((p, i) => <li key={i}>{p.pesan}</li>)}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Shift</th>
              {dates.map((d) => (
                <th key={d} className="p-2 text-left">{formatTanggal(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t align-top">
                <td className="p-2 font-semibold">{t.nama}<div className="text-xs font-normal text-slate-500">{t.jamMulai}–{t.jamSelesai}</div></td>
                {dates.map((d) => {
                  const isi = selTanggal(d, t.id);
                  const kurang = adaPelanggaranSlot(d, t.id);
                  return (
                    <td key={d} className={`p-2 ${kurang ? "bg-red-50" : ""}`}>
                      {isi.length === 0 ? (
                        <span className="text-slate-400">–</span>
                      ) : (
                        <ul className="space-y-1">
                          {isi.map((x) => (
                            <li key={x.id} className="rounded bg-slate-100 px-2 py-0.5">{x.karyawanNama}</li>
                          ))}
                        </ul>
                      )}
                      {kurang && <div className="mt-1 text-xs font-semibold text-red-600">⚠️ kurang personel</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={assignManual} className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">Tambah Jadwal Manual</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <select className="rounded border p-2" value={fKar} onChange={(e) => setFKar(e.target.value)} required>
            <option value="">– Karyawan –</option>
            {karyawan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <input className="rounded border p-2" type="date" value={fTgl} onChange={(e) => setFTgl(e.target.value)} required />
          <select className="rounded border p-2" value={fTpl} onChange={(e) => setFTpl(e.target.value)} required>
            <option value="">– Shift –</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.nama} ({t.jamMulai}–{t.jamSelesai})</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fForce} onChange={(e) => setFForce(e.target.checked)} /> Paksa (abaikan aturan)
          </label>
          <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Tambah</button>
        </div>
      </form>
    </div>
  );
}
