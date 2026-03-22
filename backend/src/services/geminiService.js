const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ANALYSIS_PROMPT = (comments, platform, title) => `
You are an expert in media bias, social psychology, and misinformation analysis.

Analyze the following content from "${platform}" titled "${title}".
Look at the comments/text and identify echo chamber patterns, bias clusters, and missing perspectives.

Return ONLY a valid JSON object with no extra text, no markdown, no code fences:
{
  "echo_score": <0-100, where 100 = total echo chamber, 0 = fully diverse>,
  "diversity_score": <0-100, inverse of echo_score>,
  "toxicity_score": <0-100, how toxic/hostile is the discourse>,
  "dominant_emotion": "<one word: anger | fear | joy | sadness | disgust | surprise | neutral>",
  "summary": "<2-3 sentences plain English summary of the discourse>",
  "missing_perspectives": "<comma-separated list of viewpoints NOT present in the discussion>",
  "bias_clusters": [
    {
      "label": "<name of opinion cluster>",
      "count": <estimated number of comments in this cluster>,
      "sample_quotes": ["<short representative quote>", "<another quote>"]
    }
  ]
}

Content to analyze:
${comments}
`;

async function analyzeContent({ comments, platform, title }) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = ANALYSIS_PROMPT(
      comments.slice(0, 8000), // cap tokens
      platform || 'Unknown',
      title    || 'Unknown Article'
    );

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();

    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return { success: true, data: parsed };
  } catch (err) {
    console.error('❌ Gemini error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { analyzeContent };
