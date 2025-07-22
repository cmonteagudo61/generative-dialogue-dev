# 🤖 AI HANDOFF INSTRUCTIONS - Generative Dialogue Platform

## 🎯 **PROJECT OVERVIEW**

You're working on a **React-based video conferencing platform** for structured community dialogue. The platform guides participants through a specific dialogue methodology with multiple stages and view configurations.

### **Core Concept**
- **Video conferencing** with dynamic group sizes (1 person → full community)
- **Structured dialogue stages** with AI-powered transcription and analysis
- **Progressive intimacy** - small groups building to collective wisdom
- **Real-time collaboration** with voting, editing, and submission workflows

---

## 📍 **CURRENT STATE (Ready to Continue)**

### **✅ COMPLETED STAGES**
1. **CONNECT** - Dyad (2-person) connections and dialogue
2. **EXPLORE** - Triad (3-person) dialogues with AI summary and collective wisdom  
3. **DISCOVER** - Fishbowl (6-person) catalyst + KIVA breakout groups
4. **HARVEST** - Community instructions + Individual self-reflection

### **✅ TECHNICAL INFRASTRUCTURE**
- **12+ new components** with clean navigation flow
- **Video layouts** for all group sizes (1, 2, 3, 4, 6, fishbowl, community)
- **Stage-specific styling** and content management
- **Mock AI integration** with realistic data simulation
- **Bottom tab system** (Catalyst, Dialogue, Summary, WE)

---

## 🛠️ **HOW TO GET STARTED**

### **Option 1: Use Local Backup (FASTEST)**
```bash
cd /Users/carlosmonteagudo
cp -r BACKUPS/generative-dialogue-backup-20250721_232627 generative-dialogue-dev
cd generative-dialogue-dev/client
npm install
PORT=3100 npm start
```

### **Option 2: GitHub Restore**
```bash
cd /Users/carlosmonteagudo
git clone https://github.com/cmonteagudo61/generative-dialogue-dev.git
cd generative-dialogue-dev
git checkout e213fc4  # Known working commit
cd client
npm install
PORT=3100 npm start
```

### **Quick Verification**
- Navigate through pages: Landing → Input → Permissions → Video Conference
- Test dialogue stages: Connect → Explore → Discover → Harvest  
- Verify self button active on Individual Reflection page
- Check that Questions tab is removed from bottom navigation

---

## 🏗️ **ARCHITECTURE GUIDE**

### **Key Files to Understand**

#### **`client/src/App.js`**
- **Main router** - controls page flow and navigation
- **Pages array** defines the dialogue sequence
- **Navigation props** passed to all pages
- **Current pages:** `'landing', 'input', 'permissions', 'videoconference', 'connect-dyad', 'dyad-dialogue-connect', 'dyad-summary-review', 'voices-from-field', 'explore-catalyst', 'explore-triad-dialogue', 'explore-triad-summary', 'explore-collective-wisdom', 'discover-fishbowl-catalyst', 'discover-kiva-dialogue', 'discover-kiva-summary', 'discover-collective-wisdom', 'harvest', 'reflection'...`

#### **`client/src/components/AppLayout.js`**
- **Main layout wrapper** for all pages
- **Video size controls** (1, 2, 3, 4, 6, fishbowl, community)
- **Stage management** (connect, explore, discover, harvest)
- **Props flow** to BottomContentArea

#### **`client/src/components/BottomContentArea.js`**
- **Bottom half of screen** with tab navigation
- **Tab system:** Catalyst, Dialogue, Summary, WE
- **Stage-specific content** based on currentPage and props
- **Mock AI data** and interaction workflows

#### **`client/src/components/video/VideoGrid.js`**
- **Video layout engine** for all group configurations
- **Dynamic grid arrangements** based on participant count
- **Mock video participants** with realistic avatars

### **Stage-Specific Pages**
```
EXPLORE:
- ExploreTriadDialoguePage.js - Real-time transcription with edit/submit
- ExploreTriadSummaryPage.js - AI summary review and voting
- ExploreCollectiveWisdomPage.js - Voices from field + collective wisdom

DISCOVER:  
- DiscoverFishbowlCatalystPage.js - 6-person fishbowl with community witnessing
- DiscoverKivaDialoguePage.js - 6-person KIVA breakout groups
- DiscoverKivaSummaryPage.js - AI summary review and voting (6 participants)
- DiscoverCollectiveWisdomPage.js - Jazz ensemble metaphor

HARVEST:
- HarvestPage.js - Community instructions and transition
- IndividualReflectionPage.js - Self view active, questions in main area
```

---

