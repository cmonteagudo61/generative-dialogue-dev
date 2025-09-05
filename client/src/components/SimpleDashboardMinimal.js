import React from 'react';

const SimpleDashboardMinimal = () => {
  return (
    <div style={{
      padding: '2rem',
      backgroundColor: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ color: '#2d3748', marginBottom: '1rem' }}>
          🎛️ Generative Dialogue Dashboard
        </h1>
        <p style={{ color: '#4a5568', fontSize: '1.2rem' }}>
          Welcome to the Admin Control Panel
        </p>
      </div>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#2d3748', marginBottom: '1rem' }}>🔧 System Health</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
            <strong>Backend:</strong> <span style={{ color: '#38a169' }}>Online</span>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
            <strong>Database:</strong> <span style={{ color: '#38a169' }}>Connected</span>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
            <strong>AI Services:</strong> <span style={{ color: '#38a169' }}>Active</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#2d3748', marginBottom: '1rem' }}>📊 Quick Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: '#edf2f7', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#4a5568' }}>Total Dialogues</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>12</div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#edf2f7', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#4a5568' }}>Active Sessions</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>3</div>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: '#edf2f7', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#4a5568' }}>Participants</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2d3748' }}>47</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#2d3748', marginBottom: '1rem' }}>🚀 Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#4299e1', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            Create New Dialogue
          </button>
          <button style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#718096', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            View Analytics
          </button>
          <button style={{ 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#718096', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            Manage Users
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ color: '#2d3748', marginBottom: '1rem' }}>🔗 Dashboard Features</h2>
        <p style={{ marginBottom: '1rem', color: '#4a5568' }}>
          ✅ Dashboard is working! The full feature set includes:
        </p>
        <ul style={{ color: '#4a5568', lineHeight: '1.6' }}>
          <li>✅ Prompt Library with AI suggestions</li>
          <li>✅ Dialogue Configuration with time guidance</li>
          <li>✅ Live session orchestration</li>
          <li>✅ AI Learning Flywheel</li>
          <li>✅ Developer mode with meta-prompts</li>
        </ul>
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#e6fffa', 
          borderRadius: '8px',
          border: '1px solid #38b2ac'
        }}>
          <strong style={{ color: '#234e52' }}>🎉 Success!</strong>
          <p style={{ margin: '0.5rem 0 0 0', color: '#234e52' }}>
            Dashboard routing is working. Ready to share with your colleague!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboardMinimal;
