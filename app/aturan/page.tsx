"use client";

import { useEffect, useState } from "react";

type Aturan = { id: number; key: string; value: string };

const LABEL: Record<string, string> = {
  MAKS_JAM_MINGGU: "Maks jam kerja per minggu",
  JEDA_MINIMAL_JAM: "Jeda minimal antar shift (jam)",
  KEBUTUHAN_MIN_PER_JAM: "Kebutuhan minimum karyawan per jam",
};

export default function AturanPage() {
  const [rows, setRows] = useState<Aturan[]>([]);
  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const muat = async () => {
    const j: Aturan[] = await fetch("/api/aturan").then((r) => r.json());
    setRows(j);
    const m: Record<string, string> = {};
    for (const a of j) m[a.key] = a.value;
    setNilai(m);
  };
  useEffect(() => { muat(); }, []);

  async function simpan(key: string) {
    setMsg("");
    const res = await fetch("/api/aturan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: nilai[key] }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(`❌ ${j.error}`); return; }
    setMsg(`✅ ${key} disimpan.`);
    muat();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Aturan Penjadwalan</h1>
      {msg && <p className="rounded bg-slate-100 p-2 text-sm">{msg}</p>}
      <div className="space-y-3">
        {rows.map((a) => (
          <div key={a.key} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-4 shadow">
            <div className="min-w-64 flex-1">
              <div className="font-semibold">{LABEL[a.key] ?? a.key}</div>
              <div className="font-mono text-xs text-slate-500">{a.key}</div>
            </div>
            <input
              className="w-28 rounded border p-2"
              type="number"
              min={1}
              value={nilai[a.key] ?? ""}
              onChange={(e) => setNilai({ ...nilai, [a.key]: e.target.value })}
            />
            <button onClick={() => simpan(a.key)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Simpan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
