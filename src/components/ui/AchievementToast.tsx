'use client';
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Star, Trophy, Award, Zap, BookOpen, Target, CheckCircle2, X } from 'lucide-react';

export type AchievementType = 'points' | 'star' | 'badge' | 'certificate' | 'streak' | 'course' | 'interview' | 'assessment';

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  value?: number | string;
}

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

const CONFETTI_COLORS = ['#0D9488', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F97316'];

function ConfettiCanvas({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) { setPieces([]); return; }
    const newPieces: ConfettiPiece[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1,
      size: 6 + Math.random() * 8,
    }));
    setPieces(newPieces);
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

const ACHIEVEMENT_ICONS: Record<AchievementType, React.ReactNode> = {
  points: <Zap size={22} className="text-amber-400" />,
  star: <Star size={22} className="text-amber-400" />,
  badge: <Award size={22} className="text-violet-400" />,
  certificate: <Trophy size={22} className="text-teal-400" />,
  streak: <Zap size={22} className="text-orange-400" />,
  course: <BookOpen size={22} className="text-blue-400" />,
  interview: <Target size={22} className="text-teal-400" />,
  assessment: <CheckCircle2 size={22} className="text-green-400" />,
};

const ACHIEVEMENT_GRADIENTS: Record<AchievementType, string> = {
  points: 'from-amber-500/20 to-yellow-500/10',
  star: 'from-amber-500/20 to-orange-500/10',
  badge: 'from-violet-500/20 to-purple-500/10',
  certificate: 'from-teal-500/20 to-cyan-500/10',
  streak: 'from-orange-500/20 to-red-500/10',
  course: 'from-blue-500/20 to-indigo-500/10',
  interview: 'from-teal-500/20 to-emerald-500/10',
  assessment: 'from-green-500/20 to-teal-500/10',
};

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!achievement) { setVisible(false); setShowConfetti(false); return; }
    setVisible(true);
    setShowConfetti(true);
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 2500);
    const autoClose = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => { clearTimeout(timer); clearTimeout(autoClose); };
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div
      className={[
        'fixed bottom-6 right-6 z-[9999] transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
      ].join(' ')}
      style={{ maxWidth: 360 }}
    >
      <div className={`relative bg-[#0D1B3E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br ${ACHIEVEMENT_GRADIENTS[achievement.type]}`}>
        <ConfettiCanvas active={showConfetti} />
        <div className="relative z-10 p-4 flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
            {ACHIEVEMENT_ICONS[achievement.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-700 text-white/40 uppercase tracking-widest">Achievement Unlocked</span>
            </div>
            <p className="text-sm font-800 text-white leading-tight">{achievement.title}</p>
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{achievement.description}</p>
            {achievement.value && (
              <div className="mt-2 inline-flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1">
                <Zap size={10} className="text-amber-400" />
                <span className="text-[11px] font-700 text-white">+{achievement.value}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
            className="text-white/30 hover:text-white/70 transition-colors shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
        {/* Progress bar auto-close */}
        <div className="h-0.5 bg-white/10">
          <div
            className="h-full bg-teal-400 rounded-full"
            style={{ animation: visible ? 'achievementProgress 5s linear forwards' : 'none' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Achievement Manager Context ─────────────────────────────────────────────
interface AchievementContextValue {
  triggerAchievement: (achievement: Omit<Achievement, 'id'>) => void;
}

const AchievementContext = React.createContext<AchievementContextValue>({
  triggerAchievement: () => {},
});

export function useAchievement() {
  return React.useContext(AchievementContext);
}

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  const triggerAchievement = useCallback((achievement: Omit<Achievement, 'id'>) => {
    const full: Achievement = { ...achievement, id: `ach-${Date.now()}` };
    setQueue(q => [...q, full]);
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(q => q.slice(1));
    }
  }, [current, queue]);

  const handleDismiss = useCallback(() => {
    setCurrent(null);
  }, []);

  return (
    <AchievementContext.Provider value={{ triggerAchievement }}>
      {children}
      <AchievementToast achievement={current} onDismiss={handleDismiss} />
    </AchievementContext.Provider>
  );
}
