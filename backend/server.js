/**
 * Advanced Speech Recognition and AI Processing Server
 * Integrated with Grok, Claude, OpenAI, and Deepgram
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const WebSocket = require('ws');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Import AI Enhancement Service
const { enhancer, AI_SERVICES } = require('./enhanced-transcript-service');

// Import AI APIs from backend-local api directory
const grokAPI = require('./api/grokAPI');
const anthropicAPI = require('./api/aiAPI');
const openaiAPI = require('./api/openaiAPI');

const app = express();

// Global error handlers to prevent WebSocket crashes
process.on('uncaughtException', (err) => {
  if (err.code === 'WS_ERR_INVALID_CLOSE_CODE' || err.message.includes('Invalid WebSocket frame')) {
    console.warn('⚠️ WebSocket frame error handled:', err.message);
    return; // Don't crash the server
  }
  console.error('💥 Uncaught Exception:', err);
  // For other errors, still exit
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

const { connectMongo, isDbReady, mongoose } = require('./db');
const { Submission, Vote, Participant, Session, Breakout, Contribution } = require('./models');
const expressWs = require('express-ws')(app);
const PORT = process.env.PORT || 8080;
const API_KEY = process.env.DEEPGRAM_API_KEY;

console.log(`🚀 Advanced AI Speech Processing Server starting...`);
(async () => { await connectMongo(); })();
console.log(`📍 Port: ${PORT}`);
console.log(`🔑 Deepgram API: ${API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`🤖 Grok API: ${process.env.X_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`🤖 Claude API: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);

// Trust proxy (required for some platforms/load balancers)
app.set('trust proxy', 1);

// Security, compression, logging
app.use(helmet({
  contentSecurityPolicy: false // keep simple for dev; can be tightened later
}));
app.use(compression());
// Morgan logging with health check filtering
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: function (req, res) {
    // Skip logging for health check requests to reduce noise
    return req.url === '/health';
  }
}));

// CORS: permissive in dev; restricted by ALLOWED_ORIGINS in prod
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: allowedOrigins.length ? allowedOrigins : false, credentials: true }
  : { origin: true, credentials: true };
app.use(cors(corsOptions));

// JSON body size limit
app.use(express.json({ limit: '1mb' }));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// PRIORITY: In production, serve the client build (single-origin app) FIRST
const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
}

// Serve backend static (test pages) ONLY for specific paths to avoid conflicts
app.use('/backend-tests', express.static(__dirname));
// Serve backend test pages explicitly when present
app.get('/test-format.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-format.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    deepgram: API_KEY ? 'configured' : 'missing',
    grok: process.env.X_API_KEY ? 'configured' : 'missing',
    claude: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    mongo: isDbReady() ? 'connected' : (process.env.MONGODB_URI ? 'connecting/failed' : 'not-configured')
  });
});

// Basic API rate limiting
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 }); // 120 req/min
app.use('/api', apiLimiter);

// --- Minimal session bus websocket (host broadcasts stage/page to participants) ---
const wss = expressWs.getWss('/session-bus');
const busClients = new Map(); // ws -> { sessionId, breakoutId, role }

app.ws('/session-bus', (ws, req) => {
  busClients.set(ws, { sessionId: null, breakoutId: null, role: 'participant' });
  // Avoid process crash on malformed close frames or other ws errors
  ws.on('error', (err) => {
    try {
      console.warn('⚠️ session-bus websocket error:', err && (err.code || err.message) || err);
    } catch (_) {}
  });
  // Lightweight heartbeat to keep connections fresh and prune dead sockets
  try {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  } catch (_) {}
  const pingInterval = setInterval(() => {
    try {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch (_) {}
        return;
      }
      ws.isAlive = false;
      try { ws.ping(); } catch (_) {}
    } catch (_) {}
  }, 30000);
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'join') {
        busClients.set(ws, { sessionId: data.sessionId || null, breakoutId: data.breakoutId || null, role: data.role || 'participant' });
        // Send current vote tallies immediately so UI is in sync on join
        (async () => {
          try {
            const sid = data.sessionId;
            const bid = data.breakoutId;
            if (!sid || !bid) return;
            let up = 0, down = 0;
            if (isDbReady()) {
              const sidQ = mongoose.Types.ObjectId.isValid(sid) ? new mongoose.Types.ObjectId(sid) : sid;
              const bidQ = mongoose.Types.ObjectId.isValid(bid) ? new mongoose.Types.ObjectId(bid) : bid;
              const tallies = await Vote.aggregate([
                { $match: { sessionId: sidQ, breakoutId: bidQ } },
                { $group: { _id: '$vote', count: { $sum: 1 } } }
              ]);
              up = tallies.find(t => t._id === 'up')?.count || 0;
              down = tallies.find(t => t._id === 'down')?.count || 0;
            } else {
              const bucket = getBreakoutBucket(sid, bid);
              up = bucket.votes.filter(v => v.vote === 'up').length;
              down = bucket.votes.filter(v => v.vote === 'down').length;
            }
            const payload = { type: 'voteTallies', tallies: { up, down, total: up + down } };
            try { ws.send(JSON.stringify(payload)); } catch (_) {}
          } catch (_) {}
        })();
      } else if (data.type === 'stage') {
        // host broadcast to all in same session
        const info = busClients.get(ws) || {};
        if (info.role === 'host' && info.sessionId) {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              const ci = busClients.get(client);
              if (ci && ci.sessionId === info.sessionId) {
                try { client.send(JSON.stringify({ type: 'stage', page: data.page })); } catch (_) {}
              }
            }
          });
        }
      } else if (data.type === 'transcript') {
        // host broadcasts final transcript lines to participants in same session
        const info = busClients.get(ws) || {};
        if (info.role === 'host' && info.sessionId && typeof data.text === 'string') {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              const ci = busClients.get(client);
              if (ci && ci.sessionId === info.sessionId) {
                try { client.send(JSON.stringify({ type: 'transcript', text: data.text, isFinal: !!data.isFinal })); } catch (_) {}
              }
            }
          });
        }
      } else if (data.type === 'ai') {
        // host broadcasts AI-processed payload so participants mirror enhanced/summary/themes
        const info = busClients.get(ws) || {};
        if (info.role === 'host' && info.sessionId) {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              const ci = busClients.get(client);
              if (ci && ci.sessionId === info.sessionId) {
                try { client.send(JSON.stringify({ type: 'ai', enhancedText: data.enhancedText || '', summaryText: data.summaryText || '', themesText: data.themesText || '', service: data.service || '' })); } catch (_) {}
              }
            }
          });
        }
      } else if (data.type === 'voting') {
        // host toggles voting open/close for session
        const info = busClients.get(ws) || {};
        if (info.role === 'host' && info.sessionId) {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              const ci = busClients.get(client);
              if (ci && ci.sessionId === info.sessionId) {
                try { client.send(JSON.stringify({ type: 'voting', open: !!data.open })); } catch (_) {}
              }
            }
          });
        }
      }
      } catch (e) { /* ignore malformed messages */ }
  });
  ws.on('close', () => { busClients.delete(ws); try { clearInterval(pingInterval); } catch (_) {} });
});

