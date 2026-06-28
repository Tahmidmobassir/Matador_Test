// netlify/functions/analyze.js
// Proxies requests to Google Gemini — keeps the API key server-side.
// Set GEMINI_API_KEY in: Netlify Dashboard → Site → Environment Variables

const MODEL = 'gemini-2.0-flash'; // swap to 'gemini-2.5-flash' if this is deprecated

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'GEMINI_API_KEY is not set. Add it in Netlify → Site → Environment Variables.' } })
    };
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.body  // forward the request body as-is
      }
    );

    const responseText = await geminiRes.text();

    return {
      statusCode: geminiRes.status,
      headers: { 'Content-Type': 'application/json' },
      body: responseText
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};
