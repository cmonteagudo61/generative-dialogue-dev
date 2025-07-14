# Generative Dialogue - Development Environment

## 🚀 Quick Start

```bash
# Navigate to development directory
cd /Users/carlosmonteagudo/generative-dialogue-dev

# Install dependencies
cd client && npm install

# Start development server (clean port)
npm run dev
```

**Development Server:** `http://localhost:3100`

---

## 📁 Project Structure

```
generative-dialogue-dev/
├── client/                     # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── video/         # Video components
│   │   │   └── ...           # Other components
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── public/
├── camera-permission-fix.js    # Auto-handles camera permissions
├── ultimate-video-fix.js       # Complete video flickering fix
├── cover-video-fix.js          # CSS-based video fix
├── STRUCTURE_OF_DIALOGUE.md    # Core framework documentation
└── README.md                   # This file
```

---

## 🎯 Development Focus

### **Seven View Modes Implementation**
1. **Self (1)** - Individual reflection
2. **Dyad (2)** - Paired conversation
3. **Triad (3)** - Three-person dialogue
4. **Quad (4)** - Four-person group
5. **Kiva (6)** - Circle wisdom sharing
6. **Community (50-300+)** - Large groups
7. **Fishbowl (6+)** - Structured speaking

### **Key Components**
- `VideoGrid.js` - Main video layout
- `CommunityView.js` - Community and large group views
- `FishbowlView.js` - Fishbowl implementation
- `LoopMagnifier.js` - Magnification features

---

## 🔧 Development Commands

```bash
# Start development server
cd client && npm run dev

# Start with specific port
cd client && PORT=3100 npm start

# Run tests
cd client && npm test

# Build for production
cd client && npm run build
```

---

## 🎥 Video Integration

### **Daily.co Setup**
- Primary video integration via `@daily-co/daily-js`
- Backup: Twilio Video integration
- Permission handling: Use `camera-permission-fix.js`

### **Video Fixes Available**
1. **camera-permission-fix.js** - Auto-handles permissions
2. **ultimate-video-fix.js** - Complete flickering solution
3. **cover-video-fix.js** - CSS-based stability fix

**Usage:** Copy fix files to `client/public/` directory if needed

---

## 📋 Dependencies

### **Core Stack**
- React 18.3.1
- Daily.co for video conferencing
- Bootstrap for UI components
- Speech Recognition for transcription

### **Development Tools**
- React Scripts 5.0.1
- ESLint for code quality
- Webpack Dev Server

---

## 🔧 No Port Conflicts

This development environment is configured to use:
- **React Dev Server:** `localhost:3100` (clean port)
- **Backend Proxy:** `localhost:8000` (as configured)

No conflicts with other running applications!

---

## 📚 Documentation

- **STRUCTURE_OF_DIALOGUE.md** - Complete framework guide
- **Video fixes** - Ready to use if needed
- **Clean codebase** - Minimal experimental code

---

## 🎯 Ready for Development

✅ **Clean environment** - No file confusion  
✅ **Isolated dependencies** - No conflicts  
✅ **Essential files only** - Focused development  
✅ **Clear port assignment** - No port conflicts  
✅ **Video fixes included** - Ready for Daily.co integration  

**Start developing:** `cd client && npm run dev` 