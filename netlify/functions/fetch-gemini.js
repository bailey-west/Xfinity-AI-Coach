exports.handler = async (event, context) => {
  // 1. CORS Headers (Allows your site to talk to this function)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 2. Handle Pre-flight checks
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const data = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!data.prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };
    }
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server Error: API Key missing' }) };
    }

    // 3. DEFINE MODELS
    // Primary: The specific, stable version of Flash 1.5 (Fixes the 404 error)
    const primaryModel = "gemini-1.5-flash-001";
    // Backup: The older stable Pro model (Failsafe)
    const backupModel = "gemini-pro";

    // Helper function to call Google
    async function generate(modelName) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: data.prompt }] }]
        })
      });
      return { response, json: await response.json() };
    }

    // 4. ATTEMPT PRIMARY MODEL
    console.log(`Attempting generation with ${primaryModel}...`);
    let result = await generate(primaryModel);

    // 5. IF FAILED (404), TRY BACKUP
    if (!result.response.ok) {
      console.warn(`${primaryModel} failed (${result.response.status}). Trying backup ${backupModel}...`);
      const backupResult = await generate(backupModel);
      
      // If backup succeeds, use it
      if (backupResult.response.ok) {
        result = backupResult;
      } else {
        // If both fail, return the error from the PRIMARY attempt (it's more useful)
        console.error("Backup also failed.");
        return {
          statusCode: result.response.status,
          headers,
          body: JSON.stringify({ 
            error: 'AI Provider Error', 
            details: result.json,
            note: "Both Flash and Pro models failed."
          })
        };
      }
    }

    // 6. SUCCESS
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.json)
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
