const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // 1. Handle Preflight (CORS) requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // 2. Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // 3. Parse the incoming body
    const data = JSON.parse(event.body);
    const prompt = data.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // 4. Check for API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfiguration: API Key missing' })
      };
    }

    // 5. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use 'gemini-pro' or 'gemini-1.5-flash' depending on your preference/availability
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 6. Generate Content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 7. Return success
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow all origins (or specify your domain)
        'Content-Type': 'application/json'
      },
      // Mimic the structure the frontend expects: { candidates: [ { content: { parts: [ { text: ... } ] } } ] }
      // Or simply return the text if you adjust the frontend. 
      // YOUR FRONTEND expects the raw Google structure based on your code: 
      // "result.candidates[0].content.parts[0].text"
      // So we will return the raw response structure or reconstruct it to match.
      body: JSON.stringify({
        candidates: [
            {
                content: {
                    parts: [
                        { text: text }
                    ]
                }
            }
        ]
      })
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to generate content', details: error.message })
    };
  }
};
