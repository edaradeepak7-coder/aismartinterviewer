import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface QAPair {
  question: string;
  answer: string;
  category: string;
  technology?: string;
}

export interface ResumeContext {
  candidateName: string;
  role: string;
  skills?: string[];
  experience?: string;
  resumeText?: string;
}

export interface ContextualQuestionRequest {
  resumeContext: ResumeContext;
  previousQA: QAPair[];
  questionNumber: number;
  totalQuestions: number;
  askedTopics?: string[];
}

/**
 * NLP-inspired context building:
 * 1. Keyword extraction from candidate answers (TF-IDF-like weighting)
 * 2. Topic continuity — follow up on mentioned technologies/concepts
 * 3. Gap analysis — identify skills not yet probed
 * 4. Depth escalation — increase difficulty based on answer quality signals
 */
function buildNLPContextPrompt(req: ContextualQuestionRequest): string {
  const { resumeContext, previousQA, questionNumber, totalQuestions, askedTopics = [] } = req;

  // Extract keywords/topics from all previous answers (simulated TF-IDF)
  const answerKeywords = previousQA.flatMap((qa) => {
    const words = qa.answer.toLowerCase().split(/\W+/);
    // Filter to meaningful technical terms (length > 4, not stopwords)
    const stopwords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'when', 'what', 'which', 'would', 'could', 'should', 'about', 'there', 'where', 'also', 'very', 'just', 'more', 'some', 'than', 'then', 'into', 'over', 'after', 'before', 'through', 'during', 'used', 'using', 'make', 'made', 'like', 'well', 'even', 'back', 'good', 'much', 'each', 'such', 'both', 'time', 'will', 'your', 'work']);
    return words.filter((w) => w.length > 4 && !stopwords.has(w));
  });

  // Count keyword frequency (TF-IDF approximation)
  const keywordFreq: Record<string, number> = {};
  answerKeywords.forEach((kw) => {
    keywordFreq[kw] = (keywordFreq[kw] || 0) + 1;
  });
  const topKeywords = Object.entries(keywordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([kw]) => kw);

  // Identify explicitly mentioned technologies/concepts
  const mentionedTech = previousQA.flatMap((qa) => {
    const techPatterns = /\b(react|typescript|javascript|node|python|java|kubernetes|docker|aws|gcp|azure|graphql|rest|sql|nosql|redis|kafka|microservices|monolith|ci\/cd|git|webpack|vite|nextjs|vue|angular|redux|zustand|mobx|prisma|postgres|mongodb|mysql|elasticsearch|nginx|terraform|ansible|jenkins|github actions|testing|jest|cypress|playwright|performance|accessibility|seo|ssr|csr|spa|pwa|websocket|grpc|oauth|jwt|rbac|caching|cdn|load balancing|design patterns|solid|dry|kiss|clean code|agile|scrum|kanban)\b/gi;
    const matches = qa.answer.match(techPatterns) || [];
    return matches.map((m) => m.toLowerCase());
  });
  const uniqueMentionedTech = [...new Set(mentionedTech)];

  // Build the conversation history for context
  const conversationHistory = previousQA
    .map((qa, i) => `Q${i + 1} [${qa.category}]: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const resumeSummary = resumeContext.resumeText
    ? `Resume/Profile:\n${resumeContext.resumeText}`
    : `Candidate: ${resumeContext.candidateName}\nRole: ${resumeContext.role}\nSkills: ${(resumeContext.skills || []).join(', ')}\nExperience: ${resumeContext.experience || 'Not specified'}`;

  const progressContext = `Question ${questionNumber} of ${totalQuestions} (${Math.round((questionNumber / totalQuestions) * 100)}% through interview)`;

  return `You are an expert technical interviewer conducting a live interview. Your task is to generate the NEXT interview question using NLP-based contextual analysis.

## Candidate Profile
${resumeSummary}

## Interview Progress
${progressContext}
Topics already covered: ${askedTopics.length > 0 ? askedTopics.join(', ') : 'None yet'}

## Previous Q&A Conversation
${conversationHistory || 'No previous questions yet — this is the first question.'}

## NLP Context Analysis (pre-computed)
Top keywords from candidate answers: ${topKeywords.join(', ') || 'N/A'}
Technologies/concepts explicitly mentioned: ${uniqueMentionedTech.join(', ') || 'N/A'}

## Instructions for Generating the Next Question

Apply these NLP-based contextual reasoning rules:

1. **Semantic Continuity**: If the candidate mentioned a specific technology or concept in their last answer, probe deeper into it OR explore a related concept (semantic neighbor).

2. **Gap Analysis**: Identify important skills/areas from the candidate's profile that haven't been explored yet. Prioritize uncovered areas. 3. **Depth Escalation**: If the candidate's previous answer showed strong knowledge, increase difficulty. If it was shallow, ask a clarifying or simpler follow-up.

4. **Topic Chaining**: Use the top keywords to identify the candidate's strongest areas and build a coherent narrative thread through the interview.

5. **Contextual Relevance**: Every question must feel like a natural continuation of the conversation — not a random jump to a new topic.

6. **Interview Pacing**: 
   - Early questions (1-3): Establish baseline, explore resume highlights
   - Mid questions (4-7): Deep technical dives, problem-solving scenarios
   - Late questions (8+): Architecture/design thinking, behavioral/situational

Generate exactly ONE interview question. Return a JSON object with this exact structure:
{
  "question": "The full interview question text",
  "category": "Technical|Behavioral|Architecture|Problem Solving|Experience|Role Specific",
  "difficulty": "Easy|Medium|Hard",
  "technology": "specific technology or null",
  "reasoning": "Brief explanation of why this question was chosen based on context (1-2 sentences)",
  "contextLink": "What from the previous answer or resume triggered this question"
}

IMPORTANT: Return ONLY valid JSON, no markdown, no extra text.`;
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  let body: ContextualQuestionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { resumeContext, previousQA, questionNumber, totalQuestions } = body;

  if (!resumeContext || questionNumber === undefined || totalQuestions === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: resumeContext, questionNumber, totalQuestions' },
      { status: 400 }
    );
  }

  const systemPrompt = buildNLPContextPrompt(body);

  try {
    const response = await completion({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Generate question ${questionNumber} of ${totalQuestions} for this interview. Make it contextually relevant to the conversation so far.`,
        },
      ],
      stream: false,
      api_key: OPENAI_API_KEY,
      temperature: 0.7,
      max_tokens: 600,
    });

    const content = (response as any)?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse the JSON response
    let parsed: {
      question: string;
      category: string;
      difficulty: string;
      technology: string | null;
      reasoning: string;
      contextLink: string;
    };

    try {
      // Strip any markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: extract question from raw text
      return NextResponse.json({
        question: content.trim(),
        category: 'Technical',
        difficulty: 'Medium',
        technology: null,
        reasoning: 'Generated based on interview context',
        contextLink: 'Previous conversation',
      });
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Contextual question generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate contextual question' },
      { status: 500 }
    );
  }
}