// ----- Minimal session and breakout creation (DB-first, fallback to memory) -----
app.post('/api/session', async (req, res) => {
  try {
    const { title, prompt } = req.body || {};
    if (isDbReady()) {
      // Lazy import to avoid model load before connection
      const { Session } = require('./models');
      const s = await Session.create({ title: title || 'Dialogue Session', prompt: prompt || '' });
      return res.json({ ok: true, sessionId: String(s._id) });
    } else {
      // Create a memory session bucket
      const sessionId = `mem-${Date.now()}`;
      if (!sessionStore[sessionId]) sessionStore[sessionId] = { breakouts: {}, meta: { title, prompt } };
      return res.json({ ok: true, sessionId });
    }
  } catch (err) {
    console.error('❌ Create session error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/session/:sessionId/breakout', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name, size } = req.body || {};
    if (isDbReady()) {
      const { Breakout } = require('./models');
      const b = await Breakout.create({ sessionId, name: name || 'Breakout', size: size || 0, isOpen: false });
      return res.json({ ok: true, breakoutId: String(b._id) });
    } else {
      const breakoutId = `mem-b-${Date.now()}`;
      const bucket = getBreakoutBucket(sessionId, breakoutId); // ensures exists
      sessionStore[sessionId].breakouts[breakoutId].info = { name: name || 'Breakout', size: size || 0, isOpen: false };
      return res.json({ ok: true, breakoutId });
    }
  } catch (err) {
    console.error('❌ Create breakout error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// AI Processing Endpoints
app.post('/api/ai/format', async (req, res) => {
  try {
    const { transcript, options } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }

    // Prefer the enhanced transcript service (Claude/OpenAI) for real value add
    let enhancedText = null;
    let enhancementMeta = null;
    try {
      console.log('🔄 Enhancing transcript with AI enhancer...');
      const enhanced = await enhancer.enhanceTranscript(transcript, options || {});
      if (enhanced?.success) {
        enhancedText = enhanced.enhanced;
        enhancementMeta = {
          service: enhanced.service?.toLowerCase() || 'enhancer',
          improvements: enhanced.improvements,
          timestamp: enhanced.timestamp
        };
      } else {
        console.warn('⚠️ Enhancer returned unsuccessful result');
      }
    } catch (enhanceErr) {
      console.warn('⚠️ Enhancer failed:', enhanceErr?.message);
    }

    // In parallel, compute optional value-add: summary and themes (best-effort)
    let summaryText = null;
    let themesText = null;
    try {
      const shouldDoExtras = (transcript?.length || 0) > 80;
      if (shouldDoExtras) {
        console.log('🧠 Generating value-add: summary and themes...');
        const [summaryRes, themesRes] = await Promise.allSettled([
          grokAPI.summarizeText(transcript),
          grokAPI.extractThemes(transcript)
        ]);
        if (summaryRes.status === 'fulfilled') summaryText = summaryRes.value;
        if (themesRes.status === 'fulfilled') themesText = themesRes.value;
      }
    } catch (extrasErr) {
      console.warn('⚠️ Extras generation failed:', extrasErr?.message);
    }

    // If no enhanced text yet, fallback to Grok formatter
    if (!enhancedText) {
      console.log('🔄 Using Grok formatter as base text...');
      try {
        enhancedText = await grokAPI.formatTranscript(transcript);
        enhancementMeta = { service: 'grok' };
      } catch (fallbackErr) {
        console.error('❌ Grok formatter failed:', fallbackErr?.message);
        // Last resort: return original transcript wrapped minimally
        enhancedText = transcript;
        enhancementMeta = { service: 'raw' };
      }
    }

    // Compose a single formatted payload with clear value-add sections
    const sections = [];
    sections.push('Cleaned Transcript:\n' + enhancedText.trim());
    if (summaryText) {
      sections.push('Highlights (Concise):\n\n' + summaryText.trim());
    }
    if (themesText) {
      sections.push('Top Themes (Auto-Extracted):\n\n' + themesText.trim());
    }
    const combined = sections.join('\n\n');

    return res.json({
      formatted: combined,
      enhancedText: enhancedText || transcript,
      summaryText: summaryText || null,
      themesText: themesText || null,
      ...enhancementMeta
    });
  } catch (error) {
    console.error('❌ Format error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Simple in-memory session store for submissions and votes -----
const sessionStore = {
  // [sessionId]: {
  //   breakouts: {
  //     [breakoutId]: {
  //       submissions: [ { text, enhancedText, summaryText, themesText, quotes, timestamp } ],
  //       votes: [ { participantId, vote, timestamp } ]
  //     }
  //   }
  // }
};

function getBreakoutBucket(sessionId, breakoutId) {
  if (!sessionStore[sessionId]) sessionStore[sessionId] = { breakouts: {} };
  if (!sessionStore[sessionId].breakouts[breakoutId]) {
    sessionStore[sessionId].breakouts[breakoutId] = { submissions: [], votes: [] };
  }
  return sessionStore[sessionId].breakouts[breakoutId];
}

// Submit edited/approved content for a breakout
app.post('/api/session/:sessionId/breakout/:breakoutId/submit', async (req, res) => {
  try {
    const { sessionId, breakoutId } = req.params;
    const { text, enhancedText, summaryText, themesText, quotes } = req.body || {};
    if (!text && !enhancedText && !summaryText && !themesText) {
      return res.status(400).json({ error: 'At least one of text/enhancedText/summaryText/themesText is required' });
    }
    if (isDbReady()) {
      const doc = await Submission.create({
        sessionId,
        breakoutId,
        text: text || null,
        enhancedText: enhancedText || null,
        summaryText: summaryText || null,
        themesText: themesText || null,
        quotes: Array.isArray(quotes) ? quotes : [],
      });
      return res.json({ ok: true, id: doc._id });
    } else {
      const bucket = getBreakoutBucket(sessionId, breakoutId);
      bucket.submissions.push({
        text: text || null,
        enhancedText: enhancedText || null,
        summaryText: summaryText || null,
        themesText: themesText || null,
        quotes: Array.isArray(quotes) ? quotes : [],
        timestamp: Date.now()
      });
      return res.json({ ok: true, submissions: bucket.submissions.length });
    }
  } catch (err) {
    console.error('❌ Submit error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Record a vote on a breakout summary (up/down)
app.post('/api/session/:sessionId/breakout/:breakoutId/vote', async (req, res) => {
  try {
    const { sessionId, breakoutId } = req.params;
    const { participantId, vote } = req.body || {};
    if (!vote || !['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be "up" or "down"' });
    }
    if (isDbReady()) {
      const sid = mongoose.Types.ObjectId.isValid(sessionId) ? new mongoose.Types.ObjectId(sessionId) : sessionId;
      const bid = mongoose.Types.ObjectId.isValid(breakoutId) ? new mongoose.Types.ObjectId(breakoutId) : breakoutId;
      
      // Implement one vote per person: upsert (update existing or create new)
      const filter = { sessionId: sid, breakoutId: bid, participantId: participantId || null };
      await Vote.findOneAndUpdate(filter, { vote }, { upsert: true, new: true });
      const tallies = await Vote.aggregate([
        { $match: { sessionId: sid, breakoutId: bid } },
        { $group: { _id: '$vote', count: { $sum: 1 } } }
      ]);
      const up = tallies.find(t => t._id === 'up')?.count || 0;
      const down = tallies.find(t => t._id === 'down')?.count || 0;
      // Broadcast new tallies to all clients in session so UIs refresh immediately
      try {
        const infoSession = sid;
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            const ci = busClients.get(client);
            if (ci && String(ci.sessionId) === String(infoSession)) {
              try { client.send(JSON.stringify({ type: 'voteTallies', tallies: { up, down, total: up + down } })); } catch (_) {}
            }
          }
        });
      } catch (_) {}
      return res.json({ ok: true, tallies: { up, down, total: up + down } });
    } else {
      const bucket = getBreakoutBucket(sessionId, breakoutId);
      
      // Implement one vote per person: remove existing vote from same participant, then add new vote
      const existingIndex = bucket.votes.findIndex(v => v.participantId === (participantId || null));
      if (existingIndex !== -1) {
        bucket.votes.splice(existingIndex, 1); // Remove existing vote
      }
      bucket.votes.push({ participantId: participantId || null, vote, timestamp: Date.now() });
      const up = bucket.votes.filter(v => v.vote === 'up').length;
      const down = bucket.votes.filter(v => v.vote === 'down').length;
      try {
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            const ci = busClients.get(client);
            if (ci && ci.sessionId === sessionId) {
              try { client.send(JSON.stringify({ type: 'voteTallies', tallies: { up, down, total: up + down } })); } catch (_) {}
            }
          }
        });
      } catch (_) {}
      return res.json({ ok: true, tallies: { up, down, total: up + down } });
    }
  } catch (err) {
    console.error('❌ Vote error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Aggregate across all breakouts in a session to produce WE meta view
app.get('/api/session/:sessionId/aggregate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    let allTexts = [];
    let allQuotes = [];
    let up = 0, down = 0;
    if (isDbReady()) {
      const sid = mongoose.Types.ObjectId.isValid(sessionId) ? new mongoose.Types.ObjectId(sessionId) : sessionId;
      const subs = await Submission.find({ sessionId: sid }).select('enhancedText text quotes').lean();
      subs.forEach(s => {
        if (s.enhancedText) allTexts.push(s.enhancedText);
        else if (s.text) allTexts.push(s.text);
        if (Array.isArray(s.quotes)) allQuotes.push(...s.quotes);
      });
      const tallies = await Vote.aggregate([
        { $match: { sessionId: sid } },
        { $group: { _id: '$vote', count: { $sum: 1 } } }
      ]);
      up = tallies.find(t => t._id === 'up')?.count || 0;
      down = tallies.find(t => t._id === 'down')?.count || 0;
    } else {
      const session = sessionStore[sessionId];
      if (!session) {
        return res.json({ sessionId, meta: { narrative: '', themesText: '', quotes: [], votes: { up: 0, down: 0, total: 0 } } });
      }
      const allBreakouts = Object.values(session.breakouts || {});
      const voteAgg = { up: 0, down: 0 };
      for (const b of allBreakouts) {
        for (const s of b.submissions) {
          if (s.enhancedText) allTexts.push(s.enhancedText);
          else if (s.text) allTexts.push(s.text);
          if (Array.isArray(s.quotes)) allQuotes.push(...s.quotes);
        }
        for (const v of b.votes) { if (v.vote === 'up') voteAgg.up++; else if (v.vote === 'down') voteAgg.down++; }
      }
      up = voteAgg.up; down = voteAgg.down;
    }
    const combinedText = allTexts.join('\n\n');
    let metaNarrative = '';
    let metaThemesText = '';
    if (combinedText.trim().length > 0) {
      try {
        // Reuse the formatter to produce a meta narrative and themes
        const resp = await fetch(`http://localhost:${process.env.PORT || 5680}/api/ai/format`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: combinedText })
        });
        if (resp.ok) {
          const data = await resp.json();
          metaNarrative = data.enhancedText || '';
          metaThemesText = data.themesText || '';
        }
      } catch (err) {
        console.warn('⚠️ Meta aggregation format failed:', err?.message);
      }
    }
    const total = up + down;
    const quotes = allQuotes.slice(-10);
    return res.json({
      sessionId,
      meta: {
        narrative: metaNarrative,
        themesText: metaThemesText,
        quotes,
        votes: { up, down, total }
      }
    });
  } catch (err) {
    console.error('❌ Aggregate error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }
    
    console.log('🔄 Processing transcript summary with Grok...');
    const result = await grokAPI.summarizeText(transcript);
    res.json({ summary: result, service: 'grok' });
  } catch (error) {
    console.error('❌ Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/themes', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }
    
    console.log('🔄 Processing theme extraction with Grok...');
    const result = await grokAPI.extractThemes(transcript);
    res.json({ themes: result, service: 'grok' });
  } catch (error) {
    console.error('❌ Theme extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== DAILY.CO VIDEO ROOM ENDPOINTS ====================

// Create a Daily.co room for a session
app.post('/api/daily/create-room', async (req, res) => {
  try {
    const { sessionCode, hostName, participantCount } = req.body;
    
    if (!sessionCode) {
      return res.status(400).json({ error: 'Session code is required' });
    }
    
    console.log(`🎥 Creating Daily.co room for session: ${sessionCode}`);
    
    // Daily.co API configuration
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      console.warn('⚠️ DAILY_API_KEY not found, creating mock room for development');
      // Return a mock room for development/testing
      const mockRoom = {
        url: `https://generative-dialogue.daily.co/${sessionCode.toLowerCase()}`,
        name: `session-${sessionCode.toLowerCase()}`,
        id: `mock-${sessionCode}`,
        created_at: new Date().toISOString(),
        config: {
          max_participants: 6,
          enable_transcription: true,
          enable_recording: false
        }
      };
      
      return res.json({
        success: true,
        room: mockRoom,
        message: 'Mock room created for development'
      });
    }
    
    // Create actual Daily.co room
    const roomConfig = {
      name: `session-${sessionCode.toLowerCase()}`,
      privacy: 'public', // Can be joined with URL
      properties: {
        max_participants: 6,
        enable_transcription: true,
        enable_recording: false,
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
        owner_only_broadcast: false,
        exp: Math.floor(Date.now() / 1000) + (90 * 60) // Expire in 90 minutes
      }
    };
    
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roomConfig)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Daily.co API error:', response.status, errorData);
      throw new Error(`Daily.co API error: ${response.status}`);
    }
    
    const roomData = await response.json();
    console.log(`✅ Daily.co room created: ${roomData.url}`);
    
    res.json({
      success: true,
      room: roomData,
      message: 'Daily.co room created successfully'
    });
    
  } catch (error) {
    console.error('❌ Daily.co room creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create Daily.co room',
      details: error.message 
    });
  }
});

// Get Daily.co room info
app.get('/api/daily/room/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      return res.json({
        success: true,
        room: {
          url: `https://generative-dialogue.daily.co/${roomName}`,
          name: roomName,
          id: `mock-${roomName}`,
          config: { max_participants: 6, enable_transcription: true }
        },
        message: 'Mock room info for development'
      });
    }
    
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Daily.co API error: ${response.status}`);
    }
    
    const roomData = await response.json();
    res.json({
      success: true,
      room: roomData
    });
    
  } catch (error) {
    console.error('❌ Daily.co room fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Daily.co room info',
      details: error.message 
    });
  }
});

// Delete Daily.co room (cleanup)
app.delete('/api/daily/room/:roomName', async (req, res) => {
  try {
    const { roomName } = req.params;
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      return res.json({
        success: true,
        message: 'Mock room deleted for development'
      });
    }
    
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Daily.co API error: ${response.status}`);
    }
    
    console.log(`🗑️ Daily.co room deleted: ${roomName}`);
    res.json({
      success: true,
      message: 'Daily.co room deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Daily.co room deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete Daily.co room',
      details: error.message 
    });
  }
});

