import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penjadwalan Shift Karyawan",
  description: "Penjadwalan shift karyawan: aturan jam kerja, validasi otomatis, tukar shift dengan approval",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/jadwal", label: "Jadwal" },
  { href: "/karyawan", label: "Karyawan" },
  { href: "/shift-template", label: "Template Shift" },
  { href: "/aturan", label: "Aturan" },
  { href: "/tukar", label: "Tukar Shift" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
            <Link href="/" className="mr-4 text-lg font-bold">
              🗓️ ShiftKaryawan
            </Link>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded px-3 py-1.5 text-sm hover:bg-slate-700">
                {n.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
