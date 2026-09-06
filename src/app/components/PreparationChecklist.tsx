'use client';
import React, { useState } from 'react';
import { CheckCircle2, Circle, BookOpen } from 'lucide-react';

const DEFAULT_ITEMS = [
  { id: 'c1', label: 'Review job description and requirements', completed: false },
  { id: 'c2', label: 'Prepare 3 STAR-format behavioral stories', completed: false },
  { id: 'c3', label: 'Practice technical problem solving', completed: false },
  { id: 'c4', label: 'Test microphone and internet connection', completed: false },
  { id: 'c5', label: 'Research company background', completed: false },
  { id: 'c6', label: 'Prepare questions for the interviewer', completed: false },
];

export default function PreparationChecklist() {
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const completed = items.filter((i) => i.completed).length;
  const pct = Math.round((completed / items.length) * 100);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 h-full flex flex-col fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Preparation</h3>
        </div>
        <span className="tabular-nums text-[12px] font-600 text-muted-foreground">{pct}% done</span>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-1.5 bg-primary rounded-full score-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-2 flex-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-start gap-2.5 text-left hover:bg-muted/50 rounded-md px-1.5 py-1 transition-colors group"
              aria-pressed={item.completed}
            >
              {item.completed ? (
                <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
              ) : (
                <Circle size={16} className="text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
              )}
              <span className={`text-[13px] leading-snug ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          {items.length - completed} tasks remaining before your next interview
        </p>
      </div>
    </div>
  );
}