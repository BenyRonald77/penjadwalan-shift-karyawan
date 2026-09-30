import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { durasiJam } from "@/lib/shift";

const JAM_RE = /^\d{2}:\d{2}$/;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const row = await prisma.shiftTemplate.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "template shift tidak ditemukan" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json().catch(() => null);
  const existing = await prisma.shiftTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "template shift tidak ditemukan" }, { status: 404 });
  const data: { nama?: string; jamMulai?: string; jamSelesai?: string; kebutuhanMinimum?: number } = {};
  if (body?.nama !== undefined) {
    if (typeof body.nama !== "string" || body.nama.trim() === "") {
      return NextResponse.json({ error: "nama tidak valid" }, { status: 400 });
    }
    data.nama = body.nama.trim();
  }
  const jm = body?.jam_mulai ?? body?.jamMulai;
  const js = body?.jam_selesai ?? body?.jamSelesai;
  if (jm !== undefined || js !== undefined) {
    const nm = jm ?? existing.jamMulai;
    const ns = js ?? existing.jamSelesai;
    if (!JAM_RE.test(nm) || !JAM_RE.test(ns)) {
      return NextResponse.json({ error: "jam harus format HH:MM" }, { status: 400 });
    }
    if (durasiJam(nm, ns) <= 0 || durasiJam(nm, js ?? existing.jamSelesai) > 24) {
      return NextResponse.json({ error: "durasi shift tidak valid" }, { status: 400 });
    }
    data.jamMulai = nm;
    data.jamSelesai = ns;
  }
  const butuh = body?.kebutuhan_minimum ?? body?.kebutuhanMinimum;
  if (butuh !== undefined) {
    if (!Number.isInteger(butuh) || butuh < 1) {
      return NextResponse.json({ error: "kebutuhan_minimum harus bilangan >= 1" }, { status: 400 });
    }
    data.kebutuhanMinimum = butuh;
  }
  const updated = await prisma.shiftTemplate.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const existing = await prisma.shiftTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "template shift tidak ditemukan" }, { status: 404 });
  await prisma.shiftTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
