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
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!data.prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt is required' }) };
    }
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server Config Error: GEMINI_API_KEY is missing' }) };
    }

    // --- STEP 1: DISCOVER AVAILABLE MODELS ---
    // Instead of guessing "gemini-1.5-flash", we ask Google what is allowed.
    console.log("Discovering available models...");
    
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    const listData = await listResponse.json();

    // ERROR CHECK: If we can't even list models, the Key is the problem.
    if (!listResponse.ok) {
      console.error("API Key Access Failed:", listData);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'API Key Rejected', 
          message: 'Google rejected this API Key. Ensure "Generative Language API" is enabled in Google Cloud Console.',
          googleDetails: listData 
        })
      };
    }

    // --- STEP 2: SELECT BEST MODEL ---
    // listData.models contains everything available. We prioritize Flash.
    const availableModels = listData.models || [];
    
    // Logic: Look for "flash", then "pro", then fallback to anything that supports generation
    let chosenModelObj = availableModels.find(m => m.name.includes("gemini-1.5-flash")) ||
                         availableModels.find(m => m.name.includes("gemini-pro")) ||
                         availableModels.find(m => m.supportedGenerationMethods?.includes("generateContent"));

    if (!chosenModelObj) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No text-generation models found for this API Key.' })
      };
    }

    // The name comes back as "models/gemini-1.5-flash-001" etc.
    const modelName = chosenModelObj.name; 
    console.log(`Auto-selected model: ${modelName}`);

    // --- STEP 3: GENERATE CONTENT ---
    // Note: modelName already includes "models/", so we don't add it again.
    const genUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

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
    console.error("Internal Function Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
