import React, { useState, useEffect, useRef } from 'react';
import './BottomContentArea.css';
import EnhancedTranscription from './EnhancedTranscription';
import {
  microphoneOff,
  microphoneOn,
  microphoneHover,
  cameraOff,
  cameraOn,
  cameraHover,
  dialoguePersonOff,
  dialoguePersonOn,
  dialoguePersonHover,
  thumbsUpOff,
  thumbsUpOn,
  thumbsUpHover,
  thumbsDownOff,
  thumbsDownOn,
  thumbsDownHover,
  directionBackwardOff,
  directionBackwardOn,
  directionBackwardHover,
  directionForwardOff,
  directionForwardOn,
  directionForwardHover,
  loopOn,
  loopHover
} from '../assets/icons';

const BottomContentArea = ({ 
  participantCount = 1093, 
  onLoopToggle,
  developmentMode,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  currentPage,
  defaultActiveTab = '', // Allow pages to override default tab
  dialogueQuestion = '',
  dialogueTimeframe = '',
  dialogueFormat = '',
  isDialogueActive = false,
  isSummaryReview = false,
  isCollectiveWisdom = false,
  isFishbowlCatalyst = false,
  isKivaDialogue = false,
  isKivaSummaryReview = false,
  isDiscoverCollectiveWisdom = false,
  isHarvestClosing = false
}) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab); // Use prop for default
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isInCall, setIsInCall] = useState(true);
  const [totalTime] = useState('01:30:00');
  const [segmentTime, setSegmentTime] = useState('00:00');
  const [voteState, setVoteState] = useState(null); // 'up', 'down', or null
  const [backButtonState, setBackButtonState] = useState('off'); // 'off', 'hover', 'on'
  const [forwardButtonState, setForwardButtonState] = useState('off'); // 'off', 'hover', 'on'
  const [thumbsUpButtonState, setThumbsUpButtonState] = useState('off'); // 'off', 'hover', 'on'
  const [thumbsDownButtonState, setThumbsDownButtonState] = useState('off'); // 'off', 'hover', 'on'
  const [personHover, setPersonHover] = useState(false);
  const [isMicrophoneHover, setIsMicrophoneHover] = useState(false);
  const [isCameraHover, setIsCameraHover] = useState(false);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [isLoopHover, setIsLoopHover] = useState(false);

  // Tooltip state and refs
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showCameraTooltip, setShowCameraTooltip] = useState(false);
  const [showPersonTooltip, setShowPersonTooltip] = useState(false);
  const [showLoopTooltip, setShowLoopTooltip] = useState(false);
  
  // Add tooltip states for the actual UI buttons in tab-controls-right
  const [showTabMicTooltip, setShowTabMicTooltip] = useState(false);
  const [showTabClearTooltip, setShowTabClearTooltip] = useState(false);
  const [showTabStatusTooltip, setShowTabStatusTooltip] = useState(false);

  // Timeout refs for tooltip delays
  const micTooltipTimeout = useRef(null);
  const cameraTooltipTimeout = useRef(null);
  const personTooltipTimeout = useRef(null);
  const loopTooltipTimeout = useRef(null);
  
  // Add timeout refs for the actual UI buttons
  const tabMicTooltipTimeout = useRef(null);
  const tabClearTooltipTimeout = useRef(null);
  const tabStatusTooltipTimeout = useRef(null);

  // Press timeout refs for mobile long-press
  const micPressTimeout = useRef(null);
  const cameraPressTimeout = useRef(null);
  const personPressTimeout = useRef(null);
  const loopPressTimeout = useRef(null);
  
  // Add press timeout refs for the actual UI buttons
  const tabMicPressTimeout = useRef(null);
  const tabClearPressTimeout = useRef(null);
  const tabStatusPressTimeout = useRef(null);

  // Auto-hide timeout refs for mobile
  const micAutoHideTimeout = useRef(null);
  const cameraAutoHideTimeout = useRef(null);
  const personAutoHideTimeout = useRef(null);
  const loopAutoHideTimeout = useRef(null);
  
  // Add auto-hide timeout refs for the actual UI buttons
  const tabMicAutoHideTimeout = useRef(null);
  const tabClearAutoHideTimeout = useRef(null);
  const tabStatusAutoHideTimeout = useRef(null);

  // Utility functions for tooltip management
  const showTooltipWithDelay = (setTooltip, timeoutRef, delay = 2000) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setTooltip(true);
    }, delay);
  };

  const showTooltipImmediately = (setTooltip) => {
    setTooltip(true);
  };

  const hideTooltipImmediately = (setTooltip, timeoutRef, pressTimeoutRef = null, autoHideTimeoutRef = null) => {
    clearTimeout(timeoutRef.current);
    if (pressTimeoutRef) clearTimeout(pressTimeoutRef.current);
    if (autoHideTimeoutRef) clearTimeout(autoHideTimeoutRef.current);
    setTooltip(false);
  };

  // Get tooltip positioning relative to button
  const getTooltipPosition = (buttonId) => {
    const button = document.getElementById(buttonId);
    if (!button) {
      return { left: '50%', top: '50%' };
    }
    
    const rect = button.getBoundingClientRect();
    const buttonCenterY = rect.top + rect.height / 2;
    const buttonRight = rect.right;
    const buttonLeft = rect.left;
    const viewportHeight = window.innerHeight;
    
    // For tab control buttons, always position to the LEFT of the button
    const isTabControlButton = buttonId.startsWith('tab-');
    
    let leftPosition, topPosition;
    
    if (isTabControlButton) {
      const tooltipWidth = 200;
      
      // Different positioning for each button based on user feedback
      let iconWidthGap;
      if (buttonId === 'tab-status-indicator') {
        // Status indicator: move 5px more to the left (increase gap)
        iconWidthGap = 130; // 125 + 5 = 130px gap
      } else {
        // Mic and Clear buttons: move 20px to the left (increase gap)
        iconWidthGap = 40; // 20 + 20 = 40px gap
      }
      
      leftPosition = buttonLeft - tooltipWidth - iconWidthGap;
      
      // If it would go off screen, position it as far left as possible
      if (leftPosition < 10) {
        leftPosition = 10;
      }
      
      topPosition = buttonCenterY;
    } else {
      // Original logic for other buttons - position to the right
      // Adjusted: 3px left (15-3=12) and 2px down
      leftPosition = buttonRight + 12; // 12px gap from button (was 15, moved 3px left)
      
      // Check if tooltip would go off the right edge
      const tooltipWidth = 200;
      if (leftPosition + tooltipWidth > window.innerWidth - 10) {
        // If not enough space on right, position to the left of button
        // Also moved 3px left here
        leftPosition = rect.left - tooltipWidth - 18; // was -15, now -18 (3px more left)
      }
      
      topPosition = buttonCenterY + 2; // Moved 2px down for bottom controls only
    }
    
    // Check if tooltip would go off the top or bottom
    const tooltipHeight = 50; // Approximate tooltip height
    if (topPosition - tooltipHeight/2 < 10) {
      topPosition = tooltipHeight/2 + 10;
    }
    if (topPosition + tooltipHeight/2 > viewportHeight - 10) {
      topPosition = viewportHeight - tooltipHeight/2 - 10;
    }
    
    const position = {
      left: `${leftPosition}px`,
      top: `${topPosition}px`,
      // Center all tooltips vertically since all are positioned to the side now
      transform: 'translateY(-50%)'
    };
    
    return position;
  };

  // Smart device detection - use touch capability, not just window width
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  // Universal event handlers that work on both desktop and mobile
  const createTooltipHandlers = (setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef) => ({
    // Desktop hover events
    onMouseEnter: () => {
      if (!isTouchDevice) { // Desktop/laptop with mouse
        showTooltipWithDelay(setTooltip, timeoutRef);
      }
    },
    onMouseLeave: () => {
      if (!isTouchDevice) { // Desktop/laptop with mouse
        hideTooltipImmediately(setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef);
      }
    },
    // Mobile/tablet touch events
    onTouchStart: () => {
      if (isTouchDevice) { // Only on actual touch devices
        // Clear any existing timeouts
        clearTimeout(pressTimeoutRef.current);
        clearTimeout(autoHideTimeoutRef.current);
        
        pressTimeoutRef.current = setTimeout(() => {
          setTooltip(true);
          
          // Auto-hide after 4 seconds on mobile
          autoHideTimeoutRef.current = setTimeout(() => {
            setTooltip(false);
          }, 4000);
        }, 1000); // 1 second long-press
      }
    },
    onTouchEnd: () => {
      if (isTouchDevice) {
        clearTimeout(pressTimeoutRef.current);
        // Keep the tooltip visible if it was already shown, 
        // let auto-hide handle it
      }
    },
    onTouchCancel: () => {
      if (isTouchDevice) {
        clearTimeout(pressTimeoutRef.current);
        clearTimeout(autoHideTimeoutRef.current);
        setTooltip(false);
      }
    }
  });

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(micTooltipTimeout.current);
      clearTimeout(cameraTooltipTimeout.current);
      clearTimeout(personTooltipTimeout.current);
      clearTimeout(loopTooltipTimeout.current);
      clearTimeout(micPressTimeout.current);
      clearTimeout(cameraPressTimeout.current);
      clearTimeout(personPressTimeout.current);
      clearTimeout(loopPressTimeout.current);
      clearTimeout(micAutoHideTimeout.current);
      clearTimeout(cameraAutoHideTimeout.current);
      clearTimeout(personAutoHideTimeout.current);
      clearTimeout(loopAutoHideTimeout.current);
      clearTimeout(tabMicTooltipTimeout.current);
      clearTimeout(tabClearTooltipTimeout.current);
      clearTimeout(tabStatusTooltipTimeout.current);
      clearTimeout(tabMicPressTimeout.current);
      clearTimeout(tabClearPressTimeout.current);
      clearTimeout(tabStatusPressTimeout.current);
      clearTimeout(tabMicAutoHideTimeout.current);
      clearTimeout(tabClearAutoHideTimeout.current);
      clearTimeout(tabStatusAutoHideTimeout.current);
    };
  }, []);

  // Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('Ready to transcribe');
  const [transcriptionError] = useState('');

  // AI-enhanced transcript and summary state
  const [aiEnhancedTranscript, setAiEnhancedTranscript] = useState('');
  const [aiGeneratedSummary, setAiGeneratedSummary] = useState('');

  // Function to parse timeframe string to seconds
  const parseTimeframeToSeconds = (timeframe) => {
    if (!timeframe) return 1200; // Default 20 minutes
    
    const match = timeframe.match(/(\d+)\s*(minute|min)/i);
    if (match) {
      return parseInt(match[1]) * 60; // Convert minutes to seconds
    }
    
    // If no match, try to extract any number and assume it's minutes
    const numberMatch = timeframe.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1]) * 60;
    }
    
    return 1200; // Default fallback to 20 minutes
  };

  // Summary review state
  const [participantVotes, setParticipantVotes] = useState({
    'Sarah': null,      // null, 'satisfied', 'not-satisfied'
    'Marcus': null,
    'Elena': null
  });
  const [summarySubmitted, setSummarySubmitted] = useState(false);

  // KIVA group summary review state (6 participants)
  const [kivaParticipantVotes, setKivaParticipantVotes] = useState({
    'Jordan': null,
    'Amara': null,
    'David': null,
    'Taylor': null,
    'Sam': null,
    'Casey': null
  });
  const [kivaSummarySubmitted, setKivaSummarySubmitted] = useState(false);

  // Set segment duration based on current page
  useEffect(() => {
    const getSegmentDuration = (page) => {
      switch (page) {
        case 'landing':
        case 'input':
        case 'permissions':
          return 5 * 60; // 5 minutes for setup stages
        case 'videoconference':
          return 20 * 60; // 20 minutes for main dialogue
        case 'reflection':
          return 10 * 60; // 10 minutes for individual reflection
        case 'summary':
          return 15 * 60; // 15 minutes for summary discussion
        default:
          return 10 * 60; // Default 10 minutes
      }
    };

    const duration = getSegmentDuration(currentPage);
    
    // Reset segment time to full duration when page changes
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    setSegmentTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
  }, [currentPage]);

  // Timer effect for segment time - countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSegmentTime(prevTime => {
        const [minutes, seconds] = prevTime.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds;
        
        // Count down - subtract 1 second
        const newTotalSeconds = Math.max(0, totalSeconds - 1);
        const newMinutes = Math.floor(newTotalSeconds / 60);
        const newSeconds = newTotalSeconds % 60;
        
        return `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Dialogue timer state - re-adding since it's used in UI
  const [dialogueTimeRemaining, setDialogueTimeRemaining] = useState(() => parseTimeframeToSeconds(dialogueTimeframe));

  // Update timer when timeframe prop changes
  useEffect(() => {
    const newTimeInSeconds = parseTimeframeToSeconds(dialogueTimeframe);
    setDialogueTimeRemaining(newTimeInSeconds);
  }, [dialogueTimeframe]);

  // Dialogue timer countdown
  useEffect(() => {
    if (isDialogueActive) {
      const timer = setInterval(() => {
        setDialogueTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isDialogueActive]);

  // Dialogue transcript editing functions are now handled by EnhancedTranscription component

  // Summary review functions
  const handleVote = (participant, vote) => {
    setParticipantVotes(prev => ({
      ...prev,
      [participant]: vote
    }));
  };

  const submitSummaryForCompilation = () => {
    setSummarySubmitted(true);
  };

  // Check voting status
  const allParticipants = Object.keys(participantVotes);
  const votedParticipants = allParticipants.filter(p => participantVotes[p] !== null);
  const satisfiedVotes = allParticipants.filter(p => participantVotes[p] === 'satisfied').length;
  const allVoted = votedParticipants.length === allParticipants.length;
  const canSubmit = allVoted && !summarySubmitted;

  // Mock AI-generated summary
  const aiSummary = {
    title: "Community Resilience Through Connection",
    mainThemes: [
      "Interconnectedness as foundation for resilience",
      "Communication networks as critical infrastructure", 
      "Balance between self-reliance and community support"
    ],
    keyInsights: [
      {
        speaker: "Sarah",
        insight: "Community resilience starts with understanding our interconnectedness and knowing local resources and neighbors."
      },
      {
        speaker: "Marcus", 
        insight: "Communication networks are crucial - multiple connection methods help communities bounce back faster from crises."
      },
      {
        speaker: "Elena",
        insight: "There's an important tension between individual preparedness and community interdependence that needs to be balanced."
      }
    ],
    emergingQuestions: [
      "How do we maintain individual agency while building community resilience?",
      "What communication systems are most resilient during crisis situations?",
      "How can communities assess and strengthen their interconnectedness?"
    ]
  };

  // Mock collective wisdom data
  const voicesFromField = [
    {
      speaker: "Sarah",
      quote: "I was struck by how much commonality there was in our experiences - we're all dealing with similar challenges in building resilient communities."
    },
    {
      speaker: "Marcus", 
      quote: "The conversation really opened my eyes to the importance of communication networks. I hadn't thought about redundancy in that way before."
    },
    {
      speaker: "Elena",
      quote: "What resonated most for me was the balance between individual preparation and community interdependence. It's not either/or."
    },
    {
      speaker: "James",
      quote: "I appreciated hearing different perspectives on what resilience actually means in practice. It's more nuanced than I originally thought."
    },
    {
      speaker: "Maya",
      quote: "The dialogue helped me understand that community resilience isn't just about crisis response - it's about ongoing relationship building."
    }
  ];

  const collectiveWisdom = {
    narrative: "Through our collective dialogue, a rich understanding of community resilience has emerged. Participants consistently emphasized that resilience is not merely about surviving crises, but about thriving through interconnectedness and mutual support. The conversations revealed a sophisticated understanding that true community resilience requires both individual agency and collective interdependence - not as competing forces, but as complementary aspects of a robust social fabric.",
    
    keyThemes: [
      {
        theme: "Interconnectedness as Foundation",
        description: "Communities are strongest when members understand their connections to one another and local resources",
        prevalence: "Mentioned in 8/9 triad discussions"
      },
      {
        theme: "Communication Infrastructure",
        description: "Multiple, redundant communication channels are essential for community coordination during crises",
        prevalence: "Emphasized in 7/9 triad discussions"
      },
      {
        theme: "Balance of Agency and Community",
        description: "Effective resilience combines individual preparedness with community-level mutual support systems",
        prevalence: "Central theme in 6/9 triad discussions"
      }
    ],

    choiceQuotes: [
      {
        quote: "Resilience isn't about being fortress-like; it's about being web-like - connected, flexible, and mutually supporting.",
        attribution: "Synthesis from Triad 3"
      },
      {
        quote: "When we know our neighbors and they know us, crisis becomes an opportunity for community rather than individual survival.",
        attribution: "Synthesis from Triad 7"
      }
    ],

    sentimentAnalysis: {
      overall: "Optimistic and Solution-Oriented",
      hopefulness: 78,
      concern: 45,
      empowerment: 82,
      connection: 89
    },

    emergingWisdom: [
      "Community resilience is built through daily relationship-building, not just crisis response",
      "Effective resilience strategies honor both individual agency and collective interdependence",
      "Communication networks require intentional redundancy and relationship-based trust",
      "Local knowledge and resources are often undervalued in resilience planning"
    ]
  };

  // CONNECT stage data (One-to-one connection wisdom)
  const connectVoicesFromField = [
    {
      speaker: "Marcus",
      quote: "What surprised me was how quickly we moved past small talk to something real. There's something about being witnessed by just one other person that creates safety."
    },
    {
      speaker: "Elena",  
      quote: "In my dyad, we discovered we both carry this sense of wanting to contribute but not knowing where we fit. It was such a relief to name that together."
    },
    {
      speaker: "David",
      quote: "I realized I've been so focused on speaking my truth that I forgot how powerful it is to really hear someone else's. The quality of listening changed everything."
    },
    {
      speaker: "Fatima",
      quote: "My partner and I found ourselves talking about things we'd never shared with our own families. There's something about this container that makes vulnerability feel possible."
    },
    {
      speaker: "James",
      quote: "What struck me is that we didn't need to agree on everything to feel deeply connected. Our differences became doorways rather than walls."
    },
    {
      speaker: "Aisha",
      quote: "I learned that connection isn't about finding someone just like you - it's about being seen and held exactly as you are."
    }
  ];

  const connectCollectiveWisdom = {
    title: "The Foundation of All Dialogue: What CONNECTION Teaches Us",
    
    narrative: "Through hundreds of dyad conversations, a powerful truth emerges: authentic human connection is both simpler and more profound than we often realize. When we create sacred space for two people to truly see and hear each other, we discover that beneath our surface differences lie shared longings for belonging, meaning, and the courage to be fully ourselves. These one-to-one connections become the bedrock upon which all larger collective wisdom is built.",

    choiceQuotes: [
      {
        quote: "Real connection happens not when we find someone who thinks like us, but when we're brave enough to be seen exactly as we are.",
        attribution: "Synthesis from 47 dyad conversations"
      },
      {
        quote: "The quality of our listening determines the depth of our connection, and the depth of our connection determines the wisdom that can emerge.",
        attribution: "Pattern across dyad reflections"
      }
    ],

    sentimentAnalysis: {
      overall: "Deeply Moved and Hopeful",
      vulnerability: 85,
      safety: 92,
      authenticity: 88,
      hope: 79
    },

    emergingWisdom: [
      "True dialogue begins with the courage to be vulnerable with one other person",
      "Connection is less about agreement and more about mutual witnessing and holding",
      "Sacred containers for conversation can be created through intention and presence alone",
      "The skills learned in dyad connection become the foundation for all larger group wisdom",
      "Individual healing and collective healing are intimately connected through authentic relationship"
    ]
  };

  // DISCOVER stage data (Jazz ensemble analogy - listening for themes, variations, overtones)
  const fishbowlTranscript = [
    {
      speaker: "Jordan",
      timestamp: "12:45",
      text: "What strikes me is this pattern of unexpected resilience emerging not from planning, but from relationships that seemed unrelated to crisis response."
    },
    {
      speaker: "Amara", 
      timestamp: "12:47",
      text: "Yes, and I'm hearing echoes of what the triads discovered - but now I see how personal networks actually create these invisible safety nets that activate automatically."
    },
    {
      speaker: "David",
      timestamp: "12:49", 
      text: "There's a musical quality to it - like jazz improvisation. Everyone knows the basic structure, but the magic happens in the spaces between the notes."
    }
  ];

  const discoverVoicesFromField = [
    {
      speaker: "Maya",
      quote: "The fishbowl dialogue revealed something I hadn't seen before - resilience isn't just about bouncing back, it's about bouncing forward into something new."
    },
    {
      speaker: "Alex",
      quote: "I was amazed by how the conversation built on itself, like each person was adding a new instrument to an orchestra that kept getting richer."
    },
    {
      speaker: "Zara",
      quote: "What resonated most was this idea of 'invisible infrastructure' - all the relationships and connections that we don't see until we need them."
    },
    {
      speaker: "Kai",
      quote: "The jazz metaphor really clicked for me. We're not following a script, we're improvising together based on deep listening."
    },
    {
      speaker: "River",
      quote: "Our KIVA group discovered that community resilience has a rhythm - it's not constant, it pulses and flows with natural cycles."
    }
  ];

  const discoverCollectiveWisdom = {
    narrative: "Through our fishbowl catalyst and KIVA dialogues, a deeper layer of understanding has emerged about the nature of community resilience. Like jazz musicians improvising together, we discovered that resilience is not just about prepared responses, but about the capacity for creative adaptation in real-time. The conversations revealed patterns and overtones that weren't visible in our initial exploration - the role of 'invisible infrastructure' in relationships, the rhythmic quality of community response, and the surprising ways that seemingly unrelated connections become vital resources during crisis.",
    
    keyThemes: [
      {
        theme: "Invisible Infrastructure of Relationships",
        description: "Networks of connection that remain largely unseen until activated by crisis or need",
        prevalence: "Emerged in 12/14 KIVA groups"
      },
      {
        theme: "Jazz-like Improvisation in Crisis Response", 
        description: "Communities respond most effectively through structured improvisation rather than rigid planning",
        prevalence: "Highlighted in 10/14 KIVA groups"
      },
      {
        theme: "Rhythmic Cycles of Community Resilience",
        description: "Resilience flows in natural patterns of activation, recovery, and renewal rather than being constant",
        prevalence: "Recognized in 9/14 KIVA groups"
      }
    ],

    choiceQuotes: [
      {
        quote: "Community resilience is less like a fortress and more like a jazz ensemble - it's the capacity to improvise beautifully together when the unexpected happens.",
        attribution: "Synthesis from KIVA Group 7"
      },
      {
        quote: "We discovered that the most powerful community resources are often invisible until the moment they're needed - then they appear like a hidden network lighting up.",
        attribution: "Synthesis from KIVA Group 3"
      }
    ],

    sentimentAnalysis: {
      overall: "Curious and Emergent", 
      hopefulness: 85,
      concern: 35,
      empowerment: 88,
      connection: 92,
      wonder: 79
    },

    emergingWisdom: [
      "Community resilience emerges from improvisation within structure, not from rigid predetermined responses",
      "The most vital community resources are often relationship-based and invisible until activated",
      "Resilience has natural rhythms and cycles that must be honored rather than forced",
      "Crisis reveals existing community connections while also creating new ones in unexpected ways",
      "Effective community response requires both deep listening and creative adaptation"
    ]
  };

  // KIVA group summary data
  const kivaGroupSummary = {
    title: "Emergent Patterns of Invisible Resilience",
    mainThemes: [
      "Jazz-like improvisation in community response",
      "Invisible networks that activate during crisis", 
      "Rhythmic cycles of community energy and renewal"
    ],
    keyInsights: [
      {
        speaker: "Jordan",
        insight: "Community resilience operates like jazz improvisation - structured freedom that creates beautiful responses to the unexpected."
      },
      {
        speaker: "Amara",
        insight: "The most powerful community resources are invisible relationship networks that light up exactly when needed."
      },
      {
        speaker: "David", 
        insight: "Resilience has natural rhythms - communities need cycles of activation, rest, and renewal to remain sustainable."
      },
      {
        speaker: "Taylor",
        insight: "Crisis doesn't just test existing connections, it reveals hidden ones and creates entirely new pathways."
      },
      {
        speaker: "Sam",
        insight: "Deep listening is the foundation of community improvisation - we respond creatively because we truly hear each other."
      },
      {
        speaker: "Casey",
        insight: "The spaces between formal systems are where the most adaptive community responses emerge."
      }
    ],
    emergingQuestions: [
      "How do we cultivate the 'invisible infrastructure' of relationships before crisis hits?",
      "What practices help communities develop their capacity for beautiful improvisation?",
      "How can we honor the natural rhythms of community energy without forcing activation?",
      "What makes the difference between chaotic response and creative adaptation?"
         ]
   };



   // KIVA summary review functions
   const handleKivaVote = (participant, vote) => {
     setKivaParticipantVotes(prev => ({
       ...prev,
       [participant]: vote
     }));
   };

   const submitKivaSummaryForCompilation = () => {
     setKivaSummarySubmitted(true);
   };

   // Check KIVA voting status
   const allKivaParticipants = Object.keys(kivaParticipantVotes);
   const votedKivaParticipants = allKivaParticipants.filter(p => kivaParticipantVotes[p] !== null);
   const satisfiedKivaVotes = allKivaParticipants.filter(p => kivaParticipantVotes[p] === 'satisfied').length;
   const allKivaVoted = votedKivaParticipants.length === allKivaParticipants.length;
   const canSubmitKiva = allKivaVoted && !kivaSummarySubmitted;

   // Transcription functions - these will be passed to EnhancedTranscription
  const startRecording = () => {
    setIsRecording(true);
    setTranscriptionStatus('Recording...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    setTranscriptionStatus('Processing...');
  };

  const clearTranscription = () => {
    setIsRecording(false);
    setTranscriptionStatus('Ready to transcribe');
    setAiEnhancedTranscript('');
    setAiGeneratedSummary('');
  };

  const getStatusClass = () => {
    return transcriptionStatus.toLowerCase().replace(' ', '-');
  };

  // AI callbacks
  const handleAITranscriptUpdate = (enhancedTranscript) => {
    setAiEnhancedTranscript(enhancedTranscript);
    console.log('📝 AI Enhanced transcript received:', enhancedTranscript.substring(0, 100) + '...');
  };

  const handleAISummaryUpdate = (summary) => {
    setAiGeneratedSummary(summary);
    console.log('📊 AI Summary received:', summary.substring(0, 100) + '...');
  };

  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const toggleMic = () => {
    setIsMuted(!isMuted);
    setIsMicrophoneHover(false); // Reset hover state after click
    hideTooltipImmediately(setShowMicTooltip, micTooltipTimeout, micPressTimeout, micAutoHideTimeout);
  };

  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    setIsCameraHover(false); // Reset hover state after click
    hideTooltipImmediately(setShowCameraTooltip, cameraTooltipTimeout, cameraPressTimeout, cameraAutoHideTimeout);
  };

  const toggleCall = () => {
    setIsInCall(!isInCall);
    setPersonHover(false); // Reset hover state after click
    hideTooltipImmediately(setShowPersonTooltip, personTooltipTimeout, personPressTimeout, personAutoHideTimeout);
  };

  const toggleLoop = () => {
    const newLoopState = !isLoopActive;
    setIsLoopActive(newLoopState);
    setIsLoopHover(false); // Reset hover state after click
    hideTooltipImmediately(setShowLoopTooltip, loopTooltipTimeout, loopPressTimeout, loopAutoHideTimeout);
    if (onLoopToggle) {
      onLoopToggle(newLoopState);
    }
  };

  const vote = (direction) => {
    // Toggle vote state - if same direction, remove vote, otherwise set new vote
    setVoteState(voteState === direction ? null : direction);
  };

  const handleBackClick = () => {
    if (developmentMode && canGoBack && onBack) {
      // Development mode: navigate to previous page
      setBackButtonState('on');
      onBack();
      setTimeout(() => setBackButtonState('off'), 200);
    } else {
      // Normal mode: toggle button state
      const newBackState = backButtonState === 'on' ? 'off' : 'on';
      setBackButtonState(newBackState);
      
      if (newBackState === 'on') {
        setForwardButtonState('off');
      }
    }
  };

  const handleForwardClick = () => {
    if (developmentMode && canGoForward && onForward) {
      // Development mode: navigate to next page
      setForwardButtonState('on');
      onForward();
      setTimeout(() => setForwardButtonState('off'), 200);
    } else {
      // Normal mode: toggle button state
      const newForwardState = forwardButtonState === 'on' ? 'off' : 'on';
      setForwardButtonState(newForwardState);
      
      if (newForwardState === 'on') {
        setBackButtonState('off');
      }
    }
  };

  const handleThumbsUpClick = () => {
    const newThumbsUpState = thumbsUpButtonState === 'on' ? 'off' : 'on';
    setThumbsUpButtonState(newThumbsUpState);
    
    if (newThumbsUpState === 'on') {
      setThumbsDownButtonState('off'); // Turn off thumbs down when thumbs up is on
    }
  };

  const handleThumbsDownClick = () => {
    const newThumbsDownState = thumbsDownButtonState === 'on' ? 'off' : 'on';
    setThumbsDownButtonState(newThumbsDownState);
    
    if (newThumbsDownState === 'on') {
      setThumbsUpButtonState('off'); // Turn off thumbs up when thumbs down is on
    }
  };

  const getBackButtonIcon = () => {
    switch (backButtonState) {
      case 'on': return directionBackwardOn;
      case 'hover': return directionBackwardHover;
      default: return directionBackwardOff;
    }
  };

  const getForwardButtonIcon = () => {
    switch (forwardButtonState) {
      case 'on': return directionForwardOn;
      case 'hover': return directionForwardHover;
      default: return directionForwardOff;
    }
  };

  const getThumbsUpButtonIcon = () => {
    switch (thumbsUpButtonState) {
      case 'on': return thumbsUpOn;
      case 'hover': return thumbsUpHover;
      default: return thumbsUpOff;
    }
  };

  const getThumbsDownButtonIcon = () => {
    switch (thumbsDownButtonState) {
      case 'on': return thumbsDownOn;
      case 'hover': return thumbsDownHover;
      default: return thumbsDownOff;
    }
  };

  return (
    <div className="bottom-content-area">
      {/* Tab area */}
      <div className="tab-area">
        <div className="tab-navigation">
          <div className="tab-controls-left">
            <div 
              className={`tab-btn ${activeTab === 'catalyst' ? 'active' : ''}`}
              onClick={() => switchTab('catalyst')}
            >
              Catalyst
            </div>
            <div 
              className={`tab-btn ${activeTab === 'dialogue' ? 'active' : ''}`}
              onClick={() => switchTab('dialogue')}
            >
              Dialogue
            </div>
            <div 
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => switchTab('summary')}
            >
              Summary
            </div>
            <div 
              className={`tab-btn ${activeTab === 'we' ? 'active' : ''}`}
              onClick={() => switchTab('we')}
            >
              WE
            </div>
          </div>
          
          {/* Transcription Controls */}
          <div className="tab-controls-right">
            <button 
              id="tab-mic-btn"
              className={`transcription-control-btn ${isRecording ? 'danger' : 'primary'}`}
              onClick={isRecording ? stopRecording : startRecording}
              {...createTooltipHandlers(setShowTabMicTooltip, tabMicTooltipTimeout, tabMicPressTimeout, tabMicAutoHideTimeout)}
            >
              <span className="btn-icon">{isRecording ? '⏹' : '🎤'}</span>
              <span className="btn-text">{isRecording ? ' Stop Recording' : ' Start Live Transcription'}</span>
            </button>
            
            <button 
              id="tab-clear-btn"
              className="transcription-control-btn warning"
              onClick={clearTranscription}
              {...createTooltipHandlers(setShowTabClearTooltip, tabClearTooltipTimeout, tabClearPressTimeout, tabClearAutoHideTimeout)}
            >
              <span className="btn-icon">🗑</span>
              <span className="btn-text"> Clear</span>
            </button>
            
            <div 
              id="tab-status-indicator"
              className={`transcription-status ${getStatusClass()}`}
              {...createTooltipHandlers(setShowTabStatusTooltip, tabStatusTooltipTimeout, tabStatusPressTimeout, tabStatusAutoHideTimeout)}
            >
              <span className="status-icon">🚫</span>
              <span className="status-text">{transcriptionError || transcriptionStatus}</span>
            </div>
          </div>
        </div>
        
        <div className="tab-content">
          {/* Orientation Content - shown when no tab is active */}
          {activeTab === '' && (
            <div id="orientationContent" className="content-section">
              <div className="dialogue-section">
                <h3 className="dialogue-title">Dialogue Session Orientation</h3>
                <p>Welcome! In today's Generative Dialogue we have chosen to meet for <strong>90 minutes</strong> on the subject of <strong>Community Engagement</strong>. There are <strong>{participantCount} participants</strong> present. Our gathering hosts today are <strong>Danny Martin and Carlos Monteagudo</strong>.</p>
                
                <p>As we become familiar with Generative Dialogue we will learn how the overall arc of dialogue can create the conditions for deeper connection and collective intelligence to emerge.</p>
                
                <div className="dialogue-instructions">
                  <h4>Dyad Dialogue Guide</h4>
                  <p>In this next section, you will have a total of 10 minutes to share with each other what came up for you during the mindfulness exercise.</p>
                  
                  <p>The 10 minutes will allow the two participants to share as follows:</p>
                  <ol>
                    <li>Go in sequence (4 mins each)</li>
                    <li>No interruption</li>
                    <li>Listen with full presence</li>
                    <li>Notice what resonates</li>
                  </ol>
                </div>
                
                <div className="guiding-question">
                  <strong>Guiding Question:</strong> What personal experiences have shaped your perspective on this topic?
                </div>
                
                {/* Add more content to test scrolling */}
                <div className="dialogue-instructions">
                  <h4>Additional Context</h4>
                  <p>As we move through this dialogue process, we invite you to bring your full presence and authentic voice. This is a space for deep listening and meaningful exchange.</p>
                  
                  <p>The dialogue methodology we're using has been developed through years of research and practice in collective intelligence and community building. Each stage builds on the previous one, creating layers of connection and understanding.</p>
                  
                  <h4>What to Expect</h4>
                  <ol>
                    <li><strong>Connect:</strong> Begin with one-to-one conversations that establish trust and personal connection</li>
                    <li><strong>Explore:</strong> Move to small group conversations that allow deeper exploration of themes</li>
                    <li><strong>Discover:</strong> Engage in larger group witnessing and collective meaning-making</li>
                    <li><strong>Harvest:</strong> Reflect individually and collectively on insights and next steps</li>
                  </ol>
                  
                  <h4>Guidelines for Engagement</h4>
                  <p>Please remember these key principles throughout our dialogue:</p>
                  <ul>
                    <li>Listen with curiosity rather than judgment</li>
                    <li>Speak from personal experience when possible</li>
                    <li>Allow for pauses and silence</li>
                    <li>Notice what wants to emerge rather than pushing an agenda</li>
                    <li>Trust the process and the collective wisdom of the group</li>
                  </ul>
                  
                  <h4>Technical Notes</h4>
                  <p>This platform includes AI-powered transcription and analysis to help capture and synthesize the collective insights that emerge. All content is handled with respect for privacy and the sacred nature of authentic dialogue.</p>
                  
                  <p>If you experience any technical difficulties, please use the chat or audio functions to let us know. Our hosts are here to support both the technical and relational aspects of this gathering.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Catalyst Content - Different content based on page */}
          {activeTab === 'catalyst' && (
            <div id="catalystContent" className="content-section">
              {currentPage === 'discover-fishbowl-catalyst' && isFishbowlCatalyst ? (
                /* DISCOVER Stage Fishbowl Catalyst */
                <div className="dialogue-section">
                  <div style={{marginBottom: '20px'}}>
                    <h3 className="dialogue-title" style={{color: '#D2691E', marginBottom: '15px'}}>
                      DISCOVER Stage - Fishbowl Catalyst
                    </h3>
                    <p style={{fontSize: '14px', lineHeight: '1.5', color: '#555', marginBottom: '15px'}}>
                      In the DISCOVER stage, we listen like a jazz ensemble - for themes, variations, arcs, and overtones. 
                      Six participants engage in fishbowl dialogue while the community witnesses their conversation.
                    </p>
                  </div>

                  {/* Jazz Ensemble Analogy */}
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '1px solid #D2691E',
                    borderRadius: '6px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{color: '#D2691E', marginBottom: '10px', fontSize: '16px'}}>
                      🎷 The Jazz Ensemble Approach
                    </h4>
                    <p style={{fontSize: '14px', lineHeight: '1.5', margin: 0, color: '#333'}}>
                      Like jazz musicians, we're listening for the emerging patterns, the surprising harmonies, 
                      and the spaces between the notes. The fishbowl speakers improvise while the community 
                      witnesses the collective composition unfolding.
                    </p>
                  </div>

                  {/* Fishbowl Instructions */}
                  <div style={{marginBottom: '20px'}}>
                    <h4 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                      Fishbowl Catalyst Question
                    </h4>
                    <div style={{
                      backgroundColor: '#e8f2ff',
                      border: '1px solid #2E5BBA',
                      borderRadius: '4px',
                      padding: '12px',
                      marginBottom: '15px'
                    }}>
                      <strong style={{color: '#2E5BBA'}}>Central Question:</strong>
                      <div style={{marginTop: '5px', fontStyle: 'italic'}}>
                        "{dialogueQuestion}"
                      </div>
                    </div>
                    <div style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
                      <strong>Format:</strong> {dialogueFormat} • <strong>Duration:</strong> {dialogueTimeframe}
                    </div>
                  </div>

                  {/* Live Fishbowl Transcript */}
                  <div>
                    <h4 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                      🔴 Live Fishbowl Transcript
                    </h4>
                    <div style={{
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      padding: '12px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {fishbowlTranscript.length === 0 ? (
                        <div style={{textAlign: 'center', color: '#999', fontStyle: 'italic', padding: '20px'}}>
                          Fishbowl dialogue transcript will appear here in real-time...
                        </div>
                      ) : (
                        fishbowlTranscript.map((entry, index) => (
                          <div key={index} style={{marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid #eee'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                              <strong style={{color: '#D2691E', fontSize: '14px'}}>{entry.speaker}</strong>
                              <span style={{color: '#666', fontSize: '12px'}}>{entry.timestamp}</span>
                            </div>
                            <div style={{fontSize: '14px', lineHeight: '1.4', color: '#333'}}>
                              {entry.text}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      fontStyle: 'italic',
                      marginTop: '8px',
                      textAlign: 'center'
                    }}>
                      💡 Community witnesses this dialogue before moving to KIVA breakout groups
                    </div>
                  </div>
                </div>
              ) : currentPage === 'explore-catalyst' ? (
                /* Explore Catalyst content */
                <div className="dialogue-section">
                  <h3 className="dialogue-title" style={{color: '#E06D37', marginBottom: '20px'}}>Explore Catalyst</h3>
                  <p style={{fontSize: '16px', lineHeight: '1.6', marginBottom: '20px'}}>
                    <strong>Exploring</strong> is the stage of Mindfulness Dialogue where we develop mutual 
                    understanding that will become new shared meaning that will be the foundation of a new 
                    - ever-expanding - WE. In this stage, we build on the connection we have established 
                    to explore the issue we are addressing.
                  </p>
                  
                  <p style={{fontSize: '16px', lineHeight: '1.6', marginBottom: '20px'}}>
                    We begin - as we did in the Connecting stage - with a catalyst. Thus an appropriate poem, 
                    mindfulness exercise, or story that helps us move from our analytical mind to our intuitive 
                    heart, from our left brain to our right brain.
                  </p>
                  
                  <div style={{
                    backgroundColor: '#fff3e0', 
                    border: '1px solid #ffb74d', 
                    borderRadius: '8px', 
                    padding: '20px', 
                    margin: '20px 0',
                    borderLeft: '4px solid #E06D37'
                  }}>
                    <h4 style={{marginBottom: '15px', color: '#E06D37'}}>The Shift to Explore</h4>
                    <p style={{marginBottom: '10px', lineHeight: '1.6'}}>
                      In this phase, we don't try to minimize differences, but rather we highlight them. 
                      We ask respectful questions for clarity and precision. We seek to understand the "other."
                    </p>
                    <p style={{marginBottom: '0', lineHeight: '1.6'}}>
                      <strong>Goal:</strong> To speak from the right brain (heart) rather than left brain (head), 
                      fostering deeper understanding across differences.
                    </p>
                  </div>
                </div>
              ) : (
                /* Default Connect Catalyst content for other pages */
                <div className="dialogue-section">
                  <h3 className="dialogue-title">Connect Catalyst</h3>
                  <p>Every creative interaction begins with <strong>connecting</strong>. This process of connecting forms a <strong>container</strong> - a safe space - where new shared meaning can be generated. We connect through sharing our personal stories. The deeper the story, the deeper the connection. Often, a mindfulness exercise, or a poem, or other such <strong>catalysts</strong> can focus attention in a way that helps us connect with what matters most.</p>
                  
                  <div className="dialogue-instructions">
                    <h4>Dyad Dialogue Instructions</h4>
                    <p>You will now break into pairs for a <strong>10-minute dyad dialogue</strong>. This is your opportunity to connect deeply with one other person before engaging in larger group discussions.</p>
                    
                    <p><strong>Structure:</strong></p>
                    <ol>
                      <li><strong>5 minutes each person</strong> - Share without interruption</li>
                      <li><strong>Deep listening</strong> - When not speaking, listen with full presence</li>
                      <li><strong>Personal stories</strong> - Share experiences that shaped your perspective</li>
                      <li><strong>Notice resonance</strong> - What moves you about what you hear?</li>
                    </ol>
                  </div>
                  
                  <div className="guiding-question">
                    <strong>Catalyst Question:</strong> What personal experience has most shaped your understanding of community engagement? Share a story that reveals why this topic matters to you.
                  </div>
                  
                  <div className="dialogue-instructions" style={{marginTop: '20px', backgroundColor: '#e7f3ff', borderLeft: '4px solid #2196F3'}}>
                    <h4>Breakout Instructions</h4>
                    <p>You will be automatically moved to a breakout room with your dyad partner. Take a moment to check your audio and video, then begin with whoever feels called to share first.</p>
                    
                    <p><strong>Remember:</strong> This is about connecting, not debating. Listen for the humanity in each other's stories.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Dialogue Content - Different content based on page */}
          {activeTab === 'dialogue' && (
            <div id="dialogueContent" className="content-section dialogue-tab-content">
              {currentPage === 'dyad-dialogue-connect' ? (
                isDialogueActive ? (
                  /* CONNECT Stage Dyad Dialogue Content with Full Transcript Functionality */
                  <div className="dialogue-section">
                    {/* Instructions Section */}
                    <div style={{marginBottom: '20px'}}>
                      <h3 className="dialogue-title" style={{color: '#E06D37', marginBottom: '15px'}}>
                        CONNECT Stage - {dialogueFormat} Instructions
                      </h3>
                      
                      <div style={{display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '14px'}}>
                        <div><strong>Format:</strong> {dialogueFormat}</div>
                        <div><strong>Timeframe:</strong> {dialogueTimeframe}</div>
                        <div style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {dialogueTimeRemaining > 0 ? 
                            `${Math.floor(dialogueTimeRemaining / 60)}:${String(dialogueTimeRemaining % 60).padStart(2, '0')} remaining` :
                            '30:00 remaining'
                          }
                        </div>
                      </div>
                      
                      {dialogueQuestion && (
                        <div style={{
                          backgroundColor: '#fff3e0',
                          padding: '10px',
                          borderRadius: '4px',
                          marginBottom: '12px',
                          border: '1px solid #E06D37',
                          fontSize: '14px'
                        }}>
                          <strong style={{color: '#E06D37'}}>Question:</strong> "{dialogueQuestion}"
                        </div>
                      )}

                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        border: '1px solid #E06D37',
                        fontSize: '14px'
                      }}>
                        <strong style={{color: '#E06D37'}}>Connection Guidelines:</strong>
                        <div style={{fontSize: '14px', lineHeight: '1.6', marginTop: '8px'}}>
                          <div style={{marginBottom: '4px'}}>• Go in sequence (share for equal time)</div>
                          <div style={{marginBottom: '4px'}}>• Listen without interruption</div>
                          <div>• Create space for authentic connection</div>
                        </div>
                      </div>
                    </div>

                    {/* Live Transcription Section - Using EnhancedTranscription Component */}
                    <div>
                      <div style={{marginBottom: '15px'}}>
                        <h4 style={{color: '#E06D37', margin: 0, fontSize: '16px', marginBottom: '10px'}}>
                          Live Dialogue Transcript
                        </h4>
                        <p style={{fontSize: '14px', color: '#666', margin: 0}}>
                          Real-time AI transcription with speaker identification and editing capabilities
                        </p>
                      </div>
                      
                      {/* Enhanced Transcription Component */}
                      <EnhancedTranscription
                        isRecording={isRecording}
                        startRecording={startRecording}
                        stopRecording={stopRecording}
                        clearTranscription={clearTranscription}
                        getStatusClass={getStatusClass}
                        onAITranscriptUpdate={handleAITranscriptUpdate}
                        onAISummaryUpdate={handleAISummaryUpdate}
                      />
                    </div>
                  </div>
                ) : (
                  /* CONNECT Stage - Pre-dialogue Instructions */
                  <div className="dialogue-section">
                    <h3 className="dialogue-title" style={{color: '#E06D37', marginBottom: '20px'}}>Dyad Dialogue Guide</h3>
                    <p style={{fontSize: '16px', lineHeight: '1.6', marginBottom: '20px'}}>
                      In this next section, you will have a total of <strong>15 minutes</strong> to share with each other what 
                      brought you together today and what you hope to discover through your connection.
                    </p>
                    
                    <p style={{fontSize: '16px', lineHeight: '1.6', marginBottom: '15px'}}>
                      The <strong>15 minutes</strong> will allow the two participants to share as follows:
                    </p>
                    
                    <div style={{fontSize: '16px', lineHeight: '1.8', marginLeft: '20px'}}>
                      <div style={{marginBottom: '8px'}}>
                        <strong>1.</strong> Go in sequence (share for equal time)
                      </div>
                      <div style={{marginBottom: '15px'}}>
                        <strong>2.</strong> Listen without interruption
                      </div>
                      <div style={{marginBottom: '15px'}}>
                        <strong>3.</strong> Create space for authentic connection
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#fff3e0',
                      padding: '15px',
                      borderRadius: '6px',
                      marginTop: '20px',
                      border: '1px solid #E06D37',
                      textAlign: 'center'
                    }}>
                      <strong style={{color: '#E06D37'}}>🎙️ Once dialogue begins, live transcript and editing features will be available below</strong>
                    </div>
                  </div>
                )
              ) : currentPage === 'explore-triad-dialogue' && isDialogueActive ? (
                /* EXPLORE Stage Triad Dialogue Content */
                <div className="dialogue-section">
                  {/* Instructions Section */}
                  <div style={{marginBottom: '20px'}}>
                    <h3 className="dialogue-title" style={{color: '#2E5BBA', marginBottom: '15px'}}>
                      EXPLORE Stage - {dialogueFormat} Instructions
                    </h3>
                    
                    <div style={{display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '14px'}}>
                      <div><strong>Format:</strong> {dialogueFormat} breakout rooms</div>
                      <div><strong>Timeframe:</strong> {dialogueTimeframe}</div>
                      <div style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {dialogueTimeRemaining > 0 ? 
                          `${Math.floor(dialogueTimeRemaining / 60)}:${String(dialogueTimeRemaining % 60).padStart(2, '0')} remaining` :
                          '30:00 remaining'
                        }
                      </div>
                    </div>
                    
                    {dialogueQuestion && (
                      <div style={{
                        backgroundColor: '#e8f2ff',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        border: '1px solid #2E5BBA',
                        fontSize: '14px'
                      }}>
                        <strong style={{color: '#2E5BBA'}}>Question:</strong> "{dialogueQuestion}"
                      </div>
                    )}
                  </div>

                  {/* Live Transcription Section - Using EnhancedTranscription Component */}
                  <div>
                    <div style={{marginBottom: '15px'}}>
                      <h4 style={{color: '#2E5BBA', margin: 0, fontSize: '16px', marginBottom: '10px'}}>
                        Live Dialogue Transcript
                      </h4>
                      <p style={{fontSize: '14px', color: '#666', margin: 0}}>
                        Real-time AI transcription with speaker identification and editing capabilities
                      </p>
                    </div>
                    
                    {/* Enhanced Transcription Component */}
                    <EnhancedTranscription
                      isRecording={isRecording}
                      startRecording={startRecording}
                      stopRecording={stopRecording}
                      clearTranscription={clearTranscription}
                      getStatusClass={getStatusClass}
                      onAITranscriptUpdate={handleAITranscriptUpdate}
                      onAISummaryUpdate={handleAISummaryUpdate}
                    />
                  </div>
                </div>
              ) : currentPage === 'discover-kiva-dialogue' && isKivaDialogue ? (
                /* DISCOVER Stage KIVA Dialogue Content */
                <div className="dialogue-section">
                  {/* Instructions Section */}
                  <div style={{marginBottom: '20px'}}>
                    <h3 className="dialogue-title" style={{color: '#D2691E', marginBottom: '15px'}}>
                      DISCOVER Stage - {dialogueFormat} 
                    </h3>
                    
                    <div style={{display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '14px'}}>
                      <div><strong>Format:</strong> {dialogueFormat}</div>
                      <div><strong>Timeframe:</strong> {dialogueTimeframe}</div>
                      <div style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {dialogueTimeRemaining > 0 ? 
                          `${Math.floor(dialogueTimeRemaining / 60)}:${String(dialogueTimeRemaining % 60).padStart(2, '0')} remaining` :
                          '30:00 remaining'
                        }
                      </div>
                    </div>
                    
                    {dialogueQuestion && (
                      <div style={{
                        backgroundColor: '#e8f2ff',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '12px',
                        border: '1px solid #2E5BBA',
                        fontSize: '14px'
                      }}>
                        <strong style={{color: '#2E5BBA'}}>Building on the Fishbowl:</strong> "{dialogueQuestion}"
                      </div>
                    )}

                    <div style={{
                      backgroundColor: '#fff3e0',
                      padding: '10px',
                      borderRadius: '4px',
                      marginBottom: '12px',
                      border: '1px solid #D2691E',
                      fontSize: '14px'
                    }}>
                      <strong style={{color: '#D2691E'}}>🎵 Jazz Ensemble Focus:</strong> Listen for themes, variations, and overtones emerging from the fishbowl dialogue. What unexpected connections are you hearing?
                    </div>
                  </div>

                  {/* Live Transcription Section - Using EnhancedTranscription Component */}
                  <div>
                    <div style={{marginBottom: '15px'}}>
                      <h4 style={{color: '#D2691E', margin: 0, fontSize: '16px', marginBottom: '10px'}}>
                        KIVA Group Dialogue Transcript
                      </h4>
                      <p style={{fontSize: '14px', color: '#666', margin: 0}}>
                        Real-time AI transcription with speaker identification for KIVA group discussions
                      </p>
                    </div>
                    
                    {/* Enhanced Transcription Component */}
                    <EnhancedTranscription
                      isRecording={isRecording}
                      startRecording={startRecording}
                      stopRecording={stopRecording}
                      clearTranscription={clearTranscription}
                      getStatusClass={getStatusClass}
                      onAITranscriptUpdate={handleAITranscriptUpdate}
                      onAISummaryUpdate={handleAISummaryUpdate}
                    />
                  </div>
                </div>
              ) : (
                /* Default dialogue content for pages without specific dialogue modes */
                <div className="dialogue-section">
                  <div style={{marginBottom: '15px'}}>
                    <h4 style={{color: '#666', margin: 0, fontSize: '16px', marginBottom: '10px'}}>
                      Live Dialogue Transcript
                    </h4>
                    <p style={{fontSize: '14px', color: '#666', margin: 0}}>
                      Real-time AI transcription with speaker identification and editing capabilities
                    </p>
                  </div>
                  
                  {/* Enhanced Transcription Component */}
                  <EnhancedTranscription
                    isRecording={isRecording}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    clearTranscription={clearTranscription}
                    getStatusClass={getStatusClass}
                    onAITranscriptUpdate={handleAITranscriptUpdate}
                    onAISummaryUpdate={handleAISummaryUpdate}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Summary Content - Different content based on page */}
          {activeTab === 'summary' && (
            <div id="summaryContent" className="content-section">
              {currentPage === 'explore-triad-summary' && isSummaryReview ? (
                /* EXPLORE Stage Triad AI Summary Review */
                <div className="dialogue-section">
                  <div style={{marginBottom: '20px'}}>
                    <h3 className="dialogue-title" style={{color: '#2E5BBA', marginBottom: '15px'}}>
                      AI-Generated Triad Summary
                    </h3>
                    <p style={{fontSize: '14px', lineHeight: '1.5', color: '#555'}}>
                      Please review the AI summary of your dialogue below. Each participant should vote on whether 
                      this accurately represents your conversation before submitting for collective analysis.
                    </p>
                  </div>

                  {/* AI Summary Display */}
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{color: '#2E5BBA', marginBottom: '12px', fontSize: '16px'}}>
                      {aiSummary.title}
                    </h4>
                    
                    {/* Main Themes */}
                    <div style={{marginBottom: '15px'}}>
                      <strong style={{color: '#333', fontSize: '14px'}}>Main Themes:</strong>
                      <ul style={{margin: '5px 0 0 20px', fontSize: '14px', lineHeight: '1.4'}}>
                        {aiSummary.mainThemes.map((theme, index) => (
                          <li key={index} style={{marginBottom: '3px'}}>{theme}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Key Insights */}
                    <div style={{marginBottom: '15px'}}>
                      <strong style={{color: '#333', fontSize: '14px'}}>Key Insights:</strong>
                      <div style={{marginTop: '8px'}}>
                        {aiSummary.keyInsights.map((insight, index) => (
                          <div key={index} style={{marginBottom: '8px', fontSize: '14px'}}>
                            <strong style={{color: '#2E5BBA'}}>{insight.speaker}:</strong> {insight.insight}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Emerging Questions */}
                    <div>
                      <strong style={{color: '#333', fontSize: '14px'}}>Emerging Questions:</strong>
                      <ul style={{margin: '5px 0 0 20px', fontSize: '14px', lineHeight: '1.4'}}>
                        {aiSummary.emergingQuestions.map((question, index) => (
                          <li key={index} style={{marginBottom: '3px'}}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Voting Section */}
                  <div style={{marginBottom: '20px'}}>
                    <h4 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                      Participant Votes ({votedParticipants.length}/{allParticipants.length})
                    </h4>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '10px',
                      marginBottom: '15px'
                    }}>
                      {allParticipants.map(participant => (
                        <div key={participant} style={{
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          padding: '10px',
                          backgroundColor: participantVotes[participant] ? '#f0f8ff' : '#fff'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            marginBottom: '8px',
                            fontSize: '14px',
                            color: '#2E5BBA'
                          }}>
                            {participant}
                          </div>
                          
                          <div style={{display: 'flex', gap: '8px'}}>
                            <button
                              onClick={() => handleVote(participant, 'satisfied')}
                              style={{
                                backgroundColor: participantVotes[participant] === 'satisfied' ? '#28a745' : '#f8f9fa',
                                color: participantVotes[participant] === 'satisfied' ? 'white' : '#28a745',
                                border: '1px solid #28a745',
                                padding: '4px 8px',
                                borderRadius: '3px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              👍 Satisfied
                            </button>
                            <button
                              onClick={() => handleVote(participant, 'not-satisfied')}
                              style={{
                                backgroundColor: participantVotes[participant] === 'not-satisfied' ? '#dc3545' : '#f8f9fa',
                                color: participantVotes[participant] === 'not-satisfied' ? 'white' : '#dc3545',
                                border: '1px solid #dc3545',
                                padding: '4px 8px',
                                borderRadius: '3px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              👎 Not Satisfied
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Voting Status */}
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      textAlign: 'center',
                      marginBottom: '15px'
                    }}>
                      {!allVoted ? (
                        `Waiting for ${allParticipants.length - votedParticipants.length} more vote(s)...`
                      ) : (
                        `All votes received: ${satisfiedVotes} satisfied, ${allParticipants.length - satisfiedVotes} not satisfied`
                      )}
                    </div>

                    {/* Submit Button */}
                    <div style={{textAlign: 'center'}}>
                      {!summarySubmitted ? (
                        <button
                          onClick={submitSummaryForCompilation}
                          disabled={!canSubmit}
                          style={{
                            backgroundColor: canSubmit ? '#2E5BBA' : '#cccccc',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: canSubmit ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Submit for Collective Analysis
                        </button>
                      ) : (
                        <span style={{
                          color: '#28a745',
                          fontSize: '14px',
                          fontWeight: '600',
                          padding: '8px 16px',
                          backgroundColor: '#d4edda',
                          borderRadius: '4px'
                        }}>
                          ✓ Submitted for Collective Analysis
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : currentPage === 'dyad-summary-review' ? (
                /* Dyad AI Summary Review content */
                <div className="dialogue-section">
                  <h3 className="dialogue-title" style={{color: '#E06D37', marginBottom: '20px'}}>Dyad AI Summary</h3>
                  <p style={{fontSize: '16px', lineHeight: '1.6', marginBottom: '20px'}}>
                    The following is an AI generated summary of your sharing. Please quickly review it and 
                    give it a <strong>"hands up"</strong> or <strong>"hands down"</strong> rating for it being a reasonable 
                    representation of what you both shared.
                  </p>
                  
                  <div style={{
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #e9ecef', 
                    borderRadius: '8px', 
                    padding: '20px', 
                    margin: '20px 0',
                    fontStyle: 'italic',
                    lineHeight: '1.6'
                  }}>
                    <p style={{marginBottom: '15px'}}>
                      <strong>AI Generated Summary:</strong>
                    </p>
                    <p style={{marginBottom: '15px'}}>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut 
                      labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco 
                      laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                    <p style={{marginBottom: '0'}}>
                      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat 
                      nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia 
                      deserunt mollit anim id est laborum.
                    </p>
                  </div>
                  
                  <div style={{textAlign: 'center', marginTop: '30px'}}>
                    <p style={{fontSize: '16px', marginBottom: '15px', fontWeight: '500'}}>
                      Rate the accuracy of this summary:
                    </p>
                    <div style={{display: 'flex', justifyContent: 'center', gap: '20px'}}>
                      <button 
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                        onClick={() => {/* Handle thumbs up vote */}}
                      >
                        👍 Hands Up
                      </button>
                      <button 
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                        onClick={() => {/* Handle thumbs down vote */}}
                      >
                        👎 Hands Down
                      </button>
                    </div>
                  </div>
                </div>
              ) : currentPage === 'discover-kiva-summary' && isKivaSummaryReview ? (
                /* DISCOVER Stage KIVA AI Summary Review */
                <div className="dialogue-section">
                  <div style={{marginBottom: '20px'}}>
                    <h3 className="dialogue-title" style={{color: '#D2691E', marginBottom: '15px'}}>
                      AI-Generated KIVA Summary
                    </h3>
                    <p style={{fontSize: '14px', lineHeight: '1.5', color: '#555'}}>
                      Review the AI summary of your KIVA dialogue that built on the fishbowl catalyst. 
                      Each participant should vote before submitting for collective analysis.
                    </p>
                  </div>

                  {/* AI Summary Display */}
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{color: '#D2691E', marginBottom: '12px', fontSize: '16px'}}>
                      {kivaGroupSummary.title}
                    </h4>
                    
                    {/* Main Themes */}
                    <div style={{marginBottom: '15px'}}>
                      <strong style={{color: '#333', fontSize: '14px'}}>Jazz-Inspired Themes:</strong>
                      <ul style={{margin: '5px 0 0 20px', fontSize: '14px', lineHeight: '1.4'}}>
                        {kivaGroupSummary.mainThemes.map((theme, index) => (
                          <li key={index} style={{marginBottom: '3px'}}>{theme}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Key Insights */}
                    <div style={{marginBottom: '15px'}}>
                      <strong style={{color: '#333', fontSize: '14px'}}>Emerging Insights:</strong>
                      <div style={{marginTop: '8px'}}>
                        {kivaGroupSummary.keyInsights.map((insight, index) => (
                          <div key={index} style={{marginBottom: '8px', fontSize: '14px'}}>
                            <strong style={{color: '#D2691E'}}>{insight.speaker}:</strong> {insight.insight}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Emerging Questions */}
                    <div>
                      <strong style={{color: '#333', fontSize: '14px'}}>Questions for Further Discovery:</strong>
                      <ul style={{margin: '5px 0 0 20px', fontSize: '14px', lineHeight: '1.4'}}>
                        {kivaGroupSummary.emergingQuestions.map((question, index) => (
                          <li key={index} style={{marginBottom: '3px'}}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Voting Section */}
                  <div style={{marginBottom: '20px'}}>
                    <h4 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                      KIVA Participant Votes ({votedKivaParticipants.length}/{allKivaParticipants.length})
                    </h4>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '8px',
                      marginBottom: '15px'
                    }}>
                      {allKivaParticipants.map(participant => (
                        <div key={participant} style={{
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          padding: '8px',
                          backgroundColor: kivaParticipantVotes[participant] ? '#f0f8ff' : '#fff',
                          fontSize: '13px'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            marginBottom: '6px',
                            color: '#D2691E'
                          }}>
                            {participant}
                          </div>
                          
                          <div style={{display: 'flex', gap: '4px'}}>
                            <button
                              onClick={() => handleKivaVote(participant, 'satisfied')}
                              style={{
                                backgroundColor: kivaParticipantVotes[participant] === 'satisfied' ? '#28a745' : '#f8f9fa',
                                color: kivaParticipantVotes[participant] === 'satisfied' ? 'white' : '#28a745',
                                border: '1px solid #28a745',
                                padding: '3px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              👍
                            </button>
                            <button
                              onClick={() => handleKivaVote(participant, 'not-satisfied')}
                              style={{
                                backgroundColor: kivaParticipantVotes[participant] === 'not-satisfied' ? '#dc3545' : '#f8f9fa',
                                color: kivaParticipantVotes[participant] === 'not-satisfied' ? 'white' : '#dc3545',
                                border: '1px solid #dc3545',
                                padding: '3px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              👎
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Voting Status */}
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      textAlign: 'center',
                      marginBottom: '15px'
                    }}>
                      {!allKivaVoted ? (
                        `Waiting for ${allKivaParticipants.length - votedKivaParticipants.length} more KIVA vote(s)...`
                      ) : (
                        `All KIVA votes received: ${satisfiedKivaVotes} satisfied, ${allKivaParticipants.length - satisfiedKivaVotes} not satisfied`
                      )}
                    </div>

                    {/* Submit Button */}
                    <div style={{textAlign: 'center'}}>
                      {!kivaSummarySubmitted ? (
                        <button
                          onClick={submitKivaSummaryForCompilation}
                          disabled={!canSubmitKiva}
                          style={{
                            backgroundColor: canSubmitKiva ? '#D2691E' : '#cccccc',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: canSubmitKiva ? 'pointer' : 'not-allowed'
                          }}
                        >
                          Submit for Collective Discovery
                        </button>
                      ) : (
                        <span style={{
                          color: '#28a745',
                          fontSize: '14px',
                          fontWeight: '600',
                          padding: '8px 16px',
                          backgroundColor: '#d4edda',
                          borderRadius: '4px'
                        }}>
                          ✓ Submitted for Collective Discovery
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Default Summary content for other pages */
                <div>
                  {aiGeneratedSummary ? (
                    /* Display Real AI Summary */
                    <div className="summary-card">
                      <div className="summary-header">
                        <div className="summary-title">🤖 AI-Generated Summary</div>
                        <div className="summary-status">Generated from enhanced transcript</div>
                      </div>
                      <div className="summary-content">
                        <div style={{
                          padding: '15px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {aiGeneratedSummary}
                        </div>
                      </div>
                    </div>
                  ) : aiEnhancedTranscript ? (
                    /* Show Enhanced Transcript if Summary not yet generated */
                    <div className="summary-card">
                      <div className="summary-header">
                        <div className="summary-title">📝 Enhanced Transcript</div>
                        <div className="summary-status">AI-processed for accuracy - Ready for summarization</div>
                      </div>
                      <div className="summary-content">
                        <div style={{
                          padding: '15px',
                          backgroundColor: '#e8f5e8',
                          borderRadius: '6px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '300px',
                          overflowY: 'auto'
                        }}>
                          {aiEnhancedTranscript}
                        </div>
                        <div style={{
                          marginTop: '10px',
                          padding: '10px',
                          backgroundColor: '#d1ecf1',
                          borderRadius: '4px',
                          fontSize: '14px',
                          color: '#0c5460'
                        }}>
                          💡 Go to the Dialogue tab and click "Generate Summary" to create an AI summary
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Default placeholder when no AI content available */
                    <>
                      <div className="summary-card">
                        <div className="summary-header">
                          <div className="summary-title">🎤 Live Dialogue Processing</div>
                          <div className="summary-status">AI will analyze and summarize your conversation</div>
                        </div>
                        <div className="summary-content">
                          <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#666',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            border: '1px dashed #dee2e6'
                          }}>
                            <div style={{fontSize: '48px', marginBottom: '15px'}}>🤖</div>
                            <h4 style={{margin: '0 0 10px 0', color: '#495057'}}>AI Summary & Analysis</h4>
                            <p style={{margin: '0 0 15px 0', lineHeight: '1.6'}}>
                              Start recording in the Dialogue tab to generate:
                            </p>
                            <ul style={{textAlign: 'left', display: 'inline-block', margin: 0}}>
                              <li>🔴 <strong>Live transcript</strong> - Real-time speech recognition</li>
                              <li>🤖 <strong>AI-enhanced transcript</strong> - Improved accuracy & formatting</li>
                              <li>📝 <strong>AI summary</strong> - Key themes and insights</li>
                              <li>👥 <strong>Speaker identification</strong> - Who said what</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Show Original Summary Cards Only as Fallback */}
                  {!aiGeneratedSummary && !aiEnhancedTranscript && (
                    <>
                      <div className="summary-card">
                        <div className="summary-header">
                          <div className="summary-title">Key Themes Emerging</div>
                          <div className="summary-status">Based on conversation patterns</div>
                        </div>
                        <div className="summary-content">
                          <div className="theme-item">
                            <span className="theme-icon">🌱</span>
                            <div className="theme-content">
                              <div className="theme-title">Authentic Connection</div>
                              <div className="theme-description">The conversation explores the depth of human connection beyond surface-level interactions.</div>
                            </div>
                          </div>
                          <div className="theme-item">
                            <span className="theme-icon">🔄</span>
                            <div className="theme-content">
                              <div className="theme-title">Mutual Understanding</div>
                              <div className="theme-description">Participants are finding common ground through shared experiences and perspectives.</div>
                            </div>
                          </div>
                          <div className="theme-item">
                            <span className="theme-icon">💡</span>
                            <div className="theme-content">
                              <div className="theme-title">Emerging Insights</div>
                              <div className="theme-description">New possibilities and questions are arising from the dialogue exchange.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* WE Content - Different content based on page */}
          {activeTab === 'we' && (
            <div id="weContent" className="content-section">
              {currentPage === 'explore-collective-wisdom' && isCollectiveWisdom ? (
                /* EXPLORE Stage Collective Wisdom */
                <div className="dialogue-section">
                  <div style={{marginBottom: '30px'}}>
                    <h3 className="dialogue-title" style={{color: '#2E5BBA', marginBottom: '15px'}}>
                      Collective Wisdom: What Are WE Saying?
                    </h3>
                    <p style={{fontSize: '14px', lineHeight: '1.5', color: '#555', marginBottom: '20px'}}>
                      After reflecting in triads, we come back together to understand the collective wisdom that 
                      has emerged. Here are voices from the field followed by AI-compiled insights from all triad conversations.
                    </p>
                  </div>

                  {/* Voices from the Field */}
                  <div style={{marginBottom: '30px'}}>
                    <h4 style={{color: '#2E5BBA', marginBottom: '15px', fontSize: '18px'}}>
                      🎤 Voices from the Field
                    </h4>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '15px', fontStyle: 'italic'}}>
                      Participants share what they heard and experienced in their triad conversations:
                    </p>
                    
                    <div style={{
                      display: 'grid',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      {voicesFromField.map((voice, index) => (
                        <div key={index} style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '6px',
                          padding: '12px'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            color: '#2E5BBA',
                            fontSize: '14px',
                            marginBottom: '6px'
                          }}>
                            {voice.speaker}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            lineHeight: '1.4',
                            fontStyle: 'italic',
                            color: '#333'
                          }}>
                            "{voice.quote}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Compiled Collective Wisdom */}
                  <div style={{marginBottom: '20px'}}>
                    <h4 style={{color: '#2E5BBA', marginBottom: '15px', fontSize: '18px'}}>
                      🧠 AI-Compiled Collective Wisdom
                    </h4>
                    
                    {/* Narrative Summary */}
                    <div style={{
                      backgroundColor: '#e8f2ff',
                      border: '1px solid #2E5BBA',
                      borderRadius: '6px',
                      padding: '15px',
                      marginBottom: '20px'
                    }}>
                      <h5 style={{color: '#2E5BBA', marginBottom: '10px', fontSize: '16px'}}>
                        Narrative Summary
                      </h5>
                      <p style={{
                        fontSize: '14px',
                        lineHeight: '1.5',
                        margin: 0,
                        color: '#333'
                      }}>
                        {collectiveWisdom.narrative}
                      </p>
                    </div>

                    {/* Key Themes */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Key Themes Across All Triads
                      </h5>
                      <div style={{display: 'grid', gap: '10px'}}>
                        {collectiveWisdom.keyThemes.map((theme, index) => (
                          <div key={index} style={{
                            backgroundColor: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '12px'
                          }}>
                            <div style={{
                              fontWeight: '600',
                              color: '#2E5BBA',
                              fontSize: '14px',
                              marginBottom: '4px'
                            }}>
                              {theme.theme}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              lineHeight: '1.4',
                              marginBottom: '4px',
                              color: '#333'
                            }}>
                              {theme.description}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              fontStyle: 'italic'
                            }}>
                              {theme.prevalence}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Choice Quotes */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Choice Quotes from Collective Dialogue
                      </h5>
                      <div style={{display: 'grid', gap: '10px'}}>
                        {collectiveWisdom.choiceQuotes.map((quote, index) => (
                          <div key={index} style={{
                            backgroundColor: '#f0f8f0',
                            border: '1px solid #28a745',
                            borderRadius: '4px',
                            padding: '12px'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              lineHeight: '1.4',
                              fontStyle: 'italic',
                              marginBottom: '6px',
                              color: '#333'
                            }}>
                              "{quote.quote}"
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#28a745',
                              fontWeight: '600'
                            }}>
                              — {quote.attribution}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment Analysis */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Quantitative Sentiment Analysis
                      </h5>
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '15px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          marginBottom: '10px',
                          color: '#2E5BBA'
                        }}>
                          Overall Tone: {collectiveWisdom.sentimentAnalysis.overall}
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '8px',
                          fontSize: '13px'
                        }}>
                          <div>💚 Hopefulness: {collectiveWisdom.sentimentAnalysis.hopefulness}%</div>
                          <div>⚡ Empowerment: {collectiveWisdom.sentimentAnalysis.empowerment}%</div>
                          <div>🤝 Connection: {collectiveWisdom.sentimentAnalysis.connection}%</div>
                          <div>⚠️ Concern: {collectiveWisdom.sentimentAnalysis.concern}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Emerging Wisdom */}
                    <div>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Emerging Collective Wisdom
                      </h5>
                      <div style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        padding: '15px'
                      }}>
                        <ul style={{
                          margin: 0,
                          paddingLeft: '20px',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>
                          {collectiveWisdom.emergingWisdom.map((wisdom, index) => (
                            <li key={index} style={{marginBottom: '6px', color: '#333'}}>
                              {wisdom}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentPage === 'connect-dyad-collective-wisdom' && isCollectiveWisdom ? (
                /* CONNECT Stage Collective Wisdom - Combined Version */
                <div className="dialogue-section">
                  <div style={{marginBottom: '30px'}}>
                    <h3 className="dialogue-title" style={{color: '#E06D37', marginBottom: '20px'}}>
                      Voices From the Field<br/>What are WE Saying?
                    </h3>
                    <p style={{fontSize: '16px', lineHeight: '1.6', marginBottom: '20px'}}>
                      After experiencing authentic one-to-one connection in dyads, we come back together to discover 
                      the collective wisdom that emerges. Let us now hear from a small representative number <strong>(~six volunteers)</strong>. 
                      This is a way to add to our sense of connection - the emerging WE - that has already begun to surface.
                    </p>
                  </div>

                  {/* Voices from the Field */}
                  <div style={{marginBottom: '30px'}}>
                    <h4 style={{color: '#E06D37', marginBottom: '15px', fontSize: '18px'}}>
                      🎤 Voices from Dyad Connections
                    </h4>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '15px', fontStyle: 'italic'}}>
                      Participants share what they discovered about connection through their one-to-one conversations:
                    </p>
                    
                    <div style={{
                      display: 'grid',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      {connectVoicesFromField.map((voice, index) => (
                        <div key={index} style={{
                          backgroundColor: '#fff3e0',
                          border: '1px solid #E06D37',
                          borderRadius: '6px',
                          padding: '12px'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            color: '#E06D37',
                            fontSize: '14px',
                            marginBottom: '6px'
                          }}>
                            {voice.speaker}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            lineHeight: '1.4',
                            fontStyle: 'italic',
                            color: '#333'
                          }}>
                            "{voice.quote}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What Are We Saying - AI-Generated Collective Wisdom */}
                  <div>
                    <h4 style={{color: '#E06D37', marginBottom: '15px', fontSize: '18px'}}>
                      🧠 What Are We Saying? - Collective Wisdom
                    </h4>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '20px', fontStyle: 'italic'}}>
                      Drawing from all dyad conversations, here's what emerges about the nature of human connection:
                    </p>

                    <div style={{
                      backgroundColor: '#fff3e0',
                      border: '1px solid #E06D37', 
                      borderRadius: '6px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h5 style={{color: '#E06D37', marginBottom: '10px', fontSize: '16px'}}>
                        {connectCollectiveWisdom.title}
                      </h5>
                      <p style={{
                        fontSize: '14px',
                        lineHeight: '1.5',
                        margin: 0,
                        color: '#333'
                      }}>
                        {connectCollectiveWisdom.narrative}
                      </p>
                    </div>

                    {/* Choice Quotes */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Wisdom Quotes from Connection
                      </h5>
                      <div style={{display: 'grid', gap: '10px'}}>
                        {connectCollectiveWisdom.choiceQuotes.map((quote, index) => (
                          <div key={index} style={{
                            backgroundColor: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '12px'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              lineHeight: '1.4',
                              fontStyle: 'italic',
                              marginBottom: '6px',
                              color: '#333'
                            }}>
                              "{quote.quote}"
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              textAlign: 'right'
                            }}>
                              — {quote.attribution}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment Analysis */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Connection Quality Analysis
                      </h5>
                      <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '15px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '10px',
                          color: '#E06D37'
                        }}>
                          Overall Tone: {connectCollectiveWisdom.sentimentAnalysis.overall}
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '8px',
                          fontSize: '13px'
                        }}>
                          <div>🤗 Vulnerability: {connectCollectiveWisdom.sentimentAnalysis.vulnerability}%</div>
                          <div>🛡️ Safety: {connectCollectiveWisdom.sentimentAnalysis.safety}%</div>
                          <div>✨ Authenticity: {connectCollectiveWisdom.sentimentAnalysis.authenticity}%</div>
                          <div>🌱 Hope: {connectCollectiveWisdom.sentimentAnalysis.hope}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Emerging Wisdom */}
                    <div>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Emerging Wisdom About Connection
                      </h5>
                      <div style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        padding: '15px'
                      }}>
                        <ul style={{
                          margin: 0,
                          paddingLeft: '20px',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>
                          {connectCollectiveWisdom.emergingWisdom.map((wisdom, index) => (
                            <li key={index} style={{marginBottom: '6px', color: '#333'}}>
                              {wisdom}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentPage === 'discover-collective-wisdom' && isDiscoverCollectiveWisdom ? (
                /* DISCOVER Stage Collective Wisdom */
                <div className="dialogue-section">
                  <div style={{marginBottom: '30px'}}>
                    <h3 className="dialogue-title" style={{color: '#D2691E', marginBottom: '15px'}}>
                      Jazz Ensemble Wisdom: What Are WE Discovering?
                    </h3>
                    <p style={{fontSize: '14px', lineHeight: '1.5', color: '#555', marginBottom: '20px'}}>
                      After our fishbowl catalyst and KIVA dialogues, we listen for the collective jazz composition 
                      that emerged. Here are voices from the field followed by patterns and overtones discovered across all groups.
                    </p>
                  </div>

                  {/* Voices from the Field */}
                  <div style={{marginBottom: '30px'}}>
                    <h4 style={{color: '#D2691E', marginBottom: '15px', fontSize: '18px'}}>
                      🎤 Voices from the Field
                    </h4>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '15px', fontStyle: 'italic'}}>
                      Participants share what they discovered in the jazz-like flow of dialogue:
                    </p>
                    
                    <div style={{
                      display: 'grid',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      {discoverVoicesFromField.map((voice, index) => (
                        <div key={index} style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '6px',
                          padding: '12px'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            color: '#D2691E',
                            fontSize: '14px',
                            marginBottom: '6px'
                          }}>
                            {voice.speaker}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            lineHeight: '1.4',
                            fontStyle: 'italic',
                            color: '#333'
                          }}>
                            "{voice.quote}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Compiled Discovery Wisdom */}
                  <div style={{marginBottom: '20px'}}>
                    <h4 style={{color: '#D2691E', marginBottom: '15px', fontSize: '18px'}}>
                      🎷 AI-Compiled Discovery Patterns
                    </h4>
                    
                    {/* Narrative Summary */}
                    <div style={{
                      backgroundColor: '#fff3e0',
                      border: '1px solid #D2691E',
                      borderRadius: '6px',
                      padding: '15px',
                      marginBottom: '20px'
                    }}>
                      <h5 style={{color: '#D2691E', marginBottom: '10px', fontSize: '16px'}}>
                        Jazz Ensemble Narrative
                      </h5>
                      <p style={{
                        fontSize: '14px',
                        lineHeight: '1.5',
                        margin: 0,
                        color: '#333'
                      }}>
                        {discoverCollectiveWisdom.narrative}
                      </p>
                    </div>

                    {/* Key Themes */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Emerging Overtones Across All KIVA Groups
                      </h5>
                      <div style={{display: 'grid', gap: '10px'}}>
                        {discoverCollectiveWisdom.keyThemes.map((theme, index) => (
                          <div key={index} style={{
                            backgroundColor: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '12px'
                          }}>
                            <div style={{
                              fontWeight: '600',
                              color: '#D2691E',
                              fontSize: '14px',
                              marginBottom: '4px'
                            }}>
                              {theme.theme}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              lineHeight: '1.4',
                              marginBottom: '4px',
                              color: '#333'
                            }}>
                              {theme.description}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              fontStyle: 'italic'
                            }}>
                              {theme.prevalence}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Choice Quotes */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Jazz Compositions from KIVA Groups
                      </h5>
                      <div style={{display: 'grid', gap: '10px'}}>
                        {discoverCollectiveWisdom.choiceQuotes.map((quote, index) => (
                          <div key={index} style={{
                            backgroundColor: '#f0f8f0',
                            border: '1px solid #28a745',
                            borderRadius: '4px',
                            padding: '12px'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              lineHeight: '1.4',
                              fontStyle: 'italic',
                              marginBottom: '6px',
                              color: '#333'
                            }}>
                              "{quote.quote}"
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#28a745',
                              fontWeight: '600'
                            }}>
                              — {quote.attribution}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment Analysis */}
                    <div style={{marginBottom: '20px'}}>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Collective Emotional Tonality
                      </h5>
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '15px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          marginBottom: '10px',
                          color: '#D2691E'
                        }}>
                          Overall Jazz Mood: {discoverCollectiveWisdom.sentimentAnalysis.overall}
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '8px',
                          fontSize: '13px'
                        }}>
                          <div>💚 Hopefulness: {discoverCollectiveWisdom.sentimentAnalysis.hopefulness}%</div>
                          <div>⚡ Empowerment: {discoverCollectiveWisdom.sentimentAnalysis.empowerment}%</div>
                          <div>🤝 Connection: {discoverCollectiveWisdom.sentimentAnalysis.connection}%</div>
                          <div>⚠️ Concern: {discoverCollectiveWisdom.sentimentAnalysis.concern}%</div>
                          <div>✨ Wonder: {discoverCollectiveWisdom.sentimentAnalysis.wonder}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Emerging Wisdom */}
                    <div>
                      <h5 style={{color: '#333', marginBottom: '12px', fontSize: '16px'}}>
                        Discovered Collective Wisdom
                      </h5>
                      <div style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        padding: '15px'
                      }}>
                        <ul style={{
                          margin: 0,
                          paddingLeft: '20px',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>
                          {discoverCollectiveWisdom.emergingWisdom.map((wisdom, index) => (
                            <li key={index} style={{marginBottom: '6px', color: '#333'}}>
                              {wisdom}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentPage === 'harvest' && isHarvestClosing ? (
                /* HARVEST Stage - What's Next? */
                <div className="dialogue-section">
                  <div style={{marginBottom: '30px'}}>
                    <h3 className="dialogue-title" style={{color: '#FF8C00', marginBottom: '15px'}}>
                      What's Next?
                    </h3>
                    <p style={{fontSize: '16px', lineHeight: '1.6', color: '#333', marginBottom: '20px'}}>
                      It is important to harvest this rich experience and translate it into actions, however small. 
                      These "next steps" can take the form of committing to a continuing process; later they may take 
                      the form of new principles and application; over time they will hopefully be part of a movement 
                      of transformation.
                    </p>
                  </div>

                  {/* Closing Thank You */}
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '1px solid #FF8C00',
                    borderRadius: '6px',
                    padding: '20px',
                    marginBottom: '25px',
                    textAlign: 'center'
                  }}>
                    <h4 style={{color: '#FF8C00', marginBottom: '10px', fontSize: '18px'}}>
                      🙏 Thank You for Your Participation
                    </h4>
                    <p style={{fontSize: '15px', lineHeight: '1.5', margin: 0, color: '#333'}}>
                      Our dialogue community has created something beautiful together. Before we close, 
                      please take a few minutes to capture your immediate responses to the questions below.
                    </p>
                  </div>

                  {/* Instructions */}
                  <div style={{
                    backgroundColor: '#f0f8ff',
                    border: '1px solid #4169E1',
                    borderRadius: '6px',
                    padding: '20px',
                    marginBottom: '25px'
                  }}>
                    <h4 style={{color: '#4169E1', marginBottom: '15px', fontSize: '18px'}}>
                      📝 Freestyle Response Instructions
                    </h4>
                    <p style={{fontSize: '15px', lineHeight: '1.6', marginBottom: '12px', color: '#333'}}>
                      <strong>Just blurt out the first things that come to mind - don't overthink it!</strong>
                    </p>
                    <p style={{fontSize: '14px', lineHeight: '1.5', margin: 0, color: '#555'}}>
                      These written responses should take no more than a few minutes each. They will be 
                      fed into our AI for collective summarization and analysis to help us understand 
                      how to best support the continuing movement of transformation.
                    </p>
                  </div>



                  {/* Next Steps Instructions */}
                  <div style={{
                    backgroundColor: '#fff3e0',
                    border: '1px solid #FF8C00',
                    borderRadius: '6px',
                    padding: '20px',
                    marginBottom: '25px',
                    textAlign: 'center'
                  }}>
                    <h4 style={{color: '#FF8C00', marginBottom: '12px', fontSize: '16px'}}>
                      🔄 What Happens Next
                    </h4>
                    <p style={{fontSize: '14px', lineHeight: '1.5', margin: 0, color: '#333'}}>
                      When you're ready, you'll move to <strong>Self View</strong> for individual reflection time. 
                      Take as much time as you need to capture your authentic responses to these questions.
                    </p>
                  </div>

                  {/* Final Message */}
                  <div style={{
                    backgroundColor: '#f0f8f0',
                    border: '1px solid #28a745',
                    borderRadius: '6px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <h4 style={{color: '#28a745', marginBottom: '12px', fontSize: '16px'}}>
                      🌱 The Journey Continues
                    </h4>
                    <p style={{fontSize: '14px', lineHeight: '1.5', margin: 0, color: '#333'}}>
                      Your responses will be compiled with all other participants for collective AI analysis. 
                      This rich harvest will help us understand how to best support the continuing movement 
                      of transformation that has begun here today.
                    </p>
                  </div>
                </div>
              ) : (
                /* Default WE content for CONNECT and other pages - Combined Voices From Field style */
                <div className="dialogue-section">
                  <div style={{marginBottom: '30px'}}>
                    <h3 className="dialogue-title" style={{color: '#E06D37', marginBottom: '20px'}}>
                      Voices From the Field<br/>What are WE Saying?
                    </h3>
                    <p style={{fontSize: '16px', lineHeight: '1.6', marginBottom: '20px'}}>
                      Let us now hear from a small representative number <strong>(~six volunteers)</strong>. This is a way to 
                      add to our sense of connection - the emerging WE - that has already begun to surface.
                    </p>
                  </div>

                  {/* Voices from the Field */}
                  <div style={{marginBottom: '30px'}}>
                    <h4 style={{color: '#E06D37', marginBottom: '15px', fontSize: '18px'}}>
                      🎤 Voices from the Field
                    </h4>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '15px', fontStyle: 'italic'}}>
                      Participants share insights and discoveries from their dialogue experiences:
                    </p>
                    
                    <div style={{
                      display: 'grid',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        backgroundColor: '#fff3e0',
                        border: '1px solid #E06D37',
                        borderRadius: '6px',
                        padding: '12px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#E06D37',
                          fontSize: '14px',
                          marginBottom: '6px'
                        }}>
                          Sarah Johnson
                        </div>
                        <div style={{
                          fontSize: '14px',
                          lineHeight: '1.4',
                          fontStyle: 'italic',
                          color: '#333'
                        }}>
                          "I was struck by how many of us referenced indigenous wisdom traditions as models for long-term thinking. There seems to be a collective yearning to reconnect with these deeper ways of seeing ourselves in relationship to future generations."
                        </div>
                      </div>
                      
                      <div style={{
                        backgroundColor: '#fff3e0',
                        border: '1px solid #E06D37',
                        borderRadius: '6px',
                        padding: '12px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#E06D37',
                          fontSize: '14px',
                          marginBottom: '6px'
                        }}>
                          Michael Chen
                        </div>
                        <div style={{
                          fontSize: '14px',
                          lineHeight: '1.4',
                          fontStyle: 'italic',
                          color: '#333'
                        }}>
                          "Our breakout group discussed how governance structures might be redesigned to include representatives for future generations - I'm curious if other groups explored similar ideas."
                        </div>
                      </div>
                      
                      <div style={{
                        backgroundColor: '#fff3e0',
                        border: '1px solid #E06D37',
                        borderRadius: '6px',
                        padding: '12px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#E06D37',
                          fontSize: '14px',
                          marginBottom: '6px'
                        }}>
                          Aisha Patel
                        </div>
                        <div style={{
                          fontSize: '14px',
                          lineHeight: '1.4',
                          fontStyle: 'italic',
                          color: '#333'
                        }}>
                          "We explored the tension between short-term economic incentives and long-term ecological health. Several of us wondered what economic models might better align with intergenerational thinking."
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* What Are We Saying - Emerging Themes */}
                  <div>
                    <h4 style={{color: '#E06D37', marginBottom: '15px', fontSize: '18px'}}>
                      🧠 What Are We Saying? - Emerging Themes
                    </h4>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '20px', fontStyle: 'italic'}}>
                      Collective patterns and themes emerging from our shared dialogues:
                    </p>

                    <div style={{
                      backgroundColor: '#fff3e0',
                      border: '1px solid #E06D37',
                      borderRadius: '6px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h5 style={{color: '#E06D37', marginBottom: '15px', fontSize: '16px'}}>
                        Emerging Collective Wisdom
                      </h5>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '10px',
                        marginBottom: '15px'
                      }}>
                        <span style={{
                          backgroundColor: '#E06D37',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textAlign: 'center'
                        }}>intergenerationalEthics</span>
                        <span style={{
                          backgroundColor: '#E06D37',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textAlign: 'center'
                        }}>indigenousWisdom</span>
                        <span style={{
                          backgroundColor: '#E06D37',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textAlign: 'center'
                        }}>governanceReform</span>
                        <span style={{
                          backgroundColor: '#E06D37',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textAlign: 'center'
                        }}>economicReimagining</span>
                        <span style={{
                          backgroundColor: '#E06D37',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textAlign: 'center'
                        }}>ecologicalAwareness</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Control bar */}
      <div className="control-bar">
        {/* Media controls - Left group */}
        <div className="media-controls">
          <button 
            id="camera-btn" 
            className="control-button"
            onClick={(e) => {
              toggleCamera();
            }}
            {...createTooltipHandlers(setShowCameraTooltip, cameraTooltipTimeout, cameraPressTimeout, cameraAutoHideTimeout)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          >
            <img 
              src={isCameraOff 
                ? (isCameraHover ? cameraHover : cameraOff)
                : (isCameraHover ? cameraHover : cameraOn)
              } /* Updated hover logic */
              alt="Camera" 
              style={{
                width: '24px', 
                height: '24px',
                display: 'block',
                objectFit: 'contain',
                objectPosition: 'center',
                verticalAlign: 'top'
              }}
            />
          </button>
          <button 
            id="mic-btn" 
            className="control-button"
            onClick={(e) => {
              hideTooltipImmediately(setShowMicTooltip, micTooltipTimeout, micPressTimeout, micAutoHideTimeout);
              toggleMic(e);
            }}
            {...createTooltipHandlers(setShowMicTooltip, micTooltipTimeout, micPressTimeout, micAutoHideTimeout)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          >
            <img 
              src={isMuted 
                ? (isMicrophoneHover ? microphoneHover : microphoneOff)
                : (isMicrophoneHover ? microphoneHover : microphoneOn)
              }
              alt="Microphone" 
              style={{
                width: '28px', 
                height: '28px',
                display: 'block',
                objectFit: 'contain',
                objectPosition: 'center',
                verticalAlign: 'top',
                position: 'relative',
                top: isMuted ? '-1px' : '0px'
              }}
            />
          </button>
          <button 
            id="join-btn" 
            className={`control-button ${isInCall ? 'active' : ''}`}
            onClick={(e) => {
              hideTooltipImmediately(setShowPersonTooltip, personTooltipTimeout, personPressTimeout, personAutoHideTimeout);
              toggleCall(e);
            }}
            {...createTooltipHandlers(setShowPersonTooltip, personTooltipTimeout, personPressTimeout, personAutoHideTimeout)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          > {/* Person button with new logic */}
            <img 
              src={isInCall 
                ? (personHover ? dialoguePersonHover : dialoguePersonOn)
                : (personHover ? dialoguePersonHover : dialoguePersonOff)
              }
              alt={isInCall ? 'Leave Call' : 'Join Call'}
              style={{
                width: '29px', 
                height: '29px',
                display: 'block',
                objectFit: 'contain',
                objectPosition: 'center',
                verticalAlign: 'top',
                position: 'relative',
                top: '1px'
              }}
            />
          </button>
          <button 
            id="loop-btn" 
            className={`control-button ${isLoopActive ? 'active' : ''}`}
            onClick={(e) => {
              hideTooltipImmediately(setShowLoopTooltip, loopTooltipTimeout, loopPressTimeout, loopAutoHideTimeout);
              toggleLoop(e);
            }}
            {...createTooltipHandlers(setShowLoopTooltip, loopTooltipTimeout, loopPressTimeout, loopAutoHideTimeout)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          >
            <img 
              src={isLoopActive 
                ? loopHover  // Always show blue with orange handle when active
                : (isLoopHover ? loopHover : loopOn)
              }
              alt={isLoopActive ? 'Disable Loop' : 'Enable Loop'}
              style={{width: '24px', height: '24px'}}
            />
          </button>
        </div>
        
        {/* Timer display - Responsive: separate times for desktop, total only for mobile */}
        <div className="timer-display">
          {/* Desktop view: show both times separately */}
          <div className="timer-cell-desktop timer-total">
            <div className="timer-label">TOTAL TIME</div>
            <div className="timer-value" id="total-time">
              {totalTime.replace(/^0+:/, '').replace(/^0/, '') || totalTime}
            </div>
          </div>
          
          <div className="timer-cell-desktop timer-segment">
            <div className="timer-label">SEGMENT TIME</div>
            <div className="timer-value" id="segment-time">
              {segmentTime}
            </div>
          </div>
          
          {/* Mobile view: show only total time */}
          <div className="timer-cell-mobile">
            <div className="timer-label">TOTAL TIME</div>
            <div className="timer-value" id="mobile-total-time">
              {totalTime.replace(/^0+:/, '').replace(/^0/, '') || totalTime}
            </div>
          </div>
        </div>
        
        {/* Navigation controls - Right group */}
        <div className="navigation-controls"  style={{display: 'flex'}}>
          {/* Voting controls */}
          <button 
            id="thumbs-up-btn" 
            className={`control-button ${thumbsUpButtonState === 'on' ? 'active' : ''}`}
            onClick={handleThumbsUpClick}
            onMouseEnter={() => setThumbsUpButtonState(thumbsUpButtonState === 'on' ? 'on' : 'hover')}
            onMouseLeave={() => setThumbsUpButtonState(thumbsUpButtonState === 'on' ? 'on' : 'off')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              borderRadius: '50%',
              boxShadow: 'none',
              cursor: 'pointer'
            }}
          >
            <img 
              src={getThumbsUpButtonIcon()} 
              alt="Thumbs Up" 
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </button>
          
          <button 
            id="thumbs-down-btn" 
            className={`control-button ${thumbsDownButtonState === 'on' ? 'active' : ''}`}
            onClick={handleThumbsDownClick}
            onMouseEnter={() => setThumbsDownButtonState(thumbsDownButtonState === 'on' ? 'on' : 'hover')}
            onMouseLeave={() => setThumbsDownButtonState(thumbsDownButtonState === 'on' ? 'on' : 'off')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              borderRadius: '50%',
              boxShadow: 'none',
              cursor: 'pointer'
            }}
          >
            <img 
              src={getThumbsDownButtonIcon()} 
              alt="Thumbs Down" 
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </button>
          
          <button 
            id="back-btn" 
            className="control-button"
            onClick={handleBackClick}
            onMouseEnter={() => (!developmentMode || canGoBack) && setBackButtonState(backButtonState === 'on' ? 'on' : 'hover')}
            onMouseLeave={() => setBackButtonState(backButtonState === 'on' ? 'on' : 'off')}
            disabled={developmentMode && !canGoBack}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              borderRadius: '50%',
              boxShadow: 'none',
              opacity: (developmentMode && !canGoBack) ? 0.4 : 1,
              cursor: (developmentMode && !canGoBack) ? 'not-allowed' : 'pointer'
            }}
          >
            <img 
              src={getBackButtonIcon()} 
              alt="Back" 
              style={{width: '34px', height: '34px'}}
            />
          </button>
          <button 
            id="forward-btn" 
            className="control-button"
            onClick={handleForwardClick}
            onMouseEnter={() => (!developmentMode || canGoForward) && setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'hover')}
            onMouseLeave={() => setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'off')}
            disabled={developmentMode && !canGoForward}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              borderRadius: '50%',
              boxShadow: 'none',
              overflow: 'hidden',
              opacity: (developmentMode && !canGoForward) ? 0.4 : 1,
              cursor: (developmentMode && !canGoForward) ? 'not-allowed' : 'pointer'
            }}
          >
            <img 
              src={getForwardButtonIcon()} 
              alt="Forward" 
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </button>
        </div>
      </div>

      {/* Tooltips */}
      {showCameraTooltip && (
        <div style={{
          position: 'fixed',
          ...getTooltipPosition('camera-btn'),
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '12px 20px' : '8px 12px',
          borderRadius: '8px',
          fontSize: window.innerWidth <= 768 ? '16px' : '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: window.innerWidth <= 768 ? '90vw' : 'auto',
          textAlign: 'center'
        }}>
          {isCameraOff ? '📷 Turn camera on' : '📷 Turn camera off'}
          {/* Left-pointing tooltip arrow */}
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {showMicTooltip && (
        <div style={{
          position: 'fixed',
          ...getTooltipPosition('mic-btn'),
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '12px 20px' : '8px 12px',
          borderRadius: '8px',
          fontSize: window.innerWidth <= 768 ? '16px' : '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: window.innerWidth <= 768 ? '90vw' : 'auto',
          textAlign: 'center'
        }}>
          {isMuted ? '🎤 Unmute microphone' : '🎤 Mute microphone'}
          {/* Left-pointing tooltip arrow */}
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {showPersonTooltip && (
        <div style={{
          position: 'fixed',
          ...getTooltipPosition('join-btn'),
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '12px 20px' : '8px 12px',
          borderRadius: '8px',
          fontSize: window.innerWidth <= 768 ? '16px' : '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: window.innerWidth <= 768 ? '90vw' : 'auto',
          textAlign: 'center'
        }}>
          {isInCall ? '👤 Leave call' : '👤 Join call'}
          {/* Left-pointing tooltip arrow */}
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {showLoopTooltip && (
        <div style={{
          position: 'fixed',
          ...getTooltipPosition('loop-btn'),
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '12px 20px' : '8px 12px',
          borderRadius: '8px',
          fontSize: window.innerWidth <= 768 ? '16px' : '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: window.innerWidth <= 768 ? '90vw' : 'auto',
          textAlign: 'center'
        }}>
          🔍 Toggle loop magnifier
          {/* Left-pointing tooltip arrow */}
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {/* Tab Control Tooltips */}
      {showTabMicTooltip && (
        <div style={{
          position: 'fixed',
          ...getTooltipPosition('tab-mic-btn'),
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '12px 20px' : '8px 12px',
          borderRadius: '8px',
          fontSize: window.innerWidth <= 768 ? '16px' : '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: window.innerWidth <= 768 ? '90vw' : 'auto',
          textAlign: 'center'
        }}>
          {isRecording ? '⏹ Stop recording audio' : '🎤 Start live transcription'}
          {/* Right-pointing tooltip arrow for tab controls */}
          <div style={{
            position: 'absolute',
            right: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {showTabClearTooltip && (
        <div style={{
          position: 'fixed',
          ...getTooltipPosition('tab-clear-btn'),
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '12px 20px' : '8px 12px',
          borderRadius: '8px',
          fontSize: window.innerWidth <= 768 ? '16px' : '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: window.innerWidth <= 768 ? '90vw' : 'auto',
          textAlign: 'center'
        }}>
          🗑 Clear all transcriptions
          {/* Right-pointing tooltip arrow for tab controls */}
          <div style={{
            position: 'absolute',
            right: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {showTabStatusTooltip && (
        <div style={{
          position: 'fixed',
          ...getTooltipPosition('tab-status-indicator'),
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: window.innerWidth <= 768 ? '12px 20px' : '8px 12px',
          borderRadius: '8px',
          fontSize: window.innerWidth <= 768 ? '16px' : '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          maxWidth: window.innerWidth <= 768 ? '90vw' : 'auto',
          textAlign: 'center'
        }}>
          🚫 Transcription status: {transcriptionError || transcriptionStatus}
          {/* Right-pointing tooltip arrow for status indicator (positioned to left) */}
          <div style={{
            position: 'absolute',
            right: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

    </div>
  );
};

export default BottomContentArea; 