import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const n8nRes = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await n8nRes.text();

    // Intentar parsear como JSON; si falla, devolver el texto tal cual
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return NextResponse.json(
      { ok: n8nRes.ok, status: n8nRes.status, data },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
