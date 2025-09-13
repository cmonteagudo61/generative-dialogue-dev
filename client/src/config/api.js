// API Configuration for different environments
const config = {
  development: {
    API_BASE_URL: 'http://localhost:5680',
    WS_BASE_URL: 'ws://localhost:5680'
  },
  production: {
    // Use localhost for testing (both frontend and backend on same machine)
    API_BASE_URL: 'http://localhost:5680',
    WS_BASE_URL: 'ws://localhost:5680'
  }
};

const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment];

export const API_BASE_URL = currentConfig.API_BASE_URL;
export const WS_BASE_URL = currentConfig.WS_BASE_URL;

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Helper function to build WebSocket URLs
export const buildWsUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${WS_BASE_URL}/${cleanEndpoint}`;
};

console.log(`🌐 API Configuration (${environment}):`, {
  API_BASE_URL,
  WS_BASE_URL
});

export default currentConfig;
