import React, { useState, useEffect } from 'react';
import CatalystLibrary from './CatalystLibrary';
import TimeGuidance from './TimeGuidance';
import StageConfigurationPanel from './StageConfigurationPanel';
import './DialogueSetup.css';

const DialogueSetup = ({ onDialogueCreate, onClose, editingDialogue }) => {
  // Prompt Library state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('browse'); // 'browse' or 'create'
  
  const [config, setConfig] = useState({
    // Basic Info
    title: 'New Generative Dialogue',
    description: '',
    facilitator: 'AI Facilitator',
    
    // Input Page Configuration Fields
    host: '',
    gatheringSize: '',
    availableTime: '',
    diversity: '',
    familiarity: '',
    experience: '',
    theme: '',
    context: '',
    
    // Participant Settings
    maxParticipants: 30,
    minParticipants: 2,
    allowLateJoin: true,
    requireSignIn: true,
    
    // Standardized Dialogue Structure: Connect → Explore → Discover → Closing → Harvest
    stages: {
      opening: { 
        enabled: true, 
        substages: [
          { id: 'opening-1', name: 'Technical Setup & Welcome', viewMode: 'community', duration: 15, prompt: 'Welcome everyone! Let\'s ensure everyone can see and hear clearly, then we\'ll begin with introductions.' }
        ]
      },
      connect: { 
        enabled: true,
        substages: [
          { id: 'connect-catalyst', name: 'Catalyst', viewMode: 'community', duration: 10, prompt: 'Let\'s begin with a moment to center ourselves and connect to what brought us here today.', catalystType: 'meditation', catalystContent: 'Brief centering meditation or reading' },
          { id: 'connect-dialogue', name: 'Dialogue', viewMode: 'dyad', duration: 20, prompt: 'Share with your partner: What is alive in you right now? What brought you to this conversation?', breakoutInstructions: 'Form pairs and explore what\'s present for each of you today.' },
          { id: 'connect-summary', name: 'Summary', viewMode: 'breakout-processing', duration: 5, prompt: 'Review your transcript, make any edits, then create a summary of your key insights.', aiProcessing: true },
          { id: 'connect-we', name: 'WE', viewMode: 'community', duration: 15, prompt: 'What themes are emerging from our connections? What do we notice about our collective presence?', weCompilation: true }
        ]
      },
      explore: { 
        enabled: true,
        substages: [
          { id: 'explore-catalyst', name: 'Catalyst', viewMode: 'community', duration: 10, prompt: 'Let\'s deepen our inquiry with a catalyst to open new perspectives.', catalystType: 'reading', catalystContent: 'Poem, story, or provocative question' },
          { id: 'explore-dialogue', name: 'Dialogue', viewMode: 'triad', duration: 25, prompt: 'Building on what emerged in Connect, what wants to be explored more deeply? What questions are calling to you?', breakoutInstructions: 'Form triads and explore the emerging themes and questions.' },
          { id: 'explore-summary', name: 'Summary', viewMode: 'breakout-processing', duration: 5, prompt: 'Capture the essence of your exploration. What insights emerged? What questions deepened?', aiProcessing: true },
          { id: 'explore-we', name: 'WE', viewMode: 'community', duration: 15, prompt: 'What patterns are emerging across our explorations? What collective insights are surfacing?', weCompilation: true }
        ]
      },
      discover: { 
        enabled: true,
        substages: [
          { id: 'discover-catalyst', name: 'Catalyst', viewMode: 'community', duration: 10, prompt: 'Let\'s open to what wants to emerge that we haven\'t yet touched.', catalystType: 'fishbowl', catalystContent: 'Fishbowl dialogue or artistic stimulus' },
          { id: 'discover-dialogue', name: 'Dialogue', viewMode: 'quad', duration: 30, prompt: 'What is trying to emerge through our conversation? What wants to be discovered or created together?', breakoutInstructions: 'Form groups of four and explore what wants to emerge.' },
          { id: 'discover-summary', name: 'Summary', viewMode: 'breakout-processing', duration: 5, prompt: 'Distill the essence of what emerged. What discoveries surfaced? What wants to be born?', aiProcessing: true },
          { id: 'discover-we', name: 'WE', viewMode: 'community', duration: 20, prompt: 'What is the collective wisdom that has emerged? What are we discovering together?', weCompilation: true }
        ]
      },
      closing: { 
        enabled: true,
        substages: [
          { id: 'closing-1', name: 'Closing Circle', viewMode: 'community', duration: 15, prompt: 'How do we want to close this dialogue? What are we taking with us? What gratitude do we want to share?' }
        ]
      },
      harvest: { 
        enabled: true,
        substages: [
          { id: 'harvest-individual', name: 'Individual Harvest', viewMode: 'self', duration: 10, prompt: 'Take a few minutes to reflect: What are you taking away from this dialogue? What insights, questions, or commitments are you carrying forward?', individualProcessing: true, aiCompilation: true }
        ]
      }
    },

    
    // Catalyst Library
    catalystLibrary: {
      poetry: [
        {
          id: 'rumi-field',
          title: 'Out Beyond Ideas - Rumi',
          content: 'Out beyond ideas of wrongdoing and rightdoing,\nthere is a field. I\'ll meet you there.\n\nWhen the soul lies down in that grass,\nthe world is too full to talk about.\nIdeas, language, even the phrase "each other"\ndoesn\'t make any sense.',
          duration: 3,
          themes: ['connection', 'transcendence', 'unity']
        },
        {
          id: 'oliver-wild-geese',
          title: 'Wild Geese - Mary Oliver',
          content: 'You do not have to be good.\nYou do not have to walk on your knees\nfor a hundred miles through the desert repenting.\nYou only have to let the soft animal of your body\nlove what it loves.',
          duration: 4,
          themes: ['self-acceptance', 'authenticity', 'nature']
        }
      ],
      meditation: [
        {
          id: 'centering-breath',
          title: 'Centering Breath Practice',
          content: 'Let\'s begin by finding our center together. Close your eyes if that feels comfortable, or soften your gaze downward. Take three deep breaths with me... [Guided 5-minute centering practice]',
          duration: 5,
          themes: ['presence', 'grounding', 'collective']
        },
        {
          id: 'heart-opening',
          title: 'Heart Opening Meditation',
          content: 'Place one hand on your heart, one on your belly. Feel the rhythm of your heartbeat, the rise and fall of your breath. Now imagine your heart opening like a flower... [Guided heart-opening practice]',
          duration: 8,
          themes: ['compassion', 'vulnerability', 'connection']
        }
      ],
      reading: [
        {
          id: 'brown-belonging',
          title: 'True Belonging - Brené Brown',
          content: 'True belonging is the spiritual practice of believing in and belonging to yourself so deeply that you can share your most authentic self with the world and find sacredness in both being a part of something and standing alone in the wilderness.',
          duration: 3,
          themes: ['belonging', 'authenticity', 'courage']
        },
        {
          id: 'palmer-hidden-wholeness',
          title: 'A Hidden Wholeness - Parker Palmer',
          content: 'We live in a world that seems to prize the external over the internal, doing over being, the quick fix over the long journey. But the soul is shy and prefers the hidden wholeness that comes from deep listening.',
          duration: 4,
          themes: ['wholeness', 'listening', 'soul']
        }
      ]
    },

    // Common Dialogue Prompts
    commonPrompts: {
      catalyst: [
        'What resonated most deeply with you in this catalyst?',
        'What feelings or sensations arose as you experienced this?',
        'What questions or curiosities emerged for you?',
        'How does this connect to what brought you here today?',
        'What wants to be explored further from what we just shared?',
        'What did you notice in your body or heart during this experience?'
      ],
      dialogue: [
        'What is most alive for you right now in relation to our topic?',
        'What questions are you holding that you\'d love to explore together?',
        'What perspective or experience do you bring that might serve our conversation?',
        'What would you like to understand more deeply through dialogue?',
        'What assumptions or beliefs are you curious to examine?',
        'What story or experience wants to be shared in service of our collective inquiry?'
      ],
      summary: [
        'What were the key insights or discoveries from your dialogue?',
        'What themes or patterns emerged in your conversation?',
        'What questions deepened or evolved through your exchange?',
        'What surprised you about what emerged in your dialogue?',
        'What feels most important to carry forward from this conversation?',
        'How did your understanding shift or expand through this dialogue?'
      ],
      we: [
        'What themes are you hearing across our various conversations?',
        'What collective wisdom seems to be emerging from our dialogues?',
        'What voices from the field want to be heard by our whole community?',
        'What patterns or insights are surfacing that serve our collective inquiry?',
        'What questions are arising that our whole community might explore?',
        'What gifts are emerging from our conversations that want to be shared?'
      ]
    },

    // Time Guidance System
    timeGuidance: {
      60: { // 60-minute session
        recommended: { connect: 15, explore: 20, discover: 20, closing: 5 },
        breakoutSizes: ['dyad', 'triad'],
        notes: 'Intimate session - focus on dyads for deeper connection'
      },
      90: { // 90-minute session  
        recommended: { connect: 20, explore: 25, discover: 30, closing: 10, harvest: 5 },
        breakoutSizes: ['dyad', 'triad', 'quad'],
        notes: 'Balanced session - triads work well for most groups'
      },
      180: { // 3-hour session
        recommended: { connect: 35, explore: 45, discover: 60, closing: 15, harvest: 15 },
        breakoutSizes: ['dyad', 'triad', 'quad', 'kiva'],
        notes: 'Deep session - can accommodate larger breakouts and deeper inquiry'
      }
    },
    
    // AI & Processing
    aiSettings: {
      transcription: { enabled: true, provider: 'deepgram', language: 'en', diarization: true },
      enhancement: { enabled: true, provider: 'claude', realTime: false },
      synthesis: { enabled: true, provider: 'grok', frequency: 'per-stage' },
      insights: { enabled: true, provider: 'openai', growthTracking: true, collectiveAnalysis: true },
      facilitation: { enabled: true, provider: 'claude' },
      analysis: { enabled: true, provider: 'openai' }
    },
    
    // Technical Settings
    technical: {
      videoProvider: 'daily',
      audioQuality: 'high',
      videoQuality: 'adaptive',
      recordSession: false,
      backupTranscripts: true,
      realTimeSync: true
    },
    
    // Prompts & Catalysts
    prompts: {
      opening: "What brought you here today, and what are you hoping to discover together?",
      connect: "Share a story or experience that feels alive for you right now.",
      explore: "What patterns or themes are emerging from our conversation?",
      discover: "What wants to emerge that we haven't yet spoken?",
      harvest: "What are you taking away from this dialogue?"
    },
    
    // Timing & Flow
    timing: {
      autoAdvance: false,
      stageWarnings: true,
      warningTime: 5, // minutes before stage ends
      breaksBetweenStages: true,
      breakDuration: 2 // minutes
    }
  });

  const [activeSection, setActiveSection] = useState('basic');
  const [previewMode, setPreviewMode] = useState(false);
  const [showCatalystLibrary, setShowCatalystLibrary] = useState(false);
  const [catalystSelectionContext, setCatalystSelectionContext] = useState(null);

  // Legacy catalyst library - kept for reference but replaced by CatalystLibrary component
  // eslint-disable-next-line no-unused-vars
  const catalystLibrary = {
    poetry: [
      { id: 'rumi-field', title: 'Out Beyond Ideas - Rumi', content: 'Out beyond ideas of wrongdoing and rightdoing, there is a field. I\'ll meet you there.' },
      { id: 'oliver-attention', title: 'Attention - Mary Oliver', content: 'Attention is the beginning of devotion.' },
      { id: 'whyte-conversation', title: 'The Conversation - David Whyte', content: 'All conversations are with yourself, and sometimes they are with other people.' }
    ],
    meditation: [
      { id: 'centering-breath', title: 'Centering Breath', content: 'Take three deep breaths. With each exhale, let go of what brought you here. With each inhale, arrive fully in this moment.' },
      { id: 'gratitude-moment', title: 'Gratitude Moment', content: 'Place your hand on your heart. Feel three things you\'re grateful for in this moment.' },
      { id: 'intention-setting', title: 'Intention Setting', content: 'What intention do you bring to this conversation? What do you hope will emerge?' }
    ],
    reading: [
      { id: 'brown-vulnerability', title: 'Vulnerability - Brené Brown', content: 'Vulnerability is not winning or losing; it\'s having the courage to show up when you can\'t control the outcome.' },
      { id: 'palmer-hidden', title: 'A Hidden Wholeness - Parker Palmer', content: 'We are all more than we know, and more than we let on, even to ourselves.' }
    ]
  };

  // Common Prompts for different substages
  const commonPrompts = {
    catalyst: [
      'What resonated most deeply with you in this catalyst?',
      'What feelings or sensations arose as you experienced this?',
      'What questions or curiosities emerged for you?',
      'How does this connect to what brought you here today?',
      'What wants to be explored further from what we just shared?',
      'What did you notice in your body or heart during this experience?'
    ],
    dialogue: [
      'What is most alive for you right now in relation to our topic?',
      'What questions are you holding that you\'d love to explore together?',
      'What perspective or experience do you bring that might serve our conversation?',
      'What would you like to understand more deeply through dialogue?',
      'What assumptions or beliefs are you curious to examine?',
      'What story or experience wants to be shared in service of our collective inquiry?'
    ],
    summary: [
      'What were the key insights or discoveries from your dialogue?',
      'What themes or patterns emerged in your conversation?',
      'What questions arose that want further exploration?',
      'What surprised you in your exchange?',
      'What would you want the larger group to know from your dialogue?',
      'What felt most significant or meaningful from your time together?'
    ],
    we: [
      'What themes are emerging from our collective sharing?',
      'What patterns do you notice across our different conversations?',
      'What questions are arising for our community from what we\'ve heard?',
      'What wisdom is wanting to emerge from our time together?',
      'What do you sense about our collective journey or learning?',
      'What wants to be acknowledged or celebrated from our sharing?'
    ]
  };

  // Populate config when editing an existing dialogue
  useEffect(() => {
    if (editingDialogue) {
      // Create default config structure for merging
      const defaultConfig = {
        // Basic Info
        title: 'New Generative Dialogue',
        description: '',
        facilitator: 'AI Facilitator',
        
        // Input Page Configuration Fields
        host: '',
        gatheringSize: '',
        availableTime: '',
        diversity: '',
        familiarity: '',
        experience: '',
        theme: '',
        context: '',
        
        // Participant Settings
        maxParticipants: 30,
        minParticipants: 2,
        allowLateJoin: true,
        requireSignIn: true,
        
        // Standardized Dialogue Structure: Connect → Explore → Discover → Harvest
        stages: {
          opening: { 
            enabled: true, 
            substages: [
              { id: 'opening-1', name: 'Technical Setup & Welcome', viewMode: 'community', duration: 15, prompt: 'Welcome everyone! Let\'s ensure everyone can see and hear clearly, then we\'ll begin with introductions.' }
            ]
          },
          connect: { 
            enabled: true,
            substages: [
              { id: 'connect-catalyst', name: 'Catalyst', viewMode: 'community', duration: 10, prompt: 'Let\'s begin with a moment to center ourselves and connect to what brought us here today.', catalystType: 'meditation', catalystContent: 'Brief centering meditation or reading' },
              { id: 'connect-dialogue', name: 'Dialogue', viewMode: 'dyad', duration: 20, prompt: 'Share with your partner: What is alive in you right now? What brought you to this conversation?', breakoutInstructions: 'Form pairs and explore what\'s present for each of you today.' },
              { id: 'connect-summary', name: 'Summary', viewMode: 'breakout-processing', duration: 5, prompt: 'Review your transcript, make any edits, then create a summary of your key insights.', aiProcessing: true },
              { id: 'connect-we', name: 'WE', viewMode: 'community', duration: 15, prompt: 'What themes are emerging from our connections? What do we notice about our collective presence?', weCompilation: true }
            ]
          },
          explore: { 
            enabled: true,
            substages: [
              { id: 'explore-catalyst', name: 'Catalyst', viewMode: 'community', duration: 10, prompt: 'Let\'s deepen our inquiry with a catalyst to open new perspectives.', catalystType: 'reading', catalystContent: 'Poem, story, or provocative question' },
              { id: 'explore-dialogue', name: 'Dialogue', viewMode: 'triad', duration: 25, prompt: 'Building on what emerged in Connect, what wants to be explored more deeply? What questions are calling to you?', breakoutInstructions: 'Form triads and explore the emerging themes and questions.' },
              { id: 'explore-summary', name: 'Summary', viewMode: 'breakout-processing', duration: 5, prompt: 'Capture the essence of your exploration. What insights emerged? What questions deepened?', aiProcessing: true },
              { id: 'explore-we', name: 'WE', viewMode: 'community', duration: 15, prompt: 'What patterns are emerging across our explorations? What collective insights are surfacing?', weCompilation: true }
            ]
          },
          discover: { 
            enabled: true,
            substages: [
              { id: 'discover-catalyst', name: 'Catalyst', viewMode: 'community', duration: 10, prompt: 'Let\'s open to what wants to emerge that we haven\'t yet touched.', catalystType: 'fishbowl', catalystContent: 'Fishbowl dialogue or artistic stimulus' },
              { id: 'discover-dialogue', name: 'Dialogue', viewMode: 'quad', duration: 30, prompt: 'What is trying to emerge through our conversation? What wants to be discovered or created together?', breakoutInstructions: 'Form groups of four and explore what wants to emerge.' },
              { id: 'discover-summary', name: 'Summary', viewMode: 'breakout-processing', duration: 5, prompt: 'Distill the essence of what emerged. What discoveries surfaced? What wants to be born?', aiProcessing: true },
              { id: 'discover-we', name: 'WE', viewMode: 'community', duration: 20, prompt: 'What is the collective wisdom that has emerged? What are we discovering together?', weCompilation: true }
            ]
          },
          closing: { 
            enabled: true,
            substages: [
              { id: 'closing-gratitude', name: 'Gratitude & Closing', viewMode: 'community', duration: 15, prompt: 'Share appreciations and close our formal dialogue time together.', closingRitual: true }
            ]
          },
          harvest: { 
            enabled: true,
            substages: [
              { id: 'harvest-individual', name: 'Individual Reflection', viewMode: 'individual', duration: 15, prompt: 'Take time for personal reflection on your journey through this dialogue. What insights, learnings, or commitments are you taking from this experience?', individualReflection: true }
            ]
          }
        }
      };
      
      // Merge editing dialogue with default config to ensure all required fields exist
      const mergedConfig = {
        ...defaultConfig, // Start with default config
        ...editingDialogue, // Override with editing dialogue data
        stages: {
          ...defaultConfig.stages, // Start with default stages
          ...editingDialogue.stages // Override with editing dialogue stages
        }
      };
      
      // Fix harvest stage to remove old "Harvest Sharing" substage if it exists
      if (mergedConfig.stages.harvest && mergedConfig.stages.harvest.substages) {
        const harvestSubstages = mergedConfig.stages.harvest.substages;
        const hasHarvestSharing = harvestSubstages.some(sub => sub.id === 'harvest-sharing');
        
        if (hasHarvestSharing) {
          // Remove harvest sharing and ensure only individual reflection remains
          mergedConfig.stages.harvest.substages = [
            {
              id: 'harvest-individual',
              name: 'Individual Reflection',
              viewMode: 'individual',
              duration: harvestSubstages.reduce((total, sub) => total + (parseInt(sub.duration) || 0), 0),
              prompt: 'Take time for personal reflection on your journey through this dialogue. What insights, learnings, or commitments are you taking from this experience?',
              individualReflection: true
            }
          ];
        }
      }
      
      // Ensure at least one stage is enabled
      const enabledStages = Object.values(mergedConfig.stages).filter(s => s.enabled);
      if (enabledStages.length === 0) {
        // Enable the connect stage by default if no stages are enabled
        mergedConfig.stages.connect.enabled = true;
      }
      
      setConfig(mergedConfig);
    }
  }, [editingDialogue]);

  // Dialogue Templates
  const templates = {
    'community-dialogue': {
      title: 'Community Dialogue',
      description: 'Standard community conversation with all stages',
      maxParticipants: 30,
      stages: {
        setup: { enabled: true, duration: 15 },
        orientation: { enabled: true, duration: 10 },
        connect: { enabled: true, duration: 45 },
        explore: { enabled: true, duration: 60 },
        discover: { enabled: true, duration: 45 },
        harvest: { enabled: true, duration: 30 }
      }
    },
    'intimate-circle': {
      title: 'Intimate Circle',
      description: 'Small group deep dialogue (6-12 people)',
      maxParticipants: 12,
      viewModes: {
        fishbowl: { enabled: false },
        kiva: { enabled: false },
        community: { enabled: false }
      }
    },
    'large-scale': {
      title: 'Large Scale Dialogue',
      description: 'Designed for 50+ participants',
      maxParticipants: 100,
      stages: {
        connect: { duration: 30 },
        explore: { duration: 45 },
        discover: { duration: 60 },
        harvest: { duration: 45 }
      }
    },
    'research-session': {
      title: 'Research Session',
      description: 'Enhanced recording and analysis for research',
      technical: {
        recordSession: true,
        backupTranscripts: true,
        realTimeSync: true
      },
      aiSettings: {
        enhancement: { realTime: true },
        insights: { growthTracking: true }
      }
    }
  };

  const loadTemplate = (templateKey) => {
    const template = templates[templateKey];
    setConfig(prev => ({
      ...prev,
      ...template
    }));
  };

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateNestedConfig = (section, subsection, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [key]: value
        }
      }
    }));
  };

  const calculateTotalDuration = () => {
    let total = 0;
    Object.entries(config.stages).forEach(([stage, settings]) => {
      if (settings.enabled && settings.substages) {
        // Exclude harvest from committed dialogue time - it's post-dialogue
        if (stage === 'harvest') return;
        
        // Sum all substage durations
        const stageDuration = settings.substages.reduce((sum, substage) => sum + substage.duration, 0);
        total += stageDuration;
        
        // Add break time between stages (not between substages)
        if (config.timing.breaksBetweenStages && stage !== 'closing') {
          total += config.timing.breakDuration;
        }
      }
    });
    return total;
  };

  const formatDuration = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const validateConfig = () => {
    const errors = [];
    
    if (!config.title.trim()) errors.push('Title is required');
    if (config.maxParticipants < config.minParticipants) {
      errors.push('Max participants must be greater than min participants');
    }
    
    const enabledStages = Object.values(config.stages).filter(s => s.enabled);
    if (enabledStages.length === 0) {
      errors.push('At least one stage must be enabled');
    }
    
    return errors;
  };

  // Catalyst Library Handlers
  const handleOpenCatalystLibrary = (stage, substageIndex) => {
    setCatalystSelectionContext({ stage, substageIndex });
    setShowCatalystLibrary(true);
  };

  const handleSelectCatalyst = (catalyst) => {
    if (catalystSelectionContext) {
      const { stage, substageIndex } = catalystSelectionContext;
      
      // Update the catalyst content in the substage
      updateSubstage(stage, substageIndex, 'catalystContent', catalyst.id);
      updateSubstage(stage, substageIndex, 'catalystType', catalyst.type || 'text');
      
      // Store the full catalyst data for reference
      updateSubstage(stage, substageIndex, 'selectedCatalyst', catalyst);
    }
    
    setShowCatalystLibrary(false);
    setCatalystSelectionContext(null);
  };

  const getSelectedCatalystInfo = (stage, substageIndex) => {
    const substage = config.stages[stage]?.substages?.[substageIndex];
    return substage?.selectedCatalyst || null;
  };

  // Time Guidance Handlers
  const handleApplyTimeRecommendation = (recommendedConfig) => {
    console.log('🎯 DialogueSetup: Received recommendation:', recommendedConfig);
    
    // Merge the recommended configuration with current config
    const updatedConfig = {
      ...config,
      stages: {
        ...config.stages,
        ...recommendedConfig.stages
      }
    };
    
    console.log('🎯 DialogueSetup: Updated config:', updatedConfig);
    setConfig(updatedConfig);
    
    // Show success message
    alert('✅ Configuration applied successfully! Check the stages below.');
  };

  const handleCreate = () => {
    const errors = validateConfig();
    if (errors.length > 0) {
      alert('Please fix the following errors:\n' + errors.join('\n'));
      return;
    }
    
    const calculatedDuration = calculateTotalDuration();
    console.log('💾 Saving dialogue with duration:', calculatedDuration, 'minutes');
    
    const dialogueConfig = {
      ...config,
      id: editingDialogue ? editingDialogue.id : `dialogue_${Date.now()}`,
      createdAt: editingDialogue ? editingDialogue.createdAt : new Date().toISOString(),
      totalDuration: calculatedDuration
    };
    
    console.log('💾 Full dialogue config being saved:', dialogueConfig);
    onDialogueCreate(dialogueConfig);
  };

  const loadStandardTemplate = () => {
    const standardTemplate = {
      title: 'Standard Generative Dialogue',
      description: 'A structured dialogue following the Connect → Explore → Discover → Harvest framework',
      facilitator: 'AI Facilitator',
      maxParticipants: 30,
      minParticipants: 6,
      allowLateJoin: false,
      requireSignIn: true
    };
    
    setConfig(prev => ({ ...prev, ...standardTemplate }));
  };

  const renderBasicSettings = () => (
    <div className="config-section">
      <h3>Basic Information</h3>
      
      {!editingDialogue && (
        <div className="template-actions">
          <button 
            className="template-btn standard-template"
            onClick={loadStandardTemplate}
          >
            🎯 Load Standard Dialogue Template
          </button>
          <p className="template-description">
            Uses the proven Connect → Explore → Discover → Harvest structure with Catalyst → Dialogue → Summary → WE substages
          </p>
        </div>
      )}
      
      <div className="form-group">
        <label>Dialogue Title</label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter dialogue title"
        />
      </div>
      
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of the dialogue purpose"
          rows={3}
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Host</label>
          <input
            type="text"
            value={config.host || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
            placeholder="Host name"
          />
        </div>
        
        <div className="form-group">
          <label>Gathering Size</label>
          <input
            type="number"
            value={config.gatheringSize || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, gatheringSize: parseInt(e.target.value) || '' }))}
            min="2"
            max="500"
            placeholder="Number of participants"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Available Time (in minutes)</label>
          <input
            type="number"
            value={config.availableTime || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, availableTime: parseInt(e.target.value) || '' }))}
            min="15"
            max="480"
            placeholder="Total time available"
          />
        </div>
        
        <div className="form-group">
          <label>Diversity of the Group</label>
          <select
            value={config.diversity || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, diversity: e.target.value }))}
          >
            <option value="">Select diversity level</option>
            <option value="homogeneous">Homogeneous - Similar backgrounds</option>
            <option value="mixed">Mixed - Some diversity</option>
            <option value="diverse">Diverse - Wide range of backgrounds</option>
            <option value="highly-diverse">Highly Diverse - Very different backgrounds</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Familiarity</label>
          <select
            value={config.familiarity || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, familiarity: e.target.value }))}
          >
            <option value="">Select familiarity level</option>
            <option value="strangers">Strangers - Don't know each other</option>
            <option value="acquaintances">Acquaintances - Some know each other</option>
            <option value="colleagues">Colleagues - Work together</option>
            <option value="friends">Friends - Close relationships</option>
            <option value="mixed">Mixed - Various levels of familiarity</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Experience With Generative Dialogue</label>
          <select
            value={config.experience || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, experience: e.target.value }))}
          >
            <option value="">Select experience level</option>
            <option value="none">None - First time</option>
            <option value="minimal">Minimal - 1-2 sessions</option>
            <option value="some">Some - Several sessions</option>
            <option value="experienced">Experienced - Many sessions</option>
            <option value="expert">Expert - Regular practitioner</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Theme/Issue Being Explored</label>
        <textarea
          value={config.theme || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, theme: e.target.value }))}
          placeholder="What topic or issue will the dialogue explore?"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Context/Field</label>
        <textarea
          value={config.context || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, context: e.target.value }))}
          placeholder="What context or field does this dialogue relate to? (e.g., organization, community, academic, etc.)"
          rows={3}
        />
      </div>
      
      <div className="checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={config.allowLateJoin}
            onChange={(e) => setConfig(prev => ({ ...prev, allowLateJoin: e.target.checked }))}
          />
          Allow participants to join after dialogue starts
        </label>
        
        <label>
          <input
            type="checkbox"
            checked={config.requireSignIn}
            onChange={(e) => setConfig(prev => ({ ...prev, requireSignIn: e.target.checked }))}
          />
          Require participant sign-in
        </label>
      </div>

      {/* Time Guidance System */}
      {config.availableTime && config.gatheringSize && (
        <TimeGuidance
          availableTime={config.availableTime}
          participantCount={config.gatheringSize}
          currentConfig={config}
          onRecommendationApply={handleApplyTimeRecommendation}
          onConfigUpdate={setConfig}
        />
      )}

      {/* Stage-by-Stage Configuration Panel */}
      {config.availableTime && config.gatheringSize && (
        <StageConfigurationPanel
          config={config}
          onConfigUpdate={setConfig}
          availableTime={config.availableTime}
          participantCount={config.gatheringSize}
        />
      )}
    </div>
  );

  // eslint-disable-next-line no-unused-vars
  const addSubstage = (stage) => {
    console.log('🔧 addSubstage called for stage:', stage);
    console.log('🔧 Current config.stages:', config.stages);
    console.log('🔧 Current stage config:', config.stages[stage]);
    
    try {
      const newSubstage = {
        id: `${stage}-${Date.now()}`,
        name: 'New Substage',
        viewMode: 'community',
        duration: 10,
        prompt: 'Enter your prompt here...'
      };
      
      // Ensure substages array exists
      const currentStage = config.stages[stage] || {};
      const currentSubstages = currentStage.substages || [];
      
      console.log('🔧 Current substages:', currentSubstages);
      console.log('🔧 New substage:', newSubstage);
      
      const updatedStage = {
        ...currentStage,
        substages: [...currentSubstages, newSubstage]
      };
      
      console.log('🔧 Updated stage:', updatedStage);
      
      updateConfig('stages', stage, updatedStage);
      console.log('🔧 addSubstage completed successfully');
    } catch (error) {
      console.error('❌ Error adding substage:', error);
      // Silently handle error to prevent UI flashing
    }
  };

  const updateSubstage = (stage, substageIndex, field, value) => {
    try {
      const currentStage = config.stages[stage] || {};
      const currentSubstages = currentStage.substages || [];
      
      // If substage doesn't exist, create it
      if (substageIndex < 0 || substageIndex >= currentSubstages.length) {
        console.log(`Creating missing substage at index ${substageIndex} for stage ${stage}`);
        return;
      }
      
      const updatedSubstages = [...currentSubstages];
      updatedSubstages[substageIndex] = {
        ...updatedSubstages[substageIndex],
        [field]: value
      };
      
      const updatedStage = {
        ...currentStage,
        substages: updatedSubstages
      };
      
      updateConfig('stages', stage, updatedStage);
    } catch (error) {
      console.error('Error updating substage:', error);
      // Silently handle error to prevent UI flashing
    }
  };

  // Helper function to ensure substage exists
  const ensureSubstageExists = (stage, substageType) => {
    const currentStage = config.stages[stage] || {};
    const currentSubstages = currentStage.substages || [];
    
    // Check if substage already exists
    const existingIndex = currentSubstages.findIndex(s => 
      s?.name?.toLowerCase() === substageType || s?.id?.includes(substageType)
    );
    
    if (existingIndex >= 0) {
      return existingIndex;
    }
    
    // Create new substage
    const newSubstage = {
      id: `${stage}-${substageType}`,
      name: substageType.charAt(0).toUpperCase() + substageType.slice(1),
      viewMode: substageType === 'catalyst' || substageType === 'summary' || substageType === 'we' ? 'community' : 'dyad',
      duration: substageType === 'catalyst' ? 10 : substageType === 'dialogue' ? 20 : substageType === 'summary' ? 5 : 15,
      prompt: `Enter ${substageType} instructions here...`,
      ...(substageType === 'catalyst' && { catalystType: 'meditation', catalystContent: '' }),
      ...(substageType === 'summary' && { aiProcessing: true }),
      ...(substageType === 'we' && { weCompilation: true })
    };
    
    const updatedSubstages = [...currentSubstages, newSubstage];
    const updatedStage = {
      ...currentStage,
      substages: updatedSubstages
    };
    
    updateConfig('stages', stage, updatedStage);
    return updatedSubstages.length - 1;
  };

  // eslint-disable-next-line no-unused-vars
  const removeSubstage = (stage, substageIndex) => {
    try {
      const currentStage = config.stages[stage] || {};
      const currentSubstages = currentStage.substages || [];
      
      if (substageIndex < 0 || substageIndex >= currentSubstages.length) {
        throw new Error(`Invalid substage index: ${substageIndex}`);
      }
      
      const updatedSubstages = currentSubstages.filter((_, index) => index !== substageIndex);
      const updatedStage = {
        ...currentStage,
        substages: updatedSubstages
      };
      
      updateConfig('stages', stage, updatedStage);
    } catch (error) {
      console.error('Error removing substage:', error);
      // Silently handle error to prevent UI flashing
    }
  };

  const renderStageSettings = () => (
    <div className="config-section">
      <h3>Dialogue Stages</h3>
      <p className="section-description">
        Configure each stage with its four substages: Catalyst → Dialogue → Summary → WE. 
        Total duration: <strong>{formatDuration(calculateTotalDuration())}</strong>
      </p>
      

      
      {/* Opening Stage */}
      {config.stages.opening?.enabled && (
        <div className="stage-config opening-stage">
          <div className="stage-header">
            <h4>🌅 Opening</h4>
            <p>Technical setup, welcome, and introductions</p>
          </div>
          <div className="simple-stage-content">
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={config.stages.opening.substages?.[0]?.duration || 15}
                onChange={(e) => updateSubstage('opening', 0, 'duration', parseInt(e.target.value))}
                min="5"
                max="60"
              />
            </div>
            <div className="form-group">
              <label>Instructions</label>
              <textarea
                value={config.stages.opening.substages?.[0]?.prompt || ''}
                onChange={(e) => updateSubstage('opening', 0, 'prompt', e.target.value)}
                placeholder="Welcome message and technical setup instructions"
                rows="3"
              />
            </div>
          </div>
        </div>
      )}

      {/* Connect, Explore, Discover Stages */}
      {['connect', 'explore', 'discover'].map(stage => 
        config.stages[stage]?.enabled && (
          <div key={stage} className="stage-config main-stage">
            <div className="stage-header">
              <h4>{stage === 'connect' ? '🤝 Connect' : stage === 'explore' ? '🔍 Explore' : '💎 Discover'}</h4>
              <p>{getStageDescription(stage)}</p>
            </div>

            {/* General Breakout Dialogue Parameters */}
            <div className="stage-section">
              <h5>General Breakout Dialogue Parameters</h5>
              <div className="form-row">
                <div className="form-group">
                  <label>Breakout Dialogue Size</label>
                  <select
                    value={config.stages[stage]?.substages?.find(s => s?.name === 'Dialogue')?.viewMode || 'dyad'}
                    onChange={(e) => {
                      const dialogueIndex = ensureSubstageExists(stage, 'dialogue');
                      updateSubstage(stage, dialogueIndex, 'viewMode', e.target.value);
                    }}
                  >
                    <option value="dyad">Dyad (2 people - 10 min)</option>
                    <option value="triad">Triad (3 people - 15 min)</option>
                    <option value="quad">Quad (4 people - 20 min)</option>
                    <option value="kiva">Kiva (6 people - 30 min)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Catalyst Type</label>
                  <select
                    value={config.stages[stage]?.substages?.find(s => s?.name === 'Catalyst')?.catalystType || 'meditation'}
                    onChange={(e) => {
                      const catalystIndex = ensureSubstageExists(stage, 'catalyst');
                      updateSubstage(stage, catalystIndex, 'catalystType', e.target.value);
                    }}
                  >
                    <option value="poetry">Poetry</option>
                    <option value="meditation">Meditation</option>
                    <option value="reading">Reading</option>
                    <option value="music">Music</option>
                    <option value="art">Art/Image</option>
                    <option value="video">Short Video</option>
                    <option value="fishbowl">Fishbowl Dialogue</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Time for Breakout Dialogue</label>
                  <input
                    type="number"
                    value={config.stages[stage]?.substages?.find(s => s?.name === 'Dialogue')?.duration || 20}
                    onChange={(e) => {
                      const dialogueIndex = ensureSubstageExists(stage, 'dialogue');
                      updateSubstage(stage, dialogueIndex, 'duration', parseInt(e.target.value));
                    }}
                    min="10"
                    max="60"
                  />
                  <span>minutes</span>
                </div>
              </div>
            </div>

            {/* Substage Tabs */}
            <div className="substage-tabs">
              {['catalyst', 'dialogue', 'summary', 'we'].map(substageType => {
                const substage = config.stages[stage]?.substages?.find(s => 
                  s?.name?.toLowerCase() === substageType || s?.id?.includes(substageType)
                ) || {};
                
                return (
                  <div key={substageType} className="substage-tab">
                    <h6>{substageType === 'catalyst' ? '✨ Catalyst' : 
                         substageType === 'dialogue' ? '💬 Dialogue' :
                         substageType === 'summary' ? '📝 Summary' : '🌐 WE'}</h6>
                    
                    {substageType === 'catalyst' && (
                      <div className="catalyst-content">
                        <div className="form-group">
                          <label>Choose Catalyst Content</label>
                          <div className="catalyst-selection">
                            {(() => {
                              const catalystIndex = ensureSubstageExists(stage, 'catalyst');
                              const selectedCatalyst = getSelectedCatalystInfo(stage, catalystIndex);
                              
                              return selectedCatalyst ? (
                                <div className="selected-catalyst-preview">
                                  <div className="catalyst-info">
                                    <h4>{selectedCatalyst.title}</h4>
                                    <p>by {selectedCatalyst.author} • {selectedCatalyst.duration} min{selectedCatalyst.duration !== 1 ? 's' : ''}</p>
                                    <div className="catalyst-preview-text">
                                      {selectedCatalyst.content.length > 100 
                                        ? `${selectedCatalyst.content.substring(0, 100)}...`
                                        : selectedCatalyst.content
                                      }
                                    </div>
                                    {selectedCatalyst.tags && selectedCatalyst.tags.length > 0 && (
                                      <div className="catalyst-tags-preview">
                                        {selectedCatalyst.tags.map(tag => (
                                          <span key={tag} className="tag-preview">{tag}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="catalyst-actions">
                                    <button
                                      type="button"
                                      className="change-catalyst-btn"
                                      onClick={() => handleOpenCatalystLibrary(stage, catalystIndex)}
                                    >
                                      ✨ Change Catalyst
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="no-catalyst-selected">
                                  <p>No catalyst selected for this stage</p>
                                  <button
                                    type="button"
                                    className="select-catalyst-btn"
                                    onClick={() => handleOpenCatalystLibrary(stage, catalystIndex)}
                                  >
                                    ✨ Choose from Library
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Catalyst-Inspired Questions/Prompts</label>
                          <textarea
                            value={substage?.prompt || ''}
                            onChange={(e) => {
                              const catalystIndex = ensureSubstageExists(stage, 'catalyst');
                              updateSubstage(stage, catalystIndex, 'prompt', e.target.value);
                            }}
                            placeholder="Enter custom prompt or select from common options below"
                            rows="2"
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const catalystIndex = ensureSubstageExists(stage, 'catalyst');
                                updateSubstage(stage, catalystIndex, 'prompt', e.target.value);
                              }
                            }}
                            value=""
                          >
                            <option value="">Choose common prompt...</option>
                            {commonPrompts.catalyst?.map((prompt, idx) => (
                              <option key={idx} value={prompt}>{prompt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {substageType === 'dialogue' && (
                      <div className="dialogue-content">
                        <div className="form-group">
                          <label>Dialogue Instructions</label>
                          <textarea
                            value={substage?.prompt || ''}
                            onChange={(e) => {
                              const dialogueIndex = ensureSubstageExists(stage, 'dialogue');
                              updateSubstage(stage, dialogueIndex, 'prompt', e.target.value);
                            }}
                            placeholder="Instructions for breakout dialogue participants"
                            rows="2"
                            style={{ maxHeight: '60px', overflow: 'auto' }}
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const dialogueIndex = ensureSubstageExists(stage, 'dialogue');
                                updateSubstage(stage, dialogueIndex, 'prompt', e.target.value);
                              }
                            }}
                            value=""
                          >
                            <option value="">Choose common prompt...</option>
                            {commonPrompts.dialogue?.map((prompt, idx) => (
                              <option key={idx} value={prompt}>{prompt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {substageType === 'summary' && (
                      <div className="summary-content">
                        <div className="form-group">
                          <label>Summary Instructions</label>
                          <textarea
                            value={substage?.prompt || ''}
                            onChange={(e) => {
                              const summaryIndex = ensureSubstageExists(stage, 'summary');
                              updateSubstage(stage, summaryIndex, 'prompt', e.target.value);
                            }}
                            placeholder="Instructions for transcript review and summary creation"
                            rows="2"
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const summaryIndex = ensureSubstageExists(stage, 'summary');
                                updateSubstage(stage, summaryIndex, 'prompt', e.target.value);
                              }
                            }}
                            value=""
                          >
                            <option value="">Choose common prompt...</option>
                            {commonPrompts.summary?.map((prompt, idx) => (
                              <option key={idx} value={prompt}>{prompt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {substageType === 'we' && (
                      <div className="we-content">
                        <div className="form-group">
                          <label>WE Discussion Prompt</label>
                          <textarea
                            value={substage?.prompt || ''}
                            onChange={(e) => {
                              const weIndex = ensureSubstageExists(stage, 'we');
                              updateSubstage(stage, weIndex, 'prompt', e.target.value);
                            }}
                            placeholder="Prompt for collective wisdom discussion"
                            rows="2"
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const weIndex = ensureSubstageExists(stage, 'we');
                                updateSubstage(stage, weIndex, 'prompt', e.target.value);
                              }
                            }}
                            value=""
                          >
                            <option value="">Choose common prompt...</option>
                            {commonPrompts.we?.map((prompt, idx) => (
                              <option key={idx} value={prompt}>{prompt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Closing Stage */}
      {config.stages.closing?.enabled && (
        <div className="stage-config closing-stage">
          <div className="stage-header">
            <h4>🌅 Closing</h4>
            <p>Goodbyes and next steps</p>
          </div>
          <div className="simple-stage-content">
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={config.stages.closing.substages?.[0]?.duration || 10}
                onChange={(e) => updateSubstage('closing', 0, 'duration', parseInt(e.target.value))}
                min="5"
                max="30"
              />
            </div>
            <div className="form-group">
              <label>Instructions</label>
              <textarea
                value={config.stages.closing.substages?.[0]?.prompt || ''}
                onChange={(e) => updateSubstage('closing', 0, 'prompt', e.target.value)}
                placeholder="Closing remarks and next steps"
                rows="3"
              />
            </div>
          </div>
        </div>
      )}

      {/* Harvest Stage */}
      {config.stages.harvest?.enabled && (
        <div className="stage-config harvest-stage">
          <div className="stage-header">
            <h4>🌾 Harvest</h4>
            <p>Individual reflection and collective wisdom compilation</p>
          </div>
          <div className="harvest-content">
            <div className="form-group">
              <label>Harvest Instructions</label>
              <textarea
                value={config.stages.harvest.substages?.[0]?.prompt || ''}
                onChange={(e) => updateSubstage('harvest', 0, 'prompt', e.target.value)}
                placeholder="Instructions for individual post-dialogue reflection"
                rows="3"
              />
            </div>
            
            <div className="harvest-questions">
              <h6>Harvest Questions (10 questions max)</h6>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="form-group">
                  <label>Question {i + 1}</label>
                  <input
                    type="text"
                    value={config.stages.harvest.questions?.[i] || ''}
                    onChange={(e) => {
                      const questions = [...(config.stages.harvest.questions || [])];
                      questions[i] = e.target.value;
                      updateConfig('stages', 'harvest', { 
                        ...config.stages.harvest, 
                        questions 
                      });
                    }}
                    placeholder={`Enter harvest question ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );



  const renderAISettings = () => {
    // Available AI providers (in a real system, this would come from API)
    const availableProviders = [
      { id: 'openai', name: 'OpenAI GPT-4', status: 'connected', strengths: ['reasoning', 'analysis', 'synthesis'] },
      { id: 'claude', name: 'Anthropic Claude', status: 'connected', strengths: ['enhancement', 'safety', 'nuance'] },
      { id: 'grok', name: 'xAI Grok', status: 'connected', strengths: ['synthesis', 'creativity', 'real-time'] },
      { id: 'deepgram', name: 'Deepgram Nova', status: 'connected', strengths: ['transcription', 'diarization'] },
      { id: 'gemini', name: 'Google Gemini', status: 'available', strengths: ['multimodal', 'analysis'] }
    ];

    const aiTasks = [
      { 
        id: 'transcription', 
        name: '🎤 Real-time Transcription', 
        description: 'Convert speech to text with speaker identification',
        currentProvider: config.aiSettings.transcription?.provider || 'deepgram'
      },
      { 
        id: 'enhancement', 
        name: '✨ Content Enhancement', 
        description: 'Clean up and improve transcript quality',
        currentProvider: config.aiSettings.enhancement?.provider || 'claude'
      },
      { 
        id: 'synthesis', 
        name: '🧠 Dialogue Synthesis', 
        description: 'Generate summaries and extract key insights',
        currentProvider: config.aiSettings.synthesis?.provider || 'grok'
      },
      { 
        id: 'insights', 
        name: '💡 Pattern Recognition', 
        description: 'Identify themes, growth moments, and collective wisdom',
        currentProvider: config.aiSettings.insights?.provider || 'openai'
      },
      { 
        id: 'facilitation', 
        name: '🎭 AI Facilitation', 
        description: 'Suggest prompts, timing, and interventions',
        currentProvider: config.aiSettings.facilitation?.provider || 'claude'
      },
      { 
        id: 'analysis', 
        name: '📊 Journey Analysis', 
        description: 'Track individual and collective growth over time',
        currentProvider: config.aiSettings.analysis?.provider || 'openai'
      }
    ];

    return (
      <div className="config-section">
        <h3>AI & Processing</h3>
        <p className="section-description">
          Configure which AI providers handle different tasks. Mix and match based on each AI's strengths.
        </p>
        
        {/* Connected Providers Status */}
        <div className="ai-providers-status">
          <h4>🔗 Connected AI Providers</h4>
          <div className="providers-grid">
            {availableProviders.map(provider => (
              <div key={provider.id} className={`provider-card ${provider.status}`}>
                <div className="provider-header">
                  <span className="provider-name">{provider.name}</span>
                  <span className={`status-badge ${provider.status}`}>
                    {provider.status === 'connected' ? '🟢 Connected' : '🟡 Available'}
                  </span>
                </div>
                <div className="provider-strengths">
                  <strong>Best for:</strong> {provider.strengths.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Assignments */}
        <div className="ai-task-assignments">
          <h4>🎯 Task Assignments</h4>
          <div className="tasks-grid">
            {aiTasks.map(task => (
              <div key={task.id} className="task-assignment">
                <div className="task-info">
                  <h5>{task.name}</h5>
                  <p>{task.description}</p>
                </div>
                <div className="task-controls">
                  <div className="form-group">
                    <label>Assigned AI Provider</label>
                    <select
                      value={task.currentProvider}
                      onChange={(e) => updateNestedConfig('aiSettings', task.id, 'provider', e.target.value)}
                    >
                      {availableProviders
                        .filter(p => p.status === 'connected')
                        .map(provider => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                  <div className="task-toggle">
                    <label>
                      <input
                        type="checkbox"
                        checked={config.aiSettings[task.id]?.enabled !== false}
                        onChange={(e) => updateNestedConfig('aiSettings', task.id, 'enabled', e.target.checked)}
                      />
                      Enable
                    </label>
                  </div>
                </div>
                
                {/* Task-specific settings */}
                {task.id === 'transcription' && config.aiSettings[task.id]?.enabled !== false && (
                  <div className="task-specific-settings">
                    <div className="form-group">
                      <label>Language</label>
                      <select
                        value={config.aiSettings.transcription?.language || 'en'}
                        onChange={(e) => updateNestedConfig('aiSettings', 'transcription', 'language', e.target.value)}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="pt">Portuguese</option>
                        <option value="it">Italian</option>
                      </select>
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={config.aiSettings.transcription?.diarization !== false}
                        onChange={(e) => updateNestedConfig('aiSettings', 'transcription', 'diarization', e.target.checked)}
                      />
                      Speaker identification
                    </label>
                  </div>
                )}
                
                {task.id === 'synthesis' && config.aiSettings[task.id]?.enabled !== false && (
                  <div className="task-specific-settings">
                    <div className="form-group">
                      <label>Processing Frequency</label>
                      <select
                        value={config.aiSettings.synthesis?.frequency || 'per-stage'}
                        onChange={(e) => updateNestedConfig('aiSettings', 'synthesis', 'frequency', e.target.value)}
                      >
                        <option value="real-time">Real-time (continuous)</option>
                        <option value="per-substage">After each substage</option>
                        <option value="per-stage">After each stage</option>
                        <option value="end-session">End of session only</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {task.id === 'insights' && config.aiSettings[task.id]?.enabled !== false && (
                  <div className="task-specific-settings">
                    <label>
                      <input
                        type="checkbox"
                        checked={config.aiSettings.insights?.growthTracking !== false}
                        onChange={(e) => updateNestedConfig('aiSettings', 'insights', 'growthTracking', e.target.checked)}
                      />
                      Enable individual growth tracking
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={config.aiSettings.insights?.collectiveAnalysis !== false}
                        onChange={(e) => updateNestedConfig('aiSettings', 'insights', 'collectiveAnalysis', e.target.checked)}
                      />
                      Enable collective wisdom analysis
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPromptLibrary = () => {
    // Sample prompt library data (in production, this would come from API/database)
    const promptLibrary = [
      {
        id: 1,
        title: "Opening Circle - What brought you here?",
        text: "What brought you here today, and what are you hoping to discover or contribute?",
        category: "opening",
        tags: ["connection", "intention", "presence"],
        rating: 4.8,
        usageCount: 127,
        createdBy: "System",
        isTopRated: true
      },
      {
        id: 2,
        title: "Connection - Story Sharing",
        text: "Share a story or experience that feels alive and meaningful to you right now.",
        category: "connect",
        tags: ["storytelling", "vulnerability", "authenticity"],
        rating: 4.9,
        usageCount: 203,
        createdBy: "System",
        isTopRated: true
      },
      {
        id: 3,
        title: "Exploration - Pattern Recognition",
        text: "What patterns or themes are emerging from our shared stories and experiences?",
        category: "explore",
        tags: ["patterns", "synthesis", "collective"],
        rating: 4.7,
        usageCount: 156,
        createdBy: "System",
        isTopRated: true
      },
      {
        id: 4,
        title: "Discovery - Collective Wisdom",
        text: "What wants to emerge that we haven't yet named or acknowledged together?",
        category: "discover",
        tags: ["emergence", "wisdom", "collective"],
        rating: 4.6,
        usageCount: 98,
        createdBy: "System",
        isTopRated: false
      },
      {
        id: 5,
        title: "Harvest - Personal Integration",
        text: "What are you taking away from this dialogue that feels most significant for your journey?",
        category: "harvest",
        tags: ["reflection", "integration", "personal"],
        rating: 4.5,
        usageCount: 89,
        createdBy: "System",
        isTopRated: false
      }
    ];

    const categories = [
      { value: 'all', label: 'All Categories' },
      { value: 'opening', label: 'Opening' },
      { value: 'connect', label: 'Connect' },
      { value: 'explore', label: 'Explore' },
      { value: 'discover', label: 'Discover' },
      { value: 'harvest', label: 'Harvest' }
    ];

    const filteredPrompts = promptLibrary.filter(prompt => {
      const matchesSearch = prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const topRatedPrompts = promptLibrary.filter(p => p.isTopRated);

    return (
      <div className="config-section">
        <div className="library-header">
          <h3>📚 Prompt Library</h3>
          <p className="section-description">
            Browse, search, and manage your collection of dialogue prompts. Top-rated prompts automatically appear in your dialogue configuration dropdowns.
          </p>
          
          <div className="library-controls">
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'browse' ? 'active' : ''}`}
                onClick={() => setViewMode('browse')}
              >
                📖 Browse
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'create' ? 'active' : ''}`}
                onClick={() => setViewMode('create')}
              >
                ➕ Create New
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'browse' ? (
          <div className="library-browse">
            <div className="library-filters">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search prompts, tags, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-filter"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="top-rated-section">
              <h4>⭐ Top Rated Prompts</h4>
              <p className="top-rated-note">These prompts automatically populate your dialogue configuration dropdowns</p>
              <div className="top-rated-grid">
                {topRatedPrompts.map(prompt => (
                  <div key={prompt.id} className="prompt-card top-rated">
                    <div className="prompt-header">
                      <h5>{prompt.title}</h5>
                      <div className="prompt-rating">
                        <span className="rating-stars">⭐ {prompt.rating}</span>
                        <span className="usage-count">({prompt.usageCount} uses)</span>
                      </div>
                    </div>
                    <p className="prompt-text">{prompt.text}</p>
                    <div className="prompt-tags">
                      {prompt.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="all-prompts-section">
              <h4>All Prompts ({filteredPrompts.length})</h4>
              <div className="prompts-grid">
                {filteredPrompts.map(prompt => (
                  <div key={prompt.id} className="prompt-card">
                    <div className="prompt-header">
                      <h5>{prompt.title}</h5>
                      <div className="prompt-rating">
                        <span className="rating-stars">⭐ {prompt.rating}</span>
                        <span className="usage-count">({prompt.usageCount} uses)</span>
                      </div>
                    </div>
                    <p className="prompt-text">{prompt.text}</p>
                    <div className="prompt-meta">
                      <div className="prompt-tags">
                        {prompt.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                      <div className="prompt-actions">
                        <button className="action-btn" title="Use in dialogue">📋</button>
                        <button className="action-btn" title="Edit prompt">✏️</button>
                        <button className="action-btn" title="Favorite">❤️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="library-create">
            <h4>Create New Prompt</h4>
            <div className="create-form">
              <div className="form-group">
                <label>Prompt Title</label>
                <input
                  type="text"
                  placeholder="Give your prompt a descriptive title..."
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select>
                  <option value="">Select category...</option>
                  {categories.slice(1).map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Prompt Text</label>
                <textarea
                  placeholder="Enter the prompt question or instruction..."
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="connection, storytelling, reflection..."
                />
              </div>
              <div className="form-actions">
                <button className="btn-secondary">Save Draft</button>
                <button className="btn-primary">Add to Library</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getStageDescription = (stage) => {
    const descriptions = {
      opening: 'Welcome, introductions, and technical setup in community mode',
      connect: 'Building initial connections through Catalyst → Dialogue → Summary → WE sequence',
      explore: 'Deepening inquiry and exploration through Catalyst → Dialogue → Summary → WE sequence', 
      discover: 'Emergence of collective wisdom through Catalyst → Dialogue → Summary → WE sequence',
      closing: 'Gratitude, closing circle, and transition in community mode',
      harvest: 'Individual reflection with AI compilation for group insights'
    };
    return descriptions[stage] || '';
  };

  // eslint-disable-next-line no-unused-vars
  const getProviderOptions = (service) => {
    const providers = {
      transcription: [
        { value: 'deepgram', label: 'Deepgram' },
        { value: 'whisper', label: 'OpenAI Whisper' }
      ],
      enhancement: [
        { value: 'claude', label: 'Anthropic Claude' },
        { value: 'gpt', label: 'OpenAI GPT' }
      ],
      synthesis: [
        { value: 'grok', label: 'xAI Grok' },
        { value: 'claude', label: 'Anthropic Claude' }
      ],
      insights: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'claude', label: 'Anthropic Claude' }
      ]
    };
    return providers[service] || [];
  };

  return (
    <div className="dialogue-setup">
      <div className="setup-header">
        <h2>{editingDialogue ? '✏️ Edit Dialogue' : '🎯 Dialogue Setup'}</h2>
        <p>{editingDialogue ? 'Modify your dialogue configuration' : 'Configure your generative dialogue experience'}</p>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="setup-content">
        <div className="setup-sidebar">
          {!editingDialogue && (
            <div className="template-section">
              <h4>Quick Templates</h4>
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  className="template-btn"
                  onClick={() => loadTemplate(key)}
                  title={template.description}
                >
                  {template.title}
                </button>
              ))}
            </div>
          )}

          {editingDialogue && (
            <div className="edit-info-section">
              <h4>Editing Dialogue</h4>
              <div className="edit-info">
                <p><strong>{editingDialogue.title}</strong></p>
                <p>Created: {new Date(editingDialogue.createdAt).toLocaleDateString()}</p>
                {editingDialogue.lastModified && (
                  <p>Modified: {new Date(editingDialogue.lastModified).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          )}

          <nav className="setup-nav">
            {[
              { key: 'basic', label: 'Basic Info', icon: '📋' },
              { key: 'stages', label: 'Stages', icon: '🎭' },
              { key: 'ai', label: 'AI Settings', icon: '🤖' },
              { key: 'prompts', label: 'Prompts', icon: '💭' },
              { key: 'timing', label: 'Timing', icon: '⏱️' }
            ].map(section => (
              <button
                key={section.key}
                className={`nav-btn ${activeSection === section.key ? 'active' : ''}`}
                onClick={() => setActiveSection(section.key)}
              >
                <span className="nav-icon">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="setup-main">
          {activeSection === 'basic' && renderBasicSettings()}
          {activeSection === 'stages' && renderStageSettings()}
          {activeSection === 'ai' && renderAISettings()}
          {activeSection === 'prompts' && renderPromptLibrary()}
          
          {activeSection === 'timing' && (
            <div className="config-section">
              <h3>Timing & Flow</h3>
              
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={config.timing.autoAdvance}
                    onChange={(e) => updateNestedConfig('timing', 'autoAdvance', 'enabled', e.target.checked)}
                  />
                  Auto-advance between stages
                </label>
                
                <label>
                  <input
                    type="checkbox"
                    checked={config.timing.stageWarnings}
                    onChange={(e) => updateNestedConfig('timing', 'stageWarnings', 'enabled', e.target.checked)}
                  />
                  Show stage ending warnings
                </label>
                
                <label>
                  <input
                    type="checkbox"
                    checked={config.timing.breaksBetweenStages}
                    onChange={(e) => updateNestedConfig('timing', 'breaksBetweenStages', 'enabled', e.target.checked)}
                  />
                  Include breaks between stages
                </label>
              </div>
              
              {config.timing.stageWarnings && (
                <div className="form-group">
                  <label>Warning Time (minutes before stage ends)</label>
                  <input
                    type="number"
                    value={config.timing.warningTime}
                    onChange={(e) => updateNestedConfig('timing', 'warningTime', 'value', parseInt(e.target.value))}
                    min="1"
                    max="15"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="setup-footer">
        <div className="config-summary">
          <span>Duration: {formatDuration(calculateTotalDuration())}</span>
          <span>Max Participants: {config.maxParticipants}</span>
          <span>Stages: {Object.values(config.stages).filter(s => s.enabled).length}</span>
        </div>
        
        <div className="setup-actions">
          <button className="btn-secondary" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit' : 'Preview'} Config
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            {editingDialogue ? 'Update Dialogue' : 'Create Dialogue'}
          </button>
        </div>
      </div>

      {previewMode && (
        <div className="config-preview">
          <div className="preview-header">
            <h4>📋 Configuration Summary</h4>
            <div className="preview-header-actions">
              <button 
                className="edit-config-btn"
                onClick={() => setPreviewMode(false)}
              >
                ✏️ Edit Configuration
              </button>
              <button 
                className="close-preview-btn"
                onClick={() => setPreviewMode(false)}
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="preview-content">
            <div className="preview-section">
              <h5>📝 Basic Information</h5>
              <div className="preview-grid">
                <div className="preview-item">
                  <span className="label">Title:</span>
                  <span className="value">{config.title}</span>
                </div>
                <div className="preview-item">
                  <span className="label">Facilitator:</span>
                  <span className="value">{config.facilitator}</span>
                </div>
                <div className="preview-item">
                  <span className="label">Max Participants:</span>
                  <span className="value">{config.maxParticipants}</span>
                </div>
                <div className="preview-item">
                  <span className="label">Total Duration:</span>
                  <span className="value">{formatDuration(calculateTotalDuration())}</span>
                </div>
              </div>
              {config.description && (
                <div className="preview-description">
                  <span className="label">Description:</span>
                  <p>{config.description}</p>
                </div>
              )}
            </div>

            <div className="preview-section">
              <h5>🎭 Dialogue Flow</h5>
              <div className="stages-timeline">
                {Object.entries(config.stages)
                  .filter(([_, settings]) => settings.enabled)
                  .map(([stage, settings], stageIndex) => (
                    <div key={stage} className="stage-timeline">
                      <div className="stage-timeline-header">
                        <div className="stage-marker">{stageIndex + 1}</div>
                        <div className="stage-info">
                          <span className="stage-name">{stage.toUpperCase()}</span>
                          <span className="stage-total-duration">
                            {formatDuration(settings.substages?.reduce((sum, sub) => sum + sub.duration, 0) || 0)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="substages-timeline">
                        {settings.substages?.map((substage, substageIndex) => (
                          <div key={substage.id} className="substage-timeline-item">
                            <div className="substage-marker">{stageIndex + 1}.{substageIndex + 1}</div>
                            <div className="substage-content">
                              <div className="substage-header">
                                <span className="substage-name">{substage.name}</span>
                                <div className="substage-meta">
                                  <span className="substage-mode">{substage.viewMode}</span>
                                  <span className="substage-duration">{formatDuration(substage.duration)}</span>
                                </div>
                              </div>
                              <div className="substage-prompt">"{substage.prompt}"</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>



            <div className="preview-section">
              <h5>🤖 AI Services</h5>
              <div className="ai-services-grid">
                {Object.entries(config.aiSettings)
                  .filter(([_, settings]) => settings.enabled)
                  .map(([service, settings]) => (
                    <div key={service} className="ai-service-item">
                      <span className="service-name">{service.charAt(0).toUpperCase() + service.slice(1)}</span>
                      <span className="service-provider">{settings.provider}</span>
                      {settings.realTime && <span className="service-badge">Real-time</span>}
                      {settings.growthTracking && <span className="service-badge">Growth Tracking</span>}
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="preview-section">
              <h5>💭 Custom Prompts</h5>
              <div className="prompts-list">
                {Object.entries(config.prompts).map(([stage, prompt]) => (
                  <div key={stage} className="prompt-item">
                    <span className="prompt-stage">{stage.charAt(0).toUpperCase() + stage.slice(1)}:</span>
                    <p className="prompt-text">"{prompt}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="preview-section">
              <h5>⏱️ Timing Settings</h5>
              <div className="timing-settings">
                <div className="timing-item">
                  <span className="timing-label">Auto-advance stages:</span>
                  <span className="timing-value">{config.timing.autoAdvance ? 'Yes' : 'No'}</span>
                </div>
                <div className="timing-item">
                  <span className="timing-label">Stage warnings:</span>
                  <span className="timing-value">
                    {config.timing.stageWarnings ? `Yes (${config.timing.warningTime} min before)` : 'No'}
                  </span>
                </div>
                <div className="timing-item">
                  <span className="timing-label">Breaks between stages:</span>
                  <span className="timing-value">
                    {config.timing.breaksBetweenStages ? `Yes (${config.timing.breakDuration} min)` : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalyst Library Modal */}
      {showCatalystLibrary && (
        <CatalystLibrary
          onClose={() => {
            setShowCatalystLibrary(false);
            setCatalystSelectionContext(null);
          }}
          onSelectCatalyst={handleSelectCatalyst}
          selectedCatalyst={catalystSelectionContext ? getSelectedCatalystInfo(
            catalystSelectionContext.stage, 
            catalystSelectionContext.substageIndex
          ) : null}
        />
      )}
    </div>
  );
};

export default DialogueSetup;
