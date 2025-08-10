/**
 * Enhanced Transcript Processing Service
 * Uses AI to significantly improve transcript accuracy, grammar, and formatting
 */

require('dotenv').config({ path: '../.env' });

// AI Service Configuration
const AI_SERVICES = {
  ANTHROPIC: {
    name: 'Claude',
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseUrl: 'https://api.anthropic.com/v1/messages',
    available: !!process.env.ANTHROPIC_API_KEY
  },
  OPENAI: {
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    available: !!process.env.OPENAI_API_KEY
  }
};

/**
 * Enhanced Transcript Processing with AI
 * Takes raw transcription and returns highly polished, accurate text
 */
class TranscriptEnhancer {
  constructor() {
    this.primaryService = this.selectPrimaryService();
    console.log(`🤖 Transcript Enhancer initialized with ${this.primaryService} as primary service`);
  }

  selectPrimaryService() {
    // Check available services
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    if (hasAnthropic) {
      console.log('🤖 Using Anthropic Claude for transcript enhancement');
      return 'ANTHROPIC';
    } else if (hasOpenAI) {
      console.log('🤖 Using OpenAI GPT for transcript enhancement');
      return 'OPENAI';
    } else {
      console.log('⚠️ No AI API keys configured - enhancement service will be disabled');
      console.log('💡 Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env file to enable AI enhancement');
      return null; // Allow startup without API keys
    }
  }

  /**
   * Main enhancement function - transforms raw transcript into polished text
   */
  async enhanceTranscript(rawTranscript, options = {}) {
    console.log(`🔄 Enhancing transcript: "${rawTranscript.substring(0, 100)}..."`);
    
    const enhancementOptions = {
      removeduplicates: true,
      improvePunctuation: true,
      fixGrammar: true,
      enhanceReadability: true,
      maintainSpeakerVoice: true,
      addParagraphs: true,
      ...options
    };

    try {
      const enhanced = await this.processWithAI(rawTranscript, enhancementOptions);
      console.log(`✅ Enhancement complete: "${enhanced.substring(0, 100)}..."`);
      
      return {
        success: true,
        original: rawTranscript,
        enhanced: enhanced,
        improvements: this.analyzeImprovements(rawTranscript, enhanced),
        service: this.primaryService,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Enhancement failed:', error);
      return {
        success: false,
        original: rawTranscript,
        enhanced: rawTranscript, // Fallback to original
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process transcript with AI service
   */
  async processWithAI(transcript, options) {
    const prompt = this.buildEnhancementPrompt(transcript, options);
    
    if (this.primaryService === 'ANTHROPIC') {
      return await this.processWithClaude(prompt);
    } else if (this.primaryService === 'OPENAI') {
      return await this.processWithOpenAI(prompt);
    }
    
    throw new Error('No available AI service');
  }

  /**
   * Build enhancement prompt for AI processing
   */
  buildEnhancementPrompt(transcript, options) {
    return `You are an expert transcript editor. Your task is to transform this speech-to-text transcript into highly accurate, well-formatted text while preserving the original meaning and conversational tone.

**Raw Transcript:**
"${transcript}"

**Enhancement Tasks:**
${options.removeduplicates ? '• Remove duplicate words and repeated phrases' : ''}
${options.improvePunctuation ? '• Add proper punctuation, capitalization, and formatting' : ''}
${options.fixGrammar ? '• Fix grammatical errors while maintaining natural speech patterns' : ''}
${options.enhanceReadability ? '• Improve readability and flow without changing meaning' : ''}
${options.maintainSpeakerVoice ? '• Preserve the speaker\'s voice and conversational style' : ''}
${options.addParagraphs ? '• Add paragraph breaks for better structure' : ''}

**Critical Requirements:**
- Maintain 100% accuracy to the original meaning
- Preserve all key information and context
- Keep the conversational tone natural
- Do not add information that wasn't spoken
- Fix obvious speech-to-text errors (homophones, context misunderstandings)
- Ensure proper sentence structure

**Output only the enhanced transcript - no explanations or metadata.**`;
  }

  /**
   * Process with Claude (Anthropic)
   */
  async processWithClaude(prompt) {
    const response = await fetch(AI_SERVICES.ANTHROPIC.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_SERVICES.ANTHROPIC.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  }

  /**
   * Process with OpenAI
   */
  async processWithOpenAI(prompt) {
    const response = await fetch(AI_SERVICES.OPENAI.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_SERVICES.OPENAI.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 4000,
        temperature: 0.1 // Low temperature for consistency
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  /**
   * Analyze improvements made to transcript
   */
  analyzeImprovements(original, enhanced) {
    const originalWords = original.split(/\s+/).length;
    const enhancedWords = enhanced.split(/\s+/).length;
    const duplicatesRemoved = this.countDuplicates(original) - this.countDuplicates(enhanced);
    
    return {
      originalLength: originalWords,
      enhancedLength: enhancedWords,
      duplicatesRemoved: duplicatesRemoved,
      compressionRatio: (enhancedWords / originalWords).toFixed(2),
      improvementScore: this.calculateImprovementScore(original, enhanced)
    };
  }

  /**
   * Count duplicate consecutive words
   */
  countDuplicates(text) {
    const words = text.toLowerCase().split(/\s+/);
    let duplicates = 0;
    
    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i-1]) {
        duplicates++;
      }
    }
    
    return duplicates;
  }

  /**
   * Calculate improvement score (0-100)
   */
  calculateImprovementScore(original, enhanced) {
    const factors = {
      duplicateReduction: Math.min(1, this.countDuplicates(original) / 10),
      lengthOptimization: Math.abs(1 - (enhanced.length / original.length)) < 0.2 ? 0.3 : 0,
      punctuationImprovement: (enhanced.match(/[.!?]/g) || []).length > (original.match(/[.!?]/g) || []).length ? 0.2 : 0,
      capitalizationImprovement: enhanced !== enhanced.toLowerCase() ? 0.2 : 0
    };
    
    const score = Object.values(factors).reduce((sum, val) => sum + val, 0) * 100;
    return Math.round(Math.min(100, score));
  }

  /**
   * Batch process multiple transcript segments
   */
  async enhanceMultipleSegments(segments, options = {}) {
    console.log(`🔄 Batch enhancing ${segments.length} transcript segments...`);
    
    const results = [];
    
    for (const segment of segments) {
      try {
        const enhanced = await this.enhanceTranscript(segment, options);
        results.push(enhanced);
        
        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Failed to enhance segment: ${segment.substring(0, 50)}...`, error);
        results.push({
          success: false,
          original: segment,
          enhanced: segment,
          error: error.message
        });
      }
    }
    
    console.log(`✅ Batch enhancement complete: ${results.filter(r => r.success).length}/${segments.length} successful`);
    return results;
  }
}

// Export singleton instance
const enhancer = new TranscriptEnhancer();

module.exports = {
  TranscriptEnhancer,
  enhancer,
  AI_SERVICES
}; 