'use client';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
  BookOpen, Search, Filter, Clock, CheckCircle2, Play, TrendingUp, Loader2,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { csrfHeaders } from '@/lib/api/apiClient';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type EnrollStatus = 'not-enrolled' | 'enrolled' | 'completed';

interface Course {
  id: string;
  title: string;
  description: string;
  level: Difficulty;
  durationHours: number;
  isPublished: boolean;
  status: EnrollStatus;
  progress: number;
}

const DIFF_COLORS: Record<Difficulty, string> = {
  Beginner: 'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-red-50 text-red-700 border-red-200',
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({ enrolledCount: 0, completedCount: 0 });
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');
  const [enrolledOnly, setEnrolledOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/courses');
      if (res.status === 401) {
        setError('Sign in to browse courses.');
        setCourses([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load courses');
        return;
      }
      setCourses(json.courses || []);
      setStats(json.stats || { enrolledCount: 0, completedCount: 0 });
    } catch {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (diffFilter !== 'all' && c.level !== diffFilter) return false;
      if (enrolledOnly && c.status === 'not-enrolled') return false;
      if (
        search &&
        !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !c.description.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [courses, search, diffFilter, enrolledOnly]);

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ courseId }),
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
      setEnrollingId(null);
    }
  };

  return (
    <AppLayout role="candidate">
      <div className="space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E] flex items-center gap-2">
              <BookOpen size={22} className="text-teal-500" /> Course Library
            </h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Discover, enroll, and learn at your own pace</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-800 text-[#0D1B3E]">{stats.enrolledCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Enrolled</p>
            </div>
            <div className="w-px h-8 bg-[#E8ECF4]" />
            <div className="text-center">
              <p className="text-lg font-800 text-teal-600">{stats.completedCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Completed</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2.5">
            <Search size={14} className="text-[#6B7A99] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="flex-1 text-sm text-[#0D1B3E] placeholder-[#C4CAD9] outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-[#6B7A99]" />
            {(['all', 'Beginner', 'Intermediate', 'Advanced'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={[
                  'px-2.5 py-1.5 rounded-lg text-xs font-600 border transition-all',
                  diffFilter === d
                    ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]'
                    : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-[#0D9488]',
                ].join(' ')}
              >
                {d === 'all' ? 'All Levels' : d}
              </button>
            ))}
            <button
              onClick={() => setEnrolledOnly(!enrolledOnly)}
              className={[
                'px-2.5 py-1.5 rounded-lg text-xs font-600 border transition-all',
                enrolledOnly
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-[#6B7A99] border-[#DDE3EE]',
              ].join(' ')}
            >
              My Courses
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#DDE3EE] rounded-2xl">
            <BookOpen size={40} className="text-[#C4CAD9] mx-auto mb-3" />
            <p className="text-sm font-600 text-[#6B7A99]">
              {courses.length === 0 ? 'No published courses yet' : 'No courses match your filters'}
            </p>
            <p className="text-xs text-[#6B7A99] mt-1">
              {courses.length === 0
                ? 'Courses will appear here when published by administrators.'
                : 'Try clearing filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((course) => {
              const isEnrolled = course.status !== 'not-enrolled';
              const isCompleted = course.status === 'completed';
              return (
                <div
                  key={course.id}
                  className={[
                    'bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col',
                    course.status === 'enrolled' ? 'border-teal-200' : 'border-[#E8ECF4]',
                  ].join(' ')}
                >
                  <div className="bg-[#F4F6FA] px-5 pt-5 pb-4 flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-teal-600 shadow-sm">
                      <BookOpen size={20} />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-600 border ${DIFF_COLORS[course.level] || DIFF_COLORS.Beginner}`}
                    >
                      {course.level}
                    </span>
                  </div>
                  <div className="px-5 py-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-800 text-[#0D1B3E] mb-1">{course.title}</h3>
                    <p className="text-xs text-[#6B7A99] mb-3 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-[#6B7A99] mb-3">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {course.durationHours}h
                      </span>
                    </div>
                    {isEnrolled && !isCompleted && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#6B7A99]">Progress</span>
                          <span className="text-[10px] font-700 text-teal-600">{course.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="mt-auto">
                      {isCompleted ? (
                        <Link
                          href={`/courses/${course.id}`}
                          className="w-full py-2.5 rounded-xl bg-green-50 text-green-700 text-xs font-700 text-center flex items-center justify-center gap-1.5 border border-green-200"
                        >
                          <CheckCircle2 size={12} /> Review Course
                        </Link>
                      ) : isEnrolled ? (
                        <Link
                          href={`/courses/${course.id}`}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs font-700 text-center flex items-center justify-center gap-1.5"
                        >
                          <Play size={12} /> Continue Learning
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={enrollingId === course.id}
                          className="w-full py-2.5 rounded-xl bg-[#0D1B3E] text-white text-xs font-700 flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {enrollingId === course.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <TrendingUp size={12} />
                          )}
                          Enroll Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
