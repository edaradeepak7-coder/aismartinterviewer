export type OfferNextStep = {
  step: string;
  deadline?: string;
  completed?: boolean;
};

export type OfferPrepTip = {
  category: string;
  tip: string;
};

export function defaultOfferNextSteps(role: string, company: string): OfferNextStep[] {
  const roleLabel = role.trim() || 'this role';
  const companyLabel = company.trim() || 'the company';
  return [
    {
      step: `HR will send your formal offer letter for ${roleLabel} at ${companyLabel}`,
      deadline: 'Within 3 business days',
      completed: false,
    },
    {
      step: 'Review compensation, benefits, and proposed start date',
      deadline: 'Within 5 business days',
      completed: false,
    },
    {
      step: 'Complete paperwork and any background-check forms',
      completed: false,
    },
    {
      step: 'Confirm your start date with the hiring manager',
      completed: false,
    },
  ];
}

export function defaultOfferPrepTips(role: string): OfferPrepTip[] {
  const roleLabel = role.trim() || 'your new role';
  return [
    {
      category: 'Onboarding',
      tip: 'Prepare ID, tax forms, and bank details so day-one setup is smooth.',
    },
    {
      category: 'Role',
      tip: `Review the ${roleLabel} responsibilities and jot questions for your manager.`,
    },
    {
      category: 'Culture',
      tip: 'Skim recent company news and team values before your first week.',
    },
  ];
}

export function normalizeOfferNextSteps(
  raw: unknown,
  role: string,
  company: string,
): OfferNextStep[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultOfferNextSteps(role, company);
  }
  const steps = raw
    .map((item) => {
      if (typeof item === 'string') {
        const step = item.trim();
        return step ? { step, completed: false } : null;
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const step = String(o.step ?? o.title ?? o.text ?? '').trim();
        if (!step) return null;
        return {
          step: step.slice(0, 500),
          deadline: o.deadline ? String(o.deadline).slice(0, 120) : undefined,
          completed: Boolean(o.completed),
        };
      }
      return null;
    })
    .filter((s): s is OfferNextStep => Boolean(s));
  return steps.length ? steps : defaultOfferNextSteps(role, company);
}

export function normalizeOfferPrepTips(raw: unknown, role: string): OfferPrepTip[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultOfferPrepTips(role);
  }
  const tips = raw
    .map((item) => {
      if (typeof item === 'string') {
        const tip = item.trim();
        return tip ? { category: 'Tip', tip: tip.slice(0, 500) } : null;
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const tip = String(o.tip ?? o.text ?? o.content ?? '').trim();
        if (!tip) return null;
        return {
          category: String(o.category ?? 'Tip').trim().slice(0, 40) || 'Tip',
          tip: tip.slice(0, 500),
        };
      }
      return null;
    })
    .filter((t): t is OfferPrepTip => Boolean(t));
  return tips.length ? tips : defaultOfferPrepTips(role);
}

/** Parse recruiter textarea: one step per line; optional "deadline | step" */
export function parseNextStepsText(text: string): OfferNextStep[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.indexOf('|');
      if (pipe > 0) {
        return {
          step: line.slice(pipe + 1).trim().slice(0, 500),
          deadline: line.slice(0, pipe).trim().slice(0, 120),
          completed: false,
        };
      }
      return { step: line.slice(0, 500), completed: false };
    })
    .filter((s) => s.step);
}

/** Parse recruiter textarea: "Category: tip" or plain tip per line */
export function parsePrepTipsText(text: string): OfferPrepTip[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(':');
      if (colon > 0 && colon < 40) {
        return {
          category: line.slice(0, colon).trim().slice(0, 40) || 'Tip',
          tip: line.slice(colon + 1).trim().slice(0, 500),
        };
      }
      return { category: 'Tip', tip: line.slice(0, 500) };
    })
    .filter((t) => t.tip);
}

export function formatNextStepsText(steps: OfferNextStep[] | null | undefined): string {
  if (!steps?.length) return '';
  return steps
    .map((s) => (s.deadline ? `${s.deadline} | ${s.step}` : s.step))
    .join('\n');
}

export function formatPrepTipsText(tips: OfferPrepTip[] | null | undefined): string {
  if (!tips?.length) return '';
  return tips.map((t) => `${t.category}: ${t.tip}`).join('\n');
}
