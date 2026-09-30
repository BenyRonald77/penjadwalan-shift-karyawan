"use client";

import { useEffect, useState } from "react";

type Karyawan = { id: number; nama: string; jabatan: string | null; maksJamMinggu: number };

export default function KaryawanPage() {
  const [rows, setRows] = useState<Karyawan[]>([]);
  const [nama, setNama] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [maks, setMaks] = useState("40");
  const [edit, setEdit] = useState<Karyawan | null>(null);
  const [err, setErr] = useState("");

  const muat = () => fetch("/api/karyawan").then((r) => r.json()).then(setRows);
  useEffect(() => { muat(); }, []);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const body = { nama, jabatan, maks_jam_minggu: Number(maks) };
    const res = await fetch(edit ? `/api/karyawan/${edit.id}` : "/api/karyawan", {
      method: edit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) { setErr(j.error ?? "gagal menyimpan"); return; }
    setNama(""); setJabatan(""); setMaks("40"); setEdit(null);
    muat();
  }

  async function hapus(id: number) {
    if (!confirm("Hapus karyawan ini? Jadwalnya ikut terhapus.")) return;
    const res = await fetch(`/api/karyawan/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json(); setErr(j.error ?? "gagal menghapus"); return; }
    muat();
  }

  function mulaiEdit(k: Karyawan) {
    setEdit(k); setNama(k.nama); setJabatan(k.jabatan ?? ""); setMaks(String(k.maksJamMinggu));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Karyawan</h1>
      {err && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{err}</p>}

      <form onSubmit={simpan} className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">{edit ? "Ubah Karyawan" : "Tambah Karyawan"}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="rounded border p-2" placeholder="Nama" value={nama} onChange={(e) => setNama(e.target.value)} />
          <input className="rounded border p-2" placeholder="Jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
          <input className="rounded border p-2" type="number" min={1} max={168} placeholder="Maks jam/minggu" value={maks} onChange={(e) => setMaks(e.target.value)} />
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{edit ? "Simpan" : "Tambah"}</button>
            {edit && <button type="button" onClick={() => { setEdit(null); setNama(""); setJabatan(""); setMaks("40"); }} className="rounded bg-slate-200 px-4 py-2">Batal</button>}
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr><th className="p-2 text-left">Nama</th><th className="p-2 text-left">Jabatan</th><th className="p-2 text-left">Maks Jam/Minggu</th><th className="p-2 text-left">Aksi</th></tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} className="border-t">
                <td className="p-2 font-medium">{k.nama}</td>
                <td className="p-2">{k.jabatan ?? "–"}</td>
                <td className="p-2">{k.maksJamMinggu} jam</td>
                <td className="p-2">
                  <button onClick={() => mulaiEdit(k)} className="mr-2 text-blue-600 hover:underline">Ubah</button>
                  <button onClick={() => hapus(k.id)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
