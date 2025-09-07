import React, { useState, useEffect, useMemo } from 'react';
import './FacilitatorGuidance.css';

const FacilitatorGuidance = ({
  phase = 'Connect',
  subphase = 'Catalyst',
  timeRemaining = 0,
  participantCount = 0,
  roomType = 'dyad',
  isVisible = true,
  onDismiss = () => {},
  customInstructions = null
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentTip, setCurrentTip] = useState(0);

  // Define guidance content for each phase and subphase
  const guidanceContent = useMemo(() => ({
    'Connect': {
      'Catalyst': {
        title: 'Connect Catalyst Phase',
        description: 'Create a welcoming atmosphere and center the group',
        instructions: [
          'Welcome everyone and acknowledge their presence',
          'Guide a brief centering practice (meditation, breathing, or moment of silence)',
          'Set the intention for meaningful dialogue',
          'Remind participants to listen deeply and speak authentically'
        ],
        tips: [
          'Keep the catalyst brief but meaningful - 5-10 minutes is ideal',
          'Model the energy you want to see in the dialogue',
          'Use inclusive language that welcomes all perspectives',
          'If using meditation, offer alternatives for different comfort levels'
        ],
        timeGuidance: {
          start: 'Begin with a warm welcome and brief check-in',
          middle: 'Guide the centering practice',
          end: 'Transition smoothly to breakout rooms'
        }
      },
      'Dialogue': {
        title: 'Connect Dialogue Phase',
        description: 'Facilitate intimate sharing in pairs (dyads)',
        instructions: [
          'Send participants to breakout rooms in pairs',
          'Provide clear timing: each person speaks for equal time',
          'Encourage deep listening without advice-giving',
          'Suggest they share what brought them to this dialogue'
        ],
        tips: [
          'Dyads work best with 10-15 minutes total (5-7 minutes each)',
          'Visit breakout rooms briefly to check energy and offer support',
          'Remind participants this is about connection, not problem-solving',
          'Encourage vulnerability within comfort zones'
        ],
        timeGuidance: {
          start: 'Send to breakout rooms with clear instructions',
          middle: 'Visit rooms to gauge energy and provide gentle guidance',
          end: 'Give 2-minute warning before bringing everyone back'
        }
      },
      'Summary': {
        title: 'Connect Summary Phase',
        description: 'Harvest insights from the dyad conversations',
        instructions: [
          'Invite participants to share one word or phrase that captures their experience',
          'Listen for themes and connections between shares',
          'Reflect back what you\'re hearing without interpretation',
          'Create space for brief clarifications if needed'
        ],
        tips: [
          'Keep individual shares brief - this isn\'t a full debrief',
          'Look for emotional resonance, not just content',
          'Notice who hasn\'t shared and gently invite them',
          'Trust the wisdom that emerges naturally'
        ],
        timeGuidance: {
          start: 'Invite sharing with a simple prompt',
          middle: 'Listen and reflect themes you\'re hearing',
          end: 'Acknowledge the wisdom shared and transition'
        }
      },
      'WE': {
        title: 'Connect WE Phase',
        description: 'Build collective understanding from individual connections',
        instructions: [
          'Ask: "What are we learning about connection?"',
          'Invite deeper sharing about patterns and insights',
          'Help the group see connections between their experiences',
          'Begin to identify collective wisdom emerging'
        ],
        tips: [
          'This is where individual insights become collective wisdom',
          'Ask questions that help the group think together',
          'Notice and name the "field" or energy in the room',
          'Help participants see they are part of something larger'
        ],
        timeGuidance: {
          start: 'Pose the central question about connection',
          middle: 'Facilitate deeper exploration of themes',
          end: 'Summarize collective insights and prepare for next phase'
        }
      }
    },
    'Explore': {
      'Catalyst': {
        title: 'Explore Catalyst Phase',
        description: 'Deepen inquiry with a thought-provoking catalyst',
        instructions: [
          'Introduce a reading, poem, or question that expands thinking',
          'Allow time for personal reflection before sharing',
          'Invite initial responses without deep discussion',
          'Set up the exploration mindset: curiosity over certainty'
        ],
        tips: [
          'Choose catalysts that challenge assumptions gently',
          'Readings should be 2-3 minutes maximum',
          'Encourage questions rather than answers',
          'Model intellectual humility and openness'
        ],
        timeGuidance: {
          start: 'Present the catalyst with intention',
          middle: 'Allow reflection time',
          end: 'Gather initial responses before breakouts'
        }
      },
      'Dialogue': {
        title: 'Explore Dialogue Phase',
        description: 'Facilitate deeper inquiry in triads',
        instructions: [
          'Send participants to triads for richer conversation',
          'Encourage building on each other\'s ideas',
          'Suggest they explore different perspectives',
          'Remind them to stay curious about disagreements'
        ],
        tips: [
          'Triads allow for more diverse perspectives than dyads',
          'Encourage participants to play with ideas, not defend them',
          'Visit rooms to sense the quality of exploration',
          'Look for groups getting stuck and offer gentle redirects'
        ],
        timeGuidance: {
          start: 'Send to triads with exploration prompts',
          middle: 'Check in with groups and support deeper inquiry',
          end: 'Prepare groups to share discoveries with the whole'
        }
      },
      'Summary': {
        title: 'Explore Summary Phase',
        description: 'Harvest new insights and questions from exploration',
        instructions: [
          'Ask groups to share their most interesting discoveries',
          'Listen for new questions that emerged',
          'Notice shifts in thinking or perspective',
          'Celebrate the courage to explore uncertainty'
        ],
        tips: [
          'Focus on insights, not conclusions',
          'Questions are often more valuable than answers',
          'Notice and name breakthrough moments',
          'Help the group appreciate the exploration process'
        ],
        timeGuidance: {
          start: 'Invite sharing of discoveries and questions',
          middle: 'Explore the most intriguing insights together',
          end: 'Acknowledge the group\'s willingness to explore'
        }
      },
      'WE': {
        title: 'Explore WE Phase',
        description: 'Synthesize collective learning from exploration',
        instructions: [
          'Ask: "What are we discovering together?"',
          'Help the group see patterns across their explorations',
          'Identify questions that want more attention',
          'Notice how the group\'s thinking is evolving'
        ],
        tips: [
          'This phase builds intellectual intimacy',
          'Look for "aha" moments that serve the whole group',
          'Help participants see their collective intelligence',
          'Prepare the ground for even deeper discovery'
        ],
        timeGuidance: {
          start: 'Pose questions about collective discovery',
          middle: 'Facilitate synthesis of insights',
          end: 'Prepare for the deeper discovery phase'
        }
      }
    },
    'Discover': {
      'Catalyst': {
        title: 'Discover Catalyst Phase',
        description: 'Create conditions for breakthrough insights',
        instructions: [
          'Use a powerful catalyst: fishbowl, art, movement, or deep question',
          'Create space for emergence rather than analysis',
          'Invite participants into not-knowing',
          'Trust the process and the group\'s wisdom'
        ],
        tips: [
          'This is where magic happens - stay open to surprise',
          'Less facilitation, more holding space',
          'Fishbowls work well: 6 in center, others listening',
          'Art or movement can unlock different ways of knowing'
        ],
        timeGuidance: {
          start: 'Set up the catalyst with minimal instruction',
          middle: 'Hold space for whatever wants to emerge',
          end: 'Allow natural completion without forcing'
        }
      },
      'Dialogue': {
        title: 'Discover Dialogue Phase',
        description: 'Facilitate breakthrough conversations in KIVAs (groups of 6)',
        instructions: [
          'Create KIVAs (6-person circles) for deep dialogue',
          'Encourage speaking from the heart, not the head',
          'Invite sharing of personal stories and deeper truths',
          'Hold space for silence and emergence'
        ],
        tips: [
          'KIVAs represent the six directions in Native wisdom',
          'Six people contain the full spectrum of community wisdom',
          'Encourage storytelling over analysis',
          'Trust long pauses - breakthrough often follows silence'
        ],
        timeGuidance: {
          start: 'Form KIVAs and invite deep sharing',
          middle: 'Visit circles to sense depth and offer support',
          end: 'Allow natural completion of deep conversations'
        }
      },
      'Summary': {
        title: 'Discover Summary Phase',
        description: 'Honor the depth of what was shared',
        instructions: [
          'Invite sharing of what touched them most deeply',
          'Listen for wisdom that serves the whole community',
          'Acknowledge the courage required for deep sharing',
          'Notice how the group has changed through this process'
        ],
        tips: [
          'This is sacred time - hold it with reverence',
          'Not everyone needs to share - honor different ways of participating',
          'Look for the gifts that want to be given to the whole',
          'Acknowledge the transformation that has occurred'
        ],
        timeGuidance: {
          start: 'Create sacred space for sharing deep insights',
          middle: 'Listen for wisdom that serves the whole',
          end: 'Honor the depth of what was shared'
        }
      },
      'WE': {
        title: 'Discover WE Phase',
        description: 'Recognize the collective wisdom that has emerged',
        instructions: [
          'Ask: "What wants to be born from our time together?"',
          'Help the group see the wisdom they\'ve created together',
          'Notice the quality of connection and understanding',
          'Prepare for harvesting this wisdom'
        ],
        tips: [
          'This is often the most powerful moment of the dialogue',
          'Trust what the group has created together',
          'Help them see they are different than when they started',
          'The "WE" is now visible and palpable'
        ],
        timeGuidance: {
          start: 'Pose the question about what wants to emerge',
          middle: 'Help the group recognize their collective wisdom',
          end: 'Prepare for the harvest phase'
        }
      }
    },
    'Closing': {
      'Closing': {
        title: 'Session Closing',
        description: 'Complete the dialogue session with general comments and next steps',
        instructions: [
          'Acknowledge the journey the group has taken together',
          'Offer general reflections on what you witnessed in the dialogue',
          'Explain the individual harvest process and next steps',
          'Handle any housekeeping items (follow-up, resources, etc.)'
        ],
        tips: [
          'Keep it simple and heartfelt - no complex facilitation needed',
          'Focus on appreciation and practical next steps',
          'Make the individual harvest process clear and inviting',
          'End with gratitude and clear instructions for what comes next'
        ],
        timeGuidance: {
          start: 'Acknowledge the collective journey and experience',
          middle: 'Explain individual harvest process and logistics',
          end: 'Handle housekeeping and close with appreciation'
        }
      }
    }
  }), []);

  // Get current guidance
  const currentGuidance = guidanceContent[phase]?.[subphase] || {
    title: `${phase} ${subphase}`,
    description: 'Facilitate this phase with presence and attention',
    instructions: ['Hold space for whatever wants to emerge'],
    tips: ['Trust the process and the group\'s wisdom'],
    timeGuidance: {
      start: 'Begin with clear intention',
      middle: 'Stay present and responsive',
      end: 'Transition mindfully to the next phase'
    }
  };

  // Rotate tips periodically
  useEffect(() => {
    if (currentGuidance.tips && currentGuidance.tips.length > 1) {
      const interval = setInterval(() => {
        setCurrentTip(prev => (prev + 1) % currentGuidance.tips.length);
      }, 15000); // Change tip every 15 seconds

      return () => clearInterval(interval);
    }
  }, [currentGuidance.tips]);

  // Get time-based guidance
  const getTimeBasedGuidance = () => {
    if (timeRemaining <= 0) return null;
    
    const totalTime = 600; // Assume 10 minutes default
    const elapsed = totalTime - timeRemaining;
    const progress = elapsed / totalTime;
    
    if (progress < 0.2) return currentGuidance.timeGuidance.start;
    if (progress < 0.8) return currentGuidance.timeGuidance.middle;
    return currentGuidance.timeGuidance.end;
  };

  const timeBasedGuidance = getTimeBasedGuidance();

  if (!isVisible) return null;

  return (
    <div className={`facilitator-guidance ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="guidance-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="guidance-title">
          <span className="guidance-icon">🎯</span>
          <span className="title-text">{currentGuidance.title}</span>
        </div>
        <button className="expand-toggle">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="guidance-content">
          <div className="guidance-description">
            {currentGuidance.description}
          </div>

          {customInstructions ? (
            <div className="custom-instructions">
              <h4>Custom Instructions:</h4>
              <p>{customInstructions}</p>
            </div>
          ) : (
            <div className="guidance-instructions">
              <h4>Key Actions:</h4>
              <ul>
                {currentGuidance.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ul>
            </div>
          )}

          {timeBasedGuidance && (
            <div className="time-based-guidance">
              <h4>Right Now:</h4>
              <p>{timeBasedGuidance}</p>
            </div>
          )}

          {currentGuidance.tips && currentGuidance.tips.length > 0 && (
            <div className="guidance-tip">
              <h4>💡 Facilitator Tip:</h4>
              <p>{currentGuidance.tips[currentTip]}</p>
              {currentGuidance.tips.length > 1 && (
                <div className="tip-indicator">
                  {currentGuidance.tips.map((_, index) => (
                    <span 
                      key={index} 
                      className={`tip-dot ${index === currentTip ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="context-info">
            <div className="context-item">
              <span className="context-label">Participants:</span>
              <span className="context-value">{participantCount}</span>
            </div>
            <div className="context-item">
              <span className="context-label">Room Type:</span>
              <span className="context-value">{roomType}</span>
            </div>
          </div>
        </div>
      )}

      <button className="dismiss-guidance" onClick={onDismiss} title="Hide Guidance">
        ✕
      </button>
    </div>
  );
};

export default FacilitatorGuidance;
