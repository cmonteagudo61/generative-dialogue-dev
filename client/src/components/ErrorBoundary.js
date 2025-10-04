import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorCount: 0, lastErrorTime: 0 };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const now = Date.now();
    
    // Prevent runaway error reporting
    if (now - this.state.lastErrorTime < 1000) {
      this.setState(prevState => ({
        errorCount: prevState.errorCount + 1,
        lastErrorTime: now
      }));
      
      if (this.state.errorCount > 5) {
        console.error('🚨 Too many errors caught by ErrorBoundary, throttling...');
        return;
      }
    } else {
      this.setState({ errorCount: 1, lastErrorTime: now });
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#c92a2a'
        }}>
          <h2>🚨 Something went wrong</h2>
          <p>An error occurred in the video component. Please refresh the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
