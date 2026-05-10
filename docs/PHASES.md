# Project Phases

This file is the living enhancement log for AI Resume Picker. Update it at the end of every phase so the product, implementation, and remaining work stay aligned.

## Phase 1: Interactive MVP

Status: In progress

Goal: Build a usable single-page resume tailoring workspace that proves the end-to-end flow from candidate data to targeted resume export.

### Works Now

- Master-data fetch from `Resume_master_data` using `data/professional_master_data.yml` as source of truth.
- Manual fallback flow when master data is unavailable or missing required resume fields.
- Job target inputs for company, role, job URL, and job description.
- Candidate data pool with editable name, title, summary, skills, projects, certifications, and existing resume text.
- Public GitHub repository import by username through the GitHub REST API.
- LinkedIn URL capture and paste-based profile text merge.
- Keyword-based relevance scoring against the target job description.
- Missing keyword chips and actionable improvement suggestions.
- Live resume preview using the `Focused Modern` template.
- TXT, DOCX, and PDF export actions.
- Version name generation with date, company, and role.
- GitHub save action that stores resume text and metadata under `resumes/<version>/`.
- In-app Phase 1 status panel showing what works now and what comes next.
- JD match analysis based on loaded master data, selected projects, skills, and work bullets.

### Known Limits

- The relevance engine is keyword-based, not LLM-based.
- Master-data import currently expects `data/professional_master_data.yml` on the `main` branch.
- Private master-data repos require a GitHub token entered in the frontend until backend token storage is added.
- Existing resume and LinkedIn import extract only simple summary, skill, and certification signals.
- DOCX and PDF exports currently use plain text rendering rather than the full visual template.
- GitHub token is entered in the browser and should be moved to secure backend storage.
- GitHub save does not yet handle updates to an existing file SHA.
- Direct LinkedIn scraping is not included because it requires an authorized/compliant data path.
- There is one template only, though the data model is ready for more.

### Verification

- `npm run build`
- `npm audit --audit-level=moderate`
- Local smoke check at `http://127.0.0.1:5174`

## Phase 2: AI Evidence Selection

Status: Planned

Goal: Replace the keyword-only matcher with an LLM-assisted evidence selector that chooses the best content from the candidate pool and explains each choice.

Planned work:

- Add backend API boundary for model calls and secrets.
- Create structured evidence objects for jobs, achievements, projects, skills, education, and certifications.
- Generate selected resume sections with source references back to the data pool.
- Add explanation cards for why each bullet or project was selected.
- Add user controls to accept, reject, rewrite, or lock suggestions.
- Add scoring dimensions for relevance, seniority match, missing evidence, and ATS coverage.

Exit criteria:

- The app can generate a resume draft from the full data pool using an LLM-assisted selector.
- The user can see why content was selected and override it.
- No API keys or private tokens are stored in the frontend.

## Phase 3: Documents, Templates, and Review

Status: Planned

Goal: Make generated resumes production-ready with multiple templates, faithful exports, and review workflows.

Planned work:

- Add multiple templates with a template registry.
- Add ATS-friendly and recruiter-friendly modes.
- Generate PDF and DOCX from the selected template, not plain text.
- Add inline editing for resume sections.
- Add review comments, section locking, and revision history.
- Add template preview thumbnails and template metadata.

Exit criteria:

- At least three templates are available and selectable.
- PDF and DOCX output visually matches the selected template.
- The user can revise a draft before exporting or saving.

## Phase 4: Integrations and Persistence

Status: Planned

Goal: Persist user profiles, resume versions, and source integrations securely.

Planned work:

- Add authentication and profile storage.
- Store GitHub credentials securely on the backend.
- Save resume versions with metadata, source evidence, and generated artifacts.
- Add GitHub branch or pull request creation for resume versions.
- Add authorized LinkedIn import through export upload or approved connector.
- Add import support for existing PDF/DOCX resumes.

Exit criteria:

- Users can return to prior profile pools and resume versions.
- Resume versions are traceable to job URL, company, role, template, and source evidence.
- Sensitive tokens are never handled as long-lived frontend state.

## Phase 5: Collaboration and Quality

Status: Planned

Goal: Improve confidence, review quality, and repeatability for serious job applications.

Planned work:

- Add recruiter-style critique.
- Add job-specific cover letter generation.
- Add application tracker and status board.
- Add resume comparison across versions.
- Add automated checks for repetition, weak verbs, missing metrics, and unsupported claims.
- Add test coverage for resume scoring, import parsing, export generation, and GitHub save behavior.

Exit criteria:

- The app supports a full job application workflow, not only resume generation.
- Users can compare, audit, and improve every generated version.
