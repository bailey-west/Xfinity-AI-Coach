// File: netlify/functions/fetch-gemini.js
// (Renamed logic to use Groq, but keeping filename to prevent frontend errors)

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

  // 3. Get your Groq API Key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Server Error: GROQ_API_KEY is missing' };
  }

  // 4. Call Groq API
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: body.prompt
          }
        ],
        model: "llama3-8b-8192", // Fast, efficient model good for summaries
        temperature: 0.7
      })
    });

    const data = await response.json();

    // 5. Handle Groq Errors
    if (data.error) {
      console.error("Groq API Error:", data.error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Groq Error: ${data.error.message}` }),
      };
    }

    // 6. Format response to match what your frontend expects
    // Groq returns OpenAI format, but your frontend expects Gemini format.
    // We map it here so you don't have to change your index.html.
    const mappedResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: data.choices[0].message.content }
            ]
          }
        }
      ]
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappedResponse),
    };

  } catch (error) {
    console.error("Backend Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to connect to Groq AI' }),
    };
  }
};
