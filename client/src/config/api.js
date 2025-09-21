// API Configuration for different environments
const config = {
  development: {
    API_BASE_URL: 'http://localhost:5680',
    WS_BASE_URL: 'ws://localhost:5680'
  },
  production: {
    // Render backend for production
    API_BASE_URL: 'https://generative-dialogue-dev.onrender.com',
    WS_BASE_URL: 'wss://generative-dialogue-dev.onrender.com'
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
