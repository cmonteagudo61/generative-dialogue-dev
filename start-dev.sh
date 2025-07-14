#!/bin/bash

# Generative Dialogue - Development Startup Script
# Navigate to development directory and start the development server

echo "🚀 Starting Generative Dialogue Development Environment..."
echo "📁 Working directory: /Users/carlosmonteagudo/generative-dialogue-dev"
echo "🌐 Development server will run at: http://localhost:3100"
echo ""

# Navigate to the client directory
cd /Users/carlosmonteagudo/generative-dialogue-dev/client

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
    echo ""
fi

# Start the development server
echo "🔧 Starting development server on port 3100..."
echo "🎯 No port conflicts - clean development environment!"
echo ""

npm run dev 