// ==================== PARTICIPANT MANAGEMENT ENDPOINTS ====================

// Register a new participant
app.post('/api/participants/register', async (req, res) => {
  try {
    const { participantId, sessionId, name, email, organization, deviceType, role } = req.body;
    
    if (!participantId || !name) {
      return res.status(400).json({ error: 'participantId and name are required' });
    }

    const participantData = {
      participantId,
      sessionId: sessionId ? (mongoose.Types.ObjectId.isValid(sessionId) ? new mongoose.Types.ObjectId(sessionId) : sessionId) : null,
      name: name.trim(),
      email: email?.trim() || '',
      organization: organization?.trim() || '',
      deviceType: deviceType || 'desktop',
      role: role || 'participant',
      isActive: true,
      lastSeen: new Date(),
      participationStats: {
        joinedAt: new Date()
      }
    };

    if (isDbReady()) {
      // Try to update existing participant or create new one
      const participant = await Participant.findOneAndUpdate(
        { participantId },
        participantData,
        { upsert: true, new: true }
      );
      console.log(`👤 Participant registered: ${name} (${participantId})`);
      
      // Broadcast to dashboard
      if (global.broadcastToDashboard) {
        global.broadcastToDashboard({
          type: 'participant-joined',
          participant: {
            name: participant.name,
            deviceType: participant.deviceType,
            role: participant.role
          }
        }, sessionId);
      }
      
      res.json({ success: true, participant });
    } else {
      // In-memory fallback
      console.log(`👤 Participant registered (in-memory): ${name} (${participantId})`);
      res.json({ success: true, participant: participantData });
    }
  } catch (error) {
    console.error('❌ Participant registration error:', error);
    res.status(500).json({ error: 'Failed to register participant' });
  }
});

