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
};