## 🎨 **DEVELOPMENT PATTERNS**

### **Creating New Dialogue Pages**
1. **Create component** in `client/src/components/`
2. **Import and route** in `App.js` 
3. **Add to pages array** in correct sequence
4. **Use AppLayout wrapper** with appropriate props
5. **Pass stage-specific props** to BottomContentArea

### **Stage Props Pattern**
```javascript
// In page component
<AppLayout
  activeSize={activeView}
  viewMode={layout}
  activeStage="your-stage"  // Sets colors and styling
  defaultActiveTab="dialogue"  // Which tab to show
  isYourStageActive={true}  // Stage-specific flag
  currentPage={currentPage}
  // ... navigation props
>
```

### **Mock Data Patterns**
- **AI summaries** with themes, insights, quotes
- **Participant responses** with realistic names and content  
- **Voting systems** with state management
- **Real-time simulation** using setTimeout/setInterval

### **Color Coding**
- **CONNECT:** Blue (#2E5BBA)
- **EXPLORE:** Blue (#2E5BBA) 
- **DISCOVER:** Orange (#D2691E)
- **HARVEST:** Orange (#FF8C00)

---

## 🔧 **COMMON TASKS**

### **Adding New Video Layout**
1. Modify `VideoGrid.js` with new layout logic
2. Update `getLayoutFromView()` function
3. Add new size option to navigation controls

### **Adding Stage Content**
1. Add new props to `AppLayout.js` and `BottomContentArea.js`
2. Create conditional rendering block in `BottomContentArea.js`
3. Add mock data and interaction handlers

### **Debugging Navigation**
- Check `App.js` pages array order
- Verify currentPage prop passing
- Check activeStage prop for styling
- Ensure navigation props (onBack, onForward) are working

### **ESLint Warnings**
- **Common:** `no-unused-vars` for imported but unused components
- **Safe to ignore:** Mock data variables, development-only imports
- **Fix pattern:** Remove unused imports or add `// eslint-disable-next-line` 

---

## 🚀 **LIKELY NEXT STEPS**

### **High Priority**
1. **Real AI Integration** - Replace mock data with actual AI API calls
2. **Real Video** - Integrate WebRTC or video service (Zoom, Daily, etc.)
3. **User Authentication** - Add login/participant management
4. **Database Integration** - Store responses and session data

### **Medium Priority**
1. **Mobile Responsive** - Optimize for phone/tablet use
2. **Accessibility** - Add ARIA labels, keyboard navigation
3. **Performance** - Optimize large community views
4. **Testing** - Add unit tests for components

### **Future Features**
1. **Host Dashboard** - Admin controls for dialogue management
2. **Recording/Playback** - Session recording and review
3. **Analytics** - Dialogue effectiveness metrics
4. **Customization** - Configurable stages and questions

---

## 🧠 **IMPORTANT CONTEXT**

### **User's Preferences (from memory)**
- **Port 3100** for development server [[memory:3832739]]
- **Avoid definitive statements** that aren't demonstrably true [[memory:3832732]]

### **Design Philosophy**
- **Incremental intimacy** - start small, build to collective
- **Structured improvisation** - guided but not rigid
- **AI as facilitator** - enhances but doesn't replace human insight
- **Visual clarity** - clean interface that supports dialogue

### **Technical Decisions Made**
- **React functional components** with hooks
- **Mock data first** approach for rapid prototyping  
- **Component reusability** - AppLayout + VideoGrid pattern
- **Stage-based architecture** for scalable content management

---

## ⚠️ **THINGS TO WATCH OUT FOR**

1. **Port conflicts** - Always use `PORT=3100 npm start`
2. **ESLint warnings** - Usually safe to ignore for mock data
3. **Props drilling** - Complex prop chains through AppLayout → BottomContentArea
4. **State management** - Some components have complex state for voting/editing
5. **Mock timer conflicts** - Multiple setTimeout calls in development

---

## 📚 **QUICK REFERENCE**

### **Start Development**
```bash
cd generative-dialogue-dev/client
PORT=3100 npm start
```

### **Key Navigation**
- **Self button active:** Individual Reflection page
- **Questions tab removed:** Clean bottom navigation
- **Stage colors:** Blue (CONNECT/EXPLORE), Orange (DISCOVER/HARVEST)

### **Emergency Restore**
```bash
cd /Users/carlosmonteagudo  
cp -r BACKUPS/generative-dialogue-backup-20250721_232627 generative-dialogue-dev
```

**You're inheriting a solid, working dialogue platform. The foundation is strong - now you can focus on enhancing and extending the features! 🚀** 