// Get all participants for a session
app.get('/api/session/:sessionId/participants', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (isDbReady()) {
      const sid = mongoose.Types.ObjectId.isValid(sessionId) ? new mongoose.Types.ObjectId(sessionId) : sessionId;
      const participants = await Participant.find({ sessionId: sid, isActive: true })
        .select('-__v')
        .sort({ 'participationStats.joinedAt': 1 });
      
      res.json({ participants });
    } else {
      // In-memory fallback - would need to implement session storage
      res.json({ participants: [] });
    }
  } catch (error) {
    console.error('❌ Get participants error:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// Update participant status (heartbeat/activity)
app.post('/api/participants/:participantId/heartbeat', async (req, res) => {
  try {
    const { participantId } = req.params;
    const { connectionQuality, isActive = true } = req.body;
    
    const updateData = {
      lastSeen: new Date(),
      isActive
    };
    
    if (connectionQuality) {
      updateData.connectionQuality = connectionQuality;
    }

    if (isDbReady()) {
      const participant = await Participant.findOneAndUpdate(
        { participantId },
        updateData,
        { new: true }
      );
      
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      
      res.json({ success: true, participant });
    } else {
      // In-memory fallback
      res.json({ success: true });
    }
  } catch (error) {
    console.error('❌ Participant heartbeat error:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
});

// Update participant stats (speaking time, contributions, etc.)
app.post('/api/participants/:participantId/stats', async (req, res) => {
  try {
    const { participantId } = req.params;
    const { speakingTime, contributions, votes } = req.body;
    
    if (isDbReady()) {
      const updateData = {};
      if (typeof speakingTime === 'number') updateData['participationStats.speakingTime'] = speakingTime;
      if (typeof contributions === 'number') updateData['participationStats.contributions'] = contributions;
      if (typeof votes === 'number') updateData['participationStats.votes'] = votes;
      
      const participant = await Participant.findOneAndUpdate(
        { participantId },
        { $inc: updateData },
        { new: true }
      );
      
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      
      res.json({ success: true, participant });
    } else {
      // In-memory fallback
      res.json({ success: true });
    }
  } catch (error) {
    console.error('❌ Participant stats error:', error);
    res.status(500).json({ error: 'Failed to update participant stats' });
  }
});

// Get participant analytics for a session
app.get('/api/session/:sessionId/analytics', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (isDbReady()) {
      const sid = mongoose.Types.ObjectId.isValid(sessionId) ? new mongoose.Types.ObjectId(sessionId) : sessionId;
      
      // Get participant stats
      const participants = await Participant.find({ sessionId: sid, isActive: true });
      
      // Calculate analytics
      const analytics = {
        totalParticipants: participants.length,
        activeParticipants: participants.filter(p => {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return p.lastSeen > fiveMinutesAgo;
        }).length,
        deviceBreakdown: {
          mobile: participants.filter(p => p.deviceType === 'mobile').length,
          tablet: participants.filter(p => p.deviceType === 'tablet').length,
          desktop: participants.filter(p => p.deviceType === 'desktop').length
        },
        participationStats: {
          totalSpeakingTime: participants.reduce((sum, p) => sum + (p.participationStats?.speakingTime || 0), 0),
          totalContributions: participants.reduce((sum, p) => sum + (p.participationStats?.contributions || 0), 0),
          totalVotes: participants.reduce((sum, p) => sum + (p.participationStats?.votes || 0), 0)
        },
        connectionQuality: {
          good: participants.filter(p => p.connectionQuality?.network === 'good').length,
          fair: participants.filter(p => p.connectionQuality?.network === 'fair').length,
          poor: participants.filter(p => p.connectionQuality?.network === 'poor').length
        }
      };
      
      res.json({ analytics });
    } else {
      // In-memory fallback
      res.json({ 
        analytics: {
          totalParticipants: 0,
          activeParticipants: 0,
          deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
          participationStats: { totalSpeakingTime: 0, totalContributions: 0, totalVotes: 0 },
          connectionQuality: { good: 0, fair: 0, poor: 0 }
        }
      });
    }
  } catch (error) {
    console.error('❌ Session analytics error:', error);
    res.status(500).json({ error: 'Failed to get session analytics' });
  }
});

// Enhanced proxy endpoint for Deepgram transcription with speaker diarization
app.post('/api/transcribe', upload.single('audio'), (req, res) => {
  console.log('📡 Received transcription request...');
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'Deepgram API key not configured' });
  }

  let audioData;
  let contentType;

  // Handle different audio sources
  if (req.file) {
    // File upload
    audioData = req.file.buffer;
    contentType = req.file.mimetype;
    
    // Enhanced format handling for Deepgram compatibility  
    console.log(`📁 Original file: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`📋 Original Content-Type: ${contentType}`);
    
    // Map content types for better Deepgram support
    if (contentType.includes('webm')) {
      // Try different approaches for WebM
      if (req.file.originalname.includes('.webm')) {
        contentType = 'audio/webm';
        console.log(`🔄 Adjusted WebM Content-Type to: ${contentType}`);
      }
    } else if (contentType.includes('mp4')) {
      contentType = 'audio/mp4';
      console.log(`🔄 Adjusted MP4 Content-Type to: ${contentType}`);
    } else if (contentType.includes('mpeg')) {
      contentType = 'audio/mpeg';
      console.log(`🔄 Adjusted MPEG Content-Type to: ${contentType}`);
    } else if (contentType.includes('wav') || req.file.originalname.endsWith('.wav')) {
      contentType = 'audio/wav';
      console.log(`🔄 Adjusted WAV Content-Type to: ${contentType}`);
    } else if (contentType === 'application/octet-stream') {
      // Detect format from file extension
      if (req.file.originalname.endsWith('.wav')) {
        contentType = 'audio/wav';
        console.log(`🔄 Detected WAV from filename: ${contentType}`);
      } else if (req.file.originalname.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
        console.log(`🔄 Detected MP3 from filename: ${contentType}`);
      } else if (req.file.originalname.endsWith('.m4a')) {
        contentType = 'audio/mp4';
        console.log(`🔄 Detected M4A from filename: ${contentType}`);
      }
    }
    
    console.log(`📤 Final Content-Type for Deepgram: ${contentType}`);
  } else if (req.body.audioData) {
    // Base64 encoded audio data
    audioData = Buffer.from(req.body.audioData, 'base64');
    contentType = req.body.contentType || 'audio/webm';
    console.log(`🎵 Processing audio data: ${audioData.length} bytes - Content-Type: ${contentType}`);
  } else {
    return res.status(400).json({ error: 'No audio data provided' });
  }

  // Enhanced Deepgram API options with superior speaker diarization (optimized for current account tier)
  const deepgramPath = '/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=en&diarize=true&utterances=true&speakers=6&min_speakers=1&max_speakers=6&multichannel=false&numerals=true&paragraphs=true&utt_split=0.8';
  
  const options = {
    hostname: 'api.deepgram.com',
    port: 443,
    path: deepgramPath,
    method: 'POST',
    headers: {
      'Authorization': `Token ${API_KEY}`,
      'Content-Type': contentType,
      'Content-Length': audioData.length
    }
  };

  console.log(`🚀 Sending ${audioData.length} bytes to Deepgram with enhanced speaker diarization...`);
  console.log(`📋 Request headers:`, {
    'Content-Type': contentType,
    'Content-Length': audioData.length,
    'Authorization': `Token ${API_KEY?.slice(0, 10)}...`
  });
  console.log(`📍 Request URL: https://api.deepgram.com${deepgramPath}`);

  const deepgramReq = https.request(options, (deepgramRes) => {
    console.log(`📡 Deepgram response status: ${deepgramRes.statusCode}`);
    
    let responseData = '';
    deepgramRes.on('data', (chunk) => {
      responseData += chunk;
    });

    deepgramRes.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        
        if (deepgramRes.statusCode === 200) {
          const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
          const words = result.results?.channels[0]?.alternatives[0]?.words || [];
          const utterances = result.results?.utterances || [];
          
          console.log(`✅ Transcription successful: "${transcript}"`);
          console.log(`🎭 Found ${utterances.length} speaker utterances`);
          
          // Process speaker-separated transcript with enhanced analysis
          const speakerAnalysis = processSpeakerDiarization(utterances, words);
          
          res.json({
            success: true,
            transcript: transcript,
            speakerTranscript: speakerAnalysis?.transcript || null,
            speakerCount: speakerAnalysis?.speakerCount || 0,
            speakerStats: speakerAnalysis?.speakerStats || {},
            confidence: result.results?.channels[0]?.alternatives[0]?.confidence || 0,
            timestamp: new Date().toISOString(),
            utterances: utterances,
            words: words,
            rawResponse: result
          });
        } else {
          console.error(`❌ Deepgram error: ${deepgramRes.statusCode}`, result);
          console.error(`❌ Response headers:`, deepgramRes.headers);
          console.error(`❌ Full response data:`, responseData);
          res.status(deepgramRes.statusCode).json({
            success: false,
            error: result.error || result.err_msg || 'Transcription failed',
            statusCode: deepgramRes.statusCode,
            deepgramError: result
          });
        }
      } catch (error) {
        console.error('❌ Failed to parse Deepgram response:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to parse transcription response',
          rawResponse: responseData
        });
      }
    });
  });

  deepgramReq.on('error', (error) => {
    console.error('❌ Deepgram request error:', error);
    res.status(500).json({
      success: false,
      error: `Request failed: ${error.message}`
    });
  });

  // Send the audio data
  deepgramReq.write(audioData);
  deepgramReq.end();
});

