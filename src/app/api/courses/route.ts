import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/courses — published courses + current user enrollments
 * POST /api/courses — { courseId } enroll
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const [coursesRes, enrollRes] = await Promise.all([
      supabase
        .from('courses')
        .select('id, title, description, level, duration_hours, is_published')
        .eq('is_published', true)
        .order('title'),
      supabase
        .from('course_enrollments')
        .select('course_id, progress_pct, completed_at, created_at')
        .eq('user_id', user.id),
    ]);

    if (coursesRes.error) return secureJson({ error: coursesRes.error.message }, 500);

    const enrollMap = new Map(
      (enrollRes.data || []).map((e) => [e.course_id, e])
    );

    const courses = (coursesRes.data || []).map((c) => {
      const en = enrollMap.get(c.id);
      let status: 'not-enrolled' | 'enrolled' | 'completed' = 'not-enrolled';
      if (en?.completed_at || (en && en.progress_pct >= 100)) status = 'completed';
      else if (en) status = 'enrolled';
      return {
        id: c.id,
        title: c.title,
        description: c.description || '',
        level: c.level,
        durationHours: Number(c.duration_hours) || 0,
        isPublished: c.is_published,
        status,
        progress: en?.progress_pct ?? 0,
        enrolledAt: en?.created_at ?? null,
        completedAt: en?.completed_at ?? null,
      };
    });

    return secureJson({
      courses,
      stats: {
        enrolledCount: courses.filter((c) => c.status !== 'not-enrolled').length,
        completedCount: courses.filter((c) => c.status === 'completed').length,
      },
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const courseId = body.courseId || body.course_id;
    if (!courseId || typeof courseId !== 'string') {
      return badRequestResponse('courseId is required');
    }

    const { data: course } = await supabase
      .from('courses')
      .select('id, is_published')
      .eq('id', courseId)
      .maybeSingle();

    if (!course || !course.is_published) {
      return secureJson({ error: 'Course not found' }, 404);
    }

    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          progress_pct: 0,
        },
        { onConflict: 'user_id,course_id', ignoreDuplicates: true }
      )
      .select('course_id, progress_pct, completed_at, created_at')
      .maybeSingle();

    if (error) {
      // Already enrolled — fetch existing
      const { data: existing } = await supabase
        .from('course_enrollments')
        .select('course_id, progress_pct, completed_at, created_at')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      if (existing) {
        return secureJson({ success: true, enrollment: existing });
      }
      return secureJson({ error: error.message }, 500);
    }

    return secureJson({
      success: true,
      enrollment: enrollment || {
        course_id: courseId,
        progress_pct: 0,
        completed_at: null,
      },
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
