#!/bin/bash

echo "🚀 Starting Advanced AI Processing Server..."
echo "===================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Please copy .env.example to .env and configure your API keys:"
    echo ""
    echo "   cp .env.example .env"
    echo ""
    echo "🔑 Required API Keys:"
    echo "   - DEEPGRAM_API_KEY (Speech Recognition)"
    echo "   - X_API_KEY (Grok - for nuanced interpretation)"
    echo "   - ANTHROPIC_API_KEY (Claude - optional backup)"
    echo "   - OPENAI_API_KEY (OpenAI - optional backup)"
    echo ""
    exit 1
fi

# Kill any existing processes on port 8080
echo "🧹 Cleaning up any existing processes on port 8080..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Start the AI processing server
echo "🤖 Launching AI Server on port 8080..."
cd backend
node server.js 