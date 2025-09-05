import React from 'react';

function DebugDashboard() {
  // Log to console to see if component is being called
  console.log('DebugDashboard component is rendering!');
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'red',
      color: 'white',
      fontSize: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>🚨 DEBUG DASHBOARD WORKING! 🚨</h1>
        <p>If you see this red screen, the dashboard component is loading!</p>
        <p>URL: {window.location.href}</p>
        <p>Pathname: {window.location.pathname}</p>
        <p>Search: {window.location.search}</p>
      </div>
    </div>
  );
}

export default DebugDashboard;
