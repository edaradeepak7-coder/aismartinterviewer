import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  secureJson,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';

const STAFF = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

type CohortRow = {
  name: string;
  candidates: number;
  placed: number;
  avgScore: number;
  placementRate: number;
  trend: number;
  topSkill?: string;
  demand?: string;
  avgTimeToHire?: string;
  topCompany?: string;
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short' });
}

function monthOrder(iso: string): number {
  const d = new Date(iso);
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * GET /api/candidate-segmentation
 * Cohort breakdowns: institution, role, experience (skill tab), tier + funnel.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !STAFF.has(profile.role)) return forbiddenResponse();

    const isAdmin = ['admin', 'super_admin', 'org_admin'].includes(profile.role);

    let ivQuery = supabase
      .from('interviews')
      .select(
        'id, candidate_id, recruiter_id, role, status, overall_score, created_at, completed_at',
      )
      .order('created_at', { ascending: true })
      .limit(4000);
    if (!isAdmin) ivQuery = ivQuery.eq('recruiter_id', user.id);

    let offersQuery = supabase
      .from('job_offers')
      .select('id, candidate_id, recruiter_id, status, created_at, responded_at, company')
      .limit(2000);
    if (!isAdmin) offersQuery = offersQuery.eq('recruiter_id', user.id);

    const [ivRes, offerRes] = await Promise.all([ivQuery, offersQuery]);
    if (ivRes.error) return secureJson({ error: ivRes.error.message }, 500);

    const interviews = ivRes.data || [];
    const offers = offerRes.error ? [] : offerRes.data || [];

    const scopedCandidateIds = [
      ...new Set(interviews.map((i) => i.candidate_id as string).filter(Boolean)),
    ];

    let candidates: {
      id: string;
      name: string | null;
      email: string | null;
      role: string | null;
      department: string | null;
      experience_level: string | null;
      created_at: string | null;
    }[] = [];

    if (isAdmin) {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, email, role, department, experience_level, created_at')
        .order('created_at', { ascending: false })
        .limit(3000);
      if (error) return secureJson({ error: error.message }, 500);
      candidates = data || [];
    } else if (scopedCandidateIds.length) {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, email, role, department, experience_level, created_at')
        .in('id', scopedCandidateIds.slice(0, 1000));
      if (error) return secureJson({ error: error.message }, 500);
      candidates = data || [];
    }

    const scoreByCandidate: Record<string, number[]> = {};
    const interviewedIds = new Set<string>();
    const assessedIds = new Set<string>();

    for (const iv of interviews) {
      const cid = iv.candidate_id as string;
      if (!cid) continue;
      interviewedIds.add(cid);
      if (typeof iv.overall_score === 'number' && iv.overall_score > 0) {
        assessedIds.add(cid);
        if (!scoreByCandidate[cid]) scoreByCandidate[cid] = [];
        scoreByCandidate[cid].push(iv.overall_score);
      }
    }

    const placedIds = new Set<string>();
    const companyByCandidate: Record<string, string> = {};
    const hireDaysByCandidate: Record<string, number[]> = {};

    for (const o of offers) {
      if (String(o.status).toLowerCase() !== 'accepted') continue;
      const cid = o.candidate_id as string;
      if (!cid) continue;
      placedIds.add(cid);
      if (o.company) companyByCandidate[cid] = String(o.company);
      if (o.responded_at && o.created_at) {
        const days =
          (new Date(o.responded_at).getTime() - new Date(o.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 365) {
          if (!hireDaysByCandidate[cid]) hireDaysByCandidate[cid] = [];
          hireDaysByCandidate[cid].push(days);
        }
      }
    }

    function candidateAvg(cid: string): number {
      return avg(scoreByCandidate[cid] || []);
    }

    function buildCohorts(
      keyFn: (c: (typeof candidates)[0]) => string,
      opts?: { extra?: (ids: string[]) => Partial<CohortRow> },
    ): CohortRow[] {
      const map: Record<
        string,
        { ids: string[]; scores: number[]; early: number[]; late: number[] }
      > = {};
      const mid = Date.now() - 45 * 24 * 60 * 60 * 1000;

      for (const c of candidates) {
        const key = keyFn(c) || 'Other';
        if (!map[key]) map[key] = { ids: [], scores: [], early: [], late: [] };
        map[key].ids.push(c.id);
        const s = candidateAvg(c.id);
        if (s > 0) {
          map[key].scores.push(s);
          const created = c.created_at ? new Date(c.created_at).getTime() : 0;
          if (created && created < mid) map[key].early.push(s);
          else map[key].late.push(s);
        }
      }

      return Object.entries(map)
        .map(([name, d]) => {
          const placed = d.ids.filter((id) => placedIds.has(id)).length;
          const earlyAvg = avg(d.early);
          const lateAvg = avg(d.late);
          let trend = 0;
          if (earlyAvg > 0 && lateAvg > 0) trend = Math.round(lateAvg - earlyAvg);
          const row: CohortRow = {
            name,
            candidates: d.ids.length,
            placed,
            avgScore: avg(d.scores),
            placementRate: d.ids.length ? Math.round((placed / d.ids.length) * 100) : 0,
            trend,
            ...(opts?.extra?.(d.ids) || {}),
          };
          return row;
        })
        .filter((r) => r.candidates > 0)
        .sort((a, b) => b.candidates - a.candidates)
        .slice(0, 20);
    }

    const roleData = buildCohorts((c) => (c.role || 'Unspecified').trim() || 'Unspecified', {
      extra: (ids) => {
        const depts = ids
          .map((id) => candidates.find((c) => c.id === id)?.department)
          .filter(Boolean) as string[];
        const top = depts.sort(
          (a, b) => depts.filter((x) => x === b).length - depts.filter((x) => x === a).length,
        )[0];
        return { topSkill: top || '—' };
      },
    });

    const skillData = buildCohorts(
      (c) => (c.experience_level || c.department || 'Unspecified').trim() || 'Unspecified',
      {
        extra: (ids) => {
          const rate = ids.length
            ? Math.round((ids.filter((id) => placedIds.has(id)).length / ids.length) * 100)
            : 0;
          return {
            demand: rate >= 70 ? 'High' : rate >= 40 ? 'Medium' : 'Low',
          };
        },
      },
    );

    const tierDefs: { name: string; min: number; max: number }[] = [
      { name: 'Elite (90–100)', min: 90, max: 100 },
      { name: 'High (80–89)', min: 80, max: 89 },
      { name: 'Mid (70–79)', min: 70, max: 79 },
      { name: 'Developing (60–69)', min: 60, max: 69 },
      { name: 'Beginner (<60)', min: 0, max: 59 },
    ];

    const tierData: CohortRow[] = tierDefs
      .map((t) => {
        const finalIds = candidates
          .filter((c) => {
            const s = candidateAvg(c.id);
            if (s <= 0) return false;
            return s >= t.min && s <= t.max;
          })
          .map((c) => c.id);
        const placed = finalIds.filter((id) => placedIds.has(id)).length;
        const scores = finalIds.map(candidateAvg).filter((s) => s > 0);
        const hireDays = finalIds.flatMap((id) => hireDaysByCandidate[id] || []);
        const companies = finalIds
          .map((id) => companyByCandidate[id])
          .filter(Boolean) as string[];
        const topCompany = companies
          .sort(
            (a, b) =>
              companies.filter((x) => x === b).length - companies.filter((x) => x === a).length,
          )
          .slice(0, 2)
          .join(', ');

        return {
          name: t.name,
          candidates: finalIds.length,
          placed,
          avgScore: avg(scores),
          placementRate: finalIds.length ? Math.round((placed / finalIds.length) * 100) : 0,
          trend: 0,
          avgTimeToHire: hireDays.length ? `${avg(hireDays)} days` : '—',
          topCompany: topCompany || '—',
        };
      })
      .filter((r) => r.candidates > 0);

    // Institutions via institution_candidates (admin/org) + email match to platform candidates
    let institutionData: CohortRow[] = [];
    let radarData: { metric: string; [k: string]: string | number }[] = [];

    const { data: instCands } = await supabase
      .from('institution_candidates')
      .select('id, institution_id, email, status, score, registered_at')
      .limit(3000);

    if (instCands?.length) {
      const instIds = [...new Set(instCands.map((i) => i.institution_id as string).filter(Boolean))];
      const instName: Record<string, string> = {};
      if (instIds.length) {
        const { data: insts } = await supabase
          .from('institutions')
          .select('id, name')
          .in('id', instIds);
        for (const i of insts || []) instName[i.id] = i.name || 'Institution';
      }

      const emailToPlatform = new Map(
        candidates
          .filter((c) => c.email)
          .map((c) => [String(c.email).toLowerCase(), c.id] as const),
      );

      const byInst: Record<
        string,
        { name: string; ids: string[]; scores: number[]; placed: number }
      > = {};

      for (const ic of instCands) {
        const key = (ic.institution_id as string) || 'unknown';
        const name = instName[key] || 'Institution';
        if (!byInst[key]) byInst[key] = { name, ids: [], scores: [], placed: 0 };

        const email = String(ic.email || '').toLowerCase();
        const platformId = emailToPlatform.get(email);
        if (!isAdmin && !platformId) continue;

        const id = platformId || (ic.id as string);
        byInst[key].ids.push(id);

        if (platformId) {
          const s = candidateAvg(platformId);
          if (s > 0) byInst[key].scores.push(s);
          if (placedIds.has(platformId)) byInst[key].placed += 1;
        } else {
          if (typeof ic.score === 'number' && ic.score > 0) byInst[key].scores.push(ic.score);
          if (String(ic.status).toLowerCase() === 'placed') byInst[key].placed += 1;
        }
      }

      institutionData = Object.values(byInst)
        .filter((d) => d.ids.length > 0)
        .map((d) => ({
          name: d.name,
          candidates: d.ids.length,
          placed: d.placed,
          avgScore: avg(d.scores),
          placementRate: d.ids.length ? Math.round((d.placed / d.ids.length) * 100) : 0,
          trend: 0,
        }))
        .sort((a, b) => b.candidates - a.candidates)
        .slice(0, 15);

      const top4 = institutionData.slice(0, 4);
      const metrics = [
        { metric: 'Avg Score', pick: (r: CohortRow) => r.avgScore },
        { metric: 'Placement %', pick: (r: CohortRow) => r.placementRate },
        {
          metric: 'Completion',
          pick: (r: CohortRow) => Math.min(100, Math.round(r.avgScore * 0.9 + r.placementRate * 0.1)),
        },
        {
          metric: 'Engagement',
          pick: (r: CohortRow) => Math.min(100, r.candidates > 0 ? Math.round(50 + r.avgScore / 2) : 0),
        },
        {
          metric: 'Interview Pass',
          pick: (r: CohortRow) => r.placementRate,
        },
      ];
      radarData = metrics.map((m) => {
        const row: { metric: string; [k: string]: string | number } = { metric: m.metric };
        top4.forEach((inst, i) => {
          row[`i${i}`] = m.pick(inst);
          row[`label${i}`] = inst.name;
        });
        return row;
      });
    }

    // Outcome timeline by month
    const monthMap: Record<
      string,
      { enrolled: number; assessed: number; interviewed: number; placed: number; order: number }
    > = {};

    for (const c of candidates) {
      if (!c.created_at) continue;
      const m = monthLabel(c.created_at);
      const order = monthOrder(c.created_at);
      if (!monthMap[m]) monthMap[m] = { enrolled: 0, assessed: 0, interviewed: 0, placed: 0, order };
      monthMap[m].enrolled += 1;
      if (interviewedIds.has(c.id)) monthMap[m].interviewed += 1;
      if (assessedIds.has(c.id)) monthMap[m].assessed += 1;
      if (placedIds.has(c.id)) monthMap[m].placed += 1;
    }

    const outcomeTimeline = Object.entries(monthMap)
      .sort(([, a], [, b]) => a.order - b.order)
      .slice(-6)
      .map(([month, d]) => ({
        month,
        enrolled: d.enrolled,
        assessed: d.assessed,
        interviewed: d.interviewed,
        placed: d.placed,
      }));

    const totalCandidates = candidates.length;
    const totalPlaced = [...placedIds].filter((id) => candidates.some((c) => c.id === id)).length;
    const allScores = candidates.map((c) => candidateAvg(c.id)).filter((s) => s > 0);

    return secureJson({
      data: {
        institution: institutionData,
        role: roleData,
        skill: skillData,
        tier: tierData,
        outcomeTimeline,
        radarData,
        radarLabels: institutionData.slice(0, 4).map((i) => i.name),
        kpis: {
          totalCandidates,
          totalPlaced,
          avgPlacementRate: totalCandidates
            ? Math.round((totalPlaced / totalCandidates) * 100)
            : 0,
          avgScore: avg(allScores),
        },
        empty: totalCandidates === 0 && institutionData.length === 0,
        skillTabLabel: 'By Experience',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}
