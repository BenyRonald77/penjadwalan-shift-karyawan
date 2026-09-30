"use client";

import { useEffect, useState } from "react";

type Template = { id: number; nama: string; jamMulai: string; jamSelesai: string; kebutuhanMinimum: number };

export default function ShiftTemplatePage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [nama, setNama] = useState("");
  const [jm, setJm] = useState("");
  const [js, setJs] = useState("");
  const [butuh, setButuh] = useState("2");
  const [edit, setEdit] = useState<Template | null>(null);
  const [err, setErr] = useState("");

  const muat = () => fetch("/api/shift-template").then((r) => r.json()).then(setRows);
  useEffect(() => { muat(); }, []);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const body = { nama, jam_mulai: jm, jam_selesai: js, kebutuhan_minimum: Number(butuh) };
    const res = await fetch(edit ? `/api/shift-template/${edit.id}` : "/api/shift-template", {
      method: edit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) { setErr(j.error ?? "gagal menyimpan"); return; }
    setNama(""); setJm(""); setJs(""); setButuh("2"); setEdit(null);
    muat();
  }

  async function hapus(id: number) {
    if (!confirm("Hapus template ini? Jadwal yang memakainya ikut terhapus.")) return;
    const res = await fetch(`/api/shift-template/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json(); setErr(j.error ?? "gagal menghapus"); return; }
    muat();
  }

  function mulaiEdit(t: Template) {
    setEdit(t); setNama(t.nama); setJm(t.jamMulai); setJs(t.jamSelesai); setButuh(String(t.kebutuhanMinimum));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Template Shift</h1>
      {err && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{err}</p>}

      <form onSubmit={simpan} className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 font-semibold">{edit ? "Ubah Template" : "Tambah Template"}</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <input className="rounded border p-2" placeholder="Nama (mis. Pagi)" value={nama} onChange={(e) => setNama(e.target.value)} />
          <input className="rounded border p-2" type="time" value={jm} onChange={(e) => setJm(e.target.value)} />
          <input className="rounded border p-2" type="time" value={js} onChange={(e) => setJs(e.target.value)} />
          <input className="rounded border p-2" type="number" min={1} placeholder="Kebutuhan min" value={butuh} onChange={(e) => setButuh(e.target.value)} />
          <div className="flex gap-2">
            <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{edit ? "Simpan" : "Tambah"}</button>
            {edit && <button type="button" onClick={() => { setEdit(null); setNama(""); setJm(""); setJs(""); setButuh("2"); }} className="rounded bg-slate-200 px-4 py-2">Batal</button>}
          </div>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr><th className="p-2 text-left">Nama</th><th className="p-2 text-left">Jam</th><th className="p-2 text-left">Kebutuhan Min</th><th className="p-2 text-left">Aksi</th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 font-medium">{t.nama}</td>
                <td className="p-2">{t.jamMulai} – {t.jamSelesai}</td>
                <td className="p-2">{t.kebutuhanMinimum} orang</td>
                <td className="p-2">
                  <button onClick={() => mulaiEdit(t)} className="mr-2 text-blue-600 hover:underline">Ubah</button>
                  <button onClick={() => hapus(t.id)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
