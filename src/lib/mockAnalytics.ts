// Analytics mock data — replace with API service calls in production

export interface VolumeDataPoint {
  date: string;
  completed: number;
  scheduled: number;
  cancelled: number;
}

export interface CompletionRatePoint {
  week: string;
  rate: number;
  target: number;
}

export interface CompetencyBreakdown {
  competency: string;
  avgScore: number;
  candidateCount: number;
}

export interface ScoreDistributionPoint {
  range: string;
  count: number;
}

export interface CandidateSegmentData {
  segment: string;
  count: number;
  avgScore: number;
  completionRate: number;
}

export interface DurationDistributionPoint {
  bucket: string;
  count: number;
}

export interface QuestionCategoryData {
  category: string;
  count: number;
  avgScore: number;
}

export const mockVolumeData: VolumeDataPoint[] = [
  { date: 'Aug 4', completed: 3, scheduled: 5, cancelled: 1 },
  { date: 'Aug 5', completed: 5, scheduled: 7, cancelled: 0 },
  { date: 'Aug 6', completed: 4, scheduled: 6, cancelled: 1 },
  { date: 'Aug 7', completed: 6, scheduled: 8, cancelled: 0 },
  { date: 'Aug 8', completed: 7, scheduled: 9, cancelled: 1 },
  { date: 'Aug 11', completed: 8, scheduled: 10, cancelled: 0 },
  { date: 'Aug 12', completed: 6, scheduled: 9, cancelled: 2 },
  { date: 'Aug 13', completed: 9, scheduled: 11, cancelled: 0 },
  { date: 'Aug 14', completed: 7, scheduled: 10, cancelled: 1 },
  { date: 'Aug 15', completed: 10, scheduled: 12, cancelled: 0 },
  { date: 'Aug 18', completed: 8, scheduled: 11, cancelled: 1 },
  { date: 'Aug 19', completed: 11, scheduled: 13, cancelled: 0 },
  { date: 'Aug 20', completed: 9, scheduled: 12, cancelled: 2 },
  { date: 'Aug 21', completed: 12, scheduled: 14, cancelled: 0 },
  { date: 'Aug 22', completed: 10, scheduled: 13, cancelled: 1 },
  { date: 'Aug 25', completed: 13, scheduled: 15, cancelled: 0 },
  { date: 'Aug 26', completed: 11, scheduled: 14, cancelled: 1 },
  { date: 'Aug 27', completed: 14, scheduled: 16, cancelled: 0 },
  { date: 'Aug 28', completed: 12, scheduled: 15, cancelled: 2 },
  { date: 'Aug 29', completed: 15, scheduled: 17, cancelled: 0 },
  { date: 'Sep 1', completed: 13, scheduled: 16, cancelled: 1 },
  { date: 'Sep 2', completed: 16, scheduled: 18, cancelled: 0 },
  { date: 'Sep 3', completed: 11, scheduled: 14, cancelled: 2 },
  { date: 'Sep 4', completed: 8, scheduled: 11, cancelled: 1 },
  { date: 'Sep 5', completed: 5, scheduled: 8, cancelled: 0 },
];

export const mockCompletionRateData: CompletionRatePoint[] = [
  { week: 'Aug W1', rate: 72, target: 80 },
  { week: 'Aug W2', rate: 76, target: 80 },
  { week: 'Aug W3', rate: 79, target: 80 },
  { week: 'Aug W4', rate: 83, target: 80 },
  { week: 'Sep W1', rate: 87, target: 80 },
];

export const mockCompetencyData: CompetencyBreakdown[] = [
  { competency: 'Technical Fundamentals', avgScore: 78, candidateCount: 79 },
  { competency: 'Problem Solving', avgScore: 72, candidateCount: 79 },
  { competency: 'System Design', avgScore: 68, candidateCount: 54 },
  { competency: 'Communication', avgScore: 81, candidateCount: 79 },
  { competency: 'Role Alignment', avgScore: 75, candidateCount: 79 },
  { competency: 'Behavioral', avgScore: 83, candidateCount: 65 },
  { competency: 'Architecture', avgScore: 65, candidateCount: 42 },
];

export const mockScoreDistributionAnalytics: ScoreDistributionPoint[] = [
  { range: '0–20', count: 2 },
  { range: '21–40', count: 4 },
  { range: '41–60', count: 12 },
  { range: '61–70', count: 19 },
  { range: '71–80', count: 23 },
  { range: '81–90', count: 14 },
  { range: '91–100', count: 5 },
];

export const mockCandidateSegments: CandidateSegmentData[] = [
  { segment: 'Junior (0–2 yrs)', count: 18, avgScore: 64, completionRate: 78 },
  { segment: 'Mid-level (3–5 yrs)', count: 31, avgScore: 74, completionRate: 85 },
  { segment: 'Senior (6–9 yrs)', count: 22, avgScore: 82, completionRate: 91 },
  { segment: 'Staff / Principal', count: 8, avgScore: 89, completionRate: 96 },
];

export const mockDurationDistribution: DurationDistributionPoint[] = [
  { bucket: '< 30 min', count: 5 },
  { bucket: '30–40 min', count: 12 },
  { bucket: '40–50 min', count: 28 },
  { bucket: '50–60 min', count: 22 },
  { bucket: '60–75 min', count: 9 },
  { bucket: '> 75 min', count: 3 },
];

export const mockQuestionCategoryData: QuestionCategoryData[] = [
  { category: 'Technical', count: 312, avgScore: 74 },
  { category: 'Behavioral', count: 198, avgScore: 82 },
  { category: 'Problem Solving', count: 156, avgScore: 70 },
  { category: 'Architecture', count: 88, avgScore: 66 },
  { category: 'Role Specific', count: 134, avgScore: 77 },
  { category: 'Experience', count: 112, avgScore: 80 },
];

export const analyticsKPIs = {
  totalInterviews: 79,
  completionRate: 87,
  avgOverallScore: 76,
  avgTechnicalScore: 79,
  avgCommunicationScore: 74,
  avgRoleAlignment: 77,
  avgDuration: 48,
  strongYesRate: 31,
  interviewsThisWeek: 34,
  completionRateChange: +5.2,
  avgScoreChange: +2.1,
  totalInterviewsChange: +18,
};
