import React from 'react';

function TestDashboard() {
  return React.createElement('div', {
    style: {
      padding: '20px',
      backgroundColor: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }
  }, [
    React.createElement('h1', { key: 'title' }, '🎛️ Dashboard Test'),
    React.createElement('p', { key: 'message' }, 'If you can see this, React is working!'),
    React.createElement('div', { 
      key: 'status',
      style: { 
        padding: '10px', 
        backgroundColor: '#e6fffa', 
        border: '1px solid #38b2ac',
        borderRadius: '5px',
        marginTop: '20px'
      }
    }, 'Dashboard routing is functional ✅')
  ]);
}

export default TestDashboard;
