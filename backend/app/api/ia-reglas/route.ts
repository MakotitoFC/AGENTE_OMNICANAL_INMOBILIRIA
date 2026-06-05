import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'ia-reglas.json');

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(FILE);
    } catch {
      await fs.writeFile(FILE, JSON.stringify({ reglas: '' }), 'utf-8');
    }
  } catch {
    // ignore
  }
}

export async function GET() {
  try {
    await ensureFile();
    const raw = await fs.readFile(FILE, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFile();
    const body = await req.json();
    const reglas = typeof body.reglas === 'string' ? body.reglas : '';
    await fs.writeFile(FILE, JSON.stringify({ reglas }), 'utf-8');
    return NextResponse.json({ ok: true, data: { reglas } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
