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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tableKey = searchParams.get('table') as keyof typeof TABLES | null;

  try {
    if (tableKey && TABLES[tableKey]) {
      const table = TABLES[tableKey];
      const data = await airtableFetch(`${AIRTABLE_BASE_ID}/${table.id}?maxRecords=200`);
      return NextResponse.json({ records: data.records, tableId: table.id, tableName: table.name });
    }

    // Fetch all 3 tables in parallel
    const [technical, hr, managerial] = await Promise.all([
      airtableFetch(`${AIRTABLE_BASE_ID}/${TABLES.technical.id}?maxRecords=200`),
      airtableFetch(`${AIRTABLE_BASE_ID}/${TABLES.hr.id}?maxRecords=200`),
      airtableFetch(`${AIRTABLE_BASE_ID}/${TABLES.managerial.id}?maxRecords=200`),
    ]);

    return NextResponse.json({
      technical: technical.records,
      hr: hr.records,
      managerial: managerial.records,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch records';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableKey, fields } = body;

    if (!tableKey || !TABLES[tableKey as keyof typeof TABLES]) {
      return NextResponse.json({ error: 'Invalid table key' }, { status: 400 });
    }

    const table = TABLES[tableKey as keyof typeof TABLES];
    const data = await airtableFetch(`${AIRTABLE_BASE_ID}/${table.id}`, {
      method: 'POST',
      body: JSON.stringify({ records: [{ fields }] }),
    });

    return NextResponse.json({ record: data.records[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
