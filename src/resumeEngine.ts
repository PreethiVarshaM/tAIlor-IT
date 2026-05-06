import { DetailPool, Experience, JobTarget, Project, ResumeDraft } from "./types";

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "are",
  "our",
  "that",
  "this",
  "will",
  "from",
  "have",
  "into",
  "your",
  "job",
  "role",
  "we",
  "is",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
]);

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopWords.has(word));

const uniq = <T,>(items: T[]) => Array.from(new Set(items));

const evidenceText = (pool: DetailPool) =>
  [
    pool.summary,
    pool.skills.join(" "),
    ...pool.experience.flatMap((item) => [item.company, item.role, item.bullets.join(" ")]),
    ...pool.projects.flatMap((item) => [
      item.name,
      item.description,
      item.technologies.join(" "),
    ]),
    pool.certifications.join(" "),
  ].join(" ");

const overlapScore = (text: string, keywords: string[]) => {
  const words = tokenize(text);
  const set = new Set(words);
  return keywords.reduce((sum, keyword) => sum + (set.has(keyword) ? 1 : 0), 0);
};

const chooseExperience = (experience: Experience[], keywords: string[]) =>
  experience
    .map((item) => ({ item, score: overlapScore([item.role, item.company, ...item.bullets].join(" "), keywords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);

const chooseProjects = (projects: Project[], keywords: string[]) =>
  projects
    .map((item) => ({
      item: { ...item, selected: true },
      score: overlapScore([item.name, item.description, item.technologies.join(" ")].join(" "), keywords),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);

const versionSafe = (value: string, fallback: string) =>
  (value || fallback)
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

export function createResumeDraft(pool: DetailPool, job: JobTarget): ResumeDraft {
  const jobKeywords = uniq(tokenize(job.description));
  const profileKeywords = new Set(tokenize(evidenceText(pool)));
  const matched = jobKeywords.filter((keyword) => profileKeywords.has(keyword));
  const missingKeywords = jobKeywords.filter((keyword) => !profileKeywords.has(keyword)).slice(0, 12);
  const score = jobKeywords.length ? Math.round((matched.length / jobKeywords.length) * 100) : 0;
  const selectedSkills = pool.skills
    .map((skill) => ({ skill, score: overlapScore(skill, jobKeywords) || (job.description.toLowerCase().includes(skill.toLowerCase()) ? 2 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ skill }) => skill);

  const suggestions = [
    missingKeywords.length
      ? `Add truthful evidence for: ${missingKeywords.slice(0, 6).join(", ")}.`
      : "Keyword coverage is strong; focus on sharpening measurable outcomes.",
    "Rewrite generic bullets with impact, metric, scope, and technology in one sentence.",
    job.url ? "Keep the job URL attached to this version for auditability." : "Add the job URL so this tailored resume can be traced later.",
    "Import recent GitHub projects and pin only repositories that prove this role's required skills.",
  ];

  const today = new Date().toISOString().slice(0, 10);
  const versionName = `${today}_${versionSafe(job.company, "company")}_${versionSafe(job.role, "role")}`;

  return {
    headline: `${pool.title} | ${job.role || "Targeted Resume"}`,
    summary: `${pool.summary} Focused for ${job.role || "this role"}${job.company ? ` at ${job.company}` : ""}.`,
    skills: selectedSkills.length ? selectedSkills : pool.skills.slice(0, 12),
    experience: chooseExperience(pool.experience, jobKeywords),
    projects: chooseProjects(pool.projects, jobKeywords),
    education: pool.education,
    certifications: pool.certifications,
    score,
    missingKeywords,
    suggestions,
    versionName,
  };
}

export function mergeGithubRepos(pool: DetailPool, repos: Project[]): DetailPool {
  const existing = new Set(pool.projects.map((project) => project.url || project.name));
  const merged = repos.filter((repo) => !existing.has(repo.url || repo.name));
  return { ...pool, projects: [...pool.projects, ...merged] };
}

export function parseLinkedInProfileText(text: string): Partial<DetailPool> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const skillsLine = lines.find((line) => /skills/i.test(line));
  const certificationLines = lines.filter((line) => /certification|certificate|credential/i.test(line));

  return {
    summary: lines.slice(0, 4).join(" "),
    skills: skillsLine
      ? skillsLine
          .replace(/skills:?/i, "")
          .split(/[,|]/)
          .map((skill) => skill.trim())
          .filter(Boolean)
      : undefined,
    certifications: certificationLines.length ? certificationLines : undefined,
  };
}

export async function fetchGithubRepos(username: string): Promise<Project[]> {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=8`);
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}`);
  }
  const repos = await response.json();
  return repos.map((repo: any) => ({
    name: repo.name,
    description: repo.description || "GitHub repository imported from the user's public profile.",
    technologies: [repo.language, ...(repo.topics || [])].filter(Boolean).slice(0, 8),
    url: repo.html_url,
  }));
}

export function resumeToText(pool: DetailPool, draft: ResumeDraft) {
  const lines = [
    pool.name,
    draft.headline,
    `${pool.email} | ${pool.phone} | ${pool.location}`,
    "",
    "SUMMARY",
    draft.summary,
    "",
    "SKILLS",
    draft.skills.join(", "),
    "",
    "EXPERIENCE",
    ...draft.experience.flatMap((item) => [
      `${item.role} - ${item.company} (${item.period})`,
      ...item.bullets.map((bullet) => `- ${bullet}`),
      "",
    ]),
    "PROJECTS",
    ...draft.projects.flatMap((item) => [
      `${item.name}${item.url ? ` - ${item.url}` : ""}`,
      item.description,
      `Tech: ${item.technologies.join(", ")}`,
      "",
    ]),
    "EDUCATION",
    ...draft.education.map((item) => `${item.degree}, ${item.school} (${item.period})`),
    "",
    "CERTIFICATIONS",
    ...draft.certifications.map((item) => `- ${item}`),
  ];

  return lines.join("\n");
}
