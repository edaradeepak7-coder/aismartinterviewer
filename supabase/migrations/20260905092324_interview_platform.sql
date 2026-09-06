-- ============================================================
-- Interview Platform Schema Migration
-- ============================================================

-- 1. ENUM TYPES
DROP TYPE IF EXISTS public.interview_status CASCADE;
CREATE TYPE public.interview_status AS ENUM ('scheduled', 'in_progress', 'completed', 'evaluated', 'archived');

DROP TYPE IF EXISTS public.recommendation_type CASCADE;
CREATE TYPE public.recommendation_type AS ENUM ('strong_yes', 'yes', 'maybe', 'no');

DROP TYPE IF EXISTS public.interview_type CASCADE;
CREATE TYPE public.interview_type AS ENUM ('technical', 'behavioral', 'mixed');

DROP TYPE IF EXISTS public.question_category CASCADE;
CREATE TYPE public.question_category AS ENUM ('Technical', 'Behavioral', 'Architecture', 'Problem Solving', 'Experience', 'Role Specific');

DROP TYPE IF EXISTS public.question_difficulty CASCADE;
CREATE TYPE public.question_difficulty AS ENUM ('Easy', 'Medium', 'Hard');

DROP TYPE IF EXISTS public.competency_level CASCADE;
CREATE TYPE public.competency_level AS ENUM ('Excellent', 'Good', 'Satisfactory', 'Needs Improvement');

-- 2. CORE TABLES

-- user_profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'candidate',
  avatar_initials TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- candidates
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT '',
  department TEXT,
  experience_level TEXT,
  avatar_initials TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  category public.question_category NOT NULL DEFAULT 'Technical',
  difficulty public.question_difficulty NOT NULL DEFAULT 'Medium',
  technology TEXT,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- interviews
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT 'Meridian Technologies',
  department TEXT,
  interview_type public.interview_type NOT NULL DEFAULT 'technical',
  status public.interview_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  question_count INTEGER DEFAULT 0,
  answered_count INTEGER DEFAULT 0,
  overall_score INTEGER,
  technical_score INTEGER,
  communication_score INTEGER,
  role_alignment_score INTEGER,
  recommendation public.recommendation_type,
  ai_feedback_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- interview_questions (junction: which questions used in which interview)
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- responses (candidate answers per question per interview)
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_type TEXT NOT NULL DEFAULT 'text',
  audio_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- interview_results (AI-generated scores and feedback per interview)
CREATE TABLE IF NOT EXISTS public.interview_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES public.interviews(id) ON DELETE CASCADE,
  final_score INTEGER,
  recommendation public.recommendation_type,
  ai_summary TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  competencies JSONB DEFAULT '[]'::jsonb,
  ai_feedback JSONB DEFAULT '[]'::jsonb,
  transcript_highlights JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_candidates_email ON public.candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON public.candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON public.interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON public.interviews(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON public.interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_responses_interview_id ON public.responses(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_results_interview_id ON public.interview_results(interview_id);

-- 4. FUNCTIONS

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Handle new auth user → create user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, avatar_initials)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'candidate'),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 2))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_results ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- candidates: authenticated users can read all, manage their own
DROP POLICY IF EXISTS "authenticated_read_candidates" ON public.candidates;
CREATE POLICY "authenticated_read_candidates"
ON public.candidates FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "users_manage_own_candidates" ON public.candidates;
CREATE POLICY "users_manage_own_candidates"
ON public.candidates FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- questions: all authenticated can read
DROP POLICY IF EXISTS "authenticated_read_questions" ON public.questions;
CREATE POLICY "authenticated_read_questions"
ON public.questions FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_questions" ON public.questions;
CREATE POLICY "authenticated_insert_questions"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (true);

-- interviews: authenticated users can read all, manage their own
DROP POLICY IF EXISTS "authenticated_read_interviews" ON public.interviews;
CREATE POLICY "authenticated_read_interviews"
ON public.interviews FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_interviews" ON public.interviews;
CREATE POLICY "authenticated_insert_interviews"
ON public.interviews FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_interviews" ON public.interviews;
CREATE POLICY "authenticated_update_interviews"
ON public.interviews FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- interview_questions
DROP POLICY IF EXISTS "authenticated_manage_interview_questions" ON public.interview_questions;
CREATE POLICY "authenticated_manage_interview_questions"
ON public.interview_questions FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- responses
DROP POLICY IF EXISTS "authenticated_manage_responses" ON public.responses;
CREATE POLICY "authenticated_manage_responses"
ON public.responses FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- interview_results
DROP POLICY IF EXISTS "authenticated_manage_interview_results" ON public.interview_results;
CREATE POLICY "authenticated_manage_interview_results"
ON public.interview_results FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_candidates_updated_at ON public.candidates;
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_interviews_updated_at ON public.interviews;
CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_interview_results_updated_at ON public.interview_results;
CREATE TRIGGER update_interview_results_updated_at
  BEFORE UPDATE ON public.interview_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 8. MOCK DATA
