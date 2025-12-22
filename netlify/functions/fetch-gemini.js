// File: netlify/functions/fetch-gemini.js

exports.handler = async (event) => {
  // 1. Security: Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. Parse the incoming prompt
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // 3. Get your API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Server Error: API Key missing' };
  }

  // 4. Call Google Gemini API
  // Using 'gemini-1.5-flash' which is the standard, fastest model for this API
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: body.prompt }] }]
        }),
      }
    );

    const data = await response.json();

    // 5. Handle Errors from Google (e.g., if model is still not found)
    if (data.error) {
      console.error("Google API Error:", data.error);
      return {
        statusCode: data.error.code || 500,
        body: JSON.stringify({ error: `Google Error: ${data.error.message}` }),
      };
    }

    // 6. Success
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to connect to Google AI' }),
    };
  }
};
