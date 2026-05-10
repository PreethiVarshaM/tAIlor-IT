import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";
import {
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  Github,
  AlertTriangle,
  Upload,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { initialJob, initialPool, templates } from "./sampleData";
import { extractTextFromFile } from "./fileExtractors";
import {
  createEvidenceAnalysis,
  createResumeDraft,
  fetchMasterData,
  fetchGithubRepos,
  mergeGithubRepos,
  parseResumeTextToPool,
  parseLinkedInProfileText,
  resumeToText,
} from "./resumeEngine";
import { DetailPool, JobTarget } from "./types";

const updateList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

type WorkspaceStep = "source" | "job" | "review" | "export";

const workspaceSteps: Array<{ id: WorkspaceStep; label: string }> = [
  { id: "source", label: "Source" },
  { id: "job", label: "Job" },
  { id: "review", label: "Review" },
  { id: "export", label: "Export" },
];

export function App() {
  const [pool, setPool] = useState<DetailPool>(initialPool);
  const [job, setJob] = useState<JobTarget>(initialJob);
  const [activeStep, setActiveStep] = useState<WorkspaceStep>("source");
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [masterRepoUrl, setMasterRepoUrl] = useState("https://github.com/PreethiVarshaM/Resume_master_data.git");
  const [masterLoaded, setMasterLoaded] = useState(false);
  const [githubUser, setGithubUser] = useState("octocat");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [existingResume, setExistingResume] = useState("");
  const [candidateSourceText, setCandidateSourceText] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [targetRepo, setTargetRepo] = useState("");
  const [status, setStatus] = useState("Ready to tailor the next resume.");

  const draft = useMemo(() => createResumeDraft(pool, job), [pool, job]);
  const analysis = useMemo(() => createEvidenceAnalysis(pool, job), [pool, job]);
  const resumeText = useMemo(() => resumeToText(pool, draft), [pool, draft]);
  const selectedTemplate = templates.find((template) => template.id === templateId)!;
  const profileCompleteness = useMemo(() => {
    const checks = [
      Boolean(pool.name),
      Boolean(pool.email),
      Boolean(pool.summary),
      pool.skills.length > 0,
      pool.experience.length > 0,
      pool.projects.length > 0,
      pool.education.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [pool]);

  const loadMasterData = async () => {
    try {
      setStatus("Fetching resume master data from GitHub...");
      const nextPool = await fetchMasterData(masterRepoUrl, githubToken);
      setPool(nextPool);
      setMasterLoaded(true);
      const githubLink = masterRepoUrl.match(/github\.com\/([^/]+)\//i)?.[1] || "";
      if (githubLink) {
        setGithubUser(githubLink);
      }
      setStatus("Master data loaded. Paste a JD to refresh the relevance analysis.");
    } catch (error) {
      setMasterLoaded(false);
      setStatus(error instanceof Error ? error.message : "Master data unavailable. Fill resume details manually.");
    }
  };

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
    const source = [existingResume, candidateSourceText].filter(Boolean).join("\n\n");
    if (!source.trim()) {
      setStatus("Paste resume text or upload a PDF, DOCX, TXT, or MD file before merging.");
      return;
    }
    setPool((current) => parseResumeTextToPool(source, current));
    setStatus("Candidate evidence was merged. The analysis now uses only the provided source data.");
  };

  const importCandidateFile = async (file?: File) => {
    if (!file) {
      return;
    }
    try {
      setStatus(`Extracting text from ${file.name}...`);
      const text = await extractTextFromFile(file);
      setCandidateSourceText((current) => [current, text].filter(Boolean).join("\n\n"));
      setPool((current) => parseResumeTextToPool(text, current));
      setStatus(`Imported ${file.name}. Review extracted text, then paste the JD for strict analysis.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not extract text from that file.");
    }
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
          <h1>Tailor an ATS resume from verified evidence.</h1>
          <p className="heroCopy">Upload or paste candidate material, add the job description, then review only source-backed matches and gaps.</p>
        </div>
        <div className="scoreRing" aria-label={`Relevance score ${draft.score}%`}>
          <span>{draft.score}</span>
          <small>% fit</small>
        </div>
      </section>

      <section className="workspace">
        <aside className="controlPane">
          <nav className="stepTabs" aria-label="Resume builder steps">
            {workspaceSteps.map((step) => (
              <button className={activeStep === step.id ? "active" : ""} key={step.id} onClick={() => setActiveStep(step.id)}>
                {step.label}
              </button>
            ))}
          </nav>

          {activeStep === "source" && (
            <Panel icon={<Sparkles />} title="Candidate Source">
              <div className="sourceSummary">
                <div>
                  <span>Source</span>
                  <strong>{masterLoaded ? "Master data" : "Manual"}</strong>
                </div>
                <div>
                  <span>Completeness</span>
                  <strong>{profileCompleteness}%</strong>
                </div>
              </div>
              <label>
                Upload PDF, DOCX, TXT, or MD
                <input type="file" accept=".pdf,.docx,.txt,.md" onChange={(event) => importCandidateFile(event.target.files?.[0])} />
              </label>
              <label>
                Paste resume or profile text
                <textarea rows={6} value={existingResume} onChange={(event) => setExistingResume(event.target.value)} placeholder="Paste resume, LinkedIn export text, or profile notes." />
              </label>
              {candidateSourceText && (
                <details>
                  <summary>Review extracted text</summary>
                  <textarea rows={7} value={candidateSourceText} onChange={(event) => setCandidateSourceText(event.target.value)} />
                </details>
              )}
              <button onClick={importExistingResume} title="Merge evidence">
                <Upload size={16} /> Merge Evidence
              </button>
              <details>
                <summary>Use master data repo</summary>
                <label>
                  Resume master repo
                  <input value={masterRepoUrl} onChange={(event) => setMasterRepoUrl(event.target.value)} />
                </label>
                <label>
                  GitHub token for private data
                  <input value={githubToken} onChange={(event) => setGithubToken(event.target.value)} type="password" placeholder="Optional for private repo" />
                </label>
                <button onClick={loadMasterData} title="Load resume master data">
                  <RefreshCw size={16} /> Load Master
                </button>
              </details>
              <details>
                <summary>Edit profile basics</summary>
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
              </details>
              <details>
                <summary>Optional LinkedIn and GitHub enrichment</summary>
                <label>
                  LinkedIn URL
                  <input value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/..." />
                </label>
                <label>
                  LinkedIn profile text
                  <textarea rows={4} value={linkedinText} onChange={(event) => setLinkedinText(event.target.value)} placeholder="Paste About, Experience, Skills, Certifications..." />
                </label>
                <button onClick={importLinkedIn} title="Merge LinkedIn details">
                  <Plus size={16} /> Merge Profile
                </button>
                <div className="inlineControls">
                  <input value={githubUser} onChange={(event) => setGithubUser(event.target.value)} placeholder="GitHub username" />
                  <button onClick={importGithub} title="Import GitHub repositories">
                    <Github size={16} /> Import
                  </button>
                </div>
              </details>
            </Panel>
          )}

          {activeStep === "job" && (
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
                <textarea rows={12} value={job.description} onChange={(event) => setJob({ ...job, description: event.target.value })} />
              </label>
            </Panel>
          )}

          {activeStep === "review" && (
            <Panel icon={<Award />} title="Evidence Review">
              <div className="analysisCard">
                <span>JD Match</span>
                <strong>{analysis.verdict}</strong>
                <small>Confidence: {analysis.confidence}. Only uploaded, pasted, or loaded evidence is used.</small>
              </div>
              <AnalysisList icon={<AlertTriangle size={16} />} title="Mismatches" items={analysis.bluntMismatches} tone="warning" />
              <details>
                <summary>Matched evidence</summary>
                <AnalysisList icon={<CheckCircle2 size={16} />} title="Matched" items={analysis.matchedKeywords.map((keyword) => `Evidence found for "${keyword}".`)} tone="ready" />
              </details>
              <details>
                <summary>ATS checks and fixes</summary>
                <AnalysisList icon={<FileText size={16} />} title="Fix Before Applying" items={analysis.fixes} tone="plain" />
                <AnalysisList icon={<CheckCircle2 size={16} />} title="ATS Checks" items={analysis.atsChecks} tone="ready" />
              </details>
            </Panel>
          )}

          {activeStep === "export" && (
            <Panel icon={<Save />} title="Export Resume">
              <div className="metric">
                <span>Template</span>
                <strong>{selectedTemplate.name}</strong>
                <small>{selectedTemplate.description}</small>
              </div>
              <div className="templateSelect compact">
                <Star size={16} />
                <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                  {templates.map((template) => (
                    <option value={template.id} key={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="exportGrid">
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
              <details>
                <summary>Save version to GitHub</summary>
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
              </details>
            </Panel>
          )}

          <div className="statusLine">{status}</div>
        </aside>

        <section className="previewPane">
          <div className="previewHeader">
            <div>
              <span>ATS Preview</span>
              <strong>{draft.versionName}</strong>
            </div>
            <button onClick={() => setActiveStep("export")}>
              <Download size={16} /> Export
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

function AnalysisList({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "ready" | "warning" | "plain";
}) {
  return (
    <div className={`analysisBlock ${tone}`}>
      <div className="analysisTitle">
        {icon}
        <strong>{title}</strong>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
