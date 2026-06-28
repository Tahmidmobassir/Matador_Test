// netlify/functions/analyze.js
// Proxies requests to Google Gemini — keeps the API key server-side.
// Set GEMINI_API_KEY in: Netlify Dashboard → Site → Environment Variables

// gemini-2.0-flash-lite: 30 RPM free tier (double that of gemini-2.0-flash)
// If this errors, try: gemini-1.5-flash-8b or gemini-2.5-flash-lite
const MODEL = 'gemini-2.0-flash-lite';

exports.handler = async (event) => {
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
        body: event.body
      }
    );

    const responseText = await geminiRes.text();

    // Log the real Gemini error to Netlify function logs for debugging
    if (!geminiRes.ok) {
      console.error(`Gemini error ${geminiRes.status}:`, responseText);
    }

    return {
      statusCode: geminiRes.status,
      headers: { 'Content-Type': 'application/json' },
      body: responseText
    };

  } catch (err) {
    console.error('Function error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};
