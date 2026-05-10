import { DetailPool, Experience, JobTarget, Project, ResumeDraft } from "./types";
import yaml from "js-yaml";

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

export function githubBlobToRawUrl(repoUrl: string, path = "data/professional_master_data.yml") {
  const { owner, repo } = parseGithubRepo(repoUrl);
  return `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
}

function parseGithubRepo(repoUrl: string) {
  const normalized = repoUrl.trim().replace(/\/$/, "");
  const match = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i);
  if (!match) {
    throw new Error("Enter a valid GitHub repository URL.");
  }
  const [, owner, repo] = match;
  return { owner, repo: repo.replace(/\.git$/, "") };
}

const flattenSkillGroups = (skills: unknown) => {
  if (!skills || typeof skills !== "object") {
    return [];
  }
  return Object.values(skills as Record<string, unknown>).flatMap((group) =>
    Array.isArray(group) ? group.map(String) : [],
  );
};

const mapMasterExperience = (experience: any[] = []): Experience[] =>
  experience.map((item) => ({
    company: item.company || "Company",
    role: item.title || item.role || "Role",
    period: [item.start, item.end].filter(Boolean).join(" - ") || item.period || "",
    bullets: [
      ...(Array.isArray(item.bullets) ? item.bullets.map(String) : []),
      ...(Array.isArray(item.projects)
        ? item.projects.flatMap((project: any) =>
            Array.isArray(project.bullets)
              ? project.bullets.map((bullet: any) => (typeof bullet === "string" ? bullet : bullet.text)).filter(Boolean)
              : [],
          )
        : []),
    ].slice(0, 8),
  }));

const mapMasterProjects = (projects: any[] = []): Project[] =>
  projects.map((item) => ({
    name: item.name || "Project",
    description: [
      item.subtitle,
      ...(Array.isArray(item.bullets)
        ? item.bullets.map((bullet: unknown) => (typeof bullet === "string" ? bullet : String(bullet))).slice(0, 2)
        : []),
    ]
      .filter(Boolean)
      .join(" - "),
    technologies: Array.isArray(item.tags) ? item.tags.map(String) : [],
    url: item.github,
  }));

export function masterDataToDetailPool(masterData: any): DetailPool {
  const profile = masterData.profile || {};
  const positioning = masterData.positioning || {};
  const education = Array.isArray(masterData.education) ? masterData.education : [];
  const achievements = Array.isArray(masterData.achievements) ? masterData.achievements : [];
  const certifications = [
    ...(Array.isArray(masterData.certifications) ? masterData.certifications.map((item: any) => item.name || item.title || String(item)) : []),
    ...achievements.map((item: any) => item.title || item.name || String(item)).filter(Boolean),
  ];

  return {
    name: profile.full_name || profile.name || "",
    title: Array.isArray(positioning.target_roles) ? positioning.target_roles[0] : "Software Engineer",
    email: profile.email || "",
    phone: profile.phone || "",
    location: profile.location || "",
    summary: positioning.primary_summary || "",
    skills: Array.from(new Set(flattenSkillGroups(masterData.skills))),
    experience: mapMasterExperience(masterData.experience),
    education: education.map((item: any) => ({
      school: item.institution || item.school || "",
      degree: [item.degree, item.field].filter(Boolean).join(" - "),
      period: [item.start, item.end].filter(Boolean).join(" - ") || item.period || "",
    })),
    projects: mapMasterProjects(masterData.projects),
    certifications,
  };
}

export async function fetchMasterData(repoUrl: string, token?: string): Promise<DetailPool> {
  const { owner, repo } = parseGithubRepo(repoUrl);
  const path = "data/professional_master_data.yml";
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const apiResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=main`, {
    headers,
  });

  let rawText = "";
  if (apiResponse.ok) {
    const payload = await apiResponse.json();
    if (!payload.content) {
      throw new Error("Master data file exists but did not include readable content.");
    }
    rawText = decodeURIComponent(escape(atob(String(payload.content).replace(/\s/g, ""))));
  } else if (!token) {
    const rawResponse = await fetch(githubBlobToRawUrl(repoUrl, path));
    if (!rawResponse.ok) {
      throw new Error(
        `Master data fetch failed with ${apiResponse.status}. Add a GitHub token for private repo access or fill details manually.`,
      );
    }
    rawText = await rawResponse.text();
  } else {
    throw new Error(`Master data fetch failed with ${apiResponse.status}. Check repo access, token permissions, or fill details manually.`);
  }

  const parsed = yaml.load(rawText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Master data file is empty or invalid.");
  }
  const pool = masterDataToDetailPool(parsed);
  if (!pool.name || !pool.summary || !pool.skills.length) {
    throw new Error("Master data is missing name, summary, or skills. Add missing resume details manually.");
  }
  return pool;
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
