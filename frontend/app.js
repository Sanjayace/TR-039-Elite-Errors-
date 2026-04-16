/**
 * Multi-Agent Code System — Frontend Application
 */

/* ── State ── */
let activeStream = null;
let currentCode = '';

/* ── Panel navigation ── */
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');
  if (name === 'jobs') loadJobs();
  if (name === 'metrics') loadMetrics();
}

/* ── Quick examples ── */
function fillExample(text) {
  document.getElementById('problem-input').value = text;
  document.getElementById('problem-input').focus();
}

/* ── Pipeline entry point ── */
async function runPipeline() {
  const problem = document.getElementById('problem-input').value.trim();
  if (!problem || problem.length < 5) {
    shake(document.getElementById('problem-input'));
    return;
  }

  // Reset UI
  resetPipelineUI();
  setRunning(true);

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem }),
    });
    const { jobId, error } = await res.json();
    if (error) { addEvent('error', 'System', error); setRunning(false); return; }

    addEvent('system', 'System', `Pipeline started (Job ${jobId.slice(0, 8)}…)`, { time: new Date().toLocaleTimeString() });
    subscribeToStream(jobId);
  } catch (err) {
    addEvent('error', 'System', `Failed to connect: ${err.message}`);
    setRunning(false);
  }
}

/* ── SSE subscription ── */
function subscribeToStream(jobId) {
  if (activeStream) activeStream.close();
  activeStream = new EventSource(`/api/stream/${jobId}`);

  activeStream.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    handleEvent(ev);
  };

  activeStream.onerror = () => {
    activeStream.close();
    setRunning(false);
  };
}

/* ── Event handler ── */
function handleEvent(ev) {
  const ts = new Date().toLocaleTimeString();

  switch (ev.type) {
    case 'pipeline_start':
      setStepActive('generate');
      addEvent('system', 'Pipeline', `Starting pipeline for: "${ev.problem}"`, { time: ts });
      break;

    case 'agent_start':
      if (ev.agent === 'Generator') {
        setStepActive('generate');
        addEvent('generator', 'Generator', '🧠 Analysing problem and generating initial code…', { time: ts });
      } else if (ev.agent === 'Validator') {
        setStepActive('validate');
        const label = ev.iteration > 1 ? `Re-validating (iteration ${ev.iteration})…` : 'Running static analysis on generated code…';
        addEvent('validator', 'Validator', `🔍 ${label}`, { time: ts });
      } else if (ev.agent === 'Debugger') {
        setStepActive('debug');
        addEvent('debugger', 'Debugger', `🛠️ Applying fixes (iteration ${ev.iteration})…`, { time: ts });
      }
      break;

    case 'agent_complete':
      if (ev.agent === 'Generator') {
        setStepDone('generate');
        setStepActive('validate');
        const { data } = ev;
        addEvent('generator', 'Generator',
          `✅ Code generated in ${data.language} · Confidence: ${Math.round(data.confidence * 100)}%`,
          { time: ts, sub: data.message }
        );
      } else if (ev.agent === 'Validator') {
        const { data } = ev;
        const icon = data.passed ? '✅' : '⚠️';
        addEvent('validator', 'Validator',
          `${icon} Quality score: ${data.qualityScore}/100 · ${data.passed ? 'PASSED' : 'FAILED'}`,
          { time: ts, sub: data.message, issues: data.issues }
        );
        if (data.passed) setStepDone('validate');
      } else if (ev.agent === 'Debugger') {
        const { data } = ev;
        addEvent('debugger', 'Debugger',
          `🔧 Iteration ${data.iteration}: ${data.appliedFixes.length} fix(es) applied`,
          { time: ts, sub: data.message }
        );
        currentCode = data.code;
      }
      break;

    case 'validation_passed':
      setStepDone('validate');
      addEvent('system', 'Validator', `✅ Validation passed with score ${ev.qualityScore}/100 on iteration ${ev.iteration}`, { time: ts });
      break;

    case 'debug_exhausted':
      setStepSkipped('debug');
      addEvent('system', 'Debugger', '⚠️ Max debug iterations reached — returning best effort result', { time: ts });
      break;

    case 'agent_error':
      addEvent('error', ev.agent, `❌ Error: ${ev.error}`, { time: ts });
      setRunning(false);
      break;

    case 'pipeline_complete': {
      setStepDone('debug');
      setStepDone('done');
      setRunning(false);
      currentCode = ev.finalCode;

      const dur = (ev.durationMs / 1000).toFixed(1);
      const status = ev.finalPassed ? '✅ Passed' : '⚠️ Best Effort';
      addEvent('system', 'Pipeline',
        `🎉 Complete in ${dur}s · ${ev.totalIterations} iteration(s) · ${status}`,
        { time: ts }
      );

      showCode(ev.finalCode, ev);
      updateSidebarStats(ev.metrics);
      if (activeStream) { activeStream.close(); activeStream = null; }
      break;
    }

    case 'stream_end':
      if (activeStream) { activeStream.close(); activeStream = null; }
      break;
  }
}

