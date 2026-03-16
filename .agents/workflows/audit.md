---
description: Perform a deep architectural and bug audit on the entire codebase
---
# Code Audit Workflow

This workflow automatically audits **all** code files for bugs, security vulnerabilities, documentation drift, and architectural misalignment specific to The Innovation Engine.

## Steps

1. **Determine the target — ALL files**: Read every backend and frontend source file in the project. Do NOT limit to the file the user is currently viewing. The full file list is:

   **Backend (`backend/`):**
   - `engine.py` — Core 5-stage evaluation pipeline
   - `main.py` — FastAPI routes, async job system, API endpoints
   - `auth.py` — JWT authentication, password hashing
   - `genesis.py` — Genesis Mode concept generation
   - `models.py` — SQLAlchemy ORM models
   - `database.py` — DB engine and session setup

   **Frontend (`frontend/src/`):**
   - `app/page.tsx` — Root page, auth gate, view routing, prop wiring
   - `components/evaluation-funnel.tsx` — Evaluation UI, async polling, cancellation
   - `components/dashboard.tsx` — Report rendering, PDF export, charts
   - `components/portfolio-archive.tsx` — History table, re-run, delete
   - `components/sidebar.tsx` — Navigation, model selector, mandate uploads
   - `components/genesis-mode.tsx` — Keyword-to-concept generation UI
   - `components/guide.tsx` — In-app documentation / user guide
   - `components/GoldenLeverWidget.tsx` — Golden Lever sensitivity display

   **Workflow Documentation (cross-reference targets):**
   - `innovation_engine_history.md`
   - `v1.0_changelog.md`
   - `frontend/Test live workflow.md`
   - `guide.tsx` (inline workflow documentation)

2. **Review all code**: Use the `view_file` tool to fully read every file listed above. Do NOT skip any file.

3. **Analyze against Engine criteria**:

   **Core Safety Checks:**
   - **Pipeline Alignment**: Identify any stages that modify state or prompt text unconditionally, skipping user-defined flow controls (like `_skip_stageX`). Flag "Ghost Stages" that waste API credits.
   - **JSON Fallbacks**: Check if API calls reliant on rigid output structures (like `stage5_resp`) fail safely when models output unexpected preamble text (e.g., "Sure, here is the JSON...").
   - **Variable Scope**: Ensure no variables are referenced before assignment in deeply nested `try/except` blocks or conditional branches.
   - **Prompt Escaping**: Ensure inputs injected into prompts are safely escaped (e.g. replacing curly braces to avoid f-string crashes). Flag raw variable injection into f-strings. Recommend an `escape_prompt_input` helper function if patterns are repeated.
   - **Error Swallowing**: Ensure `except` blocks do not silently swallow critical API errors (e.g., passing dummy data instead of raising 500s).

   **Advanced Engine Checks:**
   - **Temperature Verification**: Scan all `_call` instances for `temperature`. Ensure Stages 1, 3, and 4 use low temperatures (≤0.2) for determinism. Only adversarial stages (like Stage 2.5 Duel turns) should use higher values (e.g., 0.5-0.6).
   - **Tool Dependency Scoping**: Ensure every function call to `monte_carlo_simulation_tool` is preceded by an extraction step for Unit Economics. Flag cases where the AI calls the tool with numbers it hasn't first justified in its reasoning text ("Hallucinated Math").
   - **Telemetry Consistency**: Verify that every `logic_trace.append(...)` is immediately followed by a `progress_callback("logic_trace", ...)`. The "Trust through Friction" UI must never lag behind the backend's actual state.

   **Frontend Checks:**
   - **Prop Passthrough**: Ensure all props declared in component interfaces are actually passed from the parent (`page.tsx`). Flag any prop that exists in a type definition but is never wired.
   - **API Contract Alignment**: Verify that every `fetch()` call in the frontend matches a real route in `main.py`. Check HTTP method, path, request body shape, and response shape.
   - **Auth Token Handling**: Ensure all authenticated API calls include the `Authorization: Bearer` header and all endpoints handle 401 responses (clear token + reload).
   - **Seed/Re-run Flow**: Verify that the Genesis → Evaluation seed flow and the Portfolio → Evaluation re-run flow correctly pass all required state (idea, model, evaluation result).

   **Documentation vs Code Checks:**
   - **Guide Accuracy**: Cross-reference every claim in `guide.tsx` against the actual code behavior. Flag any UI location references, feature descriptions, or model assignments that don't match the implementation. Specifically, verify that operational tools like the `launch.sh` restart button are documented so users know how to recover the application.
   - **Workflow Doc Drift**: Compare `innovation_engine_history.md` and `v1.0_changelog.md` against the current code. Flag any documented features that were removed or changed without updating the docs.

4. **Report**: Create an artifact named `audit_results.md` using a structured table for maximum scannability:

   | Severity | Engine Component | Issue Detected | Recommended Refactoring |
   |----------|------------------|----------------|-------------------------|
   | 🔴 Critical | Stage 3 Quant | Variable used before assignment in except block | Move initialization outside the try block |
   | 🟡 Medium | Stage 2 IP Map | Regex lacks a null-check | Add fallback empty list if regex fails |
   | 🟢 Minor | Stage 1 Strategist | F-string injection lacks escaping | Use `escape_prompt_input` helper |

   Follow the table with detailed explanations for each 🔴 Critical issue, including the exact line numbers and suggested code fixes.

5. **Propose Fixes**: Ask the user if they want you to automatically fix the identified issues. If approved, apply them using code editing tools like `replace_file_content` or `multi_replace_file_content`.
