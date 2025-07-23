const axios = require('axios');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Check API status function
exports.checkStatus = async () => {
  if (!OPENAI_API_KEY) {
    return {
      isAvailable: false,
      message: "OpenAI API key is not configured",
      models: []
    };
  }
  
  try {
    // Make a simple request to test the API key
    const response = await openaiAxios.post('', {
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "user", content: "Hello" }
      ],
      max_tokens: 5,
    });
    
    return {
      isAvailable: true,
      message: "OpenAI API is configured and working",
      models: ["gpt-4-turbo-preview", "gpt-3.5-turbo"]
    };
  } catch (error) {
    return {
      isAvailable: false,
      message: `OpenAI API error: ${error.message}`,
      models: []
    };
  }
};

// Create OpenAI API client
const openaiAxios = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
});

// Simple caching mechanism
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Cache management functions
const getCachedResult = (operation, input, options = {}) => {
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  if (shouldForceRefresh) {
    console.log(`OpenAI API: Bypassing cache for ${operation} due to forceRefresh`);
    return null;
  }
  
  const key = `${operation}-${Buffer.from(input).toString('base64').substring(0, 100)}`;
  const cached = cache.get(key);
  
  if (!cached || Date.now() > cached.expiresAt) {
    if (cached) cache.delete(key);
    return null;
  }
  
  console.log(`OpenAI API: Cache hit for ${operation}`);
  return cached.data;
};

const setCacheResult = (operation, input, result) => {
  const key = `${operation}-${Buffer.from(input).toString('base64').substring(0, 100)}`;
  cache.set(key, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL
  });
  
  setTimeout(() => cache.delete(key), CACHE_TTL);
};

// Retry logic with delay
const retryWithDelay = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    console.log(`OpenAI API error, retrying in ${delay}ms (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithDelay(fn, retries - 1, delay * 2);
  }
};

// Test simple query function
exports.testSimpleQuery = async (text) => {
  if (!text || text.trim().length === 0) {
    return "No text provided for testing.";
  }
  
  try {
    const response = await retryWithDelay(() =>
      openaiAxios.post('', {
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: text
        }],
        max_tokens: 250,
        temperature: 0.7,
      })
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error in OpenAI test query:', error.response ? error.response.data : error.message);
    return `Error processing your request: ${error.message}`;
  }
};

// Summarize text function
exports.summarizeText = async (text, options = {}) => {
  if (!text || text.length < 50) {
    return "Transcript too short to summarize.";
  }
  
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  const cachedSummary = getCachedResult('summary', text, { forceRefresh: shouldForceRefresh });
  if (cachedSummary) {
    return cachedSummary;
  }
  
  try {
    const prompt = `
You are an expert dialogue facilitator. Create a concise summary of this dialogue transcript that:

1. Identifies the main topics discussed
2. Captures key insights and important points raised
3. Highlights areas of agreement and consensus
4. Notes questions or areas requiring further exploration
5. Identifies any action items or next steps mentioned
6. Preserves the essence of different perspectives shared

Format the summary in a clear, organized way that would be useful for participants to review later.

Dialogue transcript:
${text}
`;

    const response = await retryWithDelay(() =>
      openaiAxios.post('', {
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "user",
          content: prompt
        }],
        max_tokens: 400,
        temperature: 0.4,
      })
    );
    
    const summary = response.data.choices[0].message.content;
    
    if (!shouldForceRefresh) {
      setCacheResult('summary', text, summary);
    }
    
    return summary;
  } catch (error) {
    console.error('Error summarizing text with OpenAI:', error.response ? error.response.data : error.message);
    return "Unable to summarize text at this time. Please try again later.";
  }
};

// Format transcript function
exports.formatTranscript = async (text, options = {}) => {
  if (!text || text.length < 20) {
    return text;
  }
  
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  const cachedFormat = getCachedResult('format', text, { forceRefresh: shouldForceRefresh });
  if (cachedFormat) {
    return cachedFormat;
  }
  
  try {
    const prompt = `
You are a dialogue transcript formatter specializing in real-time speech-to-text conversion. Format the following raw transcript into a clear, structured conversation:

1. Identify different speakers and label them consistently
2. Organize content into proper paragraphs
3. Fix grammar, punctuation, and capitalization while preserving the original meaning
4. Maintain the conversational flow and natural language
5. Remove filler words, disfluencies (um, uh, like), and repetitions that don't add value
6. Add appropriate punctuation to spoken text that may lack it
7. Reconstruct meaningful paragraphs from stream-of-consciousness speech
8. Format in a clean, readable dialogue style
9. When speaker identity is ambiguous, make your best guess based on context

Raw speech-to-text transcript:
${text}
`;

    const response = await retryWithDelay(() =>
      openaiAxios.post('', {
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "user",
          content: prompt
        }],
        max_tokens: 1500,
        temperature: 0.3,
      })
    );
    
    const formattedText = response.data.choices[0].message.content;
    
    if (!shouldForceRefresh) {
      setCacheResult('format', text, formattedText);
    }
    
    return formattedText;
  } catch (error) {
    console.error('Error formatting transcript with OpenAI:', error.response ? error.response.data : error.message);
    return text; // Return original text if formatting fails
  }
};

// Extract themes function
exports.extractThemes = async (text, options = {}) => {
  if (!text || text.length < 100) {
    return "Text too short to extract themes.";
  }
  
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  const cachedThemes = getCachedResult('themes', text, { forceRefresh: shouldForceRefresh });
  if (cachedThemes) {
    return cachedThemes;
  }
  
  try {
    const prompt = `
You are an expert dialogue analyst specializing in thematic analysis. Analyze this transcript and identify:

1. The 3-5 main themes that emerged in the conversation
2. Key supporting points or evidence for each theme
3. Areas of agreement among participants
4. Areas of divergence or questions that remain unresolved
5. Potential next steps for further exploration

Present your analysis in a structured format with clear headings.

Dialogue transcript:
${text}
`;

    const response = await retryWithDelay(() =>
      openaiAxios.post('', {
        model: "gpt-4-turbo-preview",
        messages: [{
          role: "user",
          content: prompt
        }],
        max_tokens: 600,
        temperature: 0.3,
      })
    );
    
    const themes = response.data.choices[0].message.content;
    
    if (!shouldForceRefresh) {
      setCacheResult('themes', text, themes);
    }
    
    return themes;
  } catch (error) {
    console.error('Error extracting themes with OpenAI:', error.response ? error.response.data : error.message);
    return "Unable to extract themes at this time. Please try again later.";
  }
};

// Export cache clearing function for testing
exports.clearCache = () => {
  console.log('Clearing OpenAI API cache');
  cache.clear();
  return { success: true, message: 'Cache cleared', timestamp: Date.now() };
}; 