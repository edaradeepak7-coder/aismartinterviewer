'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import {
  Eye, EyeOff, Loader2, Mail, Lock, User, ChevronDown,
  CheckCircle, GraduationCap, BookOpen, Hash, Building2, Layers
} from 'lucide-react';

const PROGRAM_OPTIONS = ['B.Tech', 'M.Tech', 'MBA', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'B.E', 'Ph.D', 'Diploma'];
const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const COURSE_OPTIONS = [
  'Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical',
  'Data Science', 'Information Technology', 'Management', 'Mathematics', 'Physics', 'Chemistry',
];
const BRANCH_OPTIONS = [
  'CSE', 'ECE', 'ME', 'CE', 'EE', 'DS', 'IT', 'HR', 'Finance', 'Marketing', 'Operations',
];

export default function CandidateRegisterContent() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [course, setCourse] = useState('');
  const [branch, setBranch] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) { setError('Full name is required.'); return; }
    if (!program) { setError('Please select your program.'); return; }
    if (!year) { setError('Please select your year.'); return; }
    if (!course) { setError('Please select your course.'); return; }
    if (!branch) { setError('Please select your branch/department.'); return; }
    if (!institutionCode.trim()) { setError('Institution code is required.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'candidate',
            program,
            year,
            course,
            branch,
            institution_code: institutionCode.trim().toUpperCase(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Account creation failed. Please try again.');

      const initials = fullName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      // 2. Upsert user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role: 'candidate',
          avatar_initials: initials,
        }, { onConflict: 'id' });

      if (profileError) console.error('user_profiles upsert error:', profileError.message);

      // 3. Create candidates row
      const { error: candidateError } = await supabase
        .from('candidates')
        .upsert({
          user_id: authData.user.id,
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          role: '',
          avatar_initials: initials,
        }, { onConflict: 'email' });

      if (candidateError) console.error('candidates upsert error:', candidateError.message);

      // 4. Link to institution via institution_candidates
      const { data: instData } = await supabase
        .from('institutions')
        .select('id')
        .eq('institution_code', institutionCode.trim().toUpperCase())
        .single();

      if (instData?.id) {
        await supabase.from('institution_candidates').upsert({
          institution_id: instData.id,
          user_id: authData.user.id,
          program,
          year,
          course,
          branch,
          institution_code: institutionCode.trim().toUpperCase(),
          email_verified: false,
        }, { onConflict: 'user_id' });
      }

      // 5. Send verification email via Resend edge function
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const confirmationUrl = `${siteUrl}/auth/callback?next=/`;
        await supabase.functions.invoke('send-verification-email', {
          body: {
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            role: 'candidate',
            confirmationUrl,
            program,
            year,
            course,
            branch,
            institutionCode: institutionCode.trim().toUpperCase(),
          },
        });
      } catch (emailErr) {
        console.warn('Custom verification email failed:', emailErr);
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-emerald-400/15 flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
          </div>
          <h1 className="text-lg font-600 text-foreground mb-2">Registration Successful!</h1>
          <p className="text-sm text-muted-foreground mb-2">
            A verification email has been sent to <strong className="text-foreground">{email}</strong>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Please confirm your email address before signing in. Your profile will be created after verification.
          </p>
          <div className="bg-card border border-border rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs font-700 text-foreground">Registration Details</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Program:</span><span className="text-foreground font-500">{program}</span>
              <span>Year:</span><span className="text-foreground font-500">{year}</span>
              <span>Course:</span><span className="text-foreground font-500">{course}</span>
              <span>Branch:</span><span className="text-foreground font-500">{branch}</span>
              <span>Institution Code:</span><span className="text-foreground font-500 font-mono">{institutionCode.toUpperCase()}</span>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-500 rounded-lg transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <AppLogo size={40} />
            <span className="text-xl font-semibold text-foreground tracking-tight">AI Interviewer</span>
          </div>
          <p className="text-sm text-muted-foreground">Candidate Registration — Institution Portal</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <GraduationCap size={20} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Create Candidate Account</h1>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="Arjun Sharma"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@college.edu"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Academic Details Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Program */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Program</label>
                <div className="relative">
                  <GraduationCap size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={program}
                    onChange={e => setProgram(e.target.value)}
                    required
                    className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">Select…</option>
                    {PROGRAM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Year</label>
                <div className="relative">
                  <Layers size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    required
                    className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">Select…</option>
                    {YEAR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Course */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Course</label>
                <div className="relative">
                  <BookOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={course}
                    onChange={e => setCourse(e.target.value)}
                    required
                    className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">Select…</option>
                    {COURSE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Branch / Dept</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    required
                    className="w-full pl-9 pr-8 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors appearance-none"
                  >
                    <option value="">Select…</option>
                    {BRANCH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Institution Code */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Institution Code</label>
              <div className="relative">
                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={institutionCode}
                  onChange={e => setInstitutionCode(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. IITB2026"
                  className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors font-mono uppercase"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Provided by your institution's placement office</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Min. 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-600 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />}
              {loading ? 'Creating Account…' : 'Create Account & Send Verification'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-500">Sign in</Link>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Not a candidate?{' '}
            <Link href="/register" className="text-primary hover:underline font-500">General registration</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
