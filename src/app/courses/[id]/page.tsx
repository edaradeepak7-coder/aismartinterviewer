'use client';
import AppLayout from '@/components/AppLayout';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronRight, Play, CheckCircle2, Lock, Clock, FileText, Video, Code2, Award, Star, Users, BarChart2, Target, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useState } from 'react';

interface Material {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'article' | 'code';
  duration?: number;
  completed: boolean;
}

interface Lesson {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
  locked: boolean;
  materials: Material[];
  hasAssessment: boolean;
  hasPractice: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  completed: boolean;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  instructor: string;
  rating: number;
  enrolled: number;
  durationHours: number;
  certificate: boolean;
  progress: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  modules: Module[];
}

const MATERIAL_ICONS: Record<string, React.ReactNode> = {
  video:   <Video size={12} className="text-blue-500" />,
  pdf:     <FileText size={12} className="text-red-500" />,
  article: <BookOpen size={12} className="text-teal-500" />,
  code:    <Code2 size={12} className="text-violet-500" />,
};

const COURSE_DB: Record<string, CourseData> = {
  dsa: {
    id: 'dsa', title: 'Data Structures & Algorithms', description: 'Master arrays, trees, graphs, and dynamic programming.',
    instructor: 'Dr. Anand Kumar', rating: 4.8, enrolled: 3240, durationHours: 40, certificate: true, progress: 65,
    icon: <Layers size={20} />, color: 'text-violet-600', bg: 'bg-violet-50',
    modules: [
      {
        id: 'm1', title: 'Arrays & Strings', completed: true,
        lessons: [
          { id: 'l1', title: 'Introduction to Arrays', duration: 18, completed: true, locked: false, hasAssessment: false, hasPractice: true,
            materials: [{ id: 'v1', title: 'Arrays Overview', type: 'video', duration: 12, completed: true }, { id: 'p1', title: 'Array Cheatsheet', type: 'pdf', completed: true }] },
          { id: 'l2', title: 'Two-Pointer Technique', duration: 22, completed: true, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v2', title: 'Two Pointers Deep Dive', type: 'video', duration: 16, completed: true }, { id: 'c1', title: 'Practice Problems', type: 'code', completed: true }] },
          { id: 'l3', title: 'Sliding Window', duration: 20, completed: true, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v3', title: 'Sliding Window Patterns', type: 'video', duration: 14, completed: true }, { id: 'a1', title: 'Pattern Guide', type: 'article', completed: true }] },
        ],
      },
      {
        id: 'm2', title: 'Linked Lists', completed: true,
        lessons: [
          { id: 'l4', title: 'Singly Linked Lists', duration: 20, completed: true, locked: false, hasAssessment: false, hasPractice: true,
            materials: [{ id: 'v4', title: 'Linked List Basics', type: 'video', duration: 15, completed: true }] },
          { id: 'l5', title: 'Doubly Linked Lists', duration: 18, completed: true, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v5', title: 'Doubly Linked Lists', type: 'video', duration: 13, completed: true }, { id: 'c2', title: 'Implementation', type: 'code', completed: true }] },
        ],
      },
      {
        id: 'm3', title: 'Trees & Binary Trees', completed: false,
        lessons: [
          { id: 'l6', title: 'Binary Tree Basics', duration: 25, completed: true, locked: false, hasAssessment: false, hasPractice: true,
            materials: [{ id: 'v6', title: 'Tree Fundamentals', type: 'video', duration: 18, completed: true }] },
          { id: 'l7', title: 'Tree Traversals', duration: 28, completed: false, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v7', title: 'BFS & DFS', type: 'video', duration: 20, completed: false }, { id: 'c3', title: 'Traversal Code', type: 'code', completed: false }] },
          { id: 'l8', title: 'Binary Search Trees', duration: 30, completed: false, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v8', title: 'BST Operations', type: 'video', duration: 22, completed: false }, { id: 'p2', title: 'BST Reference', type: 'pdf', completed: false }] },
          { id: 'l9', title: 'Balanced Trees (AVL, Red-Black)', duration: 35, completed: false, locked: true, hasAssessment: true, hasPractice: false,
            materials: [{ id: 'v9', title: 'Balanced Trees', type: 'video', duration: 28, completed: false }] },
        ],
      },
      {
        id: 'm4', title: 'Graphs', completed: false,
        lessons: [
          { id: 'l10', title: 'Graph Representation', duration: 22, completed: false, locked: true, hasAssessment: false, hasPractice: true,
            materials: [{ id: 'v10', title: 'Graph Basics', type: 'video', duration: 16, completed: false }] },
          { id: 'l11', title: 'BFS & DFS on Graphs', duration: 30, completed: false, locked: true, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v11', title: 'Graph Traversal', type: 'video', duration: 22, completed: false }, { id: 'c4', title: 'Graph Algorithms', type: 'code', completed: false }] },
        ],
      },
    ],
  },
  react: {
    id: 'react', title: 'React & Modern Frontend', description: 'Build production-grade React apps with hooks and context.',
    instructor: 'Priya Mehta', rating: 4.9, enrolled: 2890, durationHours: 32, certificate: true, progress: 30,
    icon: <Code2 size={20} />, color: 'text-blue-600', bg: 'bg-blue-50',
    modules: [
      {
        id: 'm1', title: 'React Fundamentals', completed: true,
        lessons: [
          { id: 'l1', title: 'JSX & Components', duration: 20, completed: true, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v1', title: 'React Intro', type: 'video', duration: 15, completed: true }, { id: 'p1', title: 'JSX Guide', type: 'pdf', completed: true }] },
          { id: 'l2', title: 'Props & State', duration: 25, completed: true, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v2', title: 'Props Deep Dive', type: 'video', duration: 18, completed: true }] },
        ],
      },
      {
        id: 'm2', title: 'Hooks & Context', completed: false,
        lessons: [
          { id: 'l3', title: 'useState & useEffect', duration: 28, completed: false, locked: false, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v3', title: 'Core Hooks', type: 'video', duration: 20, completed: false }, { id: 'c1', title: 'Hook Examples', type: 'code', completed: false }] },
          { id: 'l4', title: 'useContext & Custom Hooks', duration: 30, completed: false, locked: true, hasAssessment: true, hasPractice: true,
            materials: [{ id: 'v4', title: 'Context API', type: 'video', duration: 22, completed: false }] },
        ],
      },
    ],
  },
};

function getFallbackCourse(id: string): CourseData {
  return {
    id, title: 'Course Not Found', description: 'This course content is not available.',
    instructor: 'TBD', rating: 0, enrolled: 0, durationHours: 0, certificate: false, progress: 0,
    icon: <BookOpen size={20} />, color: 'text-gray-500', bg: 'bg-gray-50', modules: [],
  };
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = typeof params?.id === 'string' ? params.id : '';
  const course = COURSE_DB[courseId] ?? getFallbackCourse(courseId);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['m1', 'm2', 'm3']));
  const [activeLesson, setActiveLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set(
      course.modules.flatMap(m => m.lessons.filter(l => l.completed).map(l => l.id))
    )
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  const markComplete = (lessonId: string) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]));
    setActiveLesson(null);
  };

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const activeModuleData = activeLesson ? course.modules.find(m => m.id === activeLesson.moduleId) : null;
  const activeLessonData = activeModuleData?.lessons.find(l => l.id === activeLesson?.lessonId) ?? null;

  if (!COURSE_DB[courseId]) {
    return (
      <AppLayout role="candidate">
        <div className="py-20 text-center">
          <BookOpen size={48} className="text-[#C4CAD9] mx-auto mb-4" />
          <h2 className="text-lg font-700 text-[#0D1B3E] mb-2">Course Not Available</h2>
          <p className="text-sm text-[#6B7A99] mb-4">This course content hasn&apos;t been published yet.</p>
          <Link href="/courses" className="text-sm font-600 text-teal-600 hover:underline">← Back to Course Library</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="candidate">
      <div className="space-y-6 fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[#6B7A99]">
          <Link href="/courses" className="hover:text-teal-600 transition-colors">Course Library</Link>
          <ChevronRight size={12} />
          <span className="text-[#0D1B3E] font-600 truncate">{course.title}</span>
        </div>

        {/* Course header */}
        <div className={`${course.bg} rounded-2xl p-6 flex flex-col sm:flex-row gap-4`}>
          <div className={`w-14 h-14 rounded-xl bg-white/80 flex items-center justify-center ${course.color} shadow-sm shrink-0`}>
            {course.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-800 text-[#0D1B3E] mb-1">{course.title}</h1>
            <p className="text-sm text-[#6B7A99] mb-3">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7A99]">
              <span className="flex items-center gap-1"><Users size={12} /> {course.instructor}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {course.durationHours}h total</span>
              <span className="flex items-center gap-1"><BookOpen size={12} /> {totalLessons} lessons</span>
              {course.rating > 0 && <span className="flex items-center gap-1 text-amber-500"><Star size={12} fill="currentColor" /> {course.rating}</span>}
              {course.certificate && <span className="flex items-center gap-1 text-amber-600"><Award size={12} /> Certificate</span>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-800 text-[#0D1B3E]">{progressPct}%</p>
            <p className="text-xs text-[#6B7A99] mb-2">{completedCount}/{totalLessons} lessons</p>
            <div className="w-32 h-2 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module/Lesson tree */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-800 text-[#0D1B3E]">Course Content</h2>
            {course.modules.map((mod) => {
              const modCompleted = mod.lessons.every(l => completedLessons.has(l.id));
              const modProgress = mod.lessons.length > 0
                ? Math.round((mod.lessons.filter(l => completedLessons.has(l.id)).length / mod.lessons.length) * 100)
                : 0;
              return (
                <div key={mod.id} className="bg-white rounded-xl border border-[#E8ECF4] overflow-hidden">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {modCompleted
                        ? <CheckCircle2 size={14} className="text-teal-500 shrink-0" />
                        : <div className="w-3.5 h-3.5 rounded-full border-2 border-[#DDE3EE] shrink-0" />
                      }
                      <span className="text-xs font-700 text-[#0D1B3E] truncate">{mod.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[#6B7A99]">{modProgress}%</span>
                      {expandedModules.has(mod.id) ? <ChevronUp size={13} className="text-[#6B7A99]" /> : <ChevronDown size={13} className="text-[#6B7A99]" />}
                    </div>
                  </button>

                  {expandedModules.has(mod.id) && (
                    <div className="border-t border-[#F4F6FA]">
                      {mod.lessons.map((lesson) => {
                        const isDone = completedLessons.has(lesson.id);
                        const isActive = activeLesson?.lessonId === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            disabled={lesson.locked}
                            onClick={() => !lesson.locked && setActiveLesson({ moduleId: mod.id, lessonId: lesson.id })}
                            className={[
                              'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors border-b border-[#F4F6FA] last:border-0',
                              lesson.locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F8FAFC] cursor-pointer',
                              isActive ? 'bg-teal-50' : '',
                            ].join(' ')}
                          >
                            <div className="shrink-0">
                              {lesson.locked ? <Lock size={12} className="text-[#C4CAD9]" /> :
                               isDone ? <CheckCircle2 size={12} className="text-teal-500" /> :
                               <Play size={12} className={isActive ? 'text-teal-600' : 'text-[#6B7A99]'} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-600 truncate ${isActive ? 'text-teal-700' : isDone ? 'text-[#6B7A99]' : 'text-[#0D1B3E]'}`}>
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-[#C4CAD9]">{lesson.duration}m</span>
                                {lesson.hasAssessment && <span className="text-[10px] text-violet-400">Quiz</span>}
                                {lesson.hasPractice && <span className="text-[10px] text-blue-400">Practice</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lesson content area */}
          <div className="lg:col-span-2">
            {activeLessonData ? (
              <div className="space-y-4">
                {/* Lesson header */}
                <div className="bg-white rounded-2xl border border-[#E8ECF4] p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-base font-800 text-[#0D1B3E]">{activeLessonData.title}</h2>
                      <p className="text-xs text-[#6B7A99] mt-0.5">{activeLessonData.duration} min · {activeLessonData.materials.length} materials</p>
                    </div>
                    {completedLessons.has(activeLessonData.id) ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 text-xs font-700 border border-teal-200">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    ) : (
                      <button
                        onClick={() => markComplete(activeLessonData.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-700 hover:bg-teal-700 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Mark Complete
                      </button>
                    )}
                  </div>

                  {/* Materials list */}
                  <div className="space-y-2">
                    <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wide mb-2">Materials</p>
                    {activeLessonData.materials.map(mat => (
                      <div
                        key={mat.id}
                        className={[
                          'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm',
                          mat.completed ? 'bg-teal-50/50 border-teal-200' : 'bg-[#F8FAFC] border-[#E8ECF4] hover:border-teal-300',
                        ].join(' ')}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-[#E8ECF4] flex items-center justify-center shrink-0">
                          {MATERIAL_ICONS[mat.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-600 text-[#0D1B3E] truncate">{mat.title}</p>
                          <p className="text-[10px] text-[#6B7A99] capitalize">{mat.type}{mat.duration ? ` · ${mat.duration}m` : ''}</p>
                        </div>
                        {mat.completed && <CheckCircle2 size={13} className="text-teal-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assessment & Practice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeLessonData.hasAssessment && (
                    <div className="bg-white rounded-2xl border border-violet-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart2 size={14} className="text-violet-600" />
                        <h3 className="text-sm font-700 text-[#0D1B3E]">Lesson Quiz</h3>
                      </div>
                      <p className="text-xs text-[#6B7A99] mb-3">Test your understanding with MCQs for this lesson.</p>
                      <button className="w-full py-2 rounded-xl bg-violet-50 text-violet-700 text-xs font-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                        Start Quiz
                      </button>
                    </div>
                  )}
                  {activeLessonData.hasPractice && (
                    <div className="bg-white rounded-2xl border border-blue-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Code2 size={14} className="text-blue-600" />
                        <h3 className="text-sm font-700 text-[#0D1B3E]">Practice Problems</h3>
                      </div>
                      <p className="text-xs text-[#6B7A99] mb-3">Reinforce concepts with hands-on coding exercises.</p>
                      <Link
                        href="/coding-assessment"
                        className="block w-full py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-700 border border-blue-200 hover:bg-blue-100 transition-colors text-center"
                      >
                        Open Coding Arena
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8ECF4] p-12 text-center">
                <Play size={40} className="text-[#C4CAD9] mx-auto mb-4" />
                <h3 className="text-base font-700 text-[#0D1B3E] mb-2">Select a Lesson</h3>
                <p className="text-sm text-[#6B7A99]">Choose a lesson from the course content on the left to start learning.</p>
                <div className="mt-6 grid grid-cols-3 gap-3 max-w-xs mx-auto">
                  {[
                    { label: 'Lessons', value: totalLessons, icon: <BookOpen size={14} className="text-teal-500" /> },
                    { label: 'Done', value: completedCount, icon: <CheckCircle2 size={14} className="text-green-500" /> },
                    { label: 'Progress', value: `${progressPct}%`, icon: <Target size={14} className="text-violet-500" /> },
                  ].map(s => (
                    <div key={s.label} className="bg-[#F8FAFC] rounded-xl p-3 text-center">
                      <div className="flex justify-center mb-1">{s.icon}</div>
                      <p className="text-sm font-800 text-[#0D1B3E]">{s.value}</p>
                      <p className="text-[10px] text-[#6B7A99]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
