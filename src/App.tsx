import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";
import {
  Award,
  BriefcaseBusiness,
  Download,
  FileText,
  Github,
  Link,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { initialJob, initialPool, templates } from "./sampleData";
import {
  createResumeDraft,
  fetchGithubRepos,
  mergeGithubRepos,
  parseLinkedInProfileText,
  resumeToText,
} from "./resumeEngine";
import { DetailPool, JobTarget } from "./types";

const updateList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function App() {
  const [pool, setPool] = useState<DetailPool>(initialPool);
  const [job, setJob] = useState<JobTarget>(initialJob);
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [githubUser, setGithubUser] = useState("octocat");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [existingResume, setExistingResume] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [targetRepo, setTargetRepo] = useState("");
  const [status, setStatus] = useState("Ready to tailor the next resume.");

  const draft = useMemo(() => createResumeDraft(pool, job), [pool, job]);
  const resumeText = useMemo(() => resumeToText(pool, draft), [pool, draft]);
  const selectedTemplate = templates.find((template) => template.id === templateId)!;

  const importGithub = async () => {
    try {
      setStatus("Importing public GitHub repositories...");
      const repos = await fetchGithubRepos(githubUser);
      setPool((current) => mergeGithubRepos(current, repos));
      setStatus(`Imported ${repos.length} repositories from GitHub.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import GitHub repositories.");
    }
  };

  const importLinkedIn = () => {
    const parsed = parseLinkedInProfileText(linkedinText || linkedinUrl);
    setPool((current) => ({
      ...current,
      summary: parsed.summary || current.summary,
      skills: parsed.skills?.length ? Array.from(new Set([...current.skills, ...parsed.skills])) : current.skills,
      certifications: parsed.certifications?.length
        ? Array.from(new Set([...current.certifications, ...parsed.certifications]))
        : current.certifications,
    }));
    setStatus(
      linkedinText
        ? "LinkedIn profile text was merged into the data pool."
        : "LinkedIn URL stored. Paste profile text or connect an authorized scraper service for richer import.",
    );
  };

  const importExistingResume = () => {
    if (!existingResume.trim()) {
      setStatus("Paste an existing resume before merging.");
      return;
    }
    const parsed = parseLinkedInProfileText(existingResume);
    setPool((current) => ({
      ...current,
      summary: parsed.summary || current.summary,
      skills: parsed.skills?.length ? Array.from(new Set([...current.skills, ...parsed.skills])) : current.skills,
      certifications: parsed.certifications?.length
        ? Array.from(new Set([...current.certifications, ...parsed.certifications]))
        : current.certifications,
    }));
    setStatus("Existing resume text was merged into the reusable data pool.");
  };

  const exportTxt = () => {
    saveAs(new Blob([resumeText], { type: "text/plain;charset=utf-8" }), `${draft.versionName}.txt`);
  };

  const exportPdf = () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const lines = pdf.splitTextToSize(resumeText, 520);
    let y = 40;
    lines.forEach((line: string) => {
      if (y > 780) {
        pdf.addPage();
        y = 40;
      }
      pdf.text(line, 40, y);
      y += 14;
    });
    pdf.save(`${draft.versionName}.pdf`);
  };

  const exportDocx = async () => {
    const doc = new Document({
      sections: [
        {
          children: resumeText.split("\n").map(
            (line) =>
              new Paragraph({
                children: [new TextRun({ text: line, bold: ["SUMMARY", "SKILLS", "EXPERIENCE", "PROJECTS", "EDUCATION", "CERTIFICATIONS"].includes(line) })],
              }),
          ),
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${draft.versionName}.docx`);
  };

  const saveToGithub = async () => {
    if (!githubToken || !targetRepo) {
      setStatus("Add a GitHub token and owner/repo before saving.");
      return;
    }

    const putFile = async (path: string, content: string) =>
      fetch(`https://api.github.com/repos/${targetRepo}/contents/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: `Add tailored resume ${draft.versionName}`,
          content: btoa(unescape(encodeURIComponent(content))),
        }),
      });

    const basePath = `resumes/${draft.versionName}`;
    const metadata = JSON.stringify(
      {
        versionName: draft.versionName,
        company: job.company,
        role: job.role,
        jobUrl: job.url,
        relevanceScore: draft.score,
        missingKeywords: draft.missingKeywords,
        templateId,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    );
    const response = await putFile(`${basePath}/${draft.versionName}.txt`, resumeText);
    const metadataResponse = response.ok ? await putFile(`${basePath}/metadata.json`, metadata) : response;

    setStatus(
      response.ok && metadataResponse.ok
        ? `Saved version to ${targetRepo}/${basePath}.`
        : `GitHub save failed with ${metadataResponse.status}.`,
    );
  };

  return (
    <main className="appShell">
      <section className="topBar">
        <div>
          <p className="eyebrow">AI Resume Picker</p>
          <h1>Build a job-specific resume from your proof pool.</h1>
        </div>
        <div className="scoreRing" aria-label={`Relevance score ${draft.score}%`}>
          <span>{draft.score}</span>
          <small>% fit</small>
        </div>
      </section>

      <section className="workspace">
        <aside className="leftPane">
          <Panel icon={<BriefcaseBusiness />} title="Target Job">
            <div className="fieldGrid two">
              <label>
                Company
                <input value={job.company} onChange={(event) => setJob({ ...job, company: event.target.value })} />
              </label>
              <label>
                Role
                <input value={job.role} onChange={(event) => setJob({ ...job, role: event.target.value })} />
              </label>
            </div>
            <label>
              Job URL
              <input value={job.url} onChange={(event) => setJob({ ...job, url: event.target.value })} />
            </label>
            <label>
              Job Description
              <textarea rows={7} value={job.description} onChange={(event) => setJob({ ...job, description: event.target.value })} />
            </label>
          </Panel>

          <Panel icon={<Sparkles />} title="Person Data Pool">
            <div className="fieldGrid two">
              <label>
                Name
                <input value={pool.name} onChange={(event) => setPool({ ...pool, name: event.target.value })} />
              </label>
              <label>
                Title
                <input value={pool.title} onChange={(event) => setPool({ ...pool, title: event.target.value })} />
              </label>
            </div>
            <label>
              Summary
              <textarea rows={4} value={pool.summary} onChange={(event) => setPool({ ...pool, summary: event.target.value })} />
            </label>
            <label>
              Skills
              <input value={pool.skills.join(", ")} onChange={(event) => setPool({ ...pool, skills: updateList(event.target.value) })} />
            </label>
            <label>
              Existing resume text
              <textarea rows={4} value={existingResume} onChange={(event) => setExistingResume(event.target.value)} placeholder="Paste an old resume to extract reusable summary, skills, and certifications." />
            </label>
            <button onClick={importExistingResume} title="Merge existing resume">
              <Plus size={16} /> Merge Resume
            </button>
          </Panel>

          <Panel icon={<Github />} title="GitHub Enrichment">
            <div className="inlineControls">
              <input value={githubUser} onChange={(event) => setGithubUser(event.target.value)} placeholder="GitHub username" />
              <button onClick={importGithub} title="Import GitHub repositories">
                <RefreshCw size={16} /> Import
              </button>
            </div>
            <div className="projectStack">
              {pool.projects.map((project) => (
                <div className="miniCard" key={project.url || project.name}>
                  <strong>{project.name}</strong>
                  <span>{project.technologies.join(", ") || "No tech tags yet"}</span>
                </div>
              ))}
            </div>
          </Panel>
        </aside>

        <section className="previewPane">
          <div className="toolbar">
            <div className="templateSelect">
              <Star size={16} />
              <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {templates.map((template) => (
                  <option value={template.id} key={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={exportTxt} title="Export text">
              <FileText size={16} /> TXT
            </button>
            <button onClick={exportDocx} title="Export DOCX">
              <Download size={16} /> DOCX
            </button>
            <button onClick={exportPdf} title="Export PDF">
              <Download size={16} /> PDF
            </button>
          </div>

          <article className="resumeSheet">
            <header>
              <h2>{pool.name}</h2>
              <p>{draft.headline}</p>
              <span>
                {pool.email} | {pool.phone} | {pool.location}
              </span>
            </header>
            <ResumeSection title="Summary">
              <p>{draft.summary}</p>
            </ResumeSection>
            <ResumeSection title="Skills">
              <div className="skillCloud">{draft.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
            </ResumeSection>
            <ResumeSection title="Experience">
              {draft.experience.map((item) => (
                <div className="resumeItem" key={`${item.company}-${item.role}`}>
                  <h3>{item.role} | {item.company}</h3>
                  <small>{item.period}</small>
                  <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                </div>
              ))}
            </ResumeSection>
            <ResumeSection title="Projects">
              {draft.projects.map((project) => (
                <div className="resumeItem" key={project.url || project.name}>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <small>{project.technologies.join(", ")}</small>
                </div>
              ))}
            </ResumeSection>
          </article>
        </section>

        <aside className="rightPane">
          <Panel icon={<Award />} title="Relevance Review">
            <div className="metric">
              <span>Template</span>
              <strong>{selectedTemplate.name}</strong>
              <small>{selectedTemplate.description}</small>
            </div>
            <div className="chips">
              {draft.missingKeywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
            <ul className="suggestions">
              {draft.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<Link />} title="LinkedIn Import">
            <label>
              Public profile URL
              <input value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/..." />
            </label>
            <label>
              Profile text
              <textarea rows={5} value={linkedinText} onChange={(event) => setLinkedinText(event.target.value)} placeholder="Paste About, Experience, Skills, Certifications..." />
            </label>
            <button onClick={importLinkedIn} title="Merge LinkedIn details">
              <Plus size={16} /> Merge Profile
            </button>
          </Panel>

          <Panel icon={<Save />} title="Version & GitHub Save">
            <div className="versionName">{draft.versionName}</div>
            <label>
              Repository
              <input value={targetRepo} onChange={(event) => setTargetRepo(event.target.value)} placeholder="owner/repo" />
            </label>
            <label>
              GitHub token
              <input value={githubToken} onChange={(event) => setGithubToken(event.target.value)} type="password" placeholder="Fine-grained token" />
            </label>
            <button onClick={saveToGithub} title="Save resume version to GitHub">
              <Github size={16} /> Save Version
            </button>
          </Panel>

          <div className="statusLine">{status}</div>
        </aside>
      </section>
    </main>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panelTitle">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="resumeSection">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
