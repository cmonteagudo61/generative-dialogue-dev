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

// Import AI APIs from the correct path
const grokAPI = require('../api/grokAPI');
const anthropicAPI = require('../api/aiAPI');
const openaiAPI = require('../api/openaiAPI');

const app = express();
const { connectMongo, isDbReady, mongoose } = require('./db');
const { Submission, Vote } = require('./models');
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
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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
// Serve backend static (test pages)
app.use(express.static(__dirname));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// In production, serve the client build (single-origin app)
const clientBuildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
}
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
      await Vote.create({ sessionId: sid, breakoutId: bid, participantId: participantId || null, vote });
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