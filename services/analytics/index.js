require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.ANALYTICS_SERVICE_PORT || 3006;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reditrend-analytics';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schemas and models
const VideoSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: String,
  description: String,
  uploadDate: { type: Date, default: Date.now },
  source: {
    type: { type: String, enum: ['reddit', 'manual', 'other'], default: 'reddit' },
    sourceData: mongoose.Schema.Types.Mixed
  },
  metrics: [{
    date: { type: Date, default: Date.now },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    estimatedRevenue: { type: Number, default: 0 },
    watchTimeHours: { type: Number, default: 0 }
  }]
});

const Video = mongoose.model('Video', VideoSchema);

// YouTube API configuration
const youtube = google.youtube('v3');
const youtubeAnalytics = google.youtubeAnalytics('v2');

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'analytics' });
});

// Start tracking a video
app.post('/track', async (req, res) => {
  try {
    const { videoId, title, description, source, sourceData } = req.body;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }
    
    // Check if video already exists
    const existingVideo = await Video.findOne({ videoId });
    
    if (existingVideo) {
      return res.status(409).json({ error: 'Video is already being tracked', video: existingVideo });
    }
    
    // Create new video tracking
    const video = new Video({
      videoId,
      title,
      description,
      source: {
        type: source || 'reddit',
        sourceData
      }
    });
    
    await video.save();
    
    // Schedule initial metrics collection
    scheduleMetricsCollection(videoId);
    
    res.status(201).json({ message: 'Video tracking started', video });
  } catch (error) {
    console.error('Error starting video tracking:', error.message);
    res.status(500).json({ error: 'Failed to start tracking', details: error.message });
  }
});

// Get all tracked videos
app.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ uploadDate: -1 });
    res.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error.message);
    res.status(500).json({ error: 'Failed to fetch videos', details: error.message });
  }
});

// Get a specific video's analytics
app.get('/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const video = await Video.findOne({ videoId });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ video });
  } catch (error) {
    console.error('Error fetching video analytics:', error.message);
    res.status(500).json({ error: 'Failed to fetch video analytics', details: error.message });
  }
});

// Update video metrics manually
app.post('/videos/:videoId/metrics', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { views, likes, comments, estimatedRevenue, watchTimeHours } = req.body;
    
    const video = await Video.findOne({ videoId });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const newMetrics = {
      date: new Date(),
      views: views || 0,
      likes: likes || 0,
      comments: comments || 0,
      estimatedRevenue: estimatedRevenue || 0,
      watchTimeHours: watchTimeHours || 0
    };
    
    video.metrics.push(newMetrics);
    await video.save();
    
    res.json({ message: 'Metrics updated', video });
  } catch (error) {
    console.error('Error updating metrics:', error.message);
    res.status(500).json({ error: 'Failed to update metrics', details: error.message });
  }
});

// Function to schedule metrics collection for a video
function scheduleMetricsCollection(videoId) {
  // Schedule for every 6 hours
  const jobName = `metrics-${videoId}`;
  
  // Cancel existing job if it exists
  if (cron.getTasks().has(jobName)) {
    cron.getTasks().get(jobName).stop();
  }
  
  // Schedule new job
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log(`Collecting metrics for video ${videoId}`);
      await collectVideoMetrics(videoId);
    } catch (error) {
      console.error(`Error collecting metrics for ${videoId}:`, error.message);
    }
  }, {
    name: jobName,
    scheduled: true
  });
}

// Function to collect video metrics from YouTube
async function collectVideoMetrics(videoId) {
  try {
    // Check authentication
    const credentials = readCredentials();
    if (!credentials || !credentials.refresh_token) {
      console.error('Not authenticated with YouTube');
      return;
    }
    
    oauth2Client.setCredentials(credentials);
    
    // Get video information
    const videoResponse = await youtube.videos.list({
      auth: oauth2Client,
      part: 'statistics,snippet',
      id: videoId
    });
    
    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      console.error(`Video ${videoId} not found on YouTube`);
      return;
    }
    
    const videoInfo = videoResponse.data.items[0];
    const statistics = videoInfo.statistics;
    
    // Get analytics data
    // Note: This requires YouTube Partner API access
    let analyticsData = { estimatedRevenue: 0, watchTimeHours: 0 };
    
    try {
      const analyticsResponse = await youtubeAnalytics.reports.query({
        auth: oauth2Client,
        ids: 'channel==MINE',
        startDate: '2000-01-01',
        endDate: new Date().toISOString().split('T')[0],
        metrics: 'estimatedRevenue,estimatedMinutesWatched',
        filters: `video==${videoId}`
      });
      
      if (analyticsResponse.data.rows && analyticsResponse.data.rows.length > 0) {
        analyticsData = {
          estimatedRevenue: analyticsResponse.data.rows[0][0] || 0,
          watchTimeHours: (analyticsResponse.data.rows[0][1] || 0) / 60
        };
      }
    } catch (analyticsError) {
      console.error('Error fetching analytics data:', analyticsError.message);
      // Continue without analytics data
    }
    
    // Update database
    const video = await Video.findOne({ videoId });
    
    if (!video) {
      console.error(`Video ${videoId} not found in database`);
      return;
    }
    
    // Update video details if needed
    if (!video.title && videoInfo.snippet) {
      video.title = videoInfo.snippet.title;
      video.description = videoInfo.snippet.description;
    }
    
    // Add new metrics
    video.metrics.push({
      date: new Date(),
      views: parseInt(statistics.viewCount) || 0,
      likes: parseInt(statistics.likeCount) || 0,
      comments: parseInt(statistics.commentCount) || 0,
      estimatedRevenue: analyticsData.estimatedRevenue,
      watchTimeHours: analyticsData.watchTimeHours
    });
    
    await video.save();
    console.log(`Updated metrics for video ${videoId}`);
  } catch (error) {
    console.error(`Error collecting metrics for ${videoId}:`, error.message);
    throw error;
  }
}

// Function to read saved credentials
function readCredentials() {
  const credentialsPath = path.join(__dirname, '..', 'youtube-uploader', 'credentials.json');
  
  if (!fs.existsSync(credentialsPath)) {
    return null;
  }
  
  const credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
  return JSON.parse(credentialsJson);
}

// Schedule a regular job to collect metrics for all tracked videos
cron.schedule('0 */6 * * *', async () => {
  try {
    const videos = await Video.find();
    
    for (const video of videos) {
      try {
        await collectVideoMetrics(video.videoId);
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error collecting metrics for ${video.videoId}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error in scheduled metrics collection:', error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Analytics service running on port ${PORT}`);
});