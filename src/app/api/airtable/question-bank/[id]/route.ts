'use server';
import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_BASE_ID = 'app5lhB1OCYH9TCV1';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';

const TABLES = {
  technical: { id: 'tblTVHgfWfbM8VFE2', name: 'Technical Questions' },
  hr: { id: 'tbllwE3G2hbWiIPGB', name: 'HR Questions' },
  managerial: { id: 'tbl4pdhaJV2tEaIRp', name: 'Managerial Questions' },
};

async function airtableFetch(path: string, options: RequestInit = {}) {
  const url = `https://api.airtable.com/v0/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Airtable error: ${res.status}`);
  }
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { tableKey, fields } = body;

    if (!tableKey || !TABLES[tableKey as keyof typeof TABLES]) {
      return NextResponse.json({ error: 'Invalid table key' }, { status: 400 });
    }

    const table = TABLES[tableKey as keyof typeof TABLES];
    const data = await airtableFetch(`${AIRTABLE_BASE_ID}/${table.id}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });

    return NextResponse.json({ record: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const tableKey = searchParams.get('tableKey') as keyof typeof TABLES | null;

    if (!tableKey || !TABLES[tableKey]) {
      return NextResponse.json({ error: 'Invalid table key' }, { status: 400 });
    }

    const table = TABLES[tableKey];
    await airtableFetch(`${AIRTABLE_BASE_ID}/${table.id}/${id}`, {
      method: 'DELETE',
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
