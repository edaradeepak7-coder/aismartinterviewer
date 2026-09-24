import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completion } from '@rocketnew/llm-sdk';
import { consumeToken, TOKEN_BUCKET_CONFIGS, rateLimitedResponse, getUserKey } from '@/lib/security/tokenBucket';
import { buildCacheKey, cacheGet, cacheSet, CACHE_TTL } from '@/lib/redis/cache';

interface ResponseItem {
  question_id: string;
  question_text: string;
  category: string;
  difficulty: string;
  answer_text: string;
}

interface CompetencyScore {
  name: string;
  score: number;
  benchmark?: number;
}

interface EvaluationResult {
  overall_score: number;
  technical_score: number;
  communication_score: number;
  role_alignment_score: number;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  ai_summary: string;
  strengths: string[];
  improvements: string[];
  competencies: CompetencyScore[];
  ai_feedback: Array<{ question_id: string; feedback: string; score: number }>;
  transcript_highlights: string[];
}

async function evaluateWithOpenAI(
  role: string,
  interviewType: string,
  responses: ResponseItem[]
): Promise<EvaluationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const responseSummary = responses
    .map((r, i) => `Q${i + 1} [${r.category} / ${r.difficulty}]: ${r.question_text}\nAnswer: ${r.answer_text || '(no answer provided)'}`)
    .join('\n\n');

  const systemPrompt = `You are an expert technical interviewer and talent evaluator. Evaluate the candidate's interview responses and return a structured JSON assessment. Be objective, fair, and constructive.`;

  const userPrompt = `Evaluate this ${interviewType} interview for the role: "${role}".

Interview Responses:
${responseSummary}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "overall_score": <integer 0-100>,
  "technical_score": <integer 0-100>,
  "communication_score": <integer 0-100>,
  "role_alignment_score": <integer 0-100>,
  "recommendation": <"strong_yes"|"yes"|"maybe"|"no">,
  "ai_summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "competencies": [
    {"name": "Technical Depth", "score": <0-100>},
    {"name": "Problem Solving", "score": <0-100>},
    {"name": "System Design", "score": <0-100>},
    {"name": "Communication", "score": <0-100>},
    {"name": "Role Alignment", "score": <0-100>}
  ],
  "ai_feedback": [
    ${responses.map(r => `{"question_id": "${r.question_id}", "feedback": "<specific feedback>", "score": <0-100>}`).join(',\n    ')}
  ],
  "transcript_highlights": ["<notable quote or moment 1>", "<notable quote or moment 2>"]
}`;

  const response = await completion({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    api_key: apiKey,
    temperature: 0.3,
    max_tokens: 2000,
  });

  const content = (response as any)?.choices?.[0]?.message?.content || '';
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as EvaluationResult;
}

/**
 * POST /api/ai/evaluate
 * Evaluates an interview using OpenAI and persists results to Supabase.
 *
 * Body: { interview_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const isInternalJob = request.headers.get('x-internal-job') === 'true';

    if (!isInternalJob) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const key = getUserKey(user.id, ip, 'ai-evaluate');
      const rl = consumeToken(key, TOKEN_BUCKET_CONFIGS.AI);
      if (!rl.allowed) return rateLimitedResponse(rl, 'ai-evaluate');
    }

    const body = await request.json();
    const { interview_id } = body;

    if (!interview_id) {
      return NextResponse.json({ error: 'interview_id is required' }, { status: 400 });
    }

    // Return cached evaluation if already computed for this interview
    const cacheKey = buildCacheKey('ai:eval', { interview_id });
    const cached = await cacheGet<{ data: unknown; evaluation: unknown }>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // 1. Fetch interview details
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*, candidates(name, email)')
      .eq('id', interview_id)
      .maybeSingle();

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // 2. Fetch responses with questions
    const { data: rawResponses, error: responsesError } = await supabase
      .from('responses')
      .select('*, questions(id, text, category, difficulty)')
      .eq('interview_id', interview_id)
      .order('submitted_at', { ascending: true });

    if (responsesError) {
      return NextResponse.json({ error: responsesError.message }, { status: 500 });
    }

    if (!rawResponses || rawResponses.length === 0) {
      return NextResponse.json({ error: 'No responses found for this interview' }, { status: 400 });
    }

    const responses: ResponseItem[] = rawResponses.map((r: any) => ({
      question_id: r.question_id,
      question_text: r.questions?.text || 'Unknown question',
      category: r.questions?.category || 'General',
      difficulty: r.questions?.difficulty || 'Medium',
      answer_text: r.answer_text || '',
    }));

    // 3. Evaluate with OpenAI
    let evaluation: EvaluationResult;
    try {
      evaluation = await evaluateWithOpenAI(interview.role, interview.interview_type, responses);
    } catch (aiError: any) {
      return NextResponse.json({ error: `AI evaluation failed: ${aiError.message}` }, { status: 502 });
    }

    // 4. Persist results to interview_results
    const { data: result, error: resultError } = await supabase
      .from('interview_results')
      .upsert({
        interview_id,
        final_score: evaluation.overall_score,
        recommendation: evaluation.recommendation,
        ai_summary: evaluation.ai_summary,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        competencies: evaluation.competencies,
        ai_feedback: evaluation.ai_feedback,
        transcript_highlights: evaluation.transcript_highlights,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'interview_id' })
      .select()
      .single();

    if (resultError) {
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }

    // 5. Update interview scores and status
    await supabase
      .from('interviews')
      .update({
        overall_score: evaluation.overall_score,
        technical_score: evaluation.technical_score,
        communication_score: evaluation.communication_score,
        role_alignment_score: evaluation.role_alignment_score,
        recommendation: evaluation.recommendation,
        status: 'evaluated',
        ai_feedback_generated: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', interview_id);

    // 6. Send score_ready notification to candidate
    if (interview.candidate_id) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('user_id')
        .eq('id', interview.candidate_id)
        .maybeSingle();

      if (candidate?.user_id) {
        await supabase.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'score_ready',
          title: 'Your interview results are ready',
          message: `Your ${interview.role} interview has been evaluated. Overall score: ${evaluation.overall_score}/100.`,
          is_read: false,
          action_url: '/interview-results',
          metadata: { interview_id, score: evaluation.overall_score },
        });
      }
    }

    // Cache the completed evaluation result
    await cacheSet(cacheKey, { data: result, evaluation }, CACHE_TTL.AI_EVALUATION);

    return NextResponse.json({ data: result, evaluation }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
