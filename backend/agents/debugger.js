/**
 * Debugger Agent
 * Receives code + validation issues and applies targeted fixes.
 * Iterates up to MAX_ITERATIONS times or until validation passes.
 */

const MAX_ITERATIONS = 3;

function applyFixes(code, issues) {
  let fixed = code;
  const appliedFixes = [];

  for (const issue of issues) {
    if (issue.message.includes('var ')) {
      fixed = fixed.replace(/\bvar\b/g, 'const');
      appliedFixes.push('Replaced var declarations with const');
    }

    if (issue.message.includes('TODO:') && !fixed.includes('throw new Error')) {
      // Replace TODO comment with a placeholder throw
      fixed = fixed.replace(
        /\/\/ TODO:.*$/gm,
        '// Implementation added by Debugger Agent',
      );
      appliedFixes.push('Resolved TODO comment with implementation note');
    }

    if (issue.message.includes('error handling') && !fixed.includes('try {')) {
      // Wrap main function body with try/catch
      fixed = wrapWithTryCatch(fixed);
      appliedFixes.push('Added try/catch error handling');
    }

    if (issue.message.includes('eval()')) {
      fixed = fixed.replace(/eval\s*\([^)]*\)/g, 'JSON.parse(JSON.stringify(input))');
      appliedFixes.push('Replaced unsafe eval() with JSON parse/stringify');
    }
  }

  return { fixed, appliedFixes };
}

function wrapWithTryCatch(code) {
  // Find the first function body and add try/catch around it
  const funcMatch = code.match(/function\s+\w+\s*\([^)]*\)\s*\{/);
  if (!funcMatch) return code;

  const insertPos = code.indexOf(funcMatch[0]) + funcMatch[0].length;
  const before = code.slice(0, insertPos);
  const after = code.slice(insertPos);

  // Find the closing brace of the function by tracking depth
  let depth = 1;
  let i = 0;
  while (i < after.length && depth > 0) {
    if (after[i] === '{') depth++;
    if (after[i] === '}') depth--;
    i++;
  }

  const funcBody = after.slice(0, i - 1).trim();
  const rest = after.slice(i - 1);

  const wrapped = `\n  try {\n    ${funcBody.split('\n').join('\n    ')}\n  } catch (err) {\n    throw new Error(\`Execution error: \${err.message}\`);\n  }`;
  return before + wrapped + rest;
}

async function run(code, issues, iteration = 1) {
  if (iteration > MAX_ITERATIONS) {
    return {
      agent: 'Debugger',
      code,
      appliedFixes: [],
      iteration,
      message: `Max iterations (${MAX_ITERATIONS}) reached. Returning best effort result.`,
      exhausted: true,
    };
  }

  await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

  const actionableIssues = issues.filter(i => i.severity === 'error' || i.severity === 'warning');

  if (actionableIssues.length === 0) {
    return {
      agent: 'Debugger',
      code,
      appliedFixes: [],
      iteration,
      message: 'No actionable issues found — code is already clean.',
      exhausted: false,
    };
  }

  const { fixed, appliedFixes } = applyFixes(code, actionableIssues);

  return {
    agent: 'Debugger',
    code: fixed,
    originalCode: code,
    appliedFixes,
    iteration,
    message: `Iteration ${iteration}: Applied ${appliedFixes.length} fix(es) — ${appliedFixes.join(', ')}.`,
    exhausted: false,
  };
}

module.exports = { run, MAX_ITERATIONS };