DO $$
DECLARE
  recruiter_uuid UUID := gen_random_uuid();
  candidate_uuid_1 UUID := gen_random_uuid();
  candidate_uuid_2 UUID := gen_random_uuid();
  candidate_uuid_3 UUID := gen_random_uuid();
  cand_id_1 UUID := gen_random_uuid();
  cand_id_2 UUID := gen_random_uuid();
  cand_id_3 UUID := gen_random_uuid();
  int_id_1 UUID := gen_random_uuid();
  int_id_2 UUID := gen_random_uuid();
  int_id_3 UUID := gen_random_uuid();
  q_id_1 UUID := gen_random_uuid();
  q_id_2 UUID := gen_random_uuid();
  q_id_3 UUID := gen_random_uuid();
  q_id_4 UUID := gen_random_uuid();
  q_id_5 UUID := gen_random_uuid();
BEGIN
  -- Auth users
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (recruiter_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'recruiter@meridian.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Alex Recruiter', 'role', 'recruiter'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (candidate_uuid_1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'priya.nair@gmail.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Priya Nair', 'role', 'candidate'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (candidate_uuid_2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'marcus.webb@outlook.com', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Marcus Webb', 'role', 'candidate'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (candidate_uuid_3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'aisha.okonkwo@proton.me', crypt('password123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Aisha Okonkwo', 'role', 'candidate'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Candidates table
  INSERT INTO public.candidates (id, user_id, name, email, role, department, experience_level, avatar_initials)
  VALUES
    (cand_id_1, candidate_uuid_1, 'Priya Nair', 'priya.nair@gmail.com', 'Senior Frontend Engineer', 'Engineering', 'Senior', 'PN'),
    (cand_id_2, candidate_uuid_2, 'Marcus Webb', 'marcus.webb@outlook.com', 'Backend Engineer', 'Engineering', 'Mid', 'MW'),
    (cand_id_3, candidate_uuid_3, 'Aisha Okonkwo', 'aisha.okonkwo@proton.me', 'ML Engineer', 'AI/ML', 'Senior', 'AO')
  ON CONFLICT (email) DO NOTHING;

  -- Questions
  INSERT INTO public.questions (id, text, category, difficulty, technology)
  VALUES
    (q_id_1, 'Can you walk me through your experience with React concurrent rendering features, particularly how you have used Suspense and transitions in production applications?', 'Technical', 'Medium', 'React'),
    (q_id_2, 'Describe a situation where you had to significantly optimize the performance of a React application. What profiling tools did you use?', 'Problem Solving', 'Hard', 'React'),
    (q_id_3, 'How do you approach state management in large-scale React applications? Walk me through the trade-offs between different solutions.', 'Architecture', 'Hard', 'React'),
    (q_id_4, 'Tell me about a time you had to collaborate with a designer and backend team simultaneously to deliver a complex feature under a tight deadline.', 'Behavioral', 'Medium', null),
    (q_id_5, 'How do you ensure accessibility compliance in the components you build? What tools and practices do you follow?', 'Technical', 'Medium', 'Web Standards')
  ON CONFLICT (id) DO NOTHING;

  -- Interviews
  INSERT INTO public.interviews (id, candidate_id, recruiter_id, role, company, department, interview_type, status, scheduled_at, completed_at, duration_minutes, question_count, answered_count, overall_score, technical_score, communication_score, role_alignment_score, recommendation, ai_feedback_generated)
  VALUES
    (int_id_1, cand_id_1, recruiter_uuid, 'Senior Frontend Engineer', 'Meridian Technologies', 'Engineering', 'technical', 'evaluated', '2026-09-02T14:00:00Z', '2026-09-02T14:47:00Z', 47, 5, 5, 87, 91, 84, 88, 'strong_yes', true),
    (int_id_2, cand_id_2, recruiter_uuid, 'Backend Engineer', 'Meridian Technologies', 'Engineering', 'technical', 'evaluated', '2026-09-02T10:00:00Z', '2026-09-02T10:52:00Z', 52, 5, 4, 74, 78, 68, 76, 'yes', true),
    (int_id_3, cand_id_3, recruiter_uuid, 'ML Engineer', 'Meridian Technologies', 'AI/ML', 'mixed', 'evaluated', '2026-09-01T15:30:00Z', '2026-09-01T16:22:00Z', 52, 5, 5, 92, 95, 89, 91, 'strong_yes', true)
  ON CONFLICT (id) DO NOTHING;

  -- Interview questions (link questions to interviews)
  INSERT INTO public.interview_questions (interview_id, question_id, question_order)
  VALUES
    (int_id_1, q_id_1, 1), (int_id_1, q_id_2, 2), (int_id_1, q_id_3, 3), (int_id_1, q_id_4, 4), (int_id_1, q_id_5, 5),
    (int_id_2, q_id_1, 1), (int_id_2, q_id_2, 2), (int_id_2, q_id_3, 3), (int_id_2, q_id_4, 4), (int_id_2, q_id_5, 5),
    (int_id_3, q_id_1, 1), (int_id_3, q_id_2, 2), (int_id_3, q_id_3, 3), (int_id_3, q_id_4, 4), (int_id_3, q_id_5, 5)
  ON CONFLICT (id) DO NOTHING;

  -- Sample responses for interview 1
  INSERT INTO public.responses (interview_id, question_id, answer_text, answer_type)
  VALUES
    (int_id_1, q_id_1, 'I have worked extensively with React 18 concurrent features. In my last role at a fintech startup, we adopted Suspense boundaries for data fetching using React Query. We wrapped dashboard widgets in individual Suspense boundaries so they could load independently. For transitions, we used useTransition to keep the UI responsive during heavy state updates.', 'text'),
    (int_id_1, q_id_2, 'For performance optimization, I rely heavily on the React DevTools Profiler to identify unnecessary re-renders before touching any code. I also use Lighthouse for overall performance metrics. The most impactful changes were memoization with useMemo and useCallback, and code splitting with React.lazy.', 'text'),
    (int_id_1, q_id_3, 'State management choice depends on team size and data complexity. For large apps, I prefer Zustand for simplicity with Jotai for atomic state. Redux is great for complex state with time-travel debugging needs. Context API works well for simple global state like themes.', 'text'),
    (int_id_1, q_id_4, 'I led a cross-functional feature delivery at my previous company. I set up daily standups with the designer and backend team, used Figma for design handoff, and created a shared API contract document. We delivered on time by parallelizing frontend and backend work.', 'text'),
    (int_id_1, q_id_5, 'I follow WCAG 2.1 AA guidelines. I use axe DevTools for automated testing, ensure proper ARIA labels, keyboard navigation, and color contrast ratios. I also do manual screen reader testing with NVDA and VoiceOver.', 'text')
  ON CONFLICT (id) DO NOTHING;

  -- Interview results for interview 1
  INSERT INTO public.interview_results (interview_id, final_score, recommendation, ai_summary, competencies, ai_feedback, transcript_highlights)
  VALUES
    (int_id_1, 87, 'strong_yes',
     'Priya demonstrated exceptional React expertise with strong production experience in concurrent features and performance optimization.',
     '[{"name":"Technical Depth","score":88,"maxScore":100,"level":"Excellent","feedback":"Demonstrated strong command of React concurrent features with real production examples."},{"name":"Problem Solving","score":82,"maxScore":100,"level":"Good","feedback":"Approached optimization challenges methodically."},{"name":"System Design","score":79,"maxScore":100,"level":"Good","feedback":"Solid understanding of state management patterns."},{"name":"Communication","score":86,"maxScore":100,"level":"Excellent","feedback":"Articulate and structured responses throughout."},{"name":"Role Alignment","score":85,"maxScore":100,"level":"Excellent","feedback":"Experience closely matches the role requirements."}]'::jsonb,
     '[{"title":"Technical Expertise","content":"Demonstrated exceptional knowledge of React 18 concurrent features with specific production use cases.","type":"strength"},{"title":"Communication Style","content":"Responses were well-structured with a clear problem-context-solution narrative.","type":"strength"},{"title":"Areas for Growth","content":"Could benefit from deeper exposure to micro-frontend architectures and module federation patterns.","type":"improvement"},{"title":"Cultural Indicators","content":"Collaborative mindset was evident. Showed ownership mentality that aligns with engineering culture.","type":"neutral"}]'::jsonb,
     '[{"timestamp":"02:15","text":"I have worked extensively with React 18 concurrent features. In my last role at a fintech startup, we adopted Suspense boundaries..."},{"timestamp":"08:42","text":"For performance optimization, I rely heavily on the React DevTools Profiler to identify unnecessary re-renders..."},{"timestamp":"15:30","text":"State management choice really depends on the team size and data complexity. For large apps, I prefer Zustand..."}]'::jsonb
    )
  ON CONFLICT (interview_id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
