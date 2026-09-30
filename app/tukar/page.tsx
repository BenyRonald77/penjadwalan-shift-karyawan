"use client";

import { useCallback, useEffect, useState } from "react";
import { formatTanggal } from "@/lib/format";

type Pengajuan = {
  id: number;
  status: string;
  alasan: string | null;
  dibuatPada: string;
  jadwalAsal: { id: number; tanggal: string; template: { nama: string; jamMulai: string; jamSelesai: string } };
  karyawanPemohon: { id: number; nama: string };
  karyawanPengganti: { id: number; nama: string };
};
type Karyawan = { id: number; nama: string };
type Jadwal = { id: number; karyawanId: number; karyawanNama: string; tanggal: string; templateNama: string };

export default function TukarPage() {
  const [rows, setRows] = useState<Pengajuan[]>([]);
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [fJadwal, setFJadwal] = useState("");
  const [fPengganti, setFPengganti] = useState("");
  const [fAlasan, setFAlasan] = useState("");
  const [msg, setMsg] = useState("");

  const muat = useCallback(async () => {
    const [t, k, j] = await Promise.all([
      fetch("/api/tukar").then((r) => r.json()),
      fetch("/api/karyawan").then((r) => r.json()),
      fetch("/api/jadwal").then((r) => r.json()),
    ]);
    setRows(t ?? []);
    setKaryawan(k ?? []);
    setJadwal((j.jadwal ?? []) as Jadwal[]);
  }, []);
  useEffect(() => { muat(); }, [muat]);

  async function ajukan(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/tukar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jadwal_asal_id: Number(fJadwal), karyawan_pengganti_id: Number(fPengganti), alasan: fAlasan }),
    });
    const jj = await res.json();
    if (!res.ok) { setMsg(`❌ ${jj.error}`); return; }
    setMsg("✅ Pengajuan tukar shift dibuat (pending).");
    setFJadwal(""); setFPengganti(""); setFAlasan("");
    muat();
  }

  async function putuskan(id: number, keputusan: "setujui" | "tolak") {
    setMsg("");
    const res = await fetch(`/api/tukar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keputusan }),
    });
    const jj = await res.json();
    if (res.status === 409) {
      setMsg(`⛔ Ditolak (409): ${jj.error}${jj.pelanggaran ? " — " + (jj.pelanggaran as { pesan: string }[]).map((p) => p.pesan).join(" | ") : ""}`);
      return;
    }
    if (!res.ok) { setMsg(`❌ ${jj.error}`); return; }
    setMsg(`✅ Pengajuan #${id} ${keputusan === "setujui" ? "disetujui" : "ditolak"}.`);
    muat();
  }

  const statusBadge: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    disetujui: "bg-green-100 text-green-800",
    ditolak: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tukar Shift</h1>
      {msg && <p className="rounded bg-slate-100 p-2 text-sm">{msg}</p>}

      <form onSubmit={ajukan} className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">Ajukan Tukar Shift</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <select className="rounded border p-2" value={fJadwal} onChange={(e) => setFJadwal(e.target.value)} required>
            <option value="">– Pilih jadwal –</option>
            {jadwal.map((j) => (
              <option key={j.id} value={j.id}>#{j.id} {j.karyawanNama} — {formatTanggal(j.tanggal)} ({j.templateNama})</option>
            ))}
          </select>
          <select className="rounded border p-2" value={fPengganti} onChange={(e) => setFPengganti(e.target.value)} required>
            <option value="">– Karyawan pengganti –</option>
            {karyawan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <input className="rounded border p-2" placeholder="Alasan" value={fAlasan} onChange={(e) => setFAlasan(e.target.value)} />
          <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Ajukan</button>
        </div>
      </form>

      <div className="space-y-3">
        {rows.map((t) => (
          <div key={t.id} className="rounded-lg bg-white p-4 shadow">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">#{t.id}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusBadge[t.status] ?? "bg-slate-100"}`}>{t.status}</span>
              <span className="text-sm">
                {t.karyawanPemohon.nama} → {t.karyawanPengganti.nama}
              </span>
              <span className="text-sm text-slate-500">
                {formatTanggal(t.jadwalAsal.tanggal)} · {t.jadwalAsal.template.nama} ({t.jadwalAsal.template.jamMulai}–{t.jadwalAsal.template.jamSelesai})
              </span>
              {t.status === "pending" && (
                <span className="ml-auto flex gap-2">
                  <button onClick={() => putuskan(t.id, "setujui")} className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700">Setujui</button>
                  <button onClick={() => putuskan(t.id, "tolak")} className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">Tolak</button>
                </span>
              )}
            </div>
            {t.alasan && <p className="mt-1 text-sm text-slate-600">Alasan: {t.alasan}</p>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-slate-500">Belum ada pengajuan tukar shift.</p>}
      </div>
    </div>
  );
}