// Enhanced speaker diarization processing with improved accuracy
function processSpeakerDiarization(utterances, words) {
  if (!utterances || utterances.length === 0) {
    console.log('⚠️ No utterances found, using fallback speaker detection');
    return null;
  }

  let speakerTranscript = '';
  let currentSpeaker = null;
  let speakerStats = {};
  
  console.log(`🎭 Processing ${utterances.length} utterances for speaker diarization`);
  
  utterances.forEach((utterance, index) => {
    const speakerId = utterance.speaker;
    const speaker = `Speaker ${speakerId}`;
    const text = utterance.transcript;
    const confidence = utterance.confidence || 0;
    const startTime = utterance.start || 0;
    const endTime = utterance.end || 0;
    const duration = endTime - startTime;
    
    // Track speaker statistics
    if (!speakerStats[speakerId]) {
      speakerStats[speakerId] = {
        utteranceCount: 0,
        totalDuration: 0,
        avgConfidence: 0,
        confidenceSum: 0
      };
    }
    
    speakerStats[speakerId].utteranceCount++;
    speakerStats[speakerId].totalDuration += duration;
    speakerStats[speakerId].confidenceSum += confidence;
    speakerStats[speakerId].avgConfidence = speakerStats[speakerId].confidenceSum / speakerStats[speakerId].utteranceCount;
    
    // Format speaker transitions
    if (speaker !== currentSpeaker) {
      if (speakerTranscript) speakerTranscript += '\n\n';
      speakerTranscript += `<div class="speaker-segment">`;
      speakerTranscript += `<span class="speaker-tag" data-speaker="${speakerId}" data-confidence="${confidence.toFixed(2)}">[${speaker} - ${startTime.toFixed(1)}s]</span> `;
      currentSpeaker = speaker;
    }
    
    speakerTranscript += `<span class="utterance" data-start="${startTime}" data-end="${endTime}" data-confidence="${confidence}">${text}</span> `;
    
    console.log(`🎤 ${speaker}: "${text}" (${startTime.toFixed(1)}s-${endTime.toFixed(1)}s, confidence: ${confidence.toFixed(2)})`);
  });
  
  if (speakerTranscript) {
    speakerTranscript += `</div>`;
  }
  
  // Log speaker statistics
  console.log(`📊 Speaker Statistics:`);
  Object.keys(speakerStats).forEach(speakerId => {
    const stats = speakerStats[speakerId];
    console.log(`   Speaker ${speakerId}: ${stats.utteranceCount} utterances, ${stats.totalDuration.toFixed(1)}s total, ${stats.avgConfidence.toFixed(2)} avg confidence`);
  });
  
  console.log(`🎭 Enhanced speaker transcript processed with ${utterances.length} utterances from ${Object.keys(speakerStats).length} speakers`);
  return {
    transcript: speakerTranscript.trim(),
    speakerCount: Object.keys(speakerStats).length,
    speakerStats: speakerStats,
    totalUtterances: utterances.length
  };
}

