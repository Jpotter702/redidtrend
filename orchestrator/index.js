require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.ORCHESTRATOR_PORT || 3000;

app.use(cors());
app.use(express.json());

// Service URLs
const REDDIT_SERVICE_URL = process.env.REDDIT_SERVICE_URL || 'http://localhost:3001';
const SCRIPT_SERVICE_URL = process.env.SCRIPT_SERVICE_URL || 'http://localhost:3002';
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:3003';
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:3004';
const YOUTUBE_SERVICE_URL = process.env.YOUTUBE_SERVICE_URL || 'http://localhost:3005';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006';

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'orchestrator' });
});

// Get available voice providers
app.get('/voices/providers', async (req, res) => {
  try {
    const response = await axios.get(`${VOICE_SERVICE_URL}/providers`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching voice providers:', error.message);
    res.status(500).json({ error: 'Failed to fetch voice providers' });
  }
});

// Full pipeline endpoint
app.post('/pipeline', async (req, res) => {
  try {
    const { 
      subreddits, 
      dateRange, 
      searchType,
      customPrompt,
      voiceProvider,
      voiceId,
      scriptStyle
    } = req.body;

    // Step 1: Get trending Reddit content
    const redditResponse = await axios.post(`${REDDIT_SERVICE_URL}/trends`, {
      subreddits,
      dateRange,
      searchType,
      customPrompt
    });
    
    const trendData = redditResponse.data;

    // Step 2: Generate script
    const scriptResponse = await axios.post(`${SCRIPT_SERVICE_URL}/generate`, {
      trendData,
      style: scriptStyle
    });
    
    const scriptData = scriptResponse.data;

    // Step 3: Generate voice-over
    const voiceResponse = await axios.post(`${VOICE_SERVICE_URL}/generate`, {
      script: scriptData.script,
      provider: voiceProvider,
      voiceId
    });
    
    const voiceData = voiceResponse.data;

    // Step 4: Create video
    const videoResponse = await axios.post(`${VIDEO_SERVICE_URL}/create`, {
      script: scriptData,
      audioFile: voiceData.audioFile,
      style: req.body.videoStyle
    });
    
    const videoData = videoResponse.data;

    // Step 5: Upload to YouTube (if requested)
    let youtubeData = null;
    if (req.body.uploadToYoutube) {
      const youtubeResponse = await axios.post(`${YOUTUBE_SERVICE_URL}/upload`, {
        videoFile: videoData.videoFile,
        title: scriptData.title,
        description: scriptData.description,
        tags: scriptData.tags
      });
      
      youtubeData = youtubeResponse.data;
      
      // Step 6: Start tracking analytics
      await axios.post(`${ANALYTICS_SERVICE_URL}/track`, {
        videoId: youtubeData.videoId,
        source: 'reddit',
        sourceData: trendData
      });
    }

    res.json({
      trend: trendData,
      script: scriptData,
      voice: voiceData,
      video: videoData,
      youtube: youtubeData
    });
  } catch (error) {
    console.error('Pipeline error:', error.message);
    res.status(500).json({ error: 'Pipeline execution failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Orchestrator service running on port ${PORT}`);
});