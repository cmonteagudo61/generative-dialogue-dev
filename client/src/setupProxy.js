const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/api', '/realtime', '/session-bus', '/health'],
    createProxyMiddleware({
      target: 'http://localhost:5680',
      ws: true,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent'
    })
  );
};


