# AI Resume Picker

AI Resume Picker is a resume tailoring workspace that builds a job-specific resume from a reusable candidate data pool. The app is designed to ingest a person's qualifications, job history, education, skills, certifications, GitHub repositories, LinkedIn profile details, and an existing resume, then select the most relevant evidence for a target job description.

## Current Status

Phase 1 MVP is implemented as a Vite + React + TypeScript web app.

Working now:

- User-provided resume evidence intake from PDF, DOCX, TXT, MD, and pasted text.
- Strict no-hallucination relevance analysis that only uses provided/imported candidate evidence.
- Blunt mismatch reporting for JD requirements that are not supported by the candidate data.
- ATS-friendly resume output with standard section headings.
- Resume master-data loading from `https://github.com/PreethiVarshaM/Resume_master_data.git`.
- Manual resume-detail fallback when master data is unavailable or incomplete.
- Live job targeting from company, role, job URL, and pasted job description.
- Reusable person data pool for summary, skills, projects, certifications, and old resume text.
- Public GitHub repository import by username.
- LinkedIn profile URL capture with paste-based profile text merge.
- Keyword-based relevance score, missing keyword chips, and improvement suggestions.
- One extendable resume template: `Focused Modern`.
- Resume export to TXT, DOCX, and PDF.
- Version naming using date, company, and role.
- GitHub save flow for resume text and metadata.

Next enhancement:

- Backend workspace with secure user auth and encrypted GitHub token storage.
- LLM-based evidence picker with explanations for selected bullets, skills, and projects.
- Authorized LinkedIn import through exported data upload or approved profile-data connector.
- Multiple templates with visual preview, ATS mode, and recruiter mode.
- Inline resume editor with accept/reject suggestions, section locking, and revision history.
- Template-based PDF/DOCX rendering instead of plain text layout exports.
- GitHub branch or pull request creation for every generated resume version.

See [docs/PHASES.md](docs/PHASES.md) for the living phase-by-phase project log.

## Tech Stack

- React 19
- TypeScript
- Vite
- Lucide React icons
- `docx` for DOCX export
- `jspdf` for PDF export
- `mammoth` for DOCX evidence extraction
- `pdfjs-dist` for PDF evidence extraction
- GitHub REST API for public repo import and version save

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev -- --port 5174 --strictPort
```

Build for production:

```bash
npm run build
```

Run dependency audit:

```bash
npm audit --audit-level=moderate
```

## Project Structure

```text
src/
  App.tsx           Main interactive resume builder UI
  fileExtractors.ts PDF, DOCX, TXT, and MD text extraction
  resumeEngine.ts  Resume selection, scoring, imports, and text rendering
  sampleData.ts    Starter profile, job, and template data
  styles.css       Product UI styling
  types.ts         Shared domain types
docs/
  PHASES.md        Phase roadmap and enhancement log
```

## Product Notes

The app treats `data/professional_master_data.yml` in the configured master-data repository as the preferred source of truth. It can fetch public repositories directly, and private repositories through a GitHub token entered in the app. If the file cannot be fetched or is missing required fields, the user can continue by filling the in-app resume detail fields manually.

Project phase status, technical roadmap details, and internal progress notes should stay in documentation files such as this README and [docs/PHASES.md](docs/PHASES.md). The application UI should show only user-relevant resume building, evidence review, JD analysis, and export controls.

Direct LinkedIn scraping is intentionally not implemented in Phase 1 because LinkedIn often blocks automated scraping and may require authorized access. The current app stores the LinkedIn URL and supports merging pasted or exported profile text. A later backend phase should add a compliant connector or export-upload workflow.

GitHub saving currently writes generated TXT resume content plus metadata. Future phases should generate DOCX/PDF from the chosen visual template and save the complete artifact bundle.

The current evaluator is intentionally strict. It can identify gaps and suggest what to add only if true, but it must not invent tools, credentials, employers, metrics, or project claims that were not present in uploaded, pasted, or master-data evidence.

## License

This project is proprietary. Copying, redistribution, modification, hosting, or reuse is not permitted without prior written permission from the project owner. See [LICENSE](LICENSE).
