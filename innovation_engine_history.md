# The Innovation Engine: Development & Technical History
*A comprehensive knowledge transfer document regarding the architecture and development history of The Innovation Engine.*

## 1. Project Overview & Core Architecture
The Innovation Engine is an AI-powered platform for evaluating and scoring new ideas based on strategic mandates. It orchestrates a multi-step pipeline using LLMs (specifically Gemini 2.5 models) to assess strategic alignment, technical feasibility, commercial desirability, and financial viability.

### Infrastructure Stack:
- **Frontend**: Next.js App Router (React), Tailwind CSS.
- **Backend / API Engine**: Python backend routing AI orchestration, built to handle complex asynchronous tasks and streaming.
- **Database**: SQLite with LargeBinary support for raw file processing (persisted across Railway deployments).
- **Authentication**: JWT-based access control (Architect Gateway).
- **Deployment Strategy**: Deployed to Railway using native Nixpack built strategies.

---

## 2. Key Evolutionary Phases & Milestones

The platform evolved rapidly through several critical versions, introducing stronger AI reliability, enhanced financial modeling, and premium reporting features.

### Version 1.0: Foundations and Multimodal Capabilities
- **Initial Commit & Foundation**: Established the Next.js frontend and Python API backend, targeting Python 3.11 features but implementing backward-compatible fixes for Railway (Python 3.9 environments).
- **Mandate Extraction Pipeline**: Introduced deep multimodal parsing. Rather than just raw text, the system uses the Gemini 2.5 Pro File API to read PDFs, retaining raw file bytes deferred multimodal processing.
- **Google Search Grounding**: Enforced Google Search integration across **all engine stages** to prevent hallucination and provide live market intelligence rather than synthesized historical assumptions.

### Version 1.1: UI Polish and Advanced Reporting
- **PDF Export Engine**: Replaced unstable `html2canvas` logic with native OS zero-frame print-to-pdf pipelines, using shadow DOM to bypass Tailwind v4 rendering deadlocks. This allowed for premium, bespoke, high-fidelity PDF downloads.
- **Granular Telemetry**: Migrated from simple numerical steps to a dynamic animated progress bar, tracking exact 0-100% telemetry for each individual AI agent in the pipeline.
- **Database Migrations**: Replaced destructive startup `drop_all` scripts with safe `ALTER TABLE` schema migrations to protect production data while modifying structures.

### Version 1.2: Deep Financial Modeling and Security
- **Dual Financial Model**: A massive architectural upgrade to Stage 3 (Financial Simulation). Expanded the search to 10 distinct market categories and implemented a dual-phased model comparing **Pilot (Yr 1-2)** vs **Full-Scale (Yr 3-5+)** rollouts.
- **Anti-Fabrication & Integrity Directives**: Implemented strict systemic directives demanding 2024-2026 recency, banning self-citations, and enforcing real external citations on CAPEX and OPEX estimates.
- **HTTP/SDK Deadlock Resolutions**: Migrated intensive `gemini-2.5-pro` generation calls from the standard Google Generative AI SDK wrapper to raw HTTP `_call()` requests. This fundamentally resolved multi-threading/httpx deadlocks observed in Uvicorn background tasks.
- **Multi-user & Templates**: Added multi-user authentication, rate limiting, and evaluation templates for broader organizational deployment.
- **URL Hallucination Fixes**: Explicitly removed clickable signals and source endpoints to prevent the LLM from hallucinating broken placeholder URLs.

### Version 1.3: Deep Research Integration & Final Report Redesign
- **Genuine Deep Research API Integration**: Swapped out the standard model mock-up for the real `deep-research-pro-preview-12-2025` agent. Bypassed the standard Python SDK by migrating the `_run_deep_research` execution handler to use raw asynchronous REST payload requests against Google's `v1alpha/interactions` endpoints with long-running polling.
- **Agent Synthesis Dashboard**: Updated the final `Stage 4 Synthesizer` outputs to explicitly formulate multi-point thematic `Agent_Summaries` highlighting direct feedback from the Strategist, Market Researcher, and Risk Specialist personas. 
- **High-Fidelity PDF Export Evolution**: Re-architected the `VisualOutputDashboard` to be dynamically rendered natively across both the real-time Evaluation Funnel and the static Portfolio Archive modals. Replaced unreliable hidden HTML iframe printing with precision `html-to-image` and `jsPDF` captures utilizing the `showSaveFilePicker` File System Access API for native, visually perfect PDF downloads.

---

## 3. Notable Technical Problem-Solving (Architectural Notes)

### Bypassing Asynchronous LLM Deadlocks
In early versions, concurrent requests using `google.genai` in background threads on Railway caused the application interface to hang indefinitely (`httpx` deadlocks). The engineering solution was to construct a bespoke direct-HTTP REST mapping (`_call()` method) that completely bypassed the SDK for heavy "think" models, manually tracking prompts sizes, blocks, and finish reasons on every call.

### The HTML-to-PDF Shadow DOM Solution
To generate bespoke PDF reports on the client side, modern Tailwind color variables and CSS flexbox behaviors repeatedly deadlocked standard Canvas tools. The eventual solution required cloning the DOM into a "Shadow DOM", stripping conflicting modal overflow constraints, and natively rasterizing the document dynamically.

### Database Safe Fallbacks 
When migrating schemas in a fast-paced prototype environment built on SQLite, early tests repeatedly wiped user data on startup. The final v1.1 initialization logic explicitly prevents `drop_all` actions in favor of targeted SQL `ALTER` execution, maintaining long-term state persistence.

---

*Document compiled from project Git logs and architecture Knowledge Items.*
