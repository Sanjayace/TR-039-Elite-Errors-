/**
 * Validator Agent
 * Performs static analysis on generated code.
 * Checks: syntax validity, common anti-patterns, missing error handling.
 */

const vm = require('vm');

function checkSyntax(code) {
  try {
    new vm.Script(code);
    return { passed: true, error: null };
  } catch (e) {
    return { passed: false, error: e.message };
  }
}

function checkAntiPatterns(code) {
  const issues = [];

  // Intentionally introduce occasional issues in generic scaffolds
  if (code.includes('TODO:') && !code.includes('throw')) {
    issues.push({
      severity: 'warning',
      line: findLineNumber(code, 'TODO:'),
      message: 'TODO comment found — implementation incomplete',
    });
  }

  if (/eval\s*\(/.test(code)) {
    issues.push({
      severity: 'error',
      line: findLineNumber(code, 'eval('),
      message: 'Use of eval() is unsafe and should be avoided',
    });
  }

  if (/var\s+/.test(code)) {
    issues.push({
      severity: 'warning',
      line: findLineNumber(code, 'var '),
      message: 'Prefer const/let over var for block scoping',
    });
  }

  if (!code.includes('throw') && !code.includes('try') && !code.includes('catch')) {
    // Only flag if longer code without any error handling
    if (code.split('\n').length > 12) {
      issues.push({
        severity: 'warning',
        line: 1,
        message: 'No error handling detected — consider adding try/catch or input guards',
      });
    }
  }

  if (/console\.log\(/.test(code) && code.match(/console\.log\(/g)?.length > 5) {
    issues.push({
      severity: 'info',
      line: findLineNumber(code, 'console.log('),
      message: 'Excessive console.log calls — remove before production',
    });
  }

  return issues;
}

function findLineNumber(code, pattern) {
  const lines = code.split('\n');
  const idx = lines.findIndex(l => l.includes(pattern));
  return idx === -1 ? 1 : idx + 1;
}

function computeQualityScore(syntaxOk, issues) {
  if (!syntaxOk) return 0;
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else if (issue.severity === 'info') score -= 3;
  }
  return Math.max(0, score);
}

async function run(code) {
  await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

  const syntaxResult = checkSyntax(code);
  const antiPatternIssues = syntaxResult.passed ? checkAntiPatterns(code) : [];
  const qualityScore = computeQualityScore(syntaxResult.passed, antiPatternIssues);
  const passed = syntaxResult.passed && qualityScore >= 60;

  const issues = [];
  if (!syntaxResult.passed) {
    issues.push({ severity: 'error', line: 1, message: `Syntax error: ${syntaxResult.error}` });
  }
  issues.push(...antiPatternIssues);

  return {
    agent: 'Validator',
    passed,
    qualityScore,
    issues,
    checks: {
      syntax: syntaxResult.passed,
      antiPatterns: antiPatternIssues.filter(i => i.severity === 'error').length === 0,
      qualityThreshold: qualityScore >= 60,
    },
    message: passed
      ? `Validation passed with quality score ${qualityScore}/100. ${issues.length} minor notice(s).`
      : `Validation failed — quality score ${qualityScore}/100. ${issues.length} issue(s) require fixing.`,
  };
}

module.exports = { run };
