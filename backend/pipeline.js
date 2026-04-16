/**
 * Pipeline Orchestrator
 * Manages job lifecycle and SSE event broadcasting.
 */

const { v4: uuidv4 } = require('uuid');
const generator = require('./agents/generator');
const validator = require('./agents/validator');
const debugger_ = require('./agents/debugger');
const metrics = require('./metrics');

// In-memory store: jobId -> { status, events, clients, result }
const jobs = new Map();

function createJob(problem) {
  const id = uuidv4();
  jobs.set(id, {
    id,
    problem,
    status: 'queued',
    events: [],
    clients: new Set(),
    result: null,
    createdAt: Date.now(),
  });
  return id;
}

function getJob(id) {
  return jobs.get(id) || null;
}

function getAllJobs() {
  return Array.from(jobs.values()).map(j => ({
    id: j.id,
    problem: j.problem,
    status: j.status,
    createdAt: j.createdAt,
    eventCount: j.events.length,
  }));
}

function addClient(jobId, res) {
  const job = jobs.get(jobId);
  if (!job) return false;
  job.clients.add(res);
  // Replay past events
  for (const ev of job.events) {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }
  return true;
}

function removeClient(jobId, res) {
  const job = jobs.get(jobId);
  if (job) job.clients.delete(res);
}

function emit(jobId, event) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.events.push(event);
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of job.clients) {
    try { client.write(data); } catch (_) { /* client disconnected */ }
  }
}

async function runPipeline(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  const startTime = Date.now();
  metrics.recordJobStart();

  job.status = 'running';
  emit(jobId, { type: 'pipeline_start', jobId, problem: job.problem, timestamp: Date.now() });

  // ───────────────────────────────────────────────
  // PHASE 1: Generator Agent
  // ───────────────────────────────────────────────
  job.status = 'generating';
  emit(jobId, { type: 'agent_start', agent: 'Generator', phase: 1, timestamp: Date.now() });

  let genResult;
  try {
    genResult = await generator.run(job.problem);
    emit(jobId, {
      type: 'agent_complete',
      agent: 'Generator',
      phase: 1,
      data: genResult,
      timestamp: Date.now(),
    });
  } catch (err) {
    emit(jobId, { type: 'agent_error', agent: 'Generator', error: err.message, timestamp: Date.now() });
    job.status = 'failed';
    return;
  }

  let currentCode = genResult.code;
  let totalIterations = 0;
  let finalPassed = false;

  // ───────────────────────────────────────────────
  // PHASE 2 & 3: Validate → Debug loop
  // ───────────────────────────────────────────────
  for (let iteration = 1; iteration <= debugger_.MAX_ITERATIONS + 1; iteration++) {
    totalIterations++;

    // Validator
    job.status = 'validating';
    emit(jobId, {
      type: 'agent_start',
      agent: 'Validator',
      phase: 2,
      iteration,
      code: currentCode,
      timestamp: Date.now(),
    });

    let valResult;
    try {
      valResult = await validator.run(currentCode);
      metrics.recordValidation(valResult.passed);
      emit(jobId, {
        type: 'agent_complete',
        agent: 'Validator',
        phase: 2,
        iteration,
        data: valResult,
        timestamp: Date.now(),
      });
    } catch (err) {
      emit(jobId, { type: 'agent_error', agent: 'Validator', error: err.message, timestamp: Date.now() });
      break;
    }

    if (valResult.passed) {
      finalPassed = true;
      emit(jobId, { type: 'validation_passed', iteration, qualityScore: valResult.qualityScore, timestamp: Date.now() });
      break;
    }

    // Debugger
    if (iteration > debugger_.MAX_ITERATIONS) {
      emit(jobId, { type: 'debug_exhausted', iteration, timestamp: Date.now() });
      break;
    }

    job.status = 'debugging';
    emit(jobId, {
      type: 'agent_start',
      agent: 'Debugger',
      phase: 3,
      iteration,
      timestamp: Date.now(),
    });

    let dbgResult;
    try {
      dbgResult = await debugger_.run(currentCode, valResult.issues, iteration);
      emit(jobId, {
        type: 'agent_complete',
        agent: 'Debugger',
        phase: 3,
        iteration,
        data: dbgResult,
        timestamp: Date.now(),
      });
      currentCode = dbgResult.code;
    } catch (err) {
      emit(jobId, { type: 'agent_error', agent: 'Debugger', error: err.message, timestamp: Date.now() });
      break;
    }

    if (dbgResult.exhausted) break;
  }

  // ───────────────────────────────────────────────
  // COMPLETE
  // ───────────────────────────────────────────────
  const durationMs = Date.now() - startTime;
  metrics.recordJobComplete({ iterations: totalIterations, durationMs, finalPassed });

  job.status = finalPassed ? 'done' : 'done_with_warnings';
  job.result = { code: currentCode, finalPassed, totalIterations, durationMs };

  const snapshot = metrics.getSnapshot();
  emit(jobId, {
    type: 'pipeline_complete',
    jobId,
    finalCode: currentCode,
    finalPassed,
    totalIterations,
    durationMs,
    metrics: snapshot,
    timestamp: Date.now(),
  });

  // Close SSE streams after a short delay
  setTimeout(() => {
    for (const client of job.clients) {
      try { client.write('data: {"type":"stream_end"}\n\n'); client.end(); } catch (_) {}
    }
    job.clients.clear();
  }, 500);
}

module.exports = { createJob, getJob, getAllJobs, addClient, removeClient, runPipeline };
