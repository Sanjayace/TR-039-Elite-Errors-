/**
 * Debugger Agent
 * Uses Gemini API to universally fix code across any language based on validator issues.
 */
const { GoogleGenAI } = require('@google/genai');

const MAX_ITERATIONS = 3;

function extractCode(text) {
  if (!text) return '';
  const codeBlockMatch = text.match(/```(?:\w*)\n([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  return text.trim();
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Missing Gemini API Key in .env file.');
  }

  try {
    const ai = new GoogleGenAI({});
    const issuesText = actionableIssues.map(i => `- Line ${i.line}: ${i.message}`).join('\n');
    
    const prompt = `You are an expert polyglot code debugger.
Fix the following code which has issues. Maintain the exact same programming language as the original code.
Return ONLY the corrected code inside a markdown code block (e.g. \`\`\`python).
Do not include any explanations.

Issues found:
${issuesText}

Original Code:
\`\`\`
${code}
\`\`\``;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const fixedCode = extractCode(response.text);

    return {
      agent: 'Debugger',
      code: fixedCode,
      originalCode: code,
      appliedFixes: actionableIssues.map(i => `Fixed: ${i.message}`),
      iteration,
      message: `Iteration ${iteration}: Gemini applied fixes for ${actionableIssues.length} issues in the detected language.`,
      exhausted: false,
    };
  } catch (error) {
    throw new Error(`Gemini Debugger API Error: ${error.message}`);
  }
}

module.exports = { run, MAX_ITERATIONS };