// WebSocket endpoint for real-time transcription
app.ws('/realtime', (ws, req) => {
  console.log('🔌 WebSocket connection established for real-time transcription');
  // Prevent process crash on ws protocol errors (e.g., invalid close codes)
  ws.on('error', (err) => {
    try {
      console.warn('⚠️ realtime websocket error:', err && (err.code || err.message) || err);
    } catch (_) {}
  });
  
  let deepgramWs = null;
  let isConnected = false;
  let keepAliveInterval = null;
  let retryCount = 0;
  const maxRetries = 5;
  const baseRetryDelay = 1000; // 1 second
  let shouldReconnect = true; // prevent reconnection after explicit stop/close

  // Connect to Deepgram WebSocket
  const connectToDeepgram = () => {
    if (!API_KEY) {
      console.log('❌ Deepgram API key not configured');
      ws.send(JSON.stringify({ type: 'error', message: 'Deepgram API key not configured' }));
      return;
    }
    
    // Configure for PCM audio format from Web Audio API with enhanced accuracy
    const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&channels=1&diarize=true&utterances=true&encoding=opus&punctuate=true&profanity_filter=false&redact=false&filler_words=false&multichannel=false&alternatives=1&numerals=true&endpointing=300&vad_events=false`;
    
    console.log('🚀 Connecting to Deepgram WebSocket with enhanced diarization...');
    console.log(`🔑 Using API key: ${API_KEY.substring(0, 8)}...`);
    
    deepgramWs = new WebSocket(deepgramUrl, {
      headers: {
        'Authorization': `Token ${API_KEY}`
      }
    });
    
    deepgramWs.on('open', () => {
      console.log('✅ Connected to Deepgram WebSocket');
      isConnected = true;
      retryCount = 0; // Reset retry count on successful connection
      ws.send(JSON.stringify({ type: 'status', message: 'Connected to Deepgram', connected: true }));
      
      // Send keepalive pings
      keepAliveInterval = setInterval(() => {
        if (deepgramWs && isConnected) {
          deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 10000);
    });
    
    deepgramWs.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        console.log('📡 Deepgram response:', JSON.stringify(response, null, 2));
        
        // Handle both nova-2 and legacy response formats
        if (response.type === 'Results' && response.channel?.alternatives?.[0]) {
          const alternative = response.channel.alternatives[0];
          const transcript = alternative.transcript;
          const confidence = alternative.confidence || 0;
          const isFinal = response.is_final || false;
          
          console.log(`🔍 Processing transcript: "${transcript}" (length: ${transcript?.length || 0})`);
          
          if (transcript && transcript.trim()) {
            console.log(`📝 Sending transcript: "${transcript}" (confidence: ${confidence}, final: ${isFinal})`);
            ws.send(JSON.stringify({
              type: 'transcript',
              transcript: transcript.trim(),
              confidence: confidence,
              isFinal: isFinal,
              timestamp: new Date().toISOString()
            }));
          } else {
            console.log('⚠️ Empty or undefined transcript, skipping...');
          }
        } else if (response.type === 'Metadata') {
          console.log('📊 Received metadata:', response);
        } else if (response.type === 'UtteranceEnd') {
          console.log('🔚 Utterance ended');
        } else {
          console.log('🤷 Unhandled response type:', response.type);
        }
      } catch (error) {
        console.error('❌ Error parsing Deepgram response:', error);
        console.error('Raw data:', data.toString());
      }
    });
    
        deepgramWs.on('error', (error) => {
      console.error('❌ Deepgram WebSocket error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        type: error.type
      });
      ws.send(JSON.stringify({ type: 'error', message: `Deepgram error: ${error.message}` }));
      isConnected = false;
    });

    deepgramWs.on('close', (code, reason) => {
      console.log(`🔌 Deepgram WebSocket closed (code: ${code}, reason: ${reason})`);
      console.log('Close event details:', {
        code: code,
        reason: reason ? reason.toString() : 'No reason provided',
        wasClean: code === 1000
      });
      isConnected = false;
      
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      
      // Send detailed error to client
      const errorMessage = code === 4003 ? 'Deepgram API key invalid or expired' :
                          code === 4001 ? 'Deepgram authentication failed' :
                          code === 1005 ? 'Deepgram connection failed - check API key and parameters' :
                          `Deepgram disconnected (code: ${code})`;
      
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: errorMessage,
        deepgramCode: code 
      }));

      // Implement reconnection logic with exponential backoff
      if (shouldReconnect && ws.readyState === ws.OPEN && retryCount < maxRetries) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * baseRetryDelay + Math.random() * 1000;
        console.log(`🔌 Attempting to reconnect to Deepgram in ${delay.toFixed(0)}ms (attempt ${retryCount}/${maxRetries})...`);
        setTimeout(connectToDeepgram, delay);
      } else {
        console.error(`❌ Max retries reached. Could not reconnect to Deepgram.`);
        ws.send(JSON.stringify({ type: 'fatal_error', message: 'Could not reconnect to Deepgram after multiple attempts.' }));
      }
    });
  };
  
  // Handle incoming messages from client
  ws.on('message', (message) => {
    // More robust check for JSON vs binary data
    let isJSON = false;
    
    try {
      // Only attempt JSON detection on reasonably small messages
      if (message.length < 1000) {
        if (message instanceof Buffer) {
          // Check if buffer contains valid UTF-8 text that looks like JSON
          const text = message.toString('utf8');
          // Verify it's valid UTF-8 and starts/ends with JSON delimiters
          if (text === message.toString() && text.trim().startsWith('{') && text.trim().includes('}')) {
            JSON.parse(text); // Validate it's actually valid JSON
            isJSON = true;
          }
        } else if (typeof message === 'string') {
          const trimmed = message.trim();
          if (trimmed.startsWith('{') && trimmed.includes('}')) {
            JSON.parse(trimmed); // Validate it's actually valid JSON
            isJSON = true;
          }
        }
      }
    } catch (error) {
      // If JSON parsing fails, it's definitely binary data
      isJSON = false;
    }
    
    if (isJSON) {
      // Handle JSON control messages
      try {
        const data = JSON.parse(message);
        console.log('📨 Received command:', data);
        
        if (data.type === 'start') {
          connectToDeepgram();
        } else if (data.type === 'stop') {
          shouldReconnect = false;
          if (deepgramWs) {
            try { deepgramWs.close(); } catch (e) {}
          }
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          isConnected = false;
          ws.send(JSON.stringify({ type: 'status', message: 'Stopped by client', connected: false }));
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('❌ Error parsing JSON command:', error);
      }
    } else {
      // Handle binary audio data
      if (deepgramWs && isConnected && message instanceof Buffer && message.length > 0) {
        deepgramWs.send(message);
      } else if (message.length > 1000) {
        // Large messages are definitely audio data
        if (deepgramWs && isConnected) {
          deepgramWs.send(message);
        }
      }
      // Silently ignore small binary messages that aren't JSON
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 Client WebSocket disconnected');
    shouldReconnect = false;
    if (deepgramWs) {
      try { deepgramWs.close(); } catch (e) {}
    }
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error);
  });
});

// AI-Enhanced Transcript Processing Endpoint
app.post('/api/enhance-transcript', express.json(), async (req, res) => {
  console.log('🤖 Received transcript enhancement request...');
  
  const { transcript, options = {} } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'No transcript provided' });
  }

  if (!transcript.trim()) {
    return res.status(400).json({ error: 'Empty transcript provided' });
  }

  try {
    // Check if AI services are available
    const hasAIService = AI_SERVICES.ANTHROPIC.available || AI_SERVICES.OPENAI.available;
    if (!hasAIService) {
      console.warn('⚠️ No AI services available, returning original transcript');
      return res.json({
        success: false,
        original: transcript,
        enhanced: transcript,
        error: 'No AI services configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY',
        fallback: true
      });
    }

    console.log(`🔄 Enhancing transcript (${transcript.length} chars) using ${enhancer.primaryService}...`);
    
    // Use the AI enhancement service
    const result = await enhancer.enhanceTranscript(transcript, {
      removeduplicates: options.removeduplicates !== false,
      improvePunctuation: options.improvePunctuation !== false,
      fixGrammar: options.fixGrammar !== false,
      enhanceReadability: options.enhanceReadability !== false,
      maintainSpeakerVoice: options.maintainSpeakerVoice !== false,
      addParagraphs: options.addParagraphs !== false,
      ...options
    });

    if (result.success) {
      console.log(`✅ Enhancement successful. Improvements: ${JSON.stringify(result.improvements)}`);
    } else {
      console.warn(`⚠️ Enhancement failed: ${result.error}`);
    }

    res.json({
      ...result,
      availableServices: {
        claude: AI_SERVICES.ANTHROPIC.available,
        openai: AI_SERVICES.OPENAI.available
      }
    });

  } catch (error) {
    console.error('❌ Enhancement error:', error);
    res.status(500).json({
      success: false,
      original: transcript,
      enhanced: transcript, // Fallback to original
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Batch Enhancement Endpoint for Multiple Segments
app.post('/api/enhance-transcript-batch', express.json(), async (req, res) => {
  console.log('🤖 Received batch transcript enhancement request...');
  
  const { segments, options = {} } = req.body;
  
  if (!segments || !Array.isArray(segments)) {
    return res.status(400).json({ error: 'Segments array required' });
  }

  if (segments.length === 0) {
    return res.status(400).json({ error: 'Empty segments array' });
  }

  try {
    console.log(`🔄 Batch enhancing ${segments.length} segments...`);
    
    const results = await enhancer.enhanceMultipleSegments(segments, options);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Batch enhancement complete: ${successCount}/${segments.length} successful`);

    res.json({
      success: true,
      results: results,
      summary: {
        total: segments.length,
        successful: successCount,
        failed: segments.length - successCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Batch enhancement error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced AI agent processing endpoint
app.post('/api/ai-agents', express.json(), (req, res) => {
  console.log('🤖 Received AI agent processing request...');
  
  const { transcript, agents = [] } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'No transcript provided' });
  }
  
  // Simulate AI agent processing
  const results = {};
  
  agents.forEach(agent => {
    switch (agent) {
      case 'summary':
        results.summary = generateSummary(transcript);
        break;
      case 'sentiment':
        results.sentiment = analyzeSentiment(transcript);
        break;
      case 'keywords':
        results.keywords = extractKeywords(transcript);
        break;
      case 'action_items':
        results.actionItems = extractActionItems(transcript);
        break;
      default:
        results[agent] = `Processing with ${agent} agent...`;
    }
  });
  
  console.log(`🤖 Processed transcript with ${agents.length} AI agents`);
  
  res.json({
    success: true,
    results: results,
    timestamp: new Date().toISOString()
  });
});

// AI Agent Processing Functions (simulated for now)
function generateSummary(transcript) {
  const sentences = transcript.split('.').filter(s => s.trim());
  const wordCount = transcript.split(' ').length;
  
  return {
    summary: `Discussion involving ${Math.ceil(wordCount / 150)} speakers covering key topics. Total ${wordCount} words transcribed.`,
    keyPoints: sentences.slice(0, 3).map(s => s.trim()).filter(s => s),
    duration: `Estimated ${Math.ceil(wordCount / 150)} minutes`
  };
}

function analyzeSentiment(transcript) {
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'happy', 'excited', 'agree'];
  const negativeWords = ['bad', 'terrible', 'negative', 'sad', 'disagree', 'problem', 'issue'];
  
  const words = transcript.toLowerCase().split(' ');
  const positive = words.filter(word => positiveWords.includes(word)).length;
  const negative = words.filter(word => negativeWords.includes(word)).length;
  
  let overall = 'neutral';
  if (positive > negative) overall = 'positive';
  if (negative > positive) overall = 'negative';
  
  return {
    overall: overall,
    positive: positive,
    negative: negative,
    confidence: Math.min(0.95, 0.5 + Math.abs(positive - negative) * 0.1)
  };
}

function extractKeywords(transcript) {
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'];
  
  const words = transcript.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function extractActionItems(transcript) {
  const actionVerbs = ['will', 'should', 'need to', 'must', 'plan to', 'going to', 'next', 'follow up'];
  const sentences = transcript.split('.').filter(s => s.trim());
  
  const actionItems = sentences.filter(sentence => {
    return actionVerbs.some(verb => sentence.toLowerCase().includes(verb));
  }).slice(0, 5);
  
  return actionItems.map((item, index) => ({
    id: index + 1,
    text: item.trim(),
    priority: Math.random() > 0.5 ? 'high' : 'medium'
  }));
}

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Speech Recognition Test Server running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔑 Deepgram API: ${API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔌 WebSocket: ✅ Real-time streaming enabled`);
  console.log(`🤖 AI Agents: ✅ Processing endpoints ready`);
  console.log(`🎯 Ready for testing!`);
});

// ==================== GROWTH TRACKING ENDPOINTS ====================

// Basic AI Analysis for Contribution Quality
const analyzeContribution = async (text) => {
  try {
    // Simple heuristic analysis (will be enhanced with proper AI later)
    const wordCount = text.split(' ').length;
    const questionCount = (text.match(/\?/g) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    const sentiment = text.toLowerCase().includes('thank') || text.toLowerCase().includes('great') || 
                     text.toLowerCase().includes('love') || text.toLowerCase().includes('appreciate') ? 0.3 : 0;
    
    // Basic sophistication based on length and complexity
    const sophistication = Math.min(5, Math.max(1, 1 + (wordCount / 20)));
    
    // Detect building on others (simple keyword detection)
    const buildingOnOthers = text.toLowerCase().includes('building on') || 
                            text.toLowerCase().includes('agree with') ||
                            text.toLowerCase().includes('adding to') ||
                            text.toLowerCase().includes('yes, and');
    
    // Detect questions and synthesis
    const askingQuestions = questionCount > 0;
    const synthesizing = text.toLowerCase().includes('summary') || 
                        text.toLowerCase().includes('overall') ||
                        text.toLowerCase().includes('in conclusion');
    
    return {
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      sophistication: sophistication,
      empathy: buildingOnOthers ? 3 : 2,
      creativity: text.toLowerCase().includes('what if') || text.toLowerCase().includes('imagine') ? 4 : 2,
      clarity: wordCount > 5 && wordCount < 100 ? 4 : 2,
      buildingOnOthers,
      introducingNewIdeas: text.toLowerCase().includes('new idea') || text.toLowerCase().includes('different approach'),
      askingQuestions,
      synthesizing
    };
  } catch (error) {
    console.error('AI Analysis error:', error);
    return {
      sentiment: 0,
      sophistication: 1,
      empathy: 1,
      creativity: 1,
      clarity: 1,
      buildingOnOthers: false,
      introducingNewIdeas: false,
      askingQuestions: false,
      synthesizing: false
    };
  }
};

// Record a contribution with AI analysis
app.post('/api/participants/:participantId/contribution', async (req, res) => {
  try {
    const { participantId } = req.params;
    const { sessionId, content, type = 'transcript' } = req.body;
    
    if (!content || !sessionId) {
      return res.status(400).json({ error: 'Content and sessionId required' });
    }
    
    // Perform AI analysis
    const aiAnalysis = await analyzeContribution(content);
    
    // Determine growth indicators
    const growthIndicators = {
      isBreakthrough: aiAnalysis.creativity > 3 && aiAnalysis.sophistication > 3,
      isInsightful: aiAnalysis.sophistication > 3 || aiAnalysis.synthesizing,
      showsGrowth: aiAnalysis.buildingOnOthers || aiAnalysis.askingQuestions,
      helpedOthers: aiAnalysis.empathy > 2 && aiAnalysis.buildingOnOthers
    };
    
    const contributionData = {
      participantId,
      sessionId: mongoose.Types.ObjectId.isValid(sessionId) ? new mongoose.Types.ObjectId(sessionId) : sessionId,
      content,
      type,
      aiAnalysis,
      growthIndicators
    };
    
    if (isDbReady()) {
      const contribution = new Contribution(contributionData);
      await contribution.save();
      
      // Update participant's journey data
      await updateParticipantJourney(participantId, sessionId, aiAnalysis, growthIndicators);
      
      console.log(`📈 Contribution analyzed for ${participantId}: sophistication=${aiAnalysis.sophistication.toFixed(1)}`);
      res.json({ success: true, analysis: aiAnalysis, growth: growthIndicators });
    } else {
      // In-memory fallback
      console.log(`📈 Contribution analyzed (in-memory) for ${participantId}`);
      res.json({ success: true, analysis: aiAnalysis, growth: growthIndicators });
    }
  } catch (error) {
    console.error('❌ Contribution analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze contribution' });
  }
});

// Update participant journey data
const updateParticipantJourney = async (participantId, sessionId, aiAnalysis, growthIndicators) => {
  try {
    if (!isDbReady()) return;
    
    const participant = await Participant.findOne({ participantId });
    if (!participant) return;
    
    // Update contribution quality (running average)
    const newQuality = (aiAnalysis.sophistication + aiAnalysis.empathy + aiAnalysis.clarity) / 3;
    const currentQuality = participant.journeyData?.contributionQuality || 1;
    const updatedQuality = (currentQuality + newQuality) / 2;
    
    // Detect growth moments
    const growthMoment = {
      sessionId: new mongoose.Types.ObjectId(sessionId),
      timestamp: new Date(),
      type: growthIndicators.isBreakthrough ? 'breakthrough' : 
            growthIndicators.isInsightful ? 'insight' :
            growthIndicators.helpedOthers ? 'connection' : null,
      description: `Contribution quality: ${newQuality.toFixed(1)}/5`,
      aiConfidence: 0.7
    };
    
    const updateData = {
      'journeyData.lastSessionDate': new Date(),
      'journeyData.contributionQuality': updatedQuality
    };
    
    // Add growth moment if significant
    if (growthMoment.type) {
      updateData.$push = { 'journeyData.growthMoments': growthMoment };
    }
    
    await Participant.findOneAndUpdate({ participantId }, updateData);
    
  } catch (error) {
    console.error('Error updating participant journey:', error);
  }
};

// Get participant journey summary
app.get('/api/participants/:participantId/journey', async (req, res) => {
  try {
    const { participantId } = req.params;
    
    if (isDbReady()) {
      const participant = await Participant.findOne({ participantId });
      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }
      
      // Get recent contributions for trend analysis
      const contributions = await Contribution.find({ participantId })
        .sort({ timestamp: -1 })
        .limit(10);
      
      // Calculate basic growth metrics
      const avgSophistication = contributions.length > 0 ? 
        contributions.reduce((sum, c) => sum + c.aiAnalysis.sophistication, 0) / contributions.length : 1;
      
      const growthMoments = participant.journeyData?.growthMoments || [];
      const recentGrowth = growthMoments.filter(m => 
        new Date(m.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      );
      
      const journeySummary = {
        participantName: participant.name,
        totalSessions: participant.journeyData?.totalSessions || 1,
        firstSession: participant.journeyData?.firstSessionDate || participant.createdAt,
        lastSession: participant.journeyData?.lastSessionDate || new Date(),
        contributionQuality: participant.journeyData?.contributionQuality || 1,
        collaborationStyle: participant.journeyData?.collaborationStyle || 'emerging',
        recentContributions: contributions.length,
        avgSophistication: avgSophistication.toFixed(1),
        growthMoments: growthMoments.length,
        recentGrowthMoments: recentGrowth.length,
        engagementTrend: participant.journeyData?.engagementTrend || 'stable'
      };
      
      res.json({ journey: journeySummary });
    } else {
      // In-memory fallback
      res.json({ 
        journey: {
          participantName: 'Demo User',
          totalSessions: 1,
          contributionQuality: 2.5,
          collaborationStyle: 'emerging',
          growthMoments: 0,
          engagementTrend: 'stable'
        }
      });
    }
  } catch (error) {
    console.error('❌ Journey summary error:', error);
    res.status(500).json({ error: 'Failed to get journey summary' });
  }
});

// ==================== DASHBOARD WEBSOCKET ENDPOINT ====================

// Dashboard WebSocket for real-time monitoring
const dashboardClients = new Set();

app.ws('/dashboard-ws', (ws, req) => {
  console.log('📊 Dashboard client connected');
  dashboardClients.add(ws);
  
  // Send initial system health
  ws.send(JSON.stringify({
    type: 'system-health',
    health: {
      backend: 'good',
      database: isDbReady() ? 'good' : 'poor',
      websocket: 'good'
    }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe':
          // Subscribe to session updates
          ws.sessionId = data.sessionId;
          console.log(`📊 Dashboard subscribed to session: ${data.sessionId}`);
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        default:
          console.log('Unknown dashboard message:', data);
      }
    } catch (error) {
      console.error('Dashboard WS message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('📊 Dashboard client disconnected');
    dashboardClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('📊 Dashboard WebSocket error:', error);
    dashboardClients.delete(ws);
  });
});

// Broadcast function for dashboard updates
const broadcastToDashboard = (message, sessionId = null) => {
  const messageStr = JSON.stringify(message);
  
  dashboardClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      // If sessionId is specified, only send to clients subscribed to that session
      if (!sessionId || client.sessionId === sessionId) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting to dashboard:', error);
          dashboardClients.delete(client);
        }
      }
    } else {
      dashboardClients.delete(client);
    }
  });
};

// Export broadcast function for use in other parts of the application
global.broadcastToDashboard = broadcastToDashboard;

module.exports = { app, server }; 

// SPA fallback: route unknown paths to client index.html in production
if (fs.existsSync(clientBuildPath)) {
  app.get('*', (req, res) => {
    // Allow API and WS paths to 404 as usual
    if (req.path.startsWith('/api') || req.path.startsWith('/realtime') || req.path.startsWith('/session-bus')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Graceful shutdown
const shutdown = (signal) => () => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try { server.close(() => { console.log('HTTP server closed.'); process.exit(0); }); } catch (_) { process.exit(0); }
  // Force exit after timeout
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));