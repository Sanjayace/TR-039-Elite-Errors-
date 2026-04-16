/**
 * API Routes
 */

const express = require('express');
const router = express.Router();
const pipeline = require('../pipeline');
const metrics = require('../metrics');

// POST /api/run — submit a problem
router.post('/run', (req, res) => {
  const { problem } = req.body;
  if (!problem || typeof problem !== 'string' || problem.trim().length < 5) {
    return res.status(400).json({ error: 'Please provide a problem statement (min 5 chars)' });
  }
  const jobId = pipeline.createJob(problem.trim());
  // Run pipeline in background
  pipeline.runPipeline(jobId).catch(console.error);
  res.json({ jobId, message: 'Pipeline started' });
});

// GET /api/stream/:jobId — SSE stream
router.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = pipeline.getJob(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  pipeline.addClient(jobId, res);

  req.on('close', () => pipeline.removeClient(jobId, res));
});

// GET /api/jobs — list all jobs
router.get('/jobs', (_req, res) => {
  res.json(pipeline.getAllJobs());
});

// GET /api/metrics — global metrics snapshot
router.get('/metrics', (_req, res) => {
  res.json(metrics.getSnapshot());
});

module.exports = router;
