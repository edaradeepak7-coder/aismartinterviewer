import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptFields, ENCRYPTED_FIELDS } from '@/lib/security/encryption';
import { writeAuditLogServer } from '@/lib/security/auditLog';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { data, error } = await supabase
      .from('responses')
      .select('*, questions(id, text, category, difficulty)')
      .eq('interview_id', id)
      .order('submitted_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    // Support single or bulk response submission
    const responses = Array.isArray(body) ? body : [body];

    // Encrypt transcript/answer text before storage
    const toInsert = await Promise.all(
      responses.map(async (r: any) => {
        const plain = {
          interview_id: id,
          question_id: r.question_id,
          answer_text: r.answer_text || null,
          answer_type: r.answer_type || 'text',
          audio_url: r.audio_url || null,
        };
        if (plain.answer_text) {
          const encrypted = await encryptFields(plain as any, ENCRYPTED_FIELDS.response as any);
          return { ...encrypted, content_encrypted: true };
        }
        return plain;
      })
    );

    const { data, error } = await supabase
      .from('responses')
      .insert(toInsert)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log for transcript submission
    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: user.email,
        action: 'data_created',
        resource: 'interview_response',
        resource_id: id,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        outcome: 'success',
        details: { count: toInsert.length, encrypted: true },
      },
      supabase
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
