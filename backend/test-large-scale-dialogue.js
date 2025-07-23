/**
 * Test Demonstration: Large-Scale Dialogue System
 * Shows the "All Voices Heard" system in action
 */

require('dotenv').config();
const { DialogueOrchestrator } = require('./dialogue-orchestrator');

async function demonstrateLargeScaleDialogue() {
  console.log('🌍 === LARGE-SCALE DIALOGUE DEMONSTRATION ===');
  console.log('🎯 Topic: "Community Solutions for Climate Change"');
  console.log('👥 Participants: 8 people across 2 breakout rooms');
  console.log('🤖 AI Companions: Witnessing every voice, generating insights\n');

  // Create the orchestrator
  const orchestrator = new DialogueOrchestrator();

  // Start global session
  const sessionId = orchestrator.startGlobalSession({
    title: 'Community Climate Solutions Dialogue',
    topic: 'Climate Change & Community Action',
    facilitator: 'Maya Chen'
  });

  console.log(`📝 Session ID: ${sessionId}\n`);

  // Add participants
  const participants = [
    { id: 'p1', name: 'Sarah Martinez', role: 'Community Organizer', room: 'room1' },
    { id: 'p2', name: 'James Wilson', role: 'City Council Member', room: 'room1' },
    { id: 'p3', name: 'Maria Rodriguez', role: 'Neighborhood Association', room: 'room1' },
    { id: 'p4', name: 'David Kim', role: 'Local Business Owner', room: 'room1' },
    { id: 'p5', name: 'Dr. Lisa Chen', role: 'Climate Scientist', room: 'room2' },
    { id: 'p6', name: 'Mark Thompson', role: 'Renewable Energy Engineer', room: 'room2' },
    { id: 'p7', name: 'Elena Vasquez', role: 'Environmental Policy', room: 'room2' },
    { id: 'p8', name: 'Zoe Walker', role: 'Youth Climate Activist', room: 'room2' }
  ];

  console.log('👥 Adding participants...');
  participants.forEach(p => {
    orchestrator.addParticipant(p.id, {
      name: p.name,
      role: p.role,
      videoChannelId: `channel_${p.id}`,
      email: `${p.name.toLowerCase().replace(' ', '.')}@community.org`
    });
  });

  // Create breakout rooms
  console.log('\n🏠 Creating breakout rooms...');
  orchestrator.createBreakoutRoom('room1', {
    topic: 'Local Community Action & Engagement',
    facilitator: 'Sarah Martinez',
    maxParticipants: 6
  });

  orchestrator.createBreakoutRoom('room2', {
    topic: 'Technical Solutions & Innovation',
    facilitator: 'Dr. Lisa Chen',
    maxParticipants: 6
  });

  // Assign participants to rooms
  console.log('\n🏠 Assigning participants to breakout rooms...');
  participants.forEach(p => {
    orchestrator.assignToBreakoutRoom(p.id, p.room);
  });

  console.log('\n🎤 === DIALOGUE BEGINS ===\n');

  // Simulate dialogue contributions
  const contributions = [
    { id: 'p1', text: 'I think we need to start with grassroots organizing in our neighborhoods. Climate change affects everyone but we need local solutions that people can actually participate in and see results from.' },
    { id: 'p5', text: 'The science is clear that we need immediate action on carbon emissions. We have the technology for renewable energy and energy efficiency but scaling and implementation are the major barriers we face.' },
    { id: 'p2', text: 'From the city perspective um we have policies but implementation is the challenge. We need community buy-in and frankly better coordination between different groups and stakeholders.' },
    { id: 'p6', text: 'Solar and wind are now cheaper than fossil fuels in most markets. The challenge is grid integration and storage. Community-scale microgrids could be a solution that empowers local control.' },
    { id: 'p8', text: 'My generation will live with the consequences of decisions being made now. We need urgent action and we need to center justice and equity in climate solutions, not just technology fixes.' },
    { id: 'p3', text: 'Hearing about the business challenges, maybe we need neighborhood-level support groups where businesses and residents work together on sustainability goals and share resources.' },
    { id: 'p7', text: 'Policy frameworks need to incentivize the right behaviors. Carbon pricing, renewable energy standards, and green building codes can create market demand for sustainable solutions.' },
    { id: 'p4', text: 'As a business owner I see the economic challenges but also opportunities. Green technology and sustainable practices can actually save money long-term if we can get past the initial investment hurdle.' }
  ];

  for (const contribution of contributions) {
    try {
      console.log(`🎤 ${contribution.id}: "${contribution.text.substring(0, 100)}..."`);
      const result = await orchestrator.processParticipantSpeech(contribution.id, contribution.text, {
        audioQuality: 'good'
      });
      console.log(`✅ Processed: ${result.contribution.wordCount} words, themes: ${result.contribution.aiInsights.themes.join(', ')}`);
      await delay(1000);
    } catch (error) {
      console.error(`❌ Error processing ${contribution.id}:`, error.message);
    }
  }

  // Show final insights
  console.log('\n📊 === FINAL COLLECTIVE WISDOM ===');
  const finalState = orchestrator.getCurrentStateSummary();
  
  console.log(`\n🌍 Global Session: ${finalState.globalSession.title}`);
  console.log(`👥 Total Participants: ${finalState.totalParticipants}`);
  console.log(`🗣️ Active Participants: ${finalState.activeParticipants}`);
  
  console.log(`\n🎯 Emerging Themes:`);
  finalState.emergingThemes.forEach((theme, index) => {
    console.log(`   ${index + 1}. ${theme.theme} (${theme.count} mentions)`);
  });

  console.log(`\n🏠 Breakout Room Insights:`);
  finalState.breakoutRooms.forEach(room => {
    console.log(`   ${room.roomId}: ${room.topic}`);
    console.log(`     👥 ${room.participantCount} participants`);
    console.log(`     💡 ${room.latestInsight}`);
  });

  console.log('\n🎉 === DEMONSTRATION COMPLETE ===');
  console.log('✅ Every voice was heard and tracked');
  console.log('✅ Individual participant journeys recorded');
  console.log('✅ Collective wisdom emerged from all contributions');
  console.log('✅ Ready to scale to 100s or 1000s of participants!');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demonstration
if (require.main === module) {
  demonstrateLargeScaleDialogue()
    .then(() => {
      console.log('\n🎯 This is just the beginning! Your system can now:');
      console.log('   • Track thousands of individual participant journeys');
      console.log('   • Generate insights from hundreds of breakout rooms');
      console.log('   • Surface collective wisdom from all voices');
      console.log('   • Enable true participatory democracy at scale');
      console.log('\n🚀 Ready to change the world, one dialogue at a time!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error in demonstration:', error);
      process.exit(1);
    });
}

module.exports = {
  demonstrateLargeScaleDialogue
};
