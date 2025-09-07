import React, { useState, useMemo, useCallback } from 'react';
import './QuickSetup.css';

const QuickSetup = ({ dialogueConfig, participants, av, sessionId, onCreateRoom, onClose, sessionFlowConfig }) => {
  const [isCreating, setIsCreating] = useState(false);

  // Memoized room templates - only recalculate when participant count changes
  const roomTemplates = useMemo(() => {
    try {
      // Get participant count from multiple sources with fallback
      const participantCount = dialogueConfig?.gatheringSize || participants?.length || 24;
      
      if (!participantCount || participantCount < 1) {
        console.warn('⚠️ No valid participant count for templates');
        return [];
      }
      
      console.log(`🎯 Generating templates for ${participantCount} participants`);
      
      // Generate templates based on participant count
      const templates = [];
      
      // 1. Individual Template (1 person per room for personal reflection) - FIRST OFFERING
      templates.push({
        name: 'Individual',
        type: 'reflection',
        description: `Personal reflection spaces for all ${participantCount} participants`,
        count: participantCount,
        rooms: Array.from({ length: participantCount }, (_, i) => ({
          name: `Reflection Space ${i + 1}`,
          description: 'Private space for individual reflection and exercises',
          maxParticipants: 1
        }))
      });
      
      // 2. Dyads Template (2 people per room)
      const dyadCount = Math.floor(participantCount / 2);
      if (dyadCount >= 2) {
        templates.push({
          name: 'Dyads',
          type: 'intimate',
          description: `Deep one-on-one conversations for ${participantCount} participants`,
          count: dyadCount,
          rooms: Array.from({ length: dyadCount }, (_, i) => ({
            name: `Dyad ${i + 1}`,
            description: 'Intimate paired conversation',
            maxParticipants: 2
          }))
        });
      }
      
      // 3. Triads Template (3 people per room)
      const triadCount = Math.floor(participantCount / 3);
      if (triadCount >= 2) {
        templates.push({
          name: 'Triads',
          type: 'collaborative',
          description: `Three-way collaborative dialogues for ${participantCount} participants`,
          count: triadCount,
          rooms: Array.from({ length: triadCount }, (_, i) => ({
            name: `Triad ${i + 1}`,
            description: 'Three-person collaborative space',
            maxParticipants: 3
          }))
        });
      }
      
      // 4. Quads Template (4 people per room)
      const quadCount = Math.floor(participantCount / 4);
      if (quadCount >= 2) {
        templates.push({
          name: 'Quads',
          type: 'structured',
          description: `Four-person creative groups for ${participantCount} participants`,
          count: quadCount,
          rooms: Array.from({ length: quadCount }, (_, i) => ({
            name: `Quad ${i + 1}`,
            description: 'Four-person creative group',
            maxParticipants: 4
          }))
        });
      }
      
      // 5. KIVAs Template (6 people per room - Native American wisdom circles)
      const kivaCount = Math.floor(participantCount / 6);
      if (kivaCount >= 1) {
        templates.push({
          name: 'KIVAs',
          type: 'wisdom-circle',
          description: `Sacred wisdom circles of 6 for ${participantCount} participants (Native American tradition)`,
          count: kivaCount,
          rooms: Array.from({ length: kivaCount }, (_, i) => ({
            name: `KIVA ${i + 1}`,
            description: 'Sacred wisdom circle (6 directions + heaven + earth)',
            maxParticipants: 6
          }))
        });
      }
      
        // Note: Fishbowl is now a catalyst type, not a room configuration
      
      // World Café Template
      const cafeRooms = Math.ceil(participantCount / 8);
      if (cafeRooms >= 2) {
        templates.push({
          name: 'World Café',
          type: 'conversational',
          description: `Rotating conversations for ${participantCount} participants`,
          count: cafeRooms, // Create as many rooms as needed for all participants
          rooms: Array.from({ length: cafeRooms }, (_, i) => ({
            name: `Café Table ${i + 1}`,
            description: 'Conversational learning space',
            maxParticipants: 8
          }))
        });
      }
      
      // Open Space Template
      const openSpaceRooms = Math.ceil(participantCount / 12);
      if (openSpaceRooms >= 2) {
        templates.push({
          name: 'Open Space',
          type: 'self-organizing',
          description: `Self-organizing sessions for ${participantCount} participants`,
          count: openSpaceRooms, // Create as many rooms as needed for all participants
          rooms: Array.from({ length: openSpaceRooms }, (_, i) => ({
            name: `Open Space ${i + 1}`,
            description: 'Self-organizing discussion space',
            maxParticipants: 12
          }))
        });
      }
      
      return templates;
    } catch (error) {
      console.error('❌ Error generating room templates:', error);
      return [];
    }
  }, [dialogueConfig?.gatheringSize, participants?.length]);

  // Determine recommended template based on session flow configuration
  const recommendedTemplate = useMemo(() => {
    if (!sessionFlowConfig || !sessionFlowConfig.config || !roomTemplates.length) {
      return null;
    }

    const { phase, subphase, config } = sessionFlowConfig;
    
    // Only recommend for Dialogue substages
    if (subphase !== 'Dialogue') {
      return null;
    }

    // Map room types to template names
    const roomTypeToTemplate = {
      'dyad': 'Dyads',
      'triad': 'Triads', 
      'quad': 'Quads',
      'kiva': 'KIVAs',
      'individual': 'Individual'
    };

    const recommendedTemplateName = roomTypeToTemplate[config.roomType];
    if (recommendedTemplateName) {
      return roomTemplates.find(template => template.name === recommendedTemplateName);
    }

    return null;
  }, [sessionFlowConfig, roomTemplates]);

  // Template selection handler with proper error handling
  const handleTemplateSelect = useCallback(async (template) => {
    if (isCreating) return; // Prevent double-clicks
    
    setIsCreating(true);
    
    try {
      console.log(`✅ Template "${template.name}" selected`);
      
      // Create rooms based on template using the proper onCreateRoom function
      for (const room of template.rooms) {
        // Determine room type based on template and max participants
        let roomType = 'quad'; // default
        if (template.name === 'Dyads') roomType = 'dyad';
        else if (template.name === 'Triads') roomType = 'triad';
        else if (template.name === 'Quads') roomType = 'quad';
        else if (template.name === 'Individual') roomType = 'individual';
        else if (template.name === 'KIVAs') roomType = 'kiva';
        // Fishbowl removed - now only a catalyst type
        else if (template.name === 'World Café') roomType = 'cafe';
        else if (template.name === 'Open Space') roomType = 'openspace';
        
        const roomConfig = {
          name: room.name,
          type: roomType,
          maxParticipants: room.maxParticipants || 4,
          description: room.description || ''
        };
        
        // Use the proper room creation function which handles both state and cloud storage
        await onCreateRoom(roomConfig);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Template "${template.name}" completed successfully! All rooms created.`);
      
      // Show success message and close modal
      const roomCount = template.count || template.rooms?.length || 6;
      alert(`🎉 Success! Created ${roomCount} ${template.name} rooms.\n\n💡 Click the "Overview" tab to see all your rooms with horizontal scrolling.`);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error(`❌ Failed to apply template:`, error);
      alert(`❌ Error creating rooms: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  }, [onCreateRoom, onClose, isCreating]);

  return (
    <div className="quick-setup-modal" onClick={(e) => e.target.className === 'quick-setup-modal' && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h4>🎯 Quick Room Setup</h4>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="modal-description">
          Choose a pre-configured room layout to get started quickly:
          {recommendedTemplate && sessionFlowConfig && (
            <span className="recommendation-note">
              <br />💡 <strong>Recommended:</strong> {recommendedTemplate.name} (matches your {sessionFlowConfig.phase} Dialogue configuration)
            </span>
          )}
        </p>
        
        {isCreating && (
          <div className="creating-overlay">
            <div className="creating-message">
              <div className="spinner"></div>
              <p>Creating rooms...</p>
            </div>
          </div>
        )}
        
        <div className="templates-grid">
          {roomTemplates && roomTemplates.length > 0 ? roomTemplates.map((template, index) => (
            <div 
              key={index} 
              className={`template-card ${isCreating ? 'disabled' : ''} ${recommendedTemplate && template.name === recommendedTemplate.name ? 'recommended' : ''}`}
              onClick={() => !isCreating && handleTemplateSelect(template)}
            >
              <div className="template-header">
                <h5>{template.name}</h5>
                <span className="template-type">{template.type}</span>
              </div>
              <p className="template-description">{template.description}</p>
              <div className="template-details">
                <span className="room-count">{template.count} room{template.count > 1 ? 's' : ''}</span>
              </div>
            </div>
          )) : (
            <div className="no-templates-message">
              <p>No templates available for current participant count.</p>
              <p>Try creating rooms manually with the "➕ Create Room" button.</p>
            </div>
          )}
        </div>
        
        <div className="modal-actions">
          <button onClick={onClose} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickSetup;
