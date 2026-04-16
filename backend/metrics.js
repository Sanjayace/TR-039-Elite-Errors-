/**
 * Metrics Collector
 * Tracks global pipeline metrics: correctness rate & iteration efficiency
 */

const store = {
  totalJobs: 0,
  completedJobs: 0,
  totalValidations: 0,
  passedValidations: 0,
  totalIterations: 0,
  totalTime: 0, // ms
  history: [], // last 20 jobs
};

function recordJobStart() {
  store.totalJobs++;
}

function recordValidation(passed) {
  store.totalValidations++;
  if (passed) store.passedValidations++;
}

function recordJobComplete({ iterations, durationMs, finalPassed }) {
  store.completedJobs++;
  store.totalIterations += iterations;
  store.totalTime += durationMs;

  const entry = {
    timestamp: Date.now(),
    iterations,
    durationMs,
    finalPassed,
    correctnessRate: getCorrectnessRate(),
    iterationEfficiency: getIterationEfficiency(),
  };
  store.history.unshift(entry);
  if (store.history.length > 20) store.history.pop();
}

function getCorrectnessRate() {
  if (store.totalValidations === 0) return 0;
  return Math.round((store.passedValidations / store.totalValidations) * 100);
}

function getIterationEfficiency() {
  if (store.completedJobs === 0) return 0;
  const avgIterations = store.totalIterations / store.completedJobs;
  // efficiency = 1/avg_iterations * 100 (capped at 100 when avg=1)
  return Math.round(Math.min(100, (1 / avgIterations) * 100));
}

function getAvgDuration() {
  if (store.completedJobs === 0) return 0;
  return Math.round(store.totalTime / store.completedJobs);
}

function getSnapshot() {
  return {
    totalJobs: store.totalJobs,
    completedJobs: store.completedJobs,
    correctnessRate: getCorrectnessRate(),
    iterationEfficiency: getIterationEfficiency(),
    avgDurationMs: getAvgDuration(),
    totalIterations: store.totalIterations,
    history: store.history.slice(0, 10),
  };
}

module.exports = {
  recordJobStart,
  recordValidation,
  recordJobComplete,
  getSnapshot,
};
