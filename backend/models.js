const { mongoose } = require('./db');

const SessionSchema = new mongoose.Schema({
  title: String,
  stage: { type: String, default: 'connect' },
  prompt: String,
}, { timestamps: true });

const BreakoutSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
  name: String,
  isOpen: { type: Boolean, default: false },
  size: Number,
}, { timestamps: true });

const SubmissionSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
  breakoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Breakout', index: true },
  text: String,
  enhancedText: String,
  summaryText: String,
  themesText: String,
  quotes: [String],
}, { timestamps: true });

const VoteSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
  breakoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Breakout', index: true },
  participantId: String,
  vote: { type: String, enum: ['up', 'down'], required: true },
}, { timestamps: true });

const ParticipantSchema = new mongoose.Schema({
  participantId: { type: String, unique: true, required: true },
  sessionId: { type: String, index: true }, // Changed to String for flexibility
  name: { type: String, required: true },
  email: String,
  organization: String,
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
  role: { type: String, enum: ['host', 'participant', 'observer'], default: 'participant' },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  connectionQuality: {
    audio: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
    video: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
    network: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' }
  },
  participationStats: {
    speakingTime: { type: Number, default: 0 }, // seconds
    contributions: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now }
  },
  // GROWTH TRACKING FOUNDATION
  journeyData: {
    totalSessions: { type: Number, default: 1 },
    firstSessionDate: { type: Date, default: Date.now },
    lastSessionDate: { type: Date, default: Date.now },
    engagementTrend: { type: String, enum: ['increasing', 'stable', 'decreasing'], default: 'stable' },
    contributionQuality: { type: Number, default: 1.0 }, // 0-5 scale
    collaborationStyle: { type: String, default: 'emerging' }, // emerging, supportive, catalytic, wise
    growthMoments: [{
      sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
      timestamp: Date,
      type: { type: String, enum: ['insight', 'breakthrough', 'connection', 'leadership'] },
      description: String,
      aiConfidence: { type: Number, default: 0.5 } // 0-1 scale
    }],
    personalInsights: [{
      sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
      insight: String,
      timestamp: { type: Date, default: Date.now }
    }]
  }
}, { timestamps: true });

// Contribution Analysis for Growth Tracking
const ContributionSchema = new mongoose.Schema({
  participantId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true }, // Changed to String for flexibility
  timestamp: { type: Date, default: Date.now },
  content: String, // The actual contribution text
  type: { type: String, enum: ['transcript', 'vote', 'edit', 'insight'], default: 'transcript' },
  
  // AI Analysis Results
  aiAnalysis: {
    sentiment: { type: Number, default: 0 }, // -1 to 1
    sophistication: { type: Number, default: 1 }, // 1-5 scale
    empathy: { type: Number, default: 1 }, // 1-5 scale
    creativity: { type: Number, default: 1 }, // 1-5 scale
    clarity: { type: Number, default: 1 }, // 1-5 scale
    buildingOnOthers: { type: Boolean, default: false },
    introducingNewIdeas: { type: Boolean, default: false },
    askingQuestions: { type: Boolean, default: false },
    synthesizing: { type: Boolean, default: false }
  },
  
  // Growth Indicators
  growthIndicators: {
    isBreakthrough: { type: Boolean, default: false },
    isInsightful: { type: Boolean, default: false },
    showsGrowth: { type: Boolean, default: false },
    helpedOthers: { type: Boolean, default: false }
  }
}, { timestamps: true });

const AggregateSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', unique: true },
  narrative: String,
  themesText: String,
  quotes: [String],
  votes: { up: Number, down: Number, total: Number },
}, { timestamps: true });

module.exports = {
  Session: mongoose.model('Session', SessionSchema),
  Breakout: mongoose.model('Breakout', BreakoutSchema),
  Submission: mongoose.model('Submission', SubmissionSchema),
  Vote: mongoose.model('Vote', VoteSchema),
  Aggregate: mongoose.model('Aggregate', AggregateSchema),
  Participant: mongoose.model('Participant', ParticipantSchema),
  Contribution: mongoose.model('Contribution', ContributionSchema),
};


