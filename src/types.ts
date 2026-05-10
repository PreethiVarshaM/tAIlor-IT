export type DetailPool = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: string[];
};

export type Experience = {
  company: string;
  role: string;
  period: string;
  bullets: string[];
};

export type Education = {
  school: string;
  degree: string;
  period: string;
};

export type Project = {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  selected?: boolean;
};

export type JobTarget = {
  company: string;
  role: string;
  url: string;
  description: string;
};

export type ResumeDraft = {
  headline: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: string[];
  score: number;
  missingKeywords: string[];
  suggestions: string[];
  versionName: string;
};

export type Template = {
  id: string;
  name: string;
  description: string;
};

export type EvidenceAnalysis = {
  verdict: string;
  confidence: "High" | "Medium" | "Low";
  matchedKeywords: string[];
  missingKeywords: string[];
  weakClaims: string[];
  bluntMismatches: string[];
  fixes: string[];
  atsChecks: string[];
};
