import { DetailPool, JobTarget, Template } from "./types";

export const templates: Template[] = [
  {
    id: "focused-modern",
    name: "Focused Modern",
    description: "Compact ATS-friendly layout with strong impact bullets.",
  },
];

export const initialPool: DetailPool = {
  name: "Aarav Sharma",
  title: "Full Stack Engineer",
  email: "aarav@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, India",
  summary:
    "Full stack engineer with experience building AI-assisted products, scalable web apps, and automation workflows across React, Node.js, Python, and cloud platforms.",
  skills: [
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "REST APIs",
    "GitHub Actions",
    "PostgreSQL",
    "AI workflows",
    "Docker",
    "AWS",
  ],
  experience: [
    {
      company: "Nimbus Labs",
      role: "Software Engineer",
      period: "2023 - Present",
      bullets: [
        "Built customer-facing React dashboards that reduced manual reporting time by 40%.",
        "Designed Node.js APIs for profile enrichment, file generation, and background job orchestration.",
        "Integrated GitHub Actions workflows to ship tested releases across staging and production.",
      ],
    },
    {
      company: "VectorStack",
      role: "Junior Developer",
      period: "2021 - 2023",
      bullets: [
        "Implemented reusable TypeScript components for internal hiring and analytics tools.",
        "Automated document generation flows for PDF and DOCX reports.",
      ],
    },
  ],
  education: [
    {
      school: "Visvesvaraya Technological University",
      degree: "B.E. Computer Science",
      period: "2017 - 2021",
    },
  ],
  projects: [
    {
      name: "AI Resume Builder",
      description:
        "Resume tailoring assistant that ranks profile evidence against target job descriptions and exports reviewable resumes.",
      technologies: ["React", "TypeScript", "OpenAI", "GitHub API"],
      url: "https://github.com/example/ai-resume-builder",
    },
    {
      name: "Ops Automator",
      description:
        "Workflow engine for scheduled data ingestion, validation, and notification routing.",
      technologies: ["Node.js", "PostgreSQL", "Docker", "AWS"],
    },
  ],
  certifications: ["AWS Cloud Practitioner", "Meta Front-End Developer"],
};

export const initialJob: JobTarget = {
  company: "Acme AI",
  role: "AI Product Engineer",
  url: "https://jobs.example.com/acme-ai-product-engineer",
  description:
    "We are looking for an AI Product Engineer with React, TypeScript, Node.js, GitHub API, PDF/DOCX generation, resume parsing, prompt engineering, and strong product design experience.",
};
