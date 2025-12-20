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
    // Trim key to remove accidental spaces
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!data.prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };
    }
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration Error: GEMINI_API_KEY is missing' }) };
    }

    // --- STEP A: ASK GOOGLE WHICH MODELS ARE AVAILABLE ---
    // This fixes the "404 Model Not Found" by only using models we KNOW exist for your key.
    console.log("Fetching available models for this key...");
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const listResponse = await fetch(listUrl);
    const listData = await listResponse.json();

    if (!listResponse.ok) {
      console.error("API Key Access Error:", listData);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Your API Key is invalid or does not have the Generative Language API enabled.',
          details: listData 
        })
      };
    }

    // --- STEP B: PICK THE BEST MODEL ---
    // Look for 'gemini-1.5-flash', then 'gemini-pro', then any 'generateContent' capable model
    const models = listData.models || [];
    let chosenModel = models.find(m => m.name.includes("gemini-1.5-flash"))?.name ||
                      models.find(m => m.name.includes("gemini-pro"))?.name ||
                      models.find(m => m.supportedGenerationMethods?.includes("generateContent"))?.name;

    if (!chosenModel) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No text-generation models found for this API Key.' })
      };
    }

    console.log(`Auto-selected model: ${chosenModel}`);

    // --- STEP C: GENERATE CONTENT ---
    // Note: chosenModel comes with 'models/' prefix, e.g., 'models/gemini-pro'
    const genUrl = `https://generativelanguage.googleapis.com/v1beta/${chosenModel}:generateContent?key=${apiKey}`;

    const genResponse = await fetch(genUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: data.prompt }] }]
      })
    });

    const genData = await genResponse.json();

    if (!genResponse.ok) {
      return {
        statusCode: genResponse.status,
        headers,
        body: JSON.stringify({ error: 'Generation Failed', details: genData })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(genData)
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
