# Multi-Agent Code Generation & Debugging System

A collaborative web application where **three specialized AI agents** work together in an automated pipeline to generate, validate, and debug code from natural language problem statements. The system tracks metrics like code correctness rate and iteration efficiency in real time.

---

## Proposed Changes

### Backend — Node.js + Express API

#### [NEW] [package.json](file:///e:/Tensor%20Antigravity/package.json)
Sets up Node.js project with Express, `node-fetch`, `uuid`, `cors`, and `dotenv`.

#### [NEW] [server.js](file:///e:/Tensor%20Antigravity/server.js)
Express HTTP server, serves static frontend and mounts `/api` routes.

#### [NEW] [pipeline.js](file:///e:/Tensor%20Antigravity/pipeline.js)
In-memory pipeline manager — stores job state (queued → generating → validating → debugging → done) and streams SSE events.

#### [NEW] [metrics.js](file:///e:/Tensor%20Antigravity/metrics.js)
Tracks per-job and global metrics:
- `correctness_rate` = (passed validations / total validation checks) × 100
- `iteration_efficiency` = 1 / total_iterations

#### [NEW] [agents/generator.js](file:///e:/Tensor%20Antigravity/agents/generator.js)
**Generator Agent** — takes a problem statement, calls Google Gemini API (or a simulated fallback), returns initial code solution + language detected.

#### [NEW] [agents/validator.js](file:///e:/Tensor%20Antigravity/agents/validator.js)
**Validator Agent** — runs static analysis (syntax check via `vm.Script`, type heuristics) on the generated code. Returns `{ passed: bool, issues: [] }`.

#### [NEW] [agents/debugger.js](file:///e:/Tensor%20Antigravity/agents/debugger.js)
**Debugger Agent** — when validation fails, receives the code + issues, applies targeted patches, returns corrected code. Loops up to 3 iterations.

#### [NEW] [routes/api.js](file:///e:/Tensor%20Antigravity/routes/api.js)
REST + SSE endpoints:
- `POST /api/run` — submit a problem statement, starts pipeline, returns `{ jobId }`
- `GET /api/stream/:jobId` — SSE stream of agent events
- `GET /api/jobs` — list all jobs with status
- `GET /api/metrics` — global aggregated metrics

---

### Frontend — Single-Page App

#### [NEW] [public/index.html](file:///e:/Tensor%20Antigravity/public/index.html)
Main shell: sidebar nav, three panels (Input, Pipeline Live View, Metrics Dashboard).

#### [NEW] [public/index.css](file:///e:/Tensor%20Antigravity/public/index.css)
Premium dark glassmorphism design system — deep navy palette, neon accent, smooth animations, Inter font, code viewer with syntax colors.

#### [NEW] [public/app.js](file:///e:/Tensor%20Antigravity/public/app.js)
Frontend logic:
- Submits problem statements to `/api/run`
- Subscribes to SSE stream and renders live agent activity cards
- Animated pipeline progress bar (Generate → Validate → Debug → Done)
- Metrics dashboard with animated counters
- Code diff viewer showing before/after between agent iterations

---

## Verification Plan

### Automated (Browser Testing)
After running `npm start`, the browser subagent will:
1. Navigate to `http://localhost:3000`
2. Enter a sample problem: _"Write a JavaScript function to reverse a string"_
3. Click **Run Pipeline** and observe the live agent feed
4. Verify all three agent cards appear (Generator ✓, Validator ✓, Debugger ✓ or skipped)
5. Confirm metrics update (Correctness Rate, Iteration Efficiency)
6. Test a second problem: _"Create a Python function to find the factorial of a number"_

### Manual Verification
Run `node server.js` from `e:\Tensor Antigravity`, open `http://localhost:3000`, and confirm:
- The input form accepts natural language descriptions
- Live pipeline feed shows each agent step with animated badges
- The metrics panel updates after each job
