import React, { useState, useEffect } from 'react';
import './CatalystLibrary.css';

const CatalystLibrary = ({ onClose, onSelectCatalyst, selectedCatalyst }) => {
  const [catalysts, setCatalysts] = useState({});
  const [activeCategory, setActiveCategory] = useState('poetry');
  const [showAddForm, setShowAddForm] = useState(false);
  const [previewCatalyst, setPreviewCatalyst] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Catalyst categories with icons and descriptions
  const categories = {
    poetry: { 
      icon: '📜', 
      name: 'Poetry', 
      description: 'Poems and verses to inspire reflection',
      acceptedTypes: ['text']
    },
    meditation: { 
      icon: '🧘', 
      name: 'Meditation', 
      description: 'Guided meditations and mindfulness practices',
      acceptedTypes: ['text', 'audio']
    },
    reading: { 
      icon: '📖', 
      name: 'Readings', 
      description: 'Excerpts, stories, and thought-provoking texts',
      acceptedTypes: ['text']
    },
    music: { 
      icon: '🎵', 
      name: 'Music', 
      description: 'Musical pieces to set tone and atmosphere',
      acceptedTypes: ['audio', 'video']
    },
    art: { 
      icon: '🎨', 
      name: 'Visual Art', 
      description: 'Images, paintings, and visual stimuli',
      acceptedTypes: ['image']
    },
    video: { 
      icon: '🎬', 
      name: 'Video', 
      description: 'Video content and visual narratives',
      acceptedTypes: ['video']
    },
    questions: { 
      icon: '❓', 
      name: 'Questions', 
      description: 'Provocative questions and inquiry prompts',
      acceptedTypes: ['text']
    },
    ritual: { 
      icon: '🕯️', 
      name: 'Rituals', 
      description: 'Ceremonial practices and group activities',
      acceptedTypes: ['text']
    }
  };

  // Default catalyst library with rich content
  const defaultCatalysts = {
    poetry: [
      {
        id: 'rumi-field',
        title: 'Out Beyond Ideas - Rumi',
        content: `Out beyond ideas of wrongdoing and rightdoing,
there is a field. I'll meet you there.

When the soul lies down in that grass
the world is too full to talk about.`,
        author: 'Rumi',
        type: 'text',
        duration: 2,
        tags: ['unity', 'transcendence', 'dialogue'],
        description: 'A beautiful invitation to meet beyond judgment and division'
      },
      {
        id: 'oliver-attention',
        title: 'Attention - Mary Oliver',
        content: `Attention is the beginning of devotion.`,
        author: 'Mary Oliver',
        type: 'text',
        duration: 1,
        tags: ['presence', 'mindfulness', 'devotion'],
        description: 'A simple yet profound reminder about the power of presence'
      },
      {
        id: 'angelou-courage',
        title: 'Courage - Maya Angelou',
        content: `Courage is the most important of all the virtues
because without courage, you can't practice
any other virtue consistently.`,
        author: 'Maya Angelou',
        type: 'text',
        duration: 1,
        tags: ['courage', 'virtue', 'consistency'],
        description: 'On the foundational importance of courage in living authentically'
      }
    ],
    meditation: [
      {
        id: 'centering-breath',
        title: 'Centering Breath Practice',
        content: `Let's take a moment to arrive fully in this space together.

Close your eyes or soften your gaze. Take three deep breaths with me.

Breathe in... and out...
Breathe in... and out...
Breathe in... and out...

Feel your body settling into this moment. Notice what brought you here today. What intention or curiosity lives in your heart right now?

When you're ready, gently open your eyes and return your attention to our circle.`,
        author: 'Generative Dialogue Team',
        type: 'text',
        duration: 3,
        tags: ['centering', 'breath', 'arrival'],
        description: 'A simple practice to help participants arrive and center'
      },
      {
        id: 'gratitude-moment',
        title: 'Moment of Gratitude',
        content: `Let's pause for a moment of gratitude.

Place your hand on your heart. Take a deep breath.

Think of something you're grateful for in this moment - perhaps the people here with you, the opportunity to connect, or simply the breath in your body.

Let that feeling of gratitude fill your chest and radiate outward.

When you're ready, open your eyes and bring that gratitude into our conversation.`,
        author: 'Generative Dialogue Team',
        type: 'text',
        duration: 2,
        tags: ['gratitude', 'heart', 'connection'],
        description: 'A heart-opening practice to cultivate appreciation'
      }
    ],
    reading: [
      {
        id: 'brown-vulnerability',
        title: 'On Vulnerability - Brené Brown',
        content: `Vulnerability is not winning or losing; it's having the courage to show up and be seen when we have no control over the outcome. Vulnerability is not weakness; it's our greatest measure of courage.`,
        author: 'Brené Brown',
        type: 'text',
        duration: 2,
        tags: ['vulnerability', 'courage', 'authenticity'],
        description: 'Reframing vulnerability as strength and courage'
      },
      {
        id: 'palmer-hidden-wholeness',
        title: 'Hidden Wholeness - Parker Palmer',
        content: `We live in a world that seems to prize the external over the internal, doing over being, going fast over going slow, the big over the small, the loud over the quiet. But there is another way to live.`,
        author: 'Parker Palmer',
        type: 'text',
        duration: 2,
        tags: ['wholeness', 'being', 'contemplation'],
        description: 'An invitation to value inner life and contemplative ways'
      }
    ],
    questions: [
      {
        id: 'what-alive',
        title: 'What is Alive in You?',
        content: `What is alive in you right now? What energy, feeling, or awareness is present as you sit here in this moment?`,
        author: 'Generative Dialogue Team',
        type: 'text',
        duration: 1,
        tags: ['presence', 'aliveness', 'awareness'],
        description: 'A question to connect with immediate felt experience'
      },
      {
        id: 'edge-learning',
        title: 'Learning Edge',
        content: `What is your learning edge right now? What are you being invited to grow into or discover about yourself?`,
        author: 'Generative Dialogue Team',
        type: 'text',
        duration: 1,
        tags: ['growth', 'learning', 'development'],
        description: 'Exploring personal growth and development edges'
      },
      {
        id: 'collective-wisdom',
        title: 'Collective Wisdom',
        content: `If this group has a collective wisdom that wants to emerge, what might it be? What does this particular constellation of people have to offer the world?`,
        author: 'Generative Dialogue Team',
        type: 'text',
        duration: 2,
        tags: ['collective', 'wisdom', 'emergence'],
        description: 'Invoking the unique wisdom of the gathered group'
      }
    ],
    ritual: [
      {
        id: 'circle-opening',
        title: 'Circle Opening Ritual',
        content: `Let's begin by acknowledging the space we're creating together.

Each person, when ready, please share your name and one word that represents what you're bringing to this circle today.

We'll go around the circle, and after each person shares, we'll all repeat their name and word together.

This helps us arrive not just as individuals, but as a community forming in this moment.`,
        author: 'Generative Dialogue Team',
        type: 'text',
        duration: 5,
        tags: ['opening', 'names', 'community'],
        description: 'A simple ritual to create community and acknowledge each person'
      }
    ],
    music: [],
    art: [],
    video: []
  };

  // Load catalysts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('catalyst_library');
    if (saved) {
      try {
        const savedCatalysts = JSON.parse(saved);
        // Merge with defaults, keeping user additions
        const merged = { ...defaultCatalysts };
        Object.keys(savedCatalysts).forEach(category => {
          if (merged[category]) {
            // Combine default and saved catalysts, avoiding duplicates
            const existingIds = merged[category].map(c => c.id);
            const newCatalysts = savedCatalysts[category].filter(c => !existingIds.includes(c.id));
            merged[category] = [...merged[category], ...newCatalysts];
          } else {
            merged[category] = savedCatalysts[category];
          }
        });
        setCatalysts(merged);
      } catch (error) {
        console.error('Error loading catalyst library:', error);
        setCatalysts(defaultCatalysts);
      }
    } else {
      setCatalysts(defaultCatalysts);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save catalysts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('catalyst_library', JSON.stringify(catalysts));
  }, [catalysts]);

  const addCatalyst = (newCatalyst) => {
    const catalyst = {
      ...newCatalyst,
      id: `custom_${Date.now()}`,
      author: newCatalyst.author || 'Custom',
      type: newCatalyst.type || 'text',
      duration: parseInt(newCatalyst.duration) || 2,
      tags: newCatalyst.tags ? newCatalyst.tags.split(',').map(t => t.trim()) : []
    };

    setCatalysts(prev => ({
      ...prev,
      [activeCategory]: [...(prev[activeCategory] || []), catalyst]
    }));

    setShowAddForm(false);
  };

  const deleteCatalyst = (category, catalystId) => {
    if (window.confirm('Are you sure you want to delete this catalyst?')) {
      setCatalysts(prev => ({
        ...prev,
        [category]: prev[category].filter(c => c.id !== catalystId)
      }));
    }
  };

  const filteredCatalysts = catalysts[activeCategory]?.filter(catalyst =>
    catalyst.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    catalyst.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    catalyst.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const formatDuration = (minutes) => {
    return minutes === 1 ? '1 min' : `${minutes} mins`;
  };

  return (
    <div className="catalyst-library-modal">
      <div className="catalyst-library">
        <div className="library-header">
          <div className="header-content">
            <h2>✨ Catalyst Library</h2>
            <p>Choose content to inspire and guide your dialogue</p>
          </div>
          <div className="header-actions">
            <button
              className="add-catalyst-btn"
              onClick={() => setShowAddForm(true)}
            >
              + Add Catalyst
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="library-content">
          {/* Category Navigation */}
          <div className="category-nav">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search catalysts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="category-tabs">
              {Object.entries(categories).map(([key, category]) => (
                <button
                  key={key}
                  className={`category-tab ${activeCategory === key ? 'active' : ''}`}
                  onClick={() => setActiveCategory(key)}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">
                    {catalysts[key]?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Catalyst Grid */}
          <div className="catalyst-grid">
            {filteredCatalysts.length === 0 ? (
              <div className="empty-category">
                <div className="empty-icon">{categories[activeCategory].icon}</div>
                <h3>No {categories[activeCategory].name} Yet</h3>
                <p>{categories[activeCategory].description}</p>
                <button
                  className="add-first-btn"
                  onClick={() => setShowAddForm(true)}
                >
                  Add First {categories[activeCategory].name}
                </button>
              </div>
            ) : (
              filteredCatalysts.map(catalyst => (
                <div key={catalyst.id} className="catalyst-card">
                  <div className="catalyst-header">
                    <h4 className="catalyst-title">{catalyst.title}</h4>
                    <div className="catalyst-meta">
                      <span className="catalyst-duration">
                        {formatDuration(catalyst.duration)}
                      </span>
                      <span className="catalyst-author">by {catalyst.author}</span>
                    </div>
                  </div>

                  <div className="catalyst-content-preview">
                    {catalyst.content.length > 150 
                      ? `${catalyst.content.substring(0, 150)}...`
                      : catalyst.content
                    }
                  </div>

                  {catalyst.tags && catalyst.tags.length > 0 && (
                    <div className="catalyst-tags">
                      {catalyst.tags.map(tag => (
                        <span key={tag} className="catalyst-tag">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="catalyst-actions">
                    <button
                      className="preview-btn"
                      onClick={() => setPreviewCatalyst(catalyst)}
                    >
                      👁️ Preview
                    </button>
                    <button
                      className="select-btn"
                      onClick={() => {
                        onSelectCatalyst(catalyst);
                        onClose();
                      }}
                    >
                      ✨ Select
                    </button>
                    {catalyst.id.startsWith('custom_') && (
                      <button
                        className="delete-btn"
                        onClick={() => deleteCatalyst(activeCategory, catalyst.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Catalyst Form */}
        {showAddForm && (
          <AddCatalystForm
            category={activeCategory}
            categoryInfo={categories[activeCategory]}
            onAdd={addCatalyst}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Preview Modal */}
        {previewCatalyst && (
          <CatalystPreview
            catalyst={previewCatalyst}
            onClose={() => setPreviewCatalyst(null)}
            onSelect={() => {
              onSelectCatalyst(previewCatalyst);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Add Catalyst Form Component
const AddCatalystForm = ({ category, categoryInfo, onAdd, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    duration: '2',
    tags: '',
    description: '',
    type: 'text'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      alert('Please fill in at least the title and content fields.');
      return;
    }
    onAdd(formData);
  };

  return (
    <div className="add-catalyst-modal">
      <div className="add-catalyst-form">
        <div className="form-header">
          <h3>Add New {categoryInfo.name}</h3>
          <p>{categoryInfo.description}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter catalyst title"
                required
              />
            </div>
            <div className="form-group">
              <label>Author</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Author name"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter the full content of your catalyst"
              rows="6"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                min="1"
                max="30"
              />
            </div>
            <div className="form-group">
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="mindfulness, connection, growth"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this catalyst"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Add {categoryInfo.name}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Catalyst Preview Component
const CatalystPreview = ({ catalyst, onClose, onSelect }) => {
  return (
    <div className="catalyst-preview-modal">
      <div className="catalyst-preview">
        <div className="preview-header">
          <div className="preview-title">
            <h3>{catalyst.title}</h3>
            <p>by {catalyst.author} • {catalyst.duration} min{catalyst.duration !== 1 ? 's' : ''}</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="preview-content">
          <div className="catalyst-full-content">
            {catalyst.content}
          </div>

          {catalyst.description && (
            <div className="catalyst-description">
              <strong>About this catalyst:</strong> {catalyst.description}
            </div>
          )}

          {catalyst.tags && catalyst.tags.length > 0 && (
            <div className="preview-tags">
              <strong>Tags:</strong>
              <div className="tag-list">
                {catalyst.tags.map(tag => (
                  <span key={tag} className="preview-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="preview-actions">
          <button className="preview-cancel-btn" onClick={onClose}>
            Close
          </button>
          <button className="preview-select-btn" onClick={onSelect}>
            ✨ Use This Catalyst
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatalystLibrary;
