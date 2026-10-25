// Response shapes from the Resu-Dog web API (frontend/app/api/v1/*).

export type Mode = 'targeted' | 'general';

export interface ScoreData {
  overall_score: number;
  summary: string;
  // Targeted mode
  keyword_coverage?: number;
  skills_alignment?: number;
  formatting_compliance?: number;
  matched_keywords?: string[];
  missing_keywords?: string[];
  // General mode
  clarity?: number;
  action_language?: number;
  structure?: number;
  completeness?: number;
}

export type Verdict = 'Low' | 'Fair' | 'Good' | 'Strong';

export interface AssessmentData {
  shortlist_probability: Verdict;
  probability_rationale: string;
  strengths: string[];
  critical_gaps: string[];
  quick_wins: string[];
  red_flags: string[];
  skills_heatmap?: { skill: string; status: 'matched' | 'transferable' | 'gap' }[];
  transferable_bridges?: { skill: string; bridge: string }[];
  gap_roadmap?: { skill: string; action: string }[];
}

export interface OptimizeResult {
  mode: Mode;
  score_before: ScoreData;
  score_after: ScoreData;
  optimized_resume: string;
  changes_made: string[];
  keywords_added: string[];
  cover_letter: string;
  assessment?: AssessmentData;
}

export interface BuildQuestion {
  id: string;
  section: string;
  question: string;
  placeholder: string;
  required: boolean;
}

export interface BuildAnalysis {
  role_title: string;
  seniority: string;
  industry: string;
  key_skills: string[];
  questions: BuildQuestion[];
}

export interface BuildResult {
  resume: string;
  keywords_used: string[];
  score: ScoreData;
  assessment?: AssessmentData;
  improvements_applied: string[];
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}
