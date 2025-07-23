/**
 * Dialogue Synthesis API
 * 
 * This is the core revolutionary feature that enables GenerativeDialogue.AI
 * to synthesize collective wisdom from multiple breakout rooms in real-time.
 * 
 * Key Functions:
 * - Aggregate transcripts from multiple rooms
 * - Extract themes across all conversations
 * - Identify collective insights and patterns
 * - Generate real-time synthesis for large group reflection
 */

const aiAPI = require('./aiAPI');

class DialogueSynthesisService {
  constructor() {
    this.activeDialogues = new Map(); // dialogueId -> dialogue data
    this.roomTranscripts = new Map(); // roomId -> transcript data
    this.synthesisCache = new Map(); // dialogueId -> cached synthesis
    this.lastSynthesisTime = new Map(); // dialogueId -> timestamp
    
    // Synthesis configuration
    this.config = {
      minTranscriptLength: 100, // Minimum characters before synthesis
      synthesisInterval: 30000, // 30 seconds between auto-synthesis
      maxRoomsPerDialogue: 50, // Support for large scale dialogues
      themes: {
        minRooms: 2, // Minimum rooms needed for theme extraction
        confidenceThreshold: 0.7
      }
    };
  }

  /**
   * Initialize a new dialogue session
   * @param {string} dialogueId - Unique dialogue identifier
   * @param {Object} options - Dialogue configuration
   */
  async initializeDialogue(dialogueId, options = {}) {
    const dialogue = {
      id: dialogueId,
      stage: options.stage || 'connect', // connect, explore, discover, harvest
      title: options.title || 'Generative Dialogue',
      facilitator: options.facilitator || 'AI Facilitator',
      participants: options.participants || [],
      rooms: new Map(), // roomId -> room data
      createdAt: Date.now(),
      status: 'active',
      config: {
        ...this.config,
        ...options.config
      }
    };

    this.activeDialogues.set(dialogueId, dialogue);
    console.log(`Initialized dialogue: ${dialogueId} with ${options.participants?.length || 0} participants`);
    
    return dialogue;
  }

  /**
   * Add a breakout room to a dialogue
   * @param {string} dialogueId - Dialogue identifier
   * @param {string} roomId - Room identifier
   * @param {Object} roomData - Room configuration
   */
  async addRoom(dialogueId, roomId, roomData = {}) {
    const dialogue = this.activeDialogues.get(dialogueId);
    if (!dialogue) {
      throw new Error(`Dialogue ${dialogueId} not found`);
    }

    const room = {
      id: roomId,
      dialogueId,
      participants: roomData.participants || [],
      transcript: '',
      speakers: {},
      themes: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      status: 'active'
    };

    dialogue.rooms.set(roomId, room);
    this.roomTranscripts.set(roomId, { transcript: '', speakers: {} });
    
    console.log(`Added room ${roomId} to dialogue ${dialogueId}`);
    return room;
  }

  /**
   * Update transcript for a specific room
   * @param {string} roomId - Room identifier
   * @param {string} transcript - New transcript content
   * @param {Object} speakers - Speaker information
   */
  async updateRoomTranscript(roomId, transcript, speakers = {}) {
    const roomData = this.roomTranscripts.get(roomId);
    if (!roomData) {
      console.warn(`Room ${roomId} not found for transcript update`);
      return false;
    }

    // Update transcript and speakers
    roomData.transcript = transcript;
    roomData.speakers = speakers;
    roomData.lastUpdate = Date.now();

    // Find the dialogue and update room data
    for (const [dialogueId, dialogue] of this.activeDialogues) {
      const room = dialogue.rooms.get(roomId);
      if (room) {
        room.transcript = transcript;
        room.speakers = speakers;
        room.lastActivity = Date.now();
        
        // Trigger auto-synthesis if enough time has passed
        await this.checkAutoSynthesis(dialogueId);
        break;
      }
    }

    return true;
  }

