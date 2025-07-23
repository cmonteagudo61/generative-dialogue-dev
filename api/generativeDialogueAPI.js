const axios = require('axios');
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Create Anthropic API client
const anthropicAxios = axios.create({
  baseURL: ANTHROPIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'x-api-key': ANTHROPIC_API_KEY
  },
});

// Simple caching mechanism
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const getCachedResult = (operation, input, options = {}) => {
  // Extract options
  const { forceRefresh = false } = options;
  
  console.log(`generativeDialogueAPI getCachedResult for ${operation} with forceRefresh=${forceRefresh} (type: ${typeof forceRefresh})`);
  
  // IMPROVED: Handle both boolean true and string "true" values for forceRefresh
  const shouldForceRefresh = (
    forceRefresh === true || 
    forceRefresh === "true" || 
    String(forceRefresh) === "true"
  );
  
  // Absolutely return null if forceRefresh is true to skip cache
  if (shouldForceRefresh) {
    console.log(`🔥 generativeDialogueAPI: BYPASSING CACHE for ${operation} due to forceRefresh=${forceRefresh}`);
    
    // Also delete the cache entry if it exists
    const key = `${operation}-${Buffer.from(input).toString('base64').substring(0, 40)}`;
    if (cache.has(key)) {
      console.log(`🗑️ generativeDialogueAPI: Deleting existing cache entry for ${operation}`);
      cache.delete(key);
    }
    
    return null;
  }
  
  const key = `${operation}-${Buffer.from(input).toString('base64').substring(0, 40)}`;
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  // Check if cache entry is expired
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  console.log(`Cache hit for ${operation}`);
  return cached.data;
};

const setCacheResult = (operation, input, result) => {
  const key = `${operation}-${Buffer.from(input).toString('base64').substring(0, 40)}`;
  cache.set(key, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL
  });
  
  // Set expiration to automatically clear cache entry
  setTimeout(() => cache.delete(key), CACHE_TTL);
};

