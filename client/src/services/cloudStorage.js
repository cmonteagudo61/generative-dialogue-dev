/**
 * Cloud Storage Service
 * Handles data synchronization with Google Cloud/Firebase
 * Falls back to localStorage if cloud storage is unavailable
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';

class CloudStorageService {
  constructor() {
    this.isInitialized = false;
    this.isOnline = false;
    this.db = null;
    this.auth = null;
    this.userId = null;
    this.listeners = new Map();
    this.firebaseConfig = null;
  }

  /**
   * Set Firebase configuration
   */
  setConfig(config) {
    this.firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };
    
    // Persist config to localStorage so it survives page refreshes
    localStorage.setItem('firebaseConfig', JSON.stringify(this.firebaseConfig));
    console.log('🔧 Firebase config set and saved:', this.firebaseConfig);
  }

  /**
   * Initialize the cloud storage service
   */
  async initialize(config = null, skipAuth = false) {
    try {
      // Set config if provided
      if (config) {
        this.setConfig(config);
      } else {
        // Try to load config from localStorage
        try {
          const savedConfig = localStorage.getItem('firebaseConfig');
          console.log('🔧 Checking localStorage for firebaseConfig:', savedConfig ? 'Found' : 'Not found');
          if (savedConfig) {
            this.firebaseConfig = JSON.parse(savedConfig);
            console.log('🔧 Firebase config loaded from localStorage:', this.firebaseConfig);
          } else {
            console.log('🔧 No saved Firebase config found in localStorage');
          }
        } catch (error) {
          console.error('❌ Failed to load saved Firebase config:', error);
        }
      }

      // Check if Firebase config is available
      if (!this.firebaseConfig || !this.firebaseConfig.apiKey) {
        console.log('🔧 Firebase config not found, using localStorage only');
        return false;
      }

      // Initialize Firebase
      const app = initializeApp(this.firebaseConfig);
      this.db = getFirestore(app);
      
      if (!skipAuth) {
        this.auth = getAuth(app);

        // Set up authentication state listener
        onAuthStateChanged(this.auth, (user) => {
          if (user) {
            this.userId = user.uid;
            this.isOnline = true;
            console.log('🔐 Cloud storage authenticated:', this.userId);
          } else {
            this.userId = null;
            this.isOnline = false;
            console.log('🔐 Cloud storage authentication lost');
          }
        });

        // Sign in anonymously for now (can be upgraded to proper auth later)
        try {
          const userCredential = await signInAnonymously(this.auth);
          console.log('🔐 Anonymous sign-in successful:', userCredential.user.uid);
        } catch (authError) {
          console.error('🔐 Anonymous sign-in failed:', authError);
          console.error('Error code:', authError.code);
          console.error('Error message:', authError.message);
          
          // Check if it's a specific auth error we can handle
          if (authError.code === 'auth/operation-not-allowed') {
            throw new Error('Anonymous authentication is not enabled. Please enable it in Firebase Console > Authentication > Sign-in method > Anonymous.');
          } else if (authError.code === 'auth/api-key-not-valid') {
            throw new Error('Invalid API key. Please check your Firebase configuration.');
          } else {
            // Try without authentication as fallback
            console.log('🔄 Retrying without authentication...');
            return await this.initialize(config, true);
          }
        }
      } else {
        // Skip authentication, use a fixed user ID
        this.userId = 'anonymous-user';
        this.isOnline = true;
        console.log('🔧 Using cloud storage without authentication');
      }
      
      this.isInitialized = true;
      console.log('☁️ Cloud storage initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize cloud storage:', error);
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Save dialogues to cloud storage
   */
  async saveDialogues(dialogues) {
    if (!this.isOnline || !this.userId) {
      console.log('📱 Saving to localStorage (offline)');
      localStorage.setItem('generative_dialogues', JSON.stringify(dialogues));
      return;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'data', 'dialogues');
      await setDoc(docRef, {
        dialogues: dialogues,
        lastModified: serverTimestamp(),
        version: '1.0'
      });
      
      // Also save to localStorage as backup
      localStorage.setItem('generative_dialogues', JSON.stringify(dialogues));
      console.log('☁️ Dialogues saved to cloud storage');
      
    } catch (error) {
      console.error('❌ Failed to save to cloud storage:', error);
      // Fallback to localStorage
      localStorage.setItem('generative_dialogues', JSON.stringify(dialogues));
    }
  }

  /**
   * Load dialogues from cloud storage
   */
  async loadDialogues() {
    // Always try localStorage first for immediate loading
    const localDialogues = this.getLocalDialogues();
    
    if (!this.isOnline || !this.userId) {
      console.log('📱 Loading from localStorage (offline)');
      return localDialogues;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'data', 'dialogues');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        const cloudDialogues = cloudData.dialogues || [];
        
        // Merge cloud and local data (cloud takes precedence for conflicts)
        const mergedDialogues = this.mergeDialogues(localDialogues, cloudDialogues);
        
        // Update localStorage with merged data
        localStorage.setItem('generative_dialogues', JSON.stringify(mergedDialogues));
        
        console.log('☁️ Dialogues loaded and merged from cloud storage');
        return mergedDialogues;
      } else {
        // No cloud data, use local data and sync to cloud
        if (localDialogues.length > 0) {
          await this.saveDialogues(localDialogues);
        }
        return localDialogues;
      }
      
    } catch (error) {
      console.error('❌ Failed to load from cloud storage:', error);
      return localDialogues;
    }
  }

  /**
   * Get dialogues from localStorage
   */
  getLocalDialogues() {
    try {
      const saved = localStorage.getItem('generative_dialogues');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      return [];
    }
  }

  /**
   * Merge local and cloud dialogues, avoiding duplicates
   */
  mergeDialogues(localDialogues, cloudDialogues) {
    const merged = [...cloudDialogues];
    const cloudIds = new Set(cloudDialogues.map(d => d.id));
    
    // Add local dialogues that don't exist in cloud
    localDialogues.forEach(dialogue => {
      if (!cloudIds.has(dialogue.id)) {
        merged.push(dialogue);
      }
    });
    
    return merged;
  }

  /**
   * Set up real-time sync listener
   */
  setupRealtimeSync(onDialoguesUpdate) {
    if (!this.isOnline || !this.userId) {
      console.log('⚠️ Cannot setup real-time sync: not online or no user ID');
      return null;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'data', 'dialogues');
      
      console.log('🔄 Setting up real-time sync for user:', this.userId);
      
      let lastUpdateTime = 0;
      let lastDialogueCount = -1;
      
      const unsubscribe = onSnapshot(docRef, (doc) => {
        const now = Date.now();
        
        // Throttle updates to prevent excessive triggering
        if (now - lastUpdateTime < 500) {
          console.log('🔄 Real-time sync: throttled (too frequent)');
          return;
        }
        
        console.log('🔄 Real-time sync triggered, doc exists:', doc.exists());
        
        if (doc.exists()) {
          const cloudData = doc.data();
          const cloudDialogues = cloudData.dialogues || [];
          
          // Only update if the count actually changed
          if (cloudDialogues.length === lastDialogueCount) {
            console.log('🔄 Real-time sync: no change in dialogue count, skipping');
            return;
          }
          
          console.log('🔄 Real-time sync: received', cloudDialogues.length, 'dialogues');
          lastDialogueCount = cloudDialogues.length;
          lastUpdateTime = now;
          
          // Update localStorage
          localStorage.setItem('generative_dialogues', JSON.stringify(cloudDialogues));
          
          // Notify the app of the update
          onDialoguesUpdate(cloudDialogues);
          console.log('🔄 Real-time sync: dialogues updated successfully');
        } else {
          console.log('🔄 Real-time sync: document does not exist yet');
          if (lastDialogueCount !== 0) {
            lastDialogueCount = 0;
            lastUpdateTime = now;
            onDialoguesUpdate([]);
          }
        }
      }, (error) => {
        console.error('❌ Real-time sync listener error:', error);
      });

      this.listeners.set('dialogues', unsubscribe);
      console.log('✅ Real-time sync listener established');
      return unsubscribe;
      
    } catch (error) {
      console.error('❌ Failed to setup real-time sync:', error);
      return null;
    }
  }

  /**
   * Save catalyst library to cloud storage
   */
  async saveCatalysts(catalysts) {
    if (!this.isOnline || !this.userId) {
      localStorage.setItem('catalyst_library', JSON.stringify(catalysts));
      return;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'data', 'catalysts');
      await setDoc(docRef, {
        catalysts: catalysts,
        lastModified: serverTimestamp(),
        version: '1.0'
      });
      
      localStorage.setItem('catalyst_library', JSON.stringify(catalysts));
      console.log('☁️ Catalysts saved to cloud storage');
      
    } catch (error) {
      console.error('❌ Failed to save catalysts to cloud:', error);
      localStorage.setItem('catalyst_library', JSON.stringify(catalysts));
    }
  }

  /**
   * Load catalyst library from cloud storage
   */
  async loadCatalysts() {
    const localCatalysts = this.getLocalCatalysts();
    
    if (!this.isOnline || !this.userId) {
      return localCatalysts;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'data', 'catalysts');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        const cloudCatalysts = cloudData.catalysts || [];
        
        localStorage.setItem('catalyst_library', JSON.stringify(cloudCatalysts));
        return cloudCatalysts;
      } else {
        if (localCatalysts.length > 0) {
          await this.saveCatalysts(localCatalysts);
        }
        return localCatalysts;
      }
      
    } catch (error) {
      console.error('❌ Failed to load catalysts from cloud:', error);
      return localCatalysts;
    }
  }

  /**
   * Get catalysts from localStorage
   */
  getLocalCatalysts() {
    try {
      const saved = localStorage.getItem('catalyst_library');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('❌ Failed to load catalysts from localStorage:', error);
      return [];
    }
  }

  /**
   * Get connection status
   */
  /**
   * Save session data (breakout rooms, transcripts, etc.)
   */
  async saveSessionData(sessionId, sessionData) {
    if (!this.isOnline || !this.userId) {
      localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
      return;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'sessions', sessionId);
      await setDoc(docRef, {
        ...sessionData,
        lastUpdated: new Date().toISOString()
      });
      
      localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
      console.log(`☁️ Session ${sessionId} data saved to cloud`);
      
    } catch (error) {
      console.error(`❌ Failed to save session ${sessionId} to cloud:`, error);
      localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
    }
  }

  /**
   * Save breakout room data to cloud storage
   */
  async saveBreakoutRoom(sessionId, roomId, roomData) {
    if (!this.isOnline || !this.userId) {
      console.log('📱 Saving breakout room to localStorage (offline)');
      const existingRooms = JSON.parse(localStorage.getItem(`breakout_rooms_${sessionId}`) || '{}');
      existingRooms[roomId] = roomData;
      localStorage.setItem(`breakout_rooms_${sessionId}`, JSON.stringify(existingRooms));
      return;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'sessions', sessionId, 'breakoutRooms', roomId);
      await setDoc(docRef, {
        roomData: roomData,
        lastModified: serverTimestamp(),
        version: '1.0'
      });
      
      // Also save to localStorage as backup
      const existingRooms = JSON.parse(localStorage.getItem(`breakout_rooms_${sessionId}`) || '{}');
      existingRooms[roomId] = roomData;
      localStorage.setItem(`breakout_rooms_${sessionId}`, JSON.stringify(existingRooms));
      
      console.log(`☁️ Breakout room saved: ${roomData.name} for session ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to save breakout room:', error);
      // Fallback to localStorage
      const existingRooms = JSON.parse(localStorage.getItem(`breakout_rooms_${sessionId}`) || '{}');
      existingRooms[roomId] = roomData;
      localStorage.setItem(`breakout_rooms_${sessionId}`, JSON.stringify(existingRooms));
    }
  }

  /**
   * Load session data from cloud storage
   */
  async loadSessionData(sessionId) {
    const localData = this.getLocalSessionData(sessionId);
    
    if (!this.isOnline || !this.userId) {
      return localData;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'sessions', sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        console.log(`☁️ Session ${sessionId} loaded from cloud`);
        
        // Merge with local data, preferring newer timestamps
        const merged = this.mergeSessionData(localData, cloudData);
        localStorage.setItem(`session_${sessionId}`, JSON.stringify(merged));
        return merged;
      } else {
        console.log(`☁️ No cloud data for session ${sessionId}, using local`);
        if (localData && Object.keys(localData).length > 0) {
          await this.saveSessionData(sessionId, localData);
        }
        return localData;
      }
    } catch (error) {
      console.error(`❌ Failed to load session ${sessionId} from cloud:`, error);
      return localData;
    }
  }

  /**
   * Setup real-time sync for session data
   */
  setupSessionSync(sessionId, callback) {
    if (!this.isOnline || !this.userId) {
      console.log(`⚠️ Cannot setup session sync for ${sessionId}: offline`);
      return null;
    }

    try {
      const docRef = doc(this.db, 'users', this.userId, 'sessions', sessionId);
      
      let lastUpdateTime = 0;
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        const now = Date.now();
        if (now - lastUpdateTime < 500) {
          console.log(`🔄 Session ${sessionId} sync: throttled`);
          return;
        }

        if (docSnap.exists()) {
          const sessionData = docSnap.data();
          console.log(`🔄 Session ${sessionId} real-time update`);
          callback(sessionData);
          localStorage.setItem(`session_${sessionId}`, JSON.stringify(sessionData));
          lastUpdateTime = now;
        }
      }, (error) => {
        console.error(`❌ Session ${sessionId} sync error:`, error);
      });

      this.listeners.set(`session_${sessionId}`, unsubscribe);
      return unsubscribe;
      
    } catch (error) {
      console.error(`❌ Failed to setup session ${sessionId} sync:`, error);
      return null;
    }
  }

  /**
   * Get local session data
   */
  getLocalSessionData(sessionId) {
    try {
      const saved = localStorage.getItem(`session_${sessionId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error(`Error loading local session ${sessionId}:`, error);
      return {};
    }
  }

  /**
   * Merge session data, preferring newer timestamps
   */
  mergeSessionData(local, cloud) {
    if (!local || Object.keys(local).length === 0) return cloud;
    if (!cloud || Object.keys(cloud).length === 0) return local;

    const localTime = new Date(local.lastUpdated || 0);
    const cloudTime = new Date(cloud.lastUpdated || 0);

    // Return the newer data
    return cloudTime > localTime ? cloud : local;
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      userId: this.userId,
      storageType: this.isOnline ? 'cloud' : 'local'
    };
  }

  /**
   * Force sync local data to cloud
   */
  async syncToCloud() {
    if (!this.isOnline) {
      throw new Error('Cloud storage not available');
    }

    const dialogues = this.getLocalDialogues();
    const catalysts = this.getLocalCatalysts();

    await Promise.all([
      this.saveDialogues(dialogues),
      this.saveCatalysts(catalysts)
    ]);

    console.log('🔄 Manual sync to cloud completed');
  }
}

// Create singleton instance
const cloudStorage = new CloudStorageService();

export default cloudStorage;