/* ── Helpers: pipeline step states ── */
function resetPipelineUI() {
  ['generate', 'validate', 'debug', 'done'].forEach(step => {
    const el = document.getElementById(`step-${step}`);
    el.classList.remove('active', 'done', 'skipped');
    document.getElementById(`ss-${step}`).textContent = 'Waiting';
    // Reset connectors
    el.querySelectorAll('.step-connector').forEach(c => c.classList.remove('active', 'done'));
  });
  document.getElementById('code-card').style.display = 'none';
  clearFeedItems();
}

function setStepActive(step) {
  const el = document.getElementById(`step-${step}`);
  el.classList.add('active');
  el.classList.remove('done', 'skipped');
  const statusMap = { generate: 'Generating…', validate: 'Validating…', debug: 'Debugging…', done: 'Finishing…' };
  document.getElementById(`ss-${step}`).textContent = statusMap[step] || 'Active…';
  // Activate right connector of its predecessor
  activateConnector(step, 'active');
}

function setStepDone(step) {
  const el = document.getElementById(`step-${step}`);
  el.classList.remove('active');
  el.classList.add('done');
  const statusMap = { generate: 'Done ✓', validate: 'Passed ✓', debug: 'Fixed ✓', done: 'Complete ✓' };
  document.getElementById(`ss-${step}`).textContent = statusMap[step] || 'Done ✓';
  activateConnector(step, 'done');
}

function setStepSkipped(step) {
  const el = document.getElementById(`step-${step}`);
  el.classList.remove('active');
  el.classList.add('skipped');
  document.getElementById(`ss-${step}`).textContent = 'Skipped';
}

function activateConnector(step, cls) {
  const steps = ['generate', 'validate', 'debug', 'done'];
  const idx = steps.indexOf(step);
  if (idx > 0) {
    const prev = document.getElementById(`step-${steps[idx - 1]}`);
    const rc = prev ? prev.querySelector('.step-connector.right') : null;
    if (rc) rc.classList.add(cls);
  }
  const cur = document.getElementById(`step-${step}`);
  const lc = cur ? cur.querySelector('.step-connector.left') : null;
  if (lc) lc.classList.add(cls);
}

/* ── Run button state ── */
function setRunning(running) {
  const btn = document.getElementById('run-btn');
  const icon = document.getElementById('run-icon');
  const label = document.getElementById('run-label');
  btn.disabled = running;
  if (running) {
    icon.textContent = '⏳';
    label.textContent = 'Running…';
  } else {
    icon.textContent = '▶';
    label.textContent = 'Run Pipeline';
  }
}

/* ── Event feed ── */
function addEvent(type, agent, message, options = {}) {
  const feed = document.getElementById('events-feed');
  const empty = document.getElementById('feed-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'event-item';

  const badgeClass = {
    generator: 'badge-generator',
    validator: 'badge-validator',
    debugger: 'badge-debugger',
    system: 'badge-system',
    error: 'badge-error',
  }[type] || 'badge-system';

  const issuesHtml = options.issues && options.issues.length > 0
    ? `<div class="event-issues">${options.issues.map(i =>
        `<div class="issue-row issue-${i.severity}">L${i.line}: ${escapeHtml(i.message)}</div>`
      ).join('')}</div>`
    : '';

  item.innerHTML = `
    <span class="event-badge ${badgeClass}">${agent}</span>
    <div class="event-content">
      <div class="event-msg">${escapeHtml(message)}</div>
      ${options.sub ? `<div class="event-meta">${escapeHtml(options.sub)}</div>` : ''}
      ${issuesHtml}
      ${options.time ? `<div class="event-meta" style="margin-top:4px;opacity:0.6">${options.time}</div>` : ''}
    </div>
  `;
  feed.appendChild(item);
  feed.scrollTop = feed.scrollHeight;
}

function clearFeedItems() {
  const feed = document.getElementById('events-feed');
  feed.innerHTML = '<div class="feed-empty" id="feed-empty"><div class="feed-empty-icon">🤖</div><p>Submit a problem to watch the agents collaborate…</p></div>';
}

function clearFeed() {
  clearFeedItems();
}

/* ── Code output ── */
function showCode(code, ev) {
  const card = document.getElementById('code-card');
  const pre = document.getElementById('code-output');
  const badges = document.getElementById('code-badges');

  pre.textContent = code;
  card.style.display = '';

  badges.innerHTML = '';
  const passedBadge = document.createElement('span');
  passedBadge.className = 'code-badge';
  passedBadge.style.cssText = ev.finalPassed
    ? 'background:rgba(34,211,160,0.15);color:#22d3a0;border:1px solid rgba(34,211,160,0.3)'
    : 'background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)';
  passedBadge.textContent = ev.finalPassed ? '✅ Validated' : '⚠️ Best Effort';
  badges.appendChild(passedBadge);

  const iterBadge = document.createElement('span');
  iterBadge.className = 'code-badge';
  iterBadge.style.cssText = 'background:rgba(100,102,241,0.15);color:#6466f1;border:1px solid rgba(100,102,241,0.3)';
  iterBadge.textContent = `${ev.totalIterations} iteration(s)`;
  badges.appendChild(iterBadge);
}

function copyCode() {
  if (!currentCode) return;
  navigator.clipboard.writeText(currentCode).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 1800);
  });
}

