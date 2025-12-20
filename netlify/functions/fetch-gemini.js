// The async handler function for the Netlify Function
exports.handler = async function (event, context) {
  // 1. Check for the correct HTTP method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Only POST requests are allowed' }),
    };
  }

  // 2. Retrieve the API key from environment variables
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    // This error means the API key's VALUE is missing in the Netlify settings.
    console.error("ERROR: GOOGLE_AI_API_KEY was not found in process.env.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key is not set' }),
    };
  }

  try {
    // 3. Parse the incoming request body to get the prompt
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400, // Bad Request
        body: JSON.stringify({ error: 'Prompt is missing from request body' }),
      };
    }

    // 4. Prepare the payload for the Google AI API
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }],
      }],
    };
    
    // *** THIS IS THE CORRECTED LINE ***
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // 5. Make the fetch request to the Google AI API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // If the API returns an error, pass it along
      const errorData = await response.text();
      console.error("API Error Details:", errorData); // Added more logging
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'API request failed', details: errorData }),
      };
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // 6. Send the successful response back to the webpage
    return {
      statusCode: 200,
      body: JSON.stringify({ text: generatedText }),
    };

  } catch (error) {
    // Catch any other errors (e.g., JSON parsing)
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal server error occurred.' }),
    };
  }
};
