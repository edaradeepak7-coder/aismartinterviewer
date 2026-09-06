'use client';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { BookOpen, Search, Filter, Star, Clock, Users, CheckCircle2, Lock, Play, Award, Zap, TrendingUp, BarChart2, Code2, Database, Globe, Cpu, FlaskConical, Target, Layers, Brain } from 'lucide-react';
import { useState, useMemo } from 'react';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
type Category = 'all' | 'programming' | 'data' | 'system' | 'soft-skills' | 'cloud';
type EnrollStatus = 'not-enrolled' | 'enrolled' | 'completed';

interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  category: Category;
  difficulty: Difficulty;
  durationHours: number;
  modules: number;
  lessons: number;
  enrolled: number;
  rating: number;
  certificate: boolean;
  status: EnrollStatus;
  progress: number;
  published: boolean;
  tags: string[];
  icon: React.ReactNode;
  color: string;
  bg: string;
  instructor: string;
}

const COURSES: Course[] = [
  {
    id: 'dsa', title: 'Data Structures & Algorithms', description: 'Master arrays, trees, graphs, and dynamic programming with hands-on coding exercises.',
    subject: 'Computer Science', category: 'programming', difficulty: 'Intermediate', durationHours: 40, modules: 8, lessons: 64,
    enrolled: 3240, rating: 4.8, certificate: true, status: 'enrolled', progress: 65, published: true,
    tags: ['DSA', 'Coding', 'Interviews'], icon: <Layers size={20} />, color: 'text-violet-600', bg: 'bg-violet-50', instructor: 'Dr. Anand Kumar',
  },
  {
    id: 'react', title: 'React & Modern Frontend', description: 'Build production-grade React apps with hooks, context, performance optimization, and testing.',
    subject: 'Web Development', category: 'programming', difficulty: 'Intermediate', durationHours: 32, modules: 6, lessons: 48,
    enrolled: 2890, rating: 4.9, certificate: true, status: 'enrolled', progress: 30, published: true,
    tags: ['React', 'JavaScript', 'Frontend'], icon: <Code2 size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', instructor: 'Priya Mehta',
  },
  {
    id: 'python', title: 'Python for Data Science', description: 'Learn Python, NumPy, Pandas, and Matplotlib for real-world data analysis and visualization.',
    subject: 'Data Science', category: 'data', difficulty: 'Beginner', durationHours: 28, modules: 5, lessons: 40,
    enrolled: 4120, rating: 4.7, certificate: true, status: 'not-enrolled', progress: 0, published: true,
    tags: ['Python', 'Data', 'Analytics'], icon: <BarChart2 size={20} />, color: 'text-teal-600', bg: 'bg-teal-50', instructor: 'Kavya Reddy',
  },
  {
    id: 'system-design', title: 'System Design Mastery', description: 'Design scalable distributed systems — load balancers, caching, databases, microservices.',
    subject: 'System Design', category: 'system', difficulty: 'Advanced', durationHours: 36, modules: 7, lessons: 56,
    enrolled: 1870, rating: 4.9, certificate: true, status: 'not-enrolled', progress: 0, published: true,
    tags: ['System Design', 'Architecture', 'Scalability'], icon: <Target size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', instructor: 'Rahul Gupta',
  },
  {
    id: 'ml-basics', title: 'Machine Learning Fundamentals', description: 'Supervised, unsupervised learning, neural networks, and model evaluation techniques.',
    subject: 'Machine Learning', category: 'data', difficulty: 'Intermediate', durationHours: 44, modules: 9, lessons: 72,
    enrolled: 2340, rating: 4.6, certificate: true, status: 'not-enrolled', progress: 0, published: true,
    tags: ['ML', 'AI', 'Python'], icon: <Brain size={20} />, color: 'text-rose-600', bg: 'bg-rose-50', instructor: 'Dr. Sneha Iyer',
  },
  {
    id: 'sql', title: 'SQL & Database Design', description: 'Write complex queries, design normalized schemas, and optimize database performance.',
    subject: 'Databases', category: 'data', difficulty: 'Beginner', durationHours: 20, modules: 4, lessons: 32,
    enrolled: 3560, rating: 4.7, certificate: true, status: 'completed', progress: 100, published: true,
    tags: ['SQL', 'Databases', 'Backend'], icon: <Database size={20} />, color: 'text-green-600', bg: 'bg-green-50', instructor: 'Arjun Mehta',
  },
  {
    id: 'cloud-aws', title: 'Cloud Computing with AWS', description: 'EC2, S3, Lambda, RDS, and cloud architecture patterns for production deployments.',
    subject: 'Cloud', category: 'cloud', difficulty: 'Intermediate', durationHours: 38, modules: 7, lessons: 56,
    enrolled: 1640, rating: 4.5, certificate: true, status: 'not-enrolled', progress: 0, published: true,
    tags: ['AWS', 'Cloud', 'DevOps'], icon: <Globe size={20} />, color: 'text-sky-600', bg: 'bg-sky-50', instructor: 'Vikram Singh',
  },
  {
    id: 'os', title: 'Operating Systems Concepts', description: 'Processes, threads, memory management, file systems, and concurrency fundamentals.',
    subject: 'Computer Science', category: 'system', difficulty: 'Advanced', durationHours: 30, modules: 6, lessons: 48,
    enrolled: 980, rating: 4.4, certificate: true, status: 'not-enrolled', progress: 0, published: true,
    tags: ['OS', 'Systems', 'C++'], icon: <Cpu size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50', instructor: 'Dr. Rohan Das',
  },
  {
    id: 'devops', title: 'DevOps & CI/CD Pipeline', description: 'Docker, Kubernetes, GitHub Actions, and modern deployment strategies.',
    subject: 'DevOps', category: 'cloud', difficulty: 'Advanced', durationHours: 34, modules: 6, lessons: 48,
    enrolled: 0, rating: 0, certificate: true, status: 'not-enrolled', progress: 0, published: false,
    tags: ['DevOps', 'Docker', 'K8s'], icon: <FlaskConical size={20} />, color: 'text-orange-600', bg: 'bg-orange-50', instructor: 'TBD',
  },
  {
    id: 'communication', title: 'Professional Communication', description: 'Articulate ideas clearly, handle behavioral interviews, and build executive presence.',
    subject: 'Soft Skills', category: 'soft-skills', difficulty: 'Beginner', durationHours: 16, modules: 4, lessons: 28,
    enrolled: 2100, rating: 4.6, certificate: true, status: 'not-enrolled', progress: 0, published: true,
    tags: ['Communication', 'Interviews', 'Soft Skills'], icon: <Zap size={20} />, color: 'text-pink-600', bg: 'bg-pink-50', instructor: 'Meera Nair',
  },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All Courses' },
  { id: 'programming', label: 'Programming' },
  { id: 'data', label: 'Data & ML' },
  { id: 'system', label: 'System Design' },
  { id: 'cloud', label: 'Cloud & DevOps' },
  { id: 'soft-skills', label: 'Soft Skills' },
];

