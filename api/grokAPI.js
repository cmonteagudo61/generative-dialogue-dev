const axios = require('axios');
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = process.env.X_API_KEY;

// Configure axios for Grok API
const grokAxios = axios.create({
  baseURL: GROK_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GROK_API_KEY}`,
    'X-API-VERSION': '2023-12-01'
  },
  timeout: 30000
});

// Check API status function
exports.checkStatus = async () => {
  if (!GROK_API_KEY) {
    return {
      isAvailable: false,
      message: "Grok API key is not configured",
      models: []
    };
  }
  
  try {
    // Make a simple request to test the API key
    const response = await grokAxios.post('', {
      model: "grok-3",
      messages: [
        { role: "user", content: "Hello" }
      ],
      max_tokens: 5,
      temperature: 0.3
    });
    
    return {
      isAvailable: true,
      message: "Grok API is configured and working",
      models: ["grok-beta", "grok-2-1212", "grok-3", "grok-3-mini"]
    };
  } catch (error) {
    // Handle specific error cases
    if (error.response && error.response.status === 403) {
      return {
        isAvailable: false,
        message: "Grok API requires credits to be purchased",
        models: ["grok-beta", "grok-2-1212", "grok-3", "grok-3-mini"]
      };
    }
    
    return {
      isAvailable: false,
      message: `Grok API error: ${error.message}`,
      models: []
    };
  }
};

// Cache for responses
const cache = new Map();

// Cache management functions
const getCachedResult = (operation, input, options = {}) => {
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  if (shouldForceRefresh) {
    console.log('Force refresh requested, skipping cache');
    return null;
  }
  
  const cacheKey = `${operation}:${Buffer.from(input).toString('base64').substring(0, 32)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < 30 * 60 * 1000) { // 30 minutes
    console.log(`Cache hit for ${operation}`);
    return cached.result;
  }
  
  return null;
};

const setCacheResult = (operation, input, result) => {
  const cacheKey = `${operation}:${Buffer.from(input).toString('base64').substring(0, 32)}`;
  cache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
};