  /**
   * Generate synthesis across all rooms in a dialogue
   * @param {string} dialogueId - Dialogue identifier
   * @param {Object} options - Synthesis options
   */
  async generateSynthesis(dialogueId, options = {}) {
    const dialogue = this.activeDialogues.get(dialogueId);
    if (!dialogue) {
      throw new Error(`Dialogue ${dialogueId} not found`);
    }

    const rooms = Array.from(dialogue.rooms.values());
    const activeRooms = rooms.filter(room => 
      room.transcript && room.transcript.length >= this.config.minTranscriptLength
    );

    if (activeRooms.length === 0) {
      return {
        dialogueId,
        synthesis: "No active conversations yet. Participants are still connecting...",
        themes: [],
        insights: [],
        roomCount: rooms.length,
        activeRoomCount: 0,
        timestamp: Date.now()
      };
    }

    console.log(`Generating synthesis for ${activeRooms.length} active rooms in dialogue ${dialogueId}`);

    try {
      // Extract themes from each room
      const roomThemes = await Promise.all(
        activeRooms.map(async (room) => {
          if (room.transcript.length < 50) return { roomId: room.id, themes: [] };
          
          try {
            const themes = await aiAPI.extractThemes(room.transcript, { 
              forceRefresh: options.forceRefresh 
            });
            return { roomId: room.id, themes, transcript: room.transcript };
          } catch (error) {
            console.error(`Error extracting themes for room ${room.id}:`, error);
            return { roomId: room.id, themes: "Error extracting themes", transcript: room.transcript };
          }
        })
      );

      // Generate collective synthesis
      const collectiveSynthesis = await this.generateCollectiveSynthesis(
        dialogueId, 
        roomThemes, 
        dialogue.stage,
        options
      );

      // Cache the synthesis
      this.synthesisCache.set(dialogueId, collectiveSynthesis);
      this.lastSynthesisTime.set(dialogueId, Date.now());

      return collectiveSynthesis;

    } catch (error) {
      console.error(`Error generating synthesis for dialogue ${dialogueId}:`, error);
      return {
        dialogueId,
        synthesis: `Error generating synthesis: ${error.message}`,
        themes: [],
        insights: [],
        roomCount: rooms.length,
        activeRoomCount: activeRooms.length,
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Generate collective synthesis from room themes
   * @private
   */
  async generateCollectiveSynthesis(dialogueId, roomThemes, stage, options = {}) {
    const dialogue = this.activeDialogues.get(dialogueId);
    const validRoomThemes = roomThemes.filter(rt => rt.themes && typeof rt.themes === 'string');

    if (validRoomThemes.length === 0) {
      return {
        dialogueId,
        synthesis: "Conversations are just beginning. The collective wisdom is still emerging...",
        themes: [],
        insights: [],
        roomCount: roomThemes.length,
        activeRoomCount: 0,
        timestamp: Date.now()
      };
    }

    // Create synthesis prompt based on dialogue stage
    const stagePrompts = {
      connect: "focus on how participants are introducing themselves, their backgrounds, and initial connections being formed",
      explore: "identify the key questions, challenges, and areas of curiosity that are emerging across conversations",
      discover: "highlight insights, breakthrough moments, and new understandings that are being discovered",
      harvest: "synthesize the key learnings, commitments, and next steps that participants are identifying"
    };

    const stageContext = stagePrompts[stage] || stagePrompts.explore;

    const synthesisPrompt = `
You are an AI facilitator witnessing a large-scale generative dialogue with ${validRoomThemes.length} active breakout rooms. 
Your role is to synthesize the collective wisdom emerging across all conversations.

DIALOGUE CONTEXT:
- Stage: ${stage.toUpperCase()} (${stageContext})
- Total Rooms: ${roomThemes.length}
- Active Conversations: ${validRoomThemes.length}
- Title: ${dialogue.title}

ROOM THEMES AND INSIGHTS:
${validRoomThemes.map((rt, index) => `
ROOM ${index + 1}:
${rt.themes}
`).join('\n')}

Please provide a synthesis that:
1. Identifies 3-5 major themes emerging across ALL rooms
2. Highlights surprising connections or patterns across conversations  
3. Notes areas of convergence where multiple rooms are exploring similar territory
4. Identifies unique insights that stand out from individual rooms
5. Suggests questions or directions that might benefit the whole group

Format your response as:

## Collective Themes Emerging
[3-5 major themes with brief descriptions]

## Cross-Room Patterns  
[Surprising connections and convergences]

## Unique Insights
[Standout discoveries from individual rooms]

## Questions for the Whole Group
[2-3 questions that could guide further dialogue]

Write in a warm, facilitative tone that honors the collective wisdom being generated.
`;

    try {
      const synthesis = await aiAPI.generateResponse(synthesisPrompt, {
        forceRefresh: options.forceRefresh,
        model: 'claude-3-sonnet' // Use a more capable model for synthesis
      });

      // Extract structured data from synthesis
      const themes = this.extractThemesFromSynthesis(synthesis);
      const insights = this.extractInsightsFromSynthesis(synthesis);

      return {
        dialogueId,
        synthesis,
        themes,
        insights,
        roomCount: roomThemes.length,
        activeRoomCount: validRoomThemes.length,
        stage,
        timestamp: Date.now(),
        roomThemes: validRoomThemes.map(rt => ({ roomId: rt.roomId, themes: rt.themes }))
      };

    } catch (error) {
      console.error('Error generating collective synthesis:', error);
      throw error;
    }
  }

  /**
   * Check if auto-synthesis should be triggered
   * @private
   */
  async checkAutoSynthesis(dialogueId) {
    const lastSynthesis = this.lastSynthesisTime.get(dialogueId) || 0;
    const now = Date.now();
    
    if (now - lastSynthesis > this.config.synthesisInterval) {
      console.log(`Triggering auto-synthesis for dialogue ${dialogueId}`);
      // Don't await - let it run in background
      this.generateSynthesis(dialogueId).catch(error => {
        console.error(`Auto-synthesis error for dialogue ${dialogueId}:`, error);
      });
    }
  }

  /**
   * Extract themes from synthesis text
   * @private
   */
  extractThemesFromSynthesis(synthesis) {
    const themes = [];
    const lines = synthesis.split('\n');
    let inThemesSection = false;

    for (const line of lines) {
      if (line.includes('Collective Themes') || line.includes('Major Themes')) {
        inThemesSection = true;
        continue;
      }
      if (line.startsWith('##') && inThemesSection) {
        inThemesSection = false;
        continue;
      }
      if (inThemesSection && line.trim().match(/^\d+\./)) {
        const theme = line.replace(/^\d+\.\s*/, '').trim();
        if (theme) themes.push(theme);
      }
    }

    return themes;
  }

  /**
   * Extract insights from synthesis text
   * @private
   */
  extractInsightsFromSynthesis(synthesis) {
    const insights = [];
    const lines = synthesis.split('\n');
    let inInsightsSection = false;

    for (const line of lines) {
      if (line.includes('Unique Insights') || line.includes('Key Insights')) {
        inInsightsSection = true;
        continue;
      }
      if (line.startsWith('##') && inInsightsSection) {
        inInsightsSection = false;
        continue;
      }
      if (inInsightsSection && line.trim().match(/^[-•*]\s/)) {
        const insight = line.replace(/^[-•*]\s*/, '').trim();
        if (insight) insights.push(insight);
      }
    }

    return insights;
  }

  /**
   * Get current synthesis for a dialogue
   */
  getCurrentSynthesis(dialogueId) {
    return this.synthesisCache.get(dialogueId);
  }

  /**
   * Get all active dialogues
   */
  getActiveDialogues() {
    return Array.from(this.activeDialogues.values());
  }

  /**
   * Get dialogue status
   */
  getDialogueStatus(dialogueId) {
    const dialogue = this.activeDialogues.get(dialogueId);
    if (!dialogue) return null;

    const rooms = Array.from(dialogue.rooms.values());
    const activeRooms = rooms.filter(room => 
      room.transcript && room.transcript.length >= this.config.minTranscriptLength
    );

    return {
      dialogueId,
      stage: dialogue.stage,
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      totalParticipants: dialogue.participants.length,
      lastSynthesis: this.lastSynthesisTime.get(dialogueId),
      status: dialogue.status
    };
  }

  /**
   * End a dialogue session
   */
  async endDialogue(dialogueId) {
    const dialogue = this.activeDialogues.get(dialogueId);
    if (!dialogue) return false;

    // Generate final synthesis
    const finalSynthesis = await this.generateSynthesis(dialogueId, { 
      forceRefresh: true,
      final: true 
    });

    // Clean up
    dialogue.status = 'completed';
    dialogue.endedAt = Date.now();
    dialogue.finalSynthesis = finalSynthesis;

    // Remove from active tracking but keep the data
    this.activeDialogues.delete(dialogueId);
    
    console.log(`Ended dialogue ${dialogueId}`);
    return finalSynthesis;
  }
}

// Create singleton instance
const dialogueSynthesisService = new DialogueSynthesisService();

module.exports = {
  DialogueSynthesisService,
  dialogueSynthesisService
}; 