// Retry logic with delay
const retryWithDelay = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    console.log(`API error, retrying in ${delay}ms (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithDelay(fn, retries - 1, delay * 2);
  }
};

// Generate meta-summary from multiple breakout room summaries
exports.generateMetaSummary = async (summaries, stage, options = {}) => {
  // Don't process empty or very short summaries
  if (!summaries || summaries.length < 50) {
    return "Summaries too short to generate meta-summary.";
  }
  
  // FIXED: Extract and standardize forceRefresh parameter
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  console.log(`generateMetaSummary called with forceRefresh=${forceRefresh} (${typeof forceRefresh}), converted to: ${shouldForceRefresh}`);
  
  // Create a modified options object with the proper boolean value
  const modifiedOptions = {
    ...options,
    forceRefresh: shouldForceRefresh
  };
  
  // Check cache first, respecting forceRefresh
  const cacheKey = `meta-summary-${stage}-${summaries.substring(0, 100)}`;
  const cachedSummary = getCachedResult('meta-summary', cacheKey, modifiedOptions);
  if (cachedSummary) {
    return cachedSummary;
  }
  
  try {
    // Tailor prompt based on dialogue stage
    let prompt = "";
    
    switch (stage) {
      case 'connect':
        prompt = `
You are analyzing summaries from the CONNECT stage of a generative dialogue process. In this stage, participants formed initial connections by sharing personal stories and experiences.

Your task is to create a meta-summary that:
1. Identifies common themes across all breakout room summaries
2. Highlights the key personal experiences shared
3. Notes the emotional tone and quality of connection established
4. Identifies areas of shared values or experiences that emerged
5. Captures the essence of the human connection formed in this stage

Here are the summaries from the Connect stage breakout rooms:
${summaries}

Create a concise meta-summary that captures the essence of these connections.
`;
        break;
      
      case 'explore':
        prompt = `
You are analyzing summaries from the EXPLORE stage of a generative dialogue process. In this stage, participants explored differences in perspective and diverse viewpoints on the topic.

Your task is to create a meta-summary that:
1. Identifies the main areas of diverse perspectives
2. Highlights the key points of tension or disagreement
3. Notes areas where participants showed curiosity about different viewpoints
4. Identifies questions that emerged from the exploration of differences
5. Captures the complexity and nuance of the different positions

Here are the summaries from the Explore stage breakout rooms:
${summaries}

Create a concise meta-summary that honors the diversity of perspectives without trying to resolve tensions prematurely.
`;
        break;
      
      case 'discover':
        prompt = `
You are analyzing summaries from the DISCOVER stage of a generative dialogue process. In this stage, participants worked to find new shared meaning emerging from the tension of differences.

Your task is to create a meta-summary that:
1. Identifies new insights or understandings that emerged
2. Highlights any creative integration of previously opposing viewpoints
3. Notes any "aha moments" or breakthroughs in understanding
4. Captures emerging patterns of collective wisdom
5. Describes any potential new framing of the issue that transcends previous divisions

Here are the summaries from the Discover stage breakout rooms:
${summaries}

Create a concise meta-summary that captures the emergent collective insights.
`;
        break;
      
      case 'harvest':
        prompt = `
You are analyzing summaries from the HARVEST stage of a generative dialogue process. In this final stage, participants reflected on their learnings and identified potential actions or next steps.

Your task is to create a meta-summary that:
1. Identifies key learnings from the entire dialogue process
2. Highlights potential actions or next steps that emerged
3. Notes any commitments participants made individually or collectively
4. Captures the essence of transformation that occurred through the dialogue
5. Summarizes the "story" that is emerging from this community

Here are the summaries from the Harvest stage breakout rooms:
${summaries}

Create a concise meta-summary that captures both the learnings and the potential for action.
`;
        break;
      
      default:
        prompt = `
You are analyzing summaries from multiple breakout rooms in a generative dialogue process.

Your task is to create a meta-summary that:
1. Identifies common themes across all breakout room summaries
2. Highlights key insights that emerged
3. Notes areas of agreement and consensus
4. Identifies questions or areas requiring further exploration
5. Captures the essence of the collective wisdom from these discussions

Here are the summaries from the breakout rooms:
${summaries}

Create a concise meta-summary that captures the collective insights.
`;
    }

    console.log(`Sending meta-summary request to AI API for ${stage} stage...`);
    
    const response = await retryWithDelay(() => 
      anthropicAxios.post('', {
        messages: [{
          role: "user",
          content: prompt
        }],
        model: "claude-3-opus-20240229",
        max_tokens: 600,
        temperature: 0.3,
      })
    );
    
    const metaSummary = response.data.content[0].text;
    console.log('Successfully generated meta-summary');
    
    // Cache the result
    setCacheResult('meta-summary', cacheKey, metaSummary);
    
    return metaSummary;
  } catch (error) {
    console.error('Error generating meta-summary:', error.response ? error.response.data : error.message);
    return "Unable to generate meta-summary at this time. Please try again later.";
  }
};

// Extract top themes with percentages from summaries
exports.extractTopThemes = async (summaries, stageOrQuestion, options = {}) => {
  // Don't process empty or very short summaries
  if (!summaries || summaries.length < 50) {
    return [];
  }
  
  // FIXED: Extract and standardize forceRefresh parameter
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  console.log(`extractTopThemes called with forceRefresh=${forceRefresh} (${typeof forceRefresh}), converted to: ${shouldForceRefresh}`);
  
  // Create a modified options object with the proper boolean value
  const modifiedOptions = {
    ...options,
    forceRefresh: shouldForceRefresh
  };
  
  // Check cache first, respecting forceRefresh
  const cacheKey = `top-themes-${stageOrQuestion}-${summaries.substring(0, 100)}`;
  const cachedThemes = getCachedResult('top-themes', cacheKey, modifiedOptions);
  if (cachedThemes) {
    return cachedThemes;
  }
  
  try {
    const prompt = `
You are an expert in analyzing dialogue and extracting key themes. Analyze these summaries and identify the top 10 themes that appear.

For each theme:
1. Provide a short, clear description (5-10 words max)
2. Assign a percentage that represents how prevalent this theme was in the discussions (e.g., "95%" for a dominant theme)
3. Sort the themes by prevalence (highest percentage first)

Format your response as a JSON array with this exact structure, and nothing else:
[
  {"text": "Theme description", "count": number_of_mentions, "percentage": numeric_value_only},
  {"text": "Another theme", "count": number_of_mentions, "percentage": numeric_value_only}
]

Make sure:
- The "text" field contains only the theme description
- The "count" field is a numeric estimate of how many times this theme appeared
- The "percentage" field contains ONLY the numeric value (e.g., 95 not "95%")
- The percentages should sum to approximately 100
- Include exactly 10 themes

Summaries to analyze:
${summaries}
`;

    console.log(`Sending top themes extraction request to AI API...`);
    
    const response = await retryWithDelay(() => 
      anthropicAxios.post('', {
        messages: [{
          role: "user",
          content: prompt
        }],
        model: "claude-3-opus-20240229",
        max_tokens: 800,
        temperature: 0.2,
      })
    );
    
    const themesText = response.data.content[0].text;
    console.log('Raw themes response:', themesText);
    
    // Extract JSON array from the response
    const jsonMatch = themesText.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from the AI response');
    }
    
    const themesJson = jsonMatch[0];
    const themes = JSON.parse(themesJson);
    
    console.log('Successfully extracted top themes:', themes);
    
    // Cache the result
    setCacheResult('top-themes', cacheKey, themes);
    
    return themes;
  } catch (error) {
    console.error('Error extracting top themes:', error.response ? error.response.data : error.message);
    // Return a minimal default set of themes
    return [
      { text: "Error generating themes", count: 1, percentage: 100 }
    ];
  }
};

// Generate summary for harvest question responses
exports.generateHarvestSummary = async (responses, question, options = {}) => {
  // Don't process empty or very short responses
  if (!responses || responses.length < 50) {
    return "Responses too short to generate summary.";
  }
  
  // FIXED: Extract and standardize forceRefresh parameter
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  console.log(`generateHarvestSummary called with forceRefresh=${forceRefresh} (${typeof forceRefresh}), converted to: ${shouldForceRefresh}`);
  
  // Create a modified options object with the proper boolean value
  const modifiedOptions = {
    ...options,
    forceRefresh: shouldForceRefresh
  };
  
  // Check cache first, respecting forceRefresh
  const cacheKey = `harvest-${question}-${responses.substring(0, 100)}`;
  const cachedSummary = getCachedResult('harvest-summary', cacheKey, modifiedOptions);
  if (cachedSummary) {
    return cachedSummary;
  }
  
  try {
    const prompt = `
You are summarizing responses to a harvest question from a generative dialogue. The question was: "${question}"

Your task is to create a concise summary that:
1. Captures the diversity of responses
2. Identifies common patterns and key insights
3. Highlights unique perspectives
4. Presents the information in a clear, well-organized format

Here are all the responses to analyze:
${responses}

Create a concise, well-structured summary that captures the essence of these responses.
`;

    console.log(`Sending harvest summary request to AI API...`);
    
    const response = await retryWithDelay(() => 
      anthropicAxios.post('', {
        messages: [{
          role: "user",
          content: prompt
        }],
        model: "claude-3-opus-20240229",
        max_tokens: 600,
        temperature: 0.3,
      })
    );
    
    const summary = response.data.content[0].text;
    console.log('Successfully generated harvest summary');
    
    // Cache the result
    setCacheResult('harvest-summary', cacheKey, summary);
    
    return summary;
  } catch (error) {
    console.error('Error generating harvest summary:', error.response ? error.response.data : error.message);
    return "Unable to generate harvest summary at this time. Please try again later.";
  }
};

// Generate emerging story
exports.generateEmergingStory = async (title, description, stageSummaries, harvestSummaries, options = {}) => {
  // Validate input
  if (!stageSummaries || stageSummaries.length === 0 || !harvestSummaries || harvestSummaries.length === 0) {
    return "Insufficient data to generate an emerging story.";
  }
  
  // FIXED: Extract and standardize forceRefresh parameter
  const { forceRefresh = false } = options;
  const shouldForceRefresh = forceRefresh === true || forceRefresh === "true";
  
  console.log(`generateEmergingStory called with forceRefresh=${forceRefresh} (${typeof forceRefresh}), converted to: ${shouldForceRefresh}`);
  
  // Create a modified options object with the proper boolean value
  const modifiedOptions = {
    ...options,
    forceRefresh: shouldForceRefresh
  };
  
  // Create a cache key based on input summaries
  const stageString = stageSummaries.map(s => `${s.stage}:${s.summary.substring(0, 50)}`).join('|');
  const harvestString = harvestSummaries.map(h => `${h.question.substring(0, 20)}:${h.summary.substring(0, 50)}`).join('|');
  const cacheKey = `story-${title}-${stageString}-${harvestString}`;
  
  // Check cache first, respecting forceRefresh
  const cachedStory = getCachedResult('emerging-story', cacheKey, modifiedOptions);
  if (cachedStory) {
    return cachedStory;
  }
  
  try {
    // Format the summaries for inclusion in the prompt
    const stageSummariesText = stageSummaries.map(s => `
Stage: ${s.stage}
Summary: ${s.summary}
${s.themes && s.themes.length > 0 ? `Themes: ${s.themes.map(t => `${t.text} (${t.percentage}%)`).join(', ')}` : ''}
`).join('\n');

    const harvestSummariesText = harvestSummaries.map(h => `
Question: ${h.question}
Summary: ${h.summary}
${h.themes && h.themes.length > 0 ? `Themes: ${h.themes.map(t => `${t.text} (${t.percentage}%)`).join(', ')}` : ''}
`).join('\n');

    const prompt = `
You are tasked with creating an "Emerging Story" narrative based on a generative dialogue process on the topic: "${title}"

Background description of the dialogue:
${description}

This dialogue process went through several stages, and participants explored different aspects of the topic. Below are summaries from each stage and responses to harvest questions.

STAGE SUMMARIES:
${stageSummariesText}

HARVEST QUESTION SUMMARIES:
${harvestSummariesText}

Your task is to weave together an "Emerging Story" that:
1. Captures the journey of this community through the dialogue process
2. Identifies the transformation in understanding that occurred
3. Highlights new shared meaning that emerged from diverse perspectives
4. Points toward future possibilities for this community
5. Maintains a hopeful, generative tone while acknowledging complexity

Create a powerful narrative (500-700 words) titled "Our Emerging Story" that could be shared with all participants and inspire continued dialogue and action.
`;

    console.log(`Sending emerging story generation request to AI API...`);
    
    const response = await retryWithDelay(() => 
      anthropicAxios.post('', {
        messages: [{
          role: "user",
          content: prompt
        }],
        model: "claude-3-opus-20240229",
        max_tokens: 1200,
        temperature: 0.5,
      })
    );
    
    const story = response.data.content[0].text;
    console.log('Successfully generated emerging story');
    
    // Cache the result
    setCacheResult('emerging-story', cacheKey, story);
    
    return story;
  } catch (error) {
    console.error('Error generating emerging story:', error.response ? error.response.data : error.message);
    return "Unable to generate emerging story at this time. Please try again later.";
  }
};