const DIFF_COLORS: Record<Difficulty, string> = {
  Beginner:     'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced:     'bg-red-50 text-red-700 border-red-200',
};

export default function CoursesPage() {
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');
  const [enrolledOnly, setEnrolledOnly] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(
    new Set(COURSES.filter(c => c.status !== 'not-enrolled').map(c => c.id))
  );

  const filtered = useMemo(() => {
    return COURSES.filter(c => {
      if (category !== 'all' && c.category !== category) return false;
      if (diffFilter !== 'all' && c.difficulty !== diffFilter) return false;
      if (enrolledOnly && !enrolledCourses.has(c.id)) return false;
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
          !c.subject.toLowerCase().includes(search.toLowerCase()) &&
          !c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [category, search, diffFilter, enrolledOnly, enrolledCourses]);

  const handleEnroll = (courseId: string) => {
    setEnrolledCourses(prev => new Set([...prev, courseId]));
  };

  const enrolledCount = enrolledCourses.size;
  const completedCount = COURSES.filter(c => c.status === 'completed').length;

  return (
    <AppLayout role="candidate">
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E] flex items-center gap-2">
              <BookOpen size={22} className="text-teal-500" /> Course Library
            </h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Discover, enroll, and learn at your own pace</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-800 text-[#0D1B3E]">{enrolledCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Enrolled</p>
            </div>
            <div className="w-px h-8 bg-[#E8ECF4]" />
            <div className="text-center">
              <p className="text-lg font-800 text-teal-600">{completedCount}</p>
              <p className="text-[10px] text-[#6B7A99]">Completed</p>
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2.5">
            <Search size={14} className="text-[#6B7A99] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses, subjects, tags..."
              className="flex-1 text-sm text-[#0D1B3E] placeholder-[#C4CAD9] outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#6B7A99]" />
            {(['all', 'Beginner', 'Intermediate', 'Advanced'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={[
                  'px-2.5 py-1.5 rounded-lg text-xs font-600 border transition-all',
                  diffFilter === d ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]' : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-[#0D9488]',
                ].join(' ')}
              >
                {d === 'all' ? 'All Levels' : d}
              </button>
            ))}
            <button
              onClick={() => setEnrolledOnly(!enrolledOnly)}
              className={[
                'px-2.5 py-1.5 rounded-lg text-xs font-600 border transition-all',
                enrolledOnly ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-teal-500',
              ].join(' ')}
            >
              My Courses
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={[
                'px-4 py-2 rounded-xl text-xs font-600 whitespace-nowrap border transition-all',
                category === cat.id
                  ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]'
                  : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-[#0D9488] hover:text-[#0D9488]',
              ].join(' ')}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Course grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(course => {
            const isEnrolled = enrolledCourses.has(course.id);
            const isCompleted = course.status === 'completed';
            return (
              <div key={course.id} className={[
                'bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md',
                !course.published ? 'opacity-80' : '',
                course.status === 'enrolled' ? 'border-teal-200' : 'border-[#E8ECF4]',
              ].join(' ')}>
                {/* Card header */}
                <div className={`${course.bg} px-5 pt-5 pb-4 flex items-start justify-between`}>
                  <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center ${course.color} shadow-sm`}>
                    {course.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!course.published && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700 bg-gray-100 text-gray-500 border border-gray-200">
                        <Lock size={9} /> Coming Soon
                      </span>
                    )}
                    {isCompleted && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700 bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 size={9} /> Completed
                      </span>
                    )}
                    {isEnrolled && !isCompleted && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-700 bg-teal-50 text-teal-700 border border-teal-200">
                        <Play size={9} /> Enrolled
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-600 border ${DIFF_COLORS[course.difficulty]}`}>
                      {course.difficulty}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4 flex-1 flex flex-col">
                  <h3 className="text-sm font-800 text-[#0D1B3E] mb-1">{course.title}</h3>
                  <p className="text-xs text-[#6B7A99] mb-3 line-clamp-2">{course.description}</p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[10px] text-[#6B7A99] mb-3">
                    <span className="flex items-center gap-1"><Clock size={10} /> {course.durationHours}h</span>
                    <span className="flex items-center gap-1"><BookOpen size={10} /> {course.lessons} lessons</span>
                    {course.published && course.enrolled > 0 && (
                      <span className="flex items-center gap-1"><Users size={10} /> {course.enrolled.toLocaleString()}</span>
                    )}
                    {course.published && course.rating > 0 && (
                      <span className="flex items-center gap-1 text-amber-500"><Star size={10} fill="currentColor" /> {course.rating}</span>
                    )}
                  </div>

                  {/* Progress bar (if enrolled) */}
                  {isEnrolled && !isCompleted && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[#6B7A99]">Progress</span>
                        <span className="text-[10px] font-700 text-teal-600">{course.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all" style={{ width: `${course.progress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {course.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-500 bg-[#F4F6FA] text-[#6B7A99]">{tag}</span>
                    ))}
                  </div>

                  {/* Certificate badge */}
                  {course.certificate && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 mb-4">
                      <Award size={10} /> Certificate on completion
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-auto">
                    {!course.published ? (
                      <div className="w-full py-2.5 rounded-xl bg-[#F4F6FA] text-[#C4CAD9] text-xs font-600 text-center flex items-center justify-center gap-1.5">
                        <Lock size={12} /> Content Coming Soon
                      </div>
                    ) : isCompleted ? (
                      <Link
                        href={`/courses/${course.id}`}
                        className="w-full py-2.5 rounded-xl bg-green-50 text-green-700 text-xs font-700 text-center flex items-center justify-center gap-1.5 border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Review Course
                      </Link>
                    ) : isEnrolled ? (
                      <Link
                        href={`/courses/${course.id}`}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs font-700 text-center flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Play size={12} /> Continue Learning
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        className="w-full py-2.5 rounded-xl bg-[#0D1B3E] text-white text-xs font-700 flex items-center justify-center gap-1.5 hover:bg-[#162444] transition-colors"
                      >
                        <TrendingUp size={12} /> Enroll Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <BookOpen size={40} className="text-[#C4CAD9] mx-auto mb-3" />
            <p className="text-sm font-600 text-[#6B7A99]">No courses match your filters</p>
            <button onClick={() => { setCategory('all'); setSearch(''); setDiffFilter('all'); }} className="mt-3 text-xs text-teal-600 font-600 hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
