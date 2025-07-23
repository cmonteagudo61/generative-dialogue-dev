# 🧠 Advanced AI Integration - Setup Guide

Your Generative Dialogue platform now includes sophisticated AI processing with **Grok**, **Claude**, and **OpenAI** integration!

---

## 🎯 **What's New**

### **Multi-AI Processing Pipeline**
- **🤖 Grok (xAI)** - Primary AI for nuanced interpretation and processing
- **🤖 Claude (Anthropic)** - High-quality text analysis and backup
- **🤖 OpenAI GPT** - Additional backup processing
- **🎤 Deepgram** - Professional speech recognition with speaker diarization

### **Advanced Features**
- ✅ Real-time transcription with AI enhancement
- ✅ Intelligent caching system
- ✅ Multi-AI fallback processing
- ✅ Speaker diarization and identification
- ✅ Theme extraction and synthesis
- ✅ Collective wisdom generation

---

## 🚀 **Quick Start**

### **Step 1: Configure API Keys**
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

**Required API Keys:**
- `X_API_KEY` - Your Grok (xAI) API key
- `DEEPGRAM_API_KEY` - Your Deepgram API key  
- `ANTHROPIC_API_KEY` - Your Claude API key (optional backup)
- `OPENAI_API_KEY` - Your OpenAI API key (optional backup)

### **Step 2: Start AI Processing Server**
```bash
# Start the advanced AI server
./start-ai-server.sh
```

### **Step 3: Start Frontend**
```bash
# In a new terminal
cd client
PORT=3100 npm start
```

---

## 🔧 **API Endpoints**

### **Health Check**
```
GET http://localhost:8080/health
```
Returns status of all AI services.

### **AI Processing**
- `POST /api/ai/format` - Format transcript with Grok
- `POST /api/ai/summarize` - Summarize content with Grok  
- `POST /api/ai/themes` - Extract themes with Grok
- `POST /api/transcribe` - Real-time transcription with Deepgram

### **WebSocket (Real-time)**
```
ws://localhost:8080/ws/transcribe
```
For real-time audio streaming and transcription.

---

## 🎯 **How It Works**

### **1. Speech Recognition**
- **Deepgram** processes audio with speaker diarization
- Identifies multiple speakers automatically
- Real-time transcription via WebSocket

### **2. AI Enhancement** 
- **Grok** provides nuanced interpretation of transcripts
- Corrects grammar, improves readability
- Extracts themes and insights
- Maintains speaker voice and intent

### **3. Collective Intelligence**
- Multi-participant dialogue orchestration
- Cross-room insight aggregation
- Emergent theme detection
- Collective wisdom synthesis

---

## 🛠️ **Troubleshooting**

### **Server Won't Start**
```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill existing processes
./start-ai-server.sh
```

### **API Key Issues**
```bash
# Test API connectivity
curl http://localhost:8080/health
```

### **Transcription Not Working**
- Check microphone permissions in browser
- Verify Deepgram API key is correct
- Check browser console for WebSocket errors

---

## 🔮 **Advanced Configuration**

### **Switching AI Providers**
The system automatically uses Grok as primary, with Claude and OpenAI as fallbacks. You can modify the priority in `backend/server.js`.

### **Custom Processing**
Add your own AI processing endpoints by extending the `/api/ai/` routes in the server.

### **Performance Tuning**
- Caching is enabled by default (30-minute TTL)
- Use `forceRefresh=true` parameter to bypass cache
- Monitor performance via `/health` endpoint

---

## 📊 **Testing the Integration**

### **1. Test Server Health**
```bash
curl http://localhost:8080/health
```

### **2. Test Grok Processing**
```bash
curl -X POST http://localhost:8080/api/ai/format \
  -H "Content-Type: application/json" \
  -d '{"transcript": "hello this is a test transcript"}'
```

### **3. Test UI Integration**
1. Start both servers (`./start-ai-server.sh` and `npm start`)
2. Navigate to `http://localhost:3100`
3. Try the transcription features in dialogue sessions

---

## 🎉 **You're Ready!**

Your Generative Dialogue platform now has enterprise-grade AI processing capabilities. The system will automatically use Grok for nuanced interpretation while maintaining high availability through multiple AI service integrations.

**Happy Dialoguing! 🌍✨** 