'use client';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, ArrowLeft, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { csrfHeaders } from '@/lib/api/apiClient';

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  durationHours: number;
  status: 'not-enrolled' | 'enrolled' | 'completed';
  progress: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/courses');
      if (res.status === 401) {
        setError('Sign in to view this course.');
        setCourse(null);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load course');
        return;
      }
      const found = (json.courses || []).find((c: Course) => c.id === id) || null;
      setCourse(found);
      if (!found) setError(null);
    } catch {
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEnroll = async () => {
    if (!course) return;
    setEnrolling(true);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ courseId: course.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Enrollment failed');
        return;
      }
      await load();
    } catch {
      setError('Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <AppLayout role="candidate">
      <div className="space-y-6 fade-in max-w-3xl">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-600 text-[#6B7A99] hover:text-teal-600"
        >
          <ArrowLeft size={12} /> Back to courses
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : !course ? (
          <div className="text-center py-16 border border-dashed border-[#DDE3EE] rounded-2xl">
            <BookOpen size={40} className="text-[#C4CAD9] mx-auto mb-3" />
            <p className="text-sm font-600 text-[#6B7A99]">Course not found</p>
            <p className="text-xs text-[#6B7A99] mt-1">
              This course may be unpublished or the link is invalid.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E8ECF4] rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <BookOpen size={22} />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-800 text-[#0D1B3E]">{course.title}</h1>
                <p className="text-sm text-[#6B7A99] mt-1">{course.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-[#6B7A99]">
                  <span className="px-2 py-0.5 rounded-full border border-[#DDE3EE] font-600">
                    {course.level}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {course.durationHours}h
                  </span>
                  {course.status === 'completed' && (
                    <span className="flex items-center gap-1 text-green-600 font-600">
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {course.status !== 'not-enrolled' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#6B7A99]">Progress</span>
                  <span className="font-700 text-teal-600">{course.progress}%</span>
                </div>
                <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#F4F6FA] px-4 py-3 text-xs text-[#6B7A99]">
              Lesson modules are not available yet for this course. You can enroll to track progress
              once content is published.
            </div>

            {course.status === 'not-enrolled' && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="px-4 py-2.5 rounded-xl bg-[#0D1B3E] text-white text-sm font-700 disabled:opacity-60"
              >
                {enrolling ? 'Enrolling…' : 'Enroll'}
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
