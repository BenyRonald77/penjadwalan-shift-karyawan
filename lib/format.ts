export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function formatTanggal(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const hari = NAMA_HARI[dt.getUTCDay()];
  return `${hari}, ${d} ${namaBulan(m)} ${y}`;
}

function namaBulan(m: number): string {
  const arr = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return arr[m - 1] ?? "";
}

/** Normalisasi tanggal apa pun ke Senin minggu itu (YYYY-MM-DD). */
export function seninMinggu(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = Senin
  dt.setUTCDate(dt.getUTCDate() - dow);
  return isoDate(dt);
}

export function tambahHari(tanggal: string, n: number): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return isoDate(dt);
}

function isoDate(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
