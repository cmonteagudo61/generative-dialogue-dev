/**
 * Multi-Participant Speech Service
 * Handles individual participant streams for large-scale structured dialogues
 * Each participant gets their own transcription pipeline and personal tracking
 */

require('dotenv').config();
const { enhancer } = require('./enhanced-transcript-service');
const EventEmitter = require('events');

/**
 * Individual Participant Tracker
 * Tracks one person's dialogue journey across sessions
 */
class ParticipantTracker {
  constructor(participantId, participantInfo = {}) {
    this.participantId = participantId;
    this.participantInfo = {
      name: participantInfo.name || `Participant ${participantId}`,
      videoChannelId: participantInfo.videoChannelId,
      email: participantInfo.email,
      role: participantInfo.role,
      joinedAt: new Date().toISOString(),
      ...participantInfo
    };
    
    // Individual dialogue journey
    this.dialogueJourney = {
      sessions: [],
      totalContributions: 0,
      totalWords: 0,
      themes: new Set(),
      sentiments: [],
      keyInsights: [],
      evolutionTimeline: []
    };
    
    // Current session tracking
    this.currentSession = null;
    
    console.log(`👤 Participant Tracker initialized: ${this.participantInfo.name} (${participantId})`);
  }

  /**
   * Start a new dialogue session for this participant
   */
  startSession(sessionInfo = {}) {
    this.currentSession = {
      sessionId: sessionInfo.sessionId || `session_${Date.now()}`,
      topic: sessionInfo.topic,
      breakoutRoom: sessionInfo.breakoutRoom,
      startTime: new Date().toISOString(),
      contributions: [],
      wordCount: 0,
      aiCompanionInsights: [],
      ...sessionInfo
    };
    
    console.log(`🚀 Session started for ${this.participantInfo.name}: ${this.currentSession.sessionId}`);
    return this.currentSession.sessionId;
  }

  /**
   * Process raw speech from this participant
   */
  async processContribution(rawTranscript, metadata = {}) {
    if (!this.currentSession) {
      console.warn(`⚠️ No active session for ${this.participantInfo.name}, starting default session`);
      this.startSession({ topic: 'General Discussion' });
    }

    console.log(`🎤 Processing contribution from ${this.participantInfo.name}: "${rawTranscript.substring(0, 50)}..."`);

    try {
      // AI Enhancement - the "companion" witnessing their speech
      const enhanced = await enhancer.enhanceTranscript(rawTranscript);
      
      const contribution = {
        timestamp: new Date().toISOString(),
        rawTranscript: rawTranscript,
        enhancedTranscript: enhanced.enhanced,
        wordCount: enhanced.enhanced.split(' ').length,
        aiInsights: {
          improvementScore: enhanced.improvements?.improvementScore || 0,
          service: enhanced.service,
          themes: this.extractThemes(enhanced.enhanced),
          sentiment: this.analyzeSentiment(enhanced.enhanced),
          keyPoints: this.extractKeyPoints(enhanced.enhanced)
        },
        metadata: {
          audioQuality: metadata.audioQuality,
          backgroundNoise: metadata.backgroundNoise,
          ...metadata
        }
      };

      // Add to current session
      this.currentSession.contributions.push(contribution);
      this.currentSession.wordCount += contribution.wordCount;

      // Update overall journey
      this.dialogueJourney.totalContributions++;
      this.dialogueJourney.totalWords += contribution.wordCount;
      
      // Track themes across their journey
      contribution.aiInsights.themes.forEach(theme => 
        this.dialogueJourney.themes.add(theme)
      );

      console.log(`✅ Contribution processed for ${this.participantInfo.name}: ${contribution.wordCount} words, themes: ${contribution.aiInsights.themes.join(', ')}`);
      
      return contribution;

    } catch (error) {
      console.error(`❌ Error processing contribution for ${this.participantInfo.name}:`, error);
      return {
        timestamp: new Date().toISOString(),
        rawTranscript: rawTranscript,
        enhancedTranscript: rawTranscript, // Fallback
        error: error.message
      };
    }
  }

  /**
   * Simple theme extraction (can be enhanced with better NLP)
   */
  extractThemes(text) {
    const themes = [];
    const themeKeywords = {
      'climate': /climate|environment|carbon|emission|green|sustainable/i,
      'technology': /technology|AI|digital|innovation|automation/i,
      'community': /community|together|collective|collaboration|group/i,
      'education': /education|learning|teaching|school|knowledge/i,
      'health': /health|wellness|medical|care|treatment/i,
      'economy': /economy|financial|money|budget|cost|economic/i,
      'justice': /justice|fair|equal|rights|equity|inclusion/i
    };

    Object.entries(themeKeywords).forEach(([theme, regex]) => {
      if (regex.test(text)) themes.push(theme);
    });

    return themes.length > 0 ? themes : ['general'];
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(text) {
    const positiveWords = /good|great|excellent|amazing|positive|happy|excited|wonderful|fantastic|love|brilliant/gi;
    const negativeWords = /bad|terrible|awful|negative|sad|angry|frustrated|hate|difficult|problem|issue/gi;
    
    const positive = (text.match(positiveWords) || []).length;
    const negative = (text.match(negativeWords) || []).length;
    
    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  /**
   * Extract key points from contribution
   */
  extractKeyPoints(text) {
    // Simple extraction - look for sentences with key indicators
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyIndicators = /\b(important|key|crucial|essential|main|primary|significant|critical|vital)\b/i;
    
    return sentences
      .filter(sentence => keyIndicators.test(sentence))
      .map(sentence => sentence.trim())
      .slice(0, 3); // Max 3 key points
  }

  /**
   * Get participant's complete journey summary
   */
  getJourneySummary() {
    return {
      participantInfo: this.participantInfo,
      overallStats: {
        totalSessions: this.dialogueJourney.sessions.length,
        totalContributions: this.dialogueJourney.totalContributions,
        totalWords: this.dialogueJourney.totalWords,
        averageWordsPerContribution: Math.round(this.dialogueJourney.totalWords / (this.dialogueJourney.totalContributions || 1)),
        uniqueThemes: Array.from(this.dialogueJourney.themes),
        evolutionTimeline: this.dialogueJourney.evolutionTimeline
      },
      currentSession: this.currentSession ? {
        sessionId: this.currentSession.sessionId,
        topic: this.currentSession.topic,
        contributionsCount: this.currentSession.contributions.length,
        wordCount: this.currentSession.wordCount
      } : null
    };
  }
}

module.exports = {
  ParticipantTracker
};
