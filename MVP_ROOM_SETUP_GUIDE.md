# MVP Room Setup Guide

## 🎯 **Enhanced Manual Room System - Ready for 6+ Remote Participants**

This guide will help you set up the room pool for immediate MVP testing with easy migration to API later.

## 📋 **Daily.co Rooms You Need to Create**

### **Step 1: Create These Rooms on Daily.co**

Go to [Daily.co](https://www.daily.co/) and create the following rooms manually:

#### **Main/Community Room (1 room)**
- `MainRoom` → `https://generativedialogue.daily.co/MainRoom`

#### **Dyad Rooms (5 rooms - supports 10 participants)**
- `Dyad1` → `https://generativedialogue.daily.co/Dyad1`
- `Dyad2` → `https://generativedialogue.daily.co/Dyad2`
- `Dyad3` → `https://generativedialogue.daily.co/Dyad3`
- `Dyad4` → `https://generativedialogue.daily.co/Dyad4`
- `Dyad5` → `https://generativedialogue.daily.co/Dyad5`

#### **Triad Rooms (4 rooms - supports 12 participants)**
- `Triad1` → `https://generativedialogue.daily.co/Triad1`
- `Triad2` → `https://generativedialogue.daily.co/Triad2`
- `Triad3` → `https://generativedialogue.daily.co/Triad3`
- `Triad4` → `https://generativedialogue.daily.co/Triad4`

#### **Quad Rooms (3 rooms - supports 12 participants)**
- `Quad1` → `https://generativedialogue.daily.co/Quad1`
- `Quad2` → `https://generativedialogue.daily.co/Quad2`
- `Quad3` → `https://generativedialogue.daily.co/Quad3`

#### **Kiva Rooms (2 rooms - supports 12 participants)**
- `Kiva1` → `https://generativedialogue.daily.co/Kiva1`
- `Kiva2` → `https://generativedialogue.daily.co/Kiva2`

### **Total System Capacity: 58 participants**
- 1 Main Room (50 people)
- 5 Dyad Rooms (10 people)
- 4 Triad Rooms (12 people) 
- 3 Quad Rooms (12 people)
- 2 Kiva Rooms (12 people)

## 🚀 **How the Enhanced System Works**

### **1. Session Creation**
- Host creates session code (e.g., `ABC123`)
- System shows room capacity and availability
- Rooms are pre-allocated but not assigned until participants join

### **2. Participant Joining**
- Participants join with session code
- System tracks participant count
- When ready, host assigns rooms using the **Room Assignment Manager**

### **3. Room Assignment Process**
- Host chooses room type (dyads, triads, quads, kivas)
- System automatically assigns participants to available rooms
- Each participant gets their specific Daily.co room URL
- Participants automatically join their assigned video room

### **4. Room Switching**
- Host can reassign rooms during dialogue phases
- Participants automatically switch to new rooms
- Support for Connect → Explore → Discover phase transitions

## 🔧 **Testing the MVP**

### **Immediate Test (6 participants)**
1. **Create session code** on dashboard
2. **Open 6 browser tabs** (simulate remote participants)
3. **Join with different names** in each tab
4. **Use Room Assignment Manager** to assign dyads (3 rooms)
5. **Test room switching** between different configurations

### **Scaling Test (12+ participants)**
- Use triads or quads to test higher capacity
- Verify room assignment algorithm balances participants
- Test reassignment during dialogue phases

## 📈 **Migration Path to API**

When you're ready to scale beyond ~30 participants:

### **Phase 1: Current Enhanced Manual (0-30 participants)**
- ✅ Works immediately with pre-created rooms
- ✅ No API costs or complexity
- ✅ Perfect for MVP validation

### **Phase 2: Hybrid System (30-100 participants)**
- Add Daily.co API for overflow rooms
- Keep manual rooms as primary pool
- Automatic fallback to API when pool exhausted

### **Phase 3: Full API (100+ participants)**
- Replace room pool with API-generated rooms
- Dynamic room creation/destruction
- Advanced features (recording, transcription, etc.)

## 🎯 **Key Benefits of This Approach**

### **Immediate Benefits**
- ✅ **Works today** - no API setup required
- ✅ **Real video calls** with your existing Daily.co setup
- ✅ **6+ remote participants** can test immediately
- ✅ **Room switching** for dialogue phases
- ✅ **Smart assignment** algorithm

### **Future Benefits**
- ✅ **Easy API migration** - just flip a config flag
- ✅ **Scalable architecture** - designed for growth
- ✅ **Cost-effective** - pay for API only when needed
- ✅ **Battle-tested** - validate concept before scaling

## 🔍 **What's New in This System**

### **Enhanced Features**
1. **Room Pool Management** - Smart allocation of pre-created rooms
2. **Participant Assignment** - Automatic balancing across rooms
3. **Room Switching** - Seamless transitions between dialogue phases
4. **System Monitoring** - Real-time capacity and usage stats
5. **Error Handling** - Graceful fallbacks and user feedback
6. **Development Tools** - Quick room switching for testing

### **Components Added**
- `RoomManager.js` - Core room management service
- `roomConfig.js` - Room pool configuration
- `RoomAssignmentManager.js` - UI for room assignments
- `EnhancedVideoSession.js` - Participant room switching

## 🎬 **Ready to Test!**

Once you create the Daily.co rooms, the system is ready for immediate testing with 6+ remote participants. The enhanced manual system provides a solid foundation that can seamlessly scale to API-based room creation when needed.

**Next Steps:**
1. Create the Daily.co rooms listed above
2. Test with multiple browser tabs
3. Invite real remote participants
4. Experience the full dialogue workflow with breakout rooms!



