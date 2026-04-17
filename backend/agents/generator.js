/**
 * Generator Agent
 * Uses Gemini API to convert prompts into code for ANY language.
 */
const { GoogleGenAI } = require('@google/genai');

function extractCode(text) {
  if (!text) return { lang: 'text', code: '' };
  const codeBlockMatch = text.match(/```(\w*)\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return { lang: codeBlockMatch[1].trim() || 'code', code: codeBlockMatch[2].trim() };
  }
  return { lang: 'text', code: text.trim() };
}

async function run(problem) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return {
      agent: 'Generator',
      language: 'text',
      code: '// ERROR: Missing API Key in .env',
      confidence: 0,
      message: 'Missing Gemini API Key.'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert polyglot developer. Write or fix the code for the following request in the most appropriate programming language, or the language explicitly requested by the user. Return ONLY the code inside a markdown block with the correct language tag (e.g. \`\`\`python). Do not include any explanations. Request: \n${problem}`,
    });
    
    const { lang, code } = extractCode(response.text);

    return {
      agent: 'Generator',
      language: lang,
      code: code,
      confidence: 1.0,
      message: `Generated solution in ${lang.toUpperCase()} using Gemini API.`
    };
  } catch (error) {
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

module.exports = { run };
