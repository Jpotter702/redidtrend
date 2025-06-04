require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

app.use(apiLimiter);

// Service URLs
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';
const REDDIT_SERVICE_URL = process.env.REDDIT_SERVICE_URL || 'http://localhost:3001';
const SCRIPT_SERVICE_URL = process.env.SCRIPT_SERVICE_URL || 'http://localhost:3002';
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:3003';
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:3004';
const YOUTUBE_SERVICE_URL = process.env.YOUTUBE_SERVICE_URL || 'http://localhost:3005';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006';

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check health of all services
    const services = [
      { name: 'orchestrator', url: `${ORCHESTRATOR_URL}/health` },
      { name: 'reddit-trends', url: `${REDDIT_SERVICE_URL}/health` },
      { name: 'script-generator', url: `${SCRIPT_SERVICE_URL}/health` },
      { name: 'voice-generator', url: `${VOICE_SERVICE_URL}/health` },
      { name: 'video-creator', url: `${VIDEO_SERVICE_URL}/health` },
      { name: 'youtube-uploader', url: `${YOUTUBE_SERVICE_URL}/health` },
      { name: 'analytics', url: `${ANALYTICS_SERVICE_URL}/health` }
    ];
    
    const healthResults = await Promise.all(
      services.map(async service => {
        try {
          const response = await axios.get(service.url, { 
            timeout: 5000,
            validateStatus: (status) => status === 200
          });
          
          if (!response.data || response.data.status !== 'OK') {
            throw new Error('Service returned non-OK status');
          }
          
          return { 
            service: service.name, 
            status: 'OK'
          };
        } catch (error) {
          return { 
            service: service.name, 
            status: 'ERROR', 
            error: error.message 
          };
        }
      })
    );
    
    // Check if any service has an ERROR status
    const hasErrors = healthResults.some(result => result.status === 'ERROR');
    
    // If any service is in error state, return 503
    const statusCode = hasErrors ? 503 : 200;
    const status = hasErrors ? 'Degraded' : 'OK';
    
    res.status(statusCode).json({
      status,
      gateway: 'OK',
      services: healthResults
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      gateway: 'ERROR',
      error: error.message 
    });
  }
});

// Only set up proxy middleware if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Proxy middleware options
  const options = {
    target: ORCHESTRATOR_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/v1/orchestrator': ''
    }
  };

  // Proxy routes
  app.use('/api/v1/orchestrator', createProxyMiddleware(options));

  app.use('/api/v1/reddit', createProxyMiddleware({
    target: REDDIT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/reddit': '' }
  }));

  app.use('/api/v1/script', createProxyMiddleware({
    target: SCRIPT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/script': '' }
  }));

  app.use('/api/v1/voice', createProxyMiddleware({
    target: VOICE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/voice': '' }
  }));

  app.use('/api/v1/video', createProxyMiddleware({
    target: VIDEO_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/video': '' }
  }));

  app.use('/api/v1/youtube', createProxyMiddleware({
    target: YOUTUBE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/youtube': '' }
  }));

  app.use('/api/v1/analytics', createProxyMiddleware({
    target: ANALYTICS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/analytics': '' }
  }));

  // Full pipeline endpoint
  app.use('/api/v1/pipeline', createProxyMiddleware({
    target: ORCHESTRATOR_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/pipeline': '/pipeline' }
  }));

  // For frontend SPA routing
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Only start the server if this file is run directly and not in test environment
if (require.main === module && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
  });
}

module.exports = app;