/**
 * Dialogue Orchestrator - Manages multiple participant streams and generates collective wisdom
 */

require('dotenv').config();
const { ParticipantTracker } = require('./multi-participant-service');
const EventEmitter = require('events');

class DialogueOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.participants = new Map();
    this.breakoutRooms = new Map(); 
    this.globalSession = null;
    this.collectiveWisdom = {
      emergingThemes: new Map(),
      participantGrowth: [],
      crossRoomInsights: []
    };
    
    console.log('🌍 Dialogue Orchestrator initialized - ready for large-scale dialogues');
  }

  startGlobalSession(sessionInfo = {}) {
    this.globalSession = {
      sessionId: sessionInfo.sessionId || `global_${Date.now()}`,
      title: sessionInfo.title || 'Global Dialogue Session',
      topic: sessionInfo.topic,
      startTime: new Date().toISOString(),
      totalParticipants: 0,
      ...sessionInfo
    };

    console.log(`🌍 Global session started: ${this.globalSession.title} (${this.globalSession.sessionId})`);
    return this.globalSession.sessionId;
  }

  addParticipant(participantId, participantInfo = {}) {
    if (this.participants.has(participantId)) {
      console.warn(`⚠️ Participant ${participantId} already exists`);
      return this.participants.get(participantId);
    }

    const tracker = new ParticipantTracker(participantId, participantInfo);
    this.participants.set(participantId, tracker);

    if (this.globalSession) {
      this.globalSession.totalParticipants++;
    }

    console.log(`👤 Participant added: ${participantInfo.name || participantId} (Total: ${this.participants.size})`);
    return tracker;
  }

  createBreakoutRoom(roomId, roomInfo = {}) {
    const room = {
      roomId: roomId,
      topic: roomInfo.topic || 'Open Discussion',
      facilitator: roomInfo.facilitator,
      maxParticipants: roomInfo.maxParticipants || 8,
      participants: [],
      createdAt: new Date().toISOString(),
      aiCompanion: {
        insights: [],
        themeTracking: new Map(),
        participationBalance: {},
        conversationFlow: []
      },
      ...roomInfo
    };

    this.breakoutRooms.set(roomId, room);
    console.log(`🏠 Breakout room created: ${roomId} - "${room.topic}"`);
    return room;
  }

  assignToBreakoutRoom(participantId, roomId) {
    const participant = this.participants.get(participantId);
    const room = this.breakoutRooms.get(roomId);

    if (!participant || !room) {
      throw new Error(`Participant ${participantId} or room ${roomId} not found`);
    }

    room.participants.push(participantId);
    participant.startSession({
      sessionId: `${roomId}_${Date.now()}`,
      topic: room.topic,
      breakoutRoom: roomId,
      globalSession: this.globalSession?.sessionId
    });

    console.log(`🏠 ${participant.participantInfo.name} assigned to room ${roomId}`);
    return room;
  }

  async processParticipantSpeech(participantId, rawTranscript, metadata = {}) {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    const contribution = await participant.processContribution(rawTranscript, metadata);
    
    // Update collective wisdom
    contribution.aiInsights.themes.forEach(theme => {
      const count = this.collectiveWisdom.emergingThemes.get(theme) || 0;
      this.collectiveWisdom.emergingThemes.set(theme, count + 1);
    });

    return {
      contribution,
      personalGrowth: participant.getJourneySummary().overallStats
    };
  }

  getCurrentStateSummary() {
    const activeParticipants = Array.from(this.participants.values())
      .filter(p => p.currentSession);
    
    const topThemes = Array.from(this.collectiveWisdom.emergingThemes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const roomSummaries = Array.from(this.breakoutRooms.values()).map(room => ({
      roomId: room.roomId,
      topic: room.topic,
      participantCount: room.participants.length,
      latestInsight: room.aiCompanion.insights.slice(-1)[0]?.summary || 'Building insights...'
    }));

    return {
      globalSession: this.globalSession,
      totalParticipants: this.participants.size,
      activeParticipants: activeParticipants.length,
      breakoutRooms: roomSummaries,
      emergingThemes: topThemes.map(([theme, count]) => ({ theme, count })),
      latestCollectiveInsight: 'Collective wisdom emerging from all voices...',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  DialogueOrchestrator
};
