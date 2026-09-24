import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

const TECH_KEYWORDS = [
  'javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql', 'aws',
  'docker', 'kubernetes', 'api', 'rest', 'graphql', 'git', 'agile', 'ci/cd',
  'postgresql', 'mongodb', 'redis', 'linux', 'html', 'css', 'next.js', 'vue',
  'angular', 'golang', 'rust', 'c++', 'machine learning', 'data structures',
];

function gradeFromScore(score: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

/** Heuristic ATS score from resume + job text length / keyword overlap. */
function heuristicAtsScore(resumeText: string, jobText: string, jobTitle: string) {
  const resume = resumeText.toLowerCase();
  const job = (jobText || jobTitle).toLowerCase();

  const wordsInJob = job
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 2);
  const uniqueJobWords = [...new Set(wordsInJob)];

  const matchedFromJob = uniqueJobWords.filter((w) => resume.includes(w));
  const keywordMatchPct =
    uniqueJobWords.length > 0
      ? Math.round((matchedFromJob.length / uniqueJobWords.length) * 100)
      : 0;

  const matchedTech = TECH_KEYWORDS.filter((k) => resume.includes(k) && job.includes(k));
  const missingTech = TECH_KEYWORDS.filter((k) => job.includes(k) && !resume.includes(k));

  const lengthScore = Math.min(100, Math.round((resumeText.trim().length / 2500) * 100));
  const formatScore = [
    /@/.test(resumeText) ? 20 : 0,
    /\b(experience|work|employment)\b/i.test(resumeText) ? 25 : 0,
    /\b(education|university|degree|b\.?tech|b\.?e\.)\b/i.test(resumeText) ? 25 : 0,
    /\b(skills|technologies)\b/i.test(resumeText) ? 30 : 0,
  ].reduce((a, b) => a + b, 0);

  const readabilityScore = Math.min(
    100,
    Math.round(
      40 +
        Math.min(40, resumeText.split(/\n/).length * 2) +
        (resumeText.length > 400 ? 20 : 0)
    )
  );

  const score = Math.round(
    keywordMatchPct * 0.45 + formatScore * 0.25 + lengthScore * 0.15 + readabilityScore * 0.15
  );
  const clamped = Math.max(0, Math.min(100, score));

  const suggestions: { type: 'success' | 'warning' | 'error'; text: string }[] = [];
  if (keywordMatchPct >= 60) {
    suggestions.push({ type: 'success', text: 'Solid keyword overlap with the job description' });
  } else {
    suggestions.push({
      type: 'warning',
      text: 'Low keyword overlap — mirror more terms from the job description',
    });
  }
  if (formatScore < 70) {
    suggestions.push({
      type: 'error',
      text: 'Add clearer Experience, Education, and Skills sections',
    });
  }
  if (missingTech.length) {
    suggestions.push({
      type: 'warning',
      text: `Consider covering missing skills: ${missingTech.slice(0, 5).join(', ')}`,
    });
  }
  if (resumeText.trim().length < 400) {
    suggestions.push({ type: 'error', text: 'Resume text is short — add more detail and metrics' });
  }

  return {
    score: clamped,
    grade: gradeFromScore(clamped),
    keywordMatch: keywordMatchPct,
    formatScore,
    readabilityScore,
    matchedKeywords: matchedTech.length
      ? matchedTech.map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase()))
      : matchedFromJob.slice(0, 12),
    missingKeywords: missingTech
      .slice(0, 8)
      .map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase())),
    suggestions,
    sections: [
      {
        name: 'Keyword Match',
        score: keywordMatchPct,
        feedback:
          keywordMatchPct >= 60
            ? 'Good alignment with job terms'
            : 'Incorporate more role-specific keywords',
      },
      {
        name: 'Structure',
        score: formatScore,
        feedback: formatScore >= 70 ? 'Core sections detected' : 'Expand standard resume sections',
      },
      {
        name: 'Length & Detail',
        score: lengthScore,
        feedback:
          lengthScore >= 60 ? 'Reasonable content volume' : 'Add quantified achievements',
      },
      {
        name: 'Readability',
        score: readabilityScore,
        feedback: 'Heuristic estimate from line breaks and length',
      },
    ],
    source: 'heuristic' as const,
  };
}

/**
 * POST /api/ats-scoring — store scan; heuristic when AI unavailable
 * Body: { resumeText, jobTitle?, jobDescription? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const resumeText = String(body.resumeText || body.resume_text || '').trim();
    const jobTitle = String(body.jobTitle || body.job_title || '').trim();
    const jobDescription = String(body.jobDescription || body.job_description || '').trim();

    if (!resumeText || resumeText.length < 40) {
      return badRequestResponse('resumeText is required (at least 40 characters)');
    }

    // Prefer heuristic always for reliability; AI path can be added later
    const result = heuristicAtsScore(resumeText, jobDescription, jobTitle);

    const { data: scan, error } = await supabase
      .from('ats_scans')
      .insert({
        user_id: user.id,
        job_title: jobTitle || 'Untitled role',
        score: result.score,
        result,
      })
      .select('id, job_title, score, result, created_at')
      .single();

    if (error) return secureJson({ error: error.message }, 500);

    return secureJson({
      success: true,
      scanId: scan.id,
      jobTitle: scan.job_title,
      ...result,
      createdAt: scan.created_at,
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/** GET recent scans for current user */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data, error } = await supabase
      .from('ats_scans')
      .select('id, job_title, score, result, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return secureJson({ error: error.message }, 500);

    return secureJson({ scans: data || [] });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