/* ── Jobs panel ── */
async function loadJobs() {
  const list = document.getElementById('jobs-list');
  try {
    const jobs = await fetch('/api/jobs').then(r => r.json());
    if (jobs.length === 0) {
      list.innerHTML = '<div class="feed-empty"><div class="feed-empty-icon">📋</div><p>No jobs yet</p></div>';
      return;
    }
    list.innerHTML = jobs.map(j => {
      const dotClass = {
        done: 'status-done', done_with_warnings: 'status-warn',
        running: 'status-running', queued: 'status-queued', failed: 'status-queued',
      }[j.status] || 'status-queued';
      const tagStyle = {
        done: 'background:rgba(34,211,160,0.15);color:#22d3a0;border:1px solid rgba(34,211,160,0.3)',
        done_with_warnings: 'background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)',
        running: 'background:rgba(100,102,241,0.15);color:#6466f1;border:1px solid rgba(100,102,241,0.3)',
        failed: 'background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3)',
        queued: 'background:rgba(138,155,196,0.15);color:#8a9bc4;border:1px solid rgba(138,155,196,0.3)',
      }[j.status] || '';
      const time = new Date(j.createdAt).toLocaleTimeString();
      return `
        <div class="job-card">
          <div class="job-status-dot ${dotClass}"></div>
          <div class="job-info">
            <div class="job-problem">${escapeHtml(j.problem)}</div>
            <div class="job-meta">${j.id.slice(0, 8)}… · ${time} · ${j.eventCount} events</div>
          </div>
          <span class="job-tag" style="${tagStyle}">${formatStatus(j.status)}</span>
        </div>
      `;
    }).join('');
  } catch (e) {
    list.innerHTML = '<div class="feed-empty"><p>Failed to load jobs</p></div>';
  }
}

/* ── Metrics panel ── */
async function loadMetrics() {
  try {
    const m = await fetch('/api/metrics').then(r => r.json());
    animateValue('m-correctness', m.correctnessRate, '%');
    animateValue('m-efficiency', m.iterationEfficiency, '%');
    setText('m-total', m.totalJobs);
    setText('m-completed', m.completedJobs);
    setText('m-iters', m.totalIterations);
    setText('m-duration', m.avgDurationMs > 0 ? `${(m.avgDurationMs / 1000).toFixed(1)}s` : '—');

    setTimeout(() => {
      const cb = document.getElementById('mb-correctness');
      const ef = document.getElementById('mb-efficiency');
      if (cb) cb.style.width = `${m.correctnessRate}%`;
      if (ef) ef.style.width = `${m.iterationEfficiency}%`;
    }, 100);

    const histEl = document.getElementById('history-list');
    if (m.history && m.history.length > 0) {
      histEl.innerHTML = m.history.map((h, i) => `
        <div class="history-row">
          <div class="history-dot" style="background:${h.finalPassed ? '#22d3a0' : '#fbbf24'}"></div>
          <span style="color:var(--text2);min-width:40px">#${m.history.length - i}</span>
          <span class="history-iter">${h.iterations} iter(s)</span>
          <span class="history-rate">${h.correctnessRate}% correct</span>
          <span class="history-eff">${h.iterationEfficiency}% eff</span>
          <span class="history-time">${(h.durationMs / 1000).toFixed(1)}s</span>
        </div>
      `).join('');
    } else {
      histEl.innerHTML = '<div class="feed-empty"><div class="feed-empty-icon">📊</div><p>No history yet</p></div>';
    }
  } catch (e) {
    console.error('Failed to load metrics:', e);
  }
}

function updateSidebarStats(m) {
  if (!m) return;
  setText('s-total', m.totalJobs);
  document.getElementById('s-correct').textContent = m.correctnessRate > 0 ? `${m.correctnessRate}%` : '—';
}

/* ── Utilities ── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function animateValue(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el || target === 0) { if (el) el.textContent = target + suffix; return; }
  let current = 0;
  const step = target / 40;
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.round(current) + suffix;
    if (current >= target) clearInterval(interval);
  }, 25);
}

function formatStatus(s) {
  return { done: 'Done', done_with_warnings: 'Best Effort', running: 'Running', queued: 'Queued', failed: 'Failed' }[s] || s;
}

function shake(el) {
  el.style.animation = 'none';
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow = '0 0 0 3px rgba(248,113,113,0.25)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 1200);
}

/* ── Init ── */
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runPipeline();
});
