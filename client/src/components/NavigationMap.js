import React, { useState, useEffect, useRef } from 'react';
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
const NavigationMap = React.memo(({ activeSize = 3, onSizeChange, isHost = false }) => {
  // Internal state
  const [currentSize, setCurrentSize] = useState(activeSize);
  const lastAppliedRef = useRef(null);
  const debTsRef = useRef(0);
  const [hovered, setHovered] = useState(null);
  
  // Log activeSize (from props) and currentSize (internal state) on every render (for debugging)
  const hostFlag = !!isHost;
  if (localStorage.getItem('gd_debug_nav') === '1') {
    console.log("[NavigationMap] activeSize (prop):", activeSize, "currentSize (internal):", currentSize);
  }
  
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
  
  // Initialize from localStorage once; thereafter, storage events drive state
  useEffect(() => {
    try {
      const v = localStorage.getItem('gd_active_size');
      if (v) {
        const parsed = (v === 'all' || v === 'fishbowl') ? v : parseInt(v);
        setCurrentSize(parsed);
        lastAppliedRef.current = parsed;
      } else {
        setCurrentSize(activeSize);
        lastAppliedRef.current = activeSize;
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global nav highlight updates via localStorage key (debounced)
  useEffect(() => {
    const applyFromStorage = () => {
      try {
        const v = localStorage.getItem('gd_active_size') || '';
        if (!v) return;
        const parsed = (v === 'all' || v === 'fishbowl') ? v : parseInt(v);
        const now = Date.now();
        if (lastAppliedRef.current === parsed) return;
        if (now - debTsRef.current < 150) return; // debounce
        debTsRef.current = now;
        lastAppliedRef.current = parsed;
        setCurrentSize(parsed);
      } catch (_) {}
    };
    applyFromStorage();
    const onStorage = (e) => {
      if (e.key === 'gd_active_size') applyFromStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  
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
    // Only the host can trigger navigation actions
    if (!hostFlag) return;
    // Keep string IDs as strings, convert numeric strings to numbers
    const newSize = (size === 'all' || size === 'fishbowl') ? size : parseInt(size);
    setCurrentSize(newSize);
    try {
      const prev = localStorage.getItem('gd_active_size');
      const next = String(newSize);
      if (prev !== next) localStorage.setItem('gd_active_size', next);
    } catch (_) {}
    
    // Call onSizeChange callback if provided
    if (onSizeChange) {
      onSizeChange(newSize); // Parent (AppLayout) will gate host-only actions
    }
  };
  
  return (
    <div className="nav-map" style={{ pointerEvents: hostFlag ? 'auto' : 'none', opacity: hostFlag ? 1 : 0.95 }}>
      {SIZES.map((size) => {
        const isActive = currentSize === size.id || (typeof currentSize === 'number' && currentSize === parseInt(size.id));
        const isHovered = hovered === size.id;
        let icon;
        if (isActive) {
          icon = getIcon(size.iconName, true, false); // Always use active icon if selected
        } else if (isHovered) {
          icon = getIcon(size.iconName, false, true); // Hover icon
        } else {
          icon = getIcon(size.iconName, false, false); // Off icon
        }
        return (
          <div
            key={size.id}
            className={`nav-item${isActive ? ' active' : ''}${isHovered ? ' hovered' : ''}${hostFlag ? '' : ' disabled'}`}
            data-size={size.id}
            data-icon-name={size.iconName}
            title={hostFlag ? size.name : 'Host controls only'}
            style={{ cursor: hostFlag ? 'pointer' : 'default' }}
            onClick={() => handleNavItemClick(size.id)}
            onMouseEnter={() => { if (hostFlag) setHovered(size.id); }}
            onMouseLeave={() => { if (hostFlag) setHovered(null); }}
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