// Retry function with exponential backoff
const retryWithDelay = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response && error.response.status >= 500) {
      console.log(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Core Grok API call function
const callGrokAPI = async (messages, options = {}) => {
  const {
    model = "grok-3",
    max_tokens = 2000,
    temperature = 0.3,
    ...otherOptions
  } = options;

  try {
    const response = await retryWithDelay(() => 
      grokAxios.post('', {
        model,
        messages,
        max_tokens,
        temperature,
        ...otherOptions
      })
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Grok API error:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Generate response function (used by synthesis service)
exports.generateResponse = async (prompt, options = {}) => {
  if (!prompt || prompt.trim().length === 0) {
    return "No prompt provided.";
  }

  // Check cache first
  const cachedResult = getCachedResult('generate', prompt, options);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    console.log('Sending generation request to Grok API...');
    
    const messages = [
      {
        role: "system",
        content: "You are Grok, an AI assistant that provides helpful, accurate, and engaging responses."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const result = await callGrokAPI(messages, options);
    
    // Cache the result
    setCacheResult('generate', prompt, result);
    
    console.log('Successfully generated response with Grok');
    return result;
  } catch (error) {
    console.error('Error in generateResponse:', error.message);
    throw error;
  }
};

// Test simple query function
exports.testSimpleQuery = async (text, options = {}) => {
  if (!text || text.trim().length === 0) {
    return "No text provided for testing.";
  }
  
  try {
    const testPrompt = `Please respond to the following input with a brief, helpful response: ${text}`;
    
    console.log('Sending test query to Grok API...');
    
    const messages = [
      {
        role: "system",
        content: "You are Grok, an AI assistant. Provide brief, helpful responses."
      },
      {
        role: "user",
        content: testPrompt
      }
    ];
    
    const result = await callGrokAPI(messages, {
      max_tokens: 250,
      temperature: 0.7,
      ...options
    });
    
    console.log('Successfully generated test response');
    return result;
  } catch (error) {
    console.error('Error in test query:', error.message);
    return `Error processing your request: ${error.message}`;
  }
};

// Extract themes function
exports.extractThemes = async (text, options = {}) => {
  if (!text || text.length < 100) {
    return "Text too short to extract themes.";
  }
  
  // Check cache first
  const cachedResult = getCachedResult('themes', text, options);
  if (cachedResult) {
    console.log('Using cached themes result');
    return cachedResult;
  }
  
  console.log('No cache hit or forceRefresh=true, generating fresh themes');
  
  try {
    const themeExtractionPrompt = `
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

    console.log('Sending theme extraction request to Grok API...');
    
    const messages = [
      {
        role: "system",
        content: "You are an expert dialogue analyst specializing in thematic analysis of conversations and transcripts."
      },
      {
        role: "user",
        content: themeExtractionPrompt
      }
    ];
    
    const result = await callGrokAPI(messages, {
      max_tokens: 3000,
      temperature: 0.2,
      ...options
    });
    
    // Cache the result
    setCacheResult('themes', text, result);
    
    console.log('Successfully extracted themes with Grok');
    return result;
  } catch (error) {
    console.error('Error in theme extraction:', error.message);
    throw error;
  }
};

// Summarize text function
exports.summarizeText = async (text, options = {}) => {
  if (!text || text.length < 50) {
    return "Text too short to summarize.";
  }
  
  // Check cache first
  const cachedResult = getCachedResult('summarize', text, options);
  if (cachedResult) {
    console.log('Using cached summary result');
    return cachedResult;
  }
  
  try {
    const summarizationPrompt = `
Please provide a comprehensive summary of the following dialogue transcript. Focus on:

1. Main topics discussed
2. Key insights and perspectives shared
3. Important decisions or conclusions reached
4. Any action items or next steps mentioned

Keep the summary clear, concise, and well-structured.

Transcript:
${text}
`;

    console.log('Sending summarization request to Grok API...');
    
    const messages = [
      {
        role: "system",
        content: "You are an expert at summarizing conversations and extracting key insights from dialogue transcripts."
      },
      {
        role: "user",
        content: summarizationPrompt
      }
    ];
    
    const result = await callGrokAPI(messages, {
      max_tokens: 2000,
      temperature: 0.2,
      ...options
    });
    
    // Cache the result
    setCacheResult('summarize', text, result);
    
    console.log('Successfully summarized text with Grok');
    return result;
  } catch (error) {
    console.error('Error in summarization:', error.message);
    throw error;
  }
};

// Format transcript function
exports.formatTranscript = async (text, options = {}) => {
  if (!text || text.length < 20) {
    return "Text too short to format.";
  }
  
  // Check cache first
  const cachedResult = getCachedResult('format', text, options);
  if (cachedResult) {
    console.log('Using cached format result');
    return cachedResult;
  }
  
  try {
    const formatPrompt = `
Please format the following transcript into a clear, structured conversation format. 

Requirements:
- Identify speakers clearly
- Clean up any transcription errors
- Organize the conversation flow logically
- Preserve the original meaning and content
- Use proper formatting with speaker names

Raw transcript:
${text}
`;

    console.log('Sending format request to Grok API...');
    
    const messages = [
      {
        role: "system",
        content: "You are an expert transcript formatter who specializes in cleaning up and structuring conversation transcripts."
      },
      {
        role: "user",
        content: formatPrompt
      }
    ];
    
    const result = await callGrokAPI(messages, {
      max_tokens: 2500,
      temperature: 0.1,
      ...options
    });
    
    // Cache the result
    setCacheResult('format', text, result);
    
    console.log('Successfully formatted transcript with Grok');
    return result;
  } catch (error) {
    console.error('Error in transcript formatting:', error.message);
    throw error;
  }
};

// Process chunk function for real-time processing
exports.processChunk = async (chunk, context = {}, options = {}) => {
  if (!chunk || chunk.length < 10) {
    return "Chunk too short to process.";
  }
  
  try {
    const processPrompt = `
Process this dialogue chunk in the context of an ongoing conversation:

Context: ${context.stage || 'general dialogue'}
Previous themes: ${context.themes || 'none established yet'}

Current chunk:
${chunk}

Provide:
1. Key points from this chunk
2. How it relates to previous themes
3. Any new themes emerging
4. Emotional tone or energy level
`;

    console.log('Sending chunk processing request to Grok API...');
    
    const messages = [
      {
        role: "system",
        content: "You are an expert at processing dialogue chunks in real-time, identifying themes and insights as conversations unfold."
      },
      {
        role: "user",
        content: processPrompt
      }
    ];
    
    const result = await callGrokAPI(messages, {
      max_tokens: 1000,
      temperature: 0.3,
      ...options
    });
    
    console.log('Successfully processed chunk with Grok');
    return result;
  } catch (error) {
    console.error('Error in chunk processing:', error.message);
    throw error;
  }
};

// Clear cache function
exports.clearCache = () => {
  cache.clear();
  console.log('Grok API cache cleared');
};

// Get cache stats
exports.getCacheStats = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}; 