import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const KEY_VALID = ["MAKS_JAM_MINGGU", "JEDA_MINIMAL_JAM", "KEBUTUHAN_MIN_PER_JAM"];

export async function GET() {
  const rows = await prisma.aturan.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(rows);
}

/** Upsert aturan berdasarkan key. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = body?.key;
  const value = body?.value;
  if (typeof key !== "string" || !KEY_VALID.includes(key)) {
    return NextResponse.json({ error: `key harus salah satu dari: ${KEY_VALID.join(", ")}` }, { status: 400 });
  }
  const num = Number(value);
  if (value === undefined || value === null || String(value).trim() === "" || !Number.isFinite(num) || num <= 0) {
    return NextResponse.json({ error: "value harus angka positif" }, { status: 400 });
  }
  const row = await prisma.aturan.upsert({
    where: { key },
    update: { value: String(value).trim() },
    create: { key, value: String(value).trim() },
  });
  return NextResponse.json(row, { status: 201 });
}
