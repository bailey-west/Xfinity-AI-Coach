exports.handler = async (event, context) => {
  // 1. Handling CORS (So your website can talk to this function)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle browser "pre-flight" checks
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 2. Get the prompt and API Key
    const data = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!data.prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };
    }
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server Config Error: API Key missing' }) };
    }

    // 3. Call Google API DIRECTLY (Bypassing the broken SDK)
    // Note: We use "v1beta" which guarantees access to the Flash model
    // To use Gemini 2.0 Flash (Experimental), change "gemini-1.5-flash" to "gemini-2.0-flash-exp" below.
    const model = "gemini-1.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: data.prompt }]
        }]
      })
    });

    const googleData = await googleResponse.json();

    // 4. Handle Google's Response
    if (!googleResponse.ok) {
      console.error("Google API Error:", googleData);
      return {
        statusCode: googleResponse.status,
        headers,
        body: JSON.stringify({ error: 'AI Provider Error', details: googleData })
      };
    }

    // 5. Send data back to your website
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(googleData)
    };

  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
