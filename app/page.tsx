"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatTanggal, seninMinggu, today } from "@/lib/format";

type Pelanggaran = { tipe: string; pesan: string };
type Ringkasan = {
  mingguMulai: string;
  mingguSelesai: string;
  totalJadwal: number;
  pelanggaran: Pelanggaran[];
  karyawan: number;
  template: number;
  tukarPending: number;
};

export default function Dashboard() {
  const [data, setData] = useState<Ringkasan | null>(null);
  const minggu = seninMinggu(today());

  useEffect(() => {
    (async () => {
      const [v, k, t, tr] = await Promise.all([
        fetch(`/api/jadwal/validasi?minggu=${minggu}`).then((r) => r.json()),
        fetch("/api/karyawan").then((r) => r.json()),
        fetch("/api/shift-template").then((r) => r.json()),
        fetch("/api/tukar").then((r) => r.json()),
      ]);
      setData({
        mingguMulai: v.mingguMulai,
        mingguSelesai: v.mingguSelesai,
        totalJadwal: v.totalJadwal,
        pelanggaran: v.pelanggaran ?? [],
        karyawan: (k as unknown[]).length,
        template: (t as unknown[]).length,
        tukarPending: (tr as { status: string }[]).filter((x) => x.status === "pending").length,
      });
    })();
  }, [minggu]);

  const badge: Record<string, string> = {
    jam_berlebih: "bg-red-100 text-red-800",
    jeda_kurang: "bg-amber-100 text-amber-800",
    kekurangan_personel: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Karyawan", data?.karyawan ?? "…", "/karyawan"],
          ["Template Shift", data?.template ?? "…", "/shift-template"],
          ["Jadwal Minggu Ini", data?.totalJadwal ?? "…", "/jadwal"],
          ["Tukar Pending", data?.tukarPending ?? "…", "/tukar"],
        ].map(([label, nilai, href]) => (
          <Link key={label as string} href={href as string} className="rounded-lg bg-white p-4 shadow hover:shadow-md">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-3xl font-bold">{nilai}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Pelanggaran minggu {data ? `${formatTanggal(data.mingguMulai)} – ${formatTanggal(data.mingguSelesai)}` : "…"}
          </h2>
          <Link href="/jadwal" className="text-sm text-blue-600 hover:underline">
            Lihat jadwal →
          </Link>
        </div>
        {!data ? (
          <p className="text-slate-500">Memuat…</p>
        ) : data.pelanggaran.length === 0 ? (
          <p className="text-green-700">✅ Tidak ada pelanggaran minggu ini.</p>
        ) : (
          <ul className="space-y-2">
            {data.pelanggaran.map((p, i) => (
              <li key={i} className="rounded border p-2 text-sm">
                <span className={`mr-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${badge[p.tipe] ?? "bg-slate-100"}`}>
                  {p.tipe}
                </span>
                {p.pesan}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
