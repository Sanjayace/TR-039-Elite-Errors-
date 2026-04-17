/**
 * Validator Agent
 * Uses Gemini LLM to act as a universal code reviewer 
 * capable of spotting syntax errors and anti-patterns in ANY language.
 */
const { GoogleGenAI } = require('@google/genai');

function extractJson(text) {
  try {
    const codeBlockMatch = text.match(/```(?:json)?\n([\s\S]*?)```/);
    if (codeBlockMatch) return JSON.parse(codeBlockMatch[1]);
    
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { issues: [] };
  } catch (e) {
    return { issues: [] };
  }
}

function computeQualityScore(issues) {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else if (issue.severity === 'info') score -= 3;
  }
  return Math.max(0, score);
}

async function run(code) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return {
      agent: 'Validator',
      passed: false,
      qualityScore: 0,
      issues: [{severity: 'error', line: 1, message: 'Missing Gemini API Key'}],
      checks: { syntax: false, qualityThreshold: false },
      message: 'Failed to run validator due to missing API key.'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const prompt = `You are an expert polyglot code reviewer. Analyze the following code for syntax errors, logical bugs, and anti-patterns.
Determine the language automatically.
Return your analysis ONLY as a valid JSON object matching this schema exactly:
{
  "issues": [
    { "severity": "error" or "warning" or "info", "line": <number>, "message": "<description>" }
  ]
}
If the code is perfectly fine and has no issues, return: { "issues": [] }
Never return markdown besides the JSON block.

Code:
\`\`\`
${code}
\`\`\``;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const parsed = extractJson(response.text);
    const issues = parsed.issues || [];
    
    const hasSyntaxError = issues.some(i => i.severity === 'error');
    const qualityScore = computeQualityScore(issues);
    const passed = !hasSyntaxError && qualityScore >= 60;

    return {
      agent: 'Validator',
      passed,
      qualityScore,
      issues,
      checks: {
        syntax: !hasSyntaxError,
        qualityThreshold: qualityScore >= 60,
      },
      message: passed
        ? `Validation passed with score ${qualityScore}/100. ${issues.length} minor notice(s).`
        : `Validation failed — quality score ${qualityScore}/100. ${issues.length} issue(s) found.`,
    };
  } catch (error) {
    throw new Error(`Gemini Validator API Error: ${error.message}`);
  }
}

module.exports = { run };
