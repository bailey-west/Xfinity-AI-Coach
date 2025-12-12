// netlify/functions/fetch-gemini.js
exports.handler = async function(event, context) {
  // 1. Get the Key securely from Netlify
  const API_KEY = process.env.GEMINI_API_KEY;
  
  // 2. Parse the complex payload (instructions, schemas, etc.) sent from your frontend
  const payload = JSON.parse(event.body);

  try {
    // 3. Forward everything to Google, adding the Key securely
    // Note: We use the specific 2.5 Flash model you requested
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
