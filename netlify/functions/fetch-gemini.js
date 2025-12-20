exports.handler = async (event, context) => {
  // 1. CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    // TRIM the key to remove accidental whitespace/newlines
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!data.prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };
    }
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration Error: GEMINI_API_KEY is missing in Netlify' }) };
    }

    // 2. SMART MODEL LIST
    // We will try these in order. If the first fails, we try the next.
    const modelsToTry = [
      "gemini-1.5-flash",       // Standard Flash
      "gemini-1.5-flash-latest", // Alternate Flash alias
      "gemini-pro"              // Robust fallback
    ];

    let successData = null;
    let lastError = null;

    // 3. LOOP THROUGH MODELS
    for (const model of modelsToTry) {
      console.log(`Trying model: ${model}...`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: data.prompt }] }]
          })
        });

        const json = await response.json();

        if (response.ok) {
          successData = json;
          console.log(`Success with ${model}`);
          break; // Stop looping, we found a winner
        } else {
          console.warn(`Failed ${model}:`, json.error?.message || json);
          lastError = json;
        }
      } catch (err) {
        console.error(`Network error with ${model}:`, err);
        lastError = { message: err.message };
      }
    }

    // 4. RESULT
    if (successData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(successData)
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'All models failed.', 
          details: lastError 
        })
      };
    }

  } catch (error) {
    console.error("Global Handler Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
