// netlify/functions/analyze.js
// Uses Groq's free Llama vision API — works globally, no regional restrictions.
// Free tier: 14,400 requests/day · Get a free key at console.groq.com
// Set GROQ_API_KEY in: Netlify Dashboard → Site → Environment Variables

const MODEL = 'llama-3.2-11b-vision-preview';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'GROQ_API_KEY is not set. Add it in Netlify → Site → Environment Variables.' } })
    };
  }

  try {
    // Parse the incoming request (index.html sends in Gemini format — we translate to Groq)
    const body     = JSON.parse(event.body);
    const parts    = body.contents[0].parts;
    const prompt   = parts[0].text;           // system + personality instructions
    const imgData  = parts[1].inline_data;    // { mime_type, data (base64) }
    const userMsg  = parts[2].text;           // "Here's my doodle!"

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `${prompt}\n\n${userMsg}` },
            { type: 'image_url', image_url: { url: `data:${imgData.mime_type};base64,${imgData.data}` } }
          ]
        }],
        max_tokens: 800,
        temperature: 0.9
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', groqRes.status, err);
      return {
        statusCode: groqRes.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { message: `Groq error ${groqRes.status}: ${err}` } })
      };
    }

    const groqData = await groqRes.json();
    const text = groqData.choices?.[0]?.message?.content || '';

    // Return in Gemini-compatible shape so index.html needs zero changes
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text }] } }]
      })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};
