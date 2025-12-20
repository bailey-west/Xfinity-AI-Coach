exports.handler = async (event, context) => {
  // VERSION: FINAL_STABLE_V3
  
  // 1. CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const data = JSON.parse(event.body);
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!data.prompt) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration Error: GEMINI_API_KEY is missing' }) };

    // 2. MODEL DEFINITION
    // We use 'gemini-1.5-flash' which is the standard free model for AI Studio keys.
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log(`[v3] Sending request to ${model}...`);

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

    // 3. ERROR HANDLING
    if (!googleResponse.ok) {
      console.error("Google API Error:", JSON.stringify(googleData, null, 2));
      
      // Specific handling for common errors
      if (googleResponse.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: 'Model Not Found (404)', 
            details: 'The API Key is valid, but cannot access "gemini-1.5-flash". Please ensure you are using a key from Google AI Studio (aistudio.google.com), NOT Google Cloud Console.' 
          })
        };
      }

      if (googleResponse.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ 
            error: 'Rate Limit Exceeded', 
            details: 'You are generating too fast. Please wait 1 minute and try again.' 
          })
        };
      }

      return {
        statusCode: googleResponse.status,
        headers,
        body: JSON.stringify({ error: 'AI Provider Error', details: googleData })
      };
    }

    // 4. SUCCESS
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(googleData)
    };

  } catch (error) {
    console.error("Internal Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
