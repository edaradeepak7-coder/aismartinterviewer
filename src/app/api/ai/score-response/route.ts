import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completion } from '@rocketnew/llm-sdk';
import { consumeToken, TOKEN_BUCKET_CONFIGS, rateLimitedResponse, getUserKey } from '@/lib/security/tokenBucket';

/**
 * POST /api/ai/score-response
 * Scores a single interview response using OpenAI.
 *
 * Body: { question_text, answer_text, category, difficulty, role }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Per-user token bucket rate limiting for AI score-response
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = getUserKey(user.id, ip, 'ai-score-response');
    const rl = consumeToken(key, TOKEN_BUCKET_CONFIGS.AI);
    if (!rl.allowed) return rateLimitedResponse(rl, 'ai-score-response');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });

    const body = await request.json();
    const { question_text, answer_text, category, difficulty, role } = body;

    if (!question_text || !answer_text) {
      return NextResponse.json({ error: 'question_text and answer_text are required' }, { status: 400 });
    }

    const prompt = `You are an expert interviewer. Score this ${category || 'Technical'} (${difficulty || 'Medium'} difficulty) interview response for the role "${role || 'Software Engineer'}".

Question: ${question_text}
Answer: ${answer_text}

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence specific feedback>",
  "strengths": ["<strength>"],
  "improvements": ["<improvement area>"]
}`;

    const response = await completion({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      api_key: apiKey,
      temperature: 0.2,
      max_tokens: 500,
    });

    const content = (response as any)?.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const scored = JSON.parse(cleaned);

    return NextResponse.json({ data: scored });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
