import React, { useState, useEffect } from 'react';
import './NavigationMap.css';
import {
  DialogueCommunityOff,
  DialogueCommunityOn,
  DialogueCommunityHover,
  DialogueKivaOff,
  DialogueKivaOn,
  DialogueKivaHover,
  DialogueQuadOff,
  DialogueQuadOn,
  DialogueQuadHover,
  DialogueTriadOff,
  DialogueTriadOn,
  DialogueTriadHover,
  DialogueDyadOff,
  DialogueDyadOn,
  DialogueDyadHover,
  DialogueIndividualOff,
  DialogueIndividualOn,
  DialogueIndividualHover,
  DialogueFishbowlOff,
  DialogueFishbowlOn,
  DialogueFishbowlHover
} from '../assets/icons';

/**
 * NavigationMap Component
 * 
 * A self-contained navigation interface for the dialogue video conference
 * that allows users to select different conversation sizes.
 * 
 * @param {Object} props
 * @param {number|string} props.activeSize - The currently active size (1, 2, 3, 4, 6, or 'all')
 * @param {Function} props.onSizeChange - Callback when user changes the size
 */
const NavigationMap = React.memo(({ activeSize = 3, onSizeChange }) => {
  // Internal state
  const [currentSize, setCurrentSize] = useState(activeSize);
  const [hovered, setHovered] = useState(null);
  
  // Log activeSize (from props) and currentSize (internal state) on every render (for debugging)
  console.log("[NavigationMap] activeSize (prop):", activeSize, "currentSize (internal):", currentSize);
  
  // Configuration
  const SIZES = [
    { id: 'all', name: 'Community', iconName: 'Community' },
    { id: 'fishbowl', name: 'Fishbowl', iconName: 'Fishbowl' },
    { id: '6', name: 'Kiva (6)', iconName: 'Kiva' },
    { id: '4', name: 'Quad (4)', iconName: 'Quad' },
    { id: '3', name: 'Triad (3)', iconName: 'Triad' },
    { id: '2', name: 'Dyad (2)', iconName: 'Dyad' },
    { id: '1', name: 'Self (1)', iconName: 'Individual' }
  ];
  
  // Update active size when props change
  useEffect(() => {
    if (activeSize !== currentSize) {
      setCurrentSize(activeSize);
    }
  }, [activeSize]);
  
  // Get icon based on name and state
  const getIcon = (iconName, isActive, isHovered) => {
    switch (iconName) {
      case 'Community':
        if (isHovered) return DialogueCommunityHover;
        return isActive ? DialogueCommunityOn : DialogueCommunityOff;
      case 'Fishbowl':
        if (isHovered) return DialogueFishbowlHover;
        return isActive ? DialogueFishbowlOn : DialogueFishbowlOff;
      case 'Kiva':
        if (isHovered) return DialogueKivaHover;
        return isActive ? DialogueKivaOn : DialogueKivaOff;
      case 'Quad':
        if (isHovered) return DialogueQuadHover;
        return isActive ? DialogueQuadOn : DialogueQuadOff;
      case 'Triad':
        if (isHovered) return DialogueTriadHover;
        return isActive ? DialogueTriadOn : DialogueTriadOff;
      case 'Dyad':
        if (isHovered) return DialogueDyadHover;
        return isActive ? DialogueDyadOn : DialogueDyadOff;
      case 'Individual':
        if (isHovered) return DialogueIndividualHover;
        return isActive ? DialogueIndividualOn : DialogueIndividualOff;
      default:
        return null;
    }
  };
  
  // Handle click on nav item
  const handleNavItemClick = (size) => {
    // Keep string IDs as strings, convert numeric strings to numbers
    const newSize = (size === 'all' || size === 'fishbowl') ? size : parseInt(size);
    setCurrentSize(newSize);
    
    // Call onSizeChange callback if provided
    if (onSizeChange) {
      onSizeChange(newSize);
    }
  };
  
  return (
    <div className="nav-map">
      {SIZES.map((size) => {
        const isActive = currentSize === size.id || (typeof currentSize === 'number' && currentSize === parseInt(size.id));
        const isHovered = hovered === size.id;
        let icon, bgColor;
        if (isActive) {
          icon = getIcon(size.iconName, true, false); // Always use active icon if selected
          bgColor = '#3e4c71'; // Blue
        } else if (isHovered) {
          icon = getIcon(size.iconName, false, true); // Hover icon
          bgColor = '#D07B47'; // Orange
        } else {
          icon = getIcon(size.iconName, false, false); // Off icon
          bgColor = '#d9d9d9'; // Grey
        }
        return (
          <div
            key={size.id}
            className={`nav-item${isActive ? ' active' : ''}`}
            data-size={size.id}
            data-icon-name={size.iconName}
            onClick={() => handleNavItemClick(size.id)}
            onMouseEnter={() => setHovered(size.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ background: bgColor }}
          >
            <img
              src={icon}
              alt={size.name}
              className={`nav-icon ${size.iconName === 'Fishbowl' ? 'fishbowl-icon' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
});

export default NavigationMap; 