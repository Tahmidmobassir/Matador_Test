// netlify/functions/translate.js
// Translates doodle reading fields from English to Bangla using Groq.
// Reuses the same GROQ_API_KEY environment variable — no new setup needed.

const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'GROQ_API_KEY not set.' } })
    };
  }

  try {
    const { spotted, archetype, vibes, reading, bonus } = JSON.parse(event.body);

    const prompt = `Translate the following JSON values from English to Bangla (Bengali script, বাংলা). 
Keep the exact same JSON structure and keys. Only translate the values.
For the "vibes" array, translate each word naturally into Bangla.
Return ONLY valid JSON — no markdown, no backticks, no explanation.

Input:
${JSON.stringify({ spotted, archetype, vibes, reading, bonus }, null, 2)}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.2  // low temp for accurate translation
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq translate error:', groqRes.status, err);
      throw new Error(`Translation error ${groqRes.status}`);
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse translated JSON');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: match[0]
    };

  } catch (err) {
    console.error('Translate function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};
