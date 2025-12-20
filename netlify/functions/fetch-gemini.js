exports.handler = async (event, context) => {
  // 1. CORS Headers (Allows your site to talk to this function)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 2. Handle Browser "Pre-flight" checks
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 3. Block anything that isn't a POST request
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 4. Parse inputs
    const data = JSON.parse(event.body);
    // Trim invisible spaces from the key (common copy-paste error)
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!data.prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };
    }
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server Config Error: GEMINI_API_KEY is missing' }) };
    }

    // 5. CALL GOOGLE DIRECTLY (Gemini 1.5 Flash)
    // We use the "v1beta" endpoint which is the standard for 1.5 Flash.
    const model = "gemini-1.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log(`Sending request to ${model}...`);

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

    // 6. Handle Errors from Google (like 404s or 429s)
    if (!googleResponse.ok) {
      console.error("Google API Error:", JSON.stringify(googleData, null, 2));
      
      // Pass the specific Google error back to the frontend so we can see it
      return {
        statusCode: googleResponse.status,
        headers,
        body: JSON.stringify({ 
          error: 'AI Provider Error', 
          details: googleData.error || googleData 
        })
      };
    }

    // 7. Success! Send the answer back.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(googleData)
    };

  } catch (error) {
    console.error("Internal Function Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
