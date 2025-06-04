require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.YOUTUBE_SERVICE_PORT || 3005;

app.use(cors());
app.use(express.json());

// Set up storage for video files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'videos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// YouTube API configuration
const youtube = google.youtube('v3');

// OAuth2 client setup
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'youtube-uploader' });
});

// Check authentication status
app.get('/auth/status', (req, res) => {
  try {
    const credentials = readCredentials();
    if (credentials && credentials.refresh_token) {
      oauth2Client.setCredentials(credentials);
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  } catch (error) {
    res.json({ authenticated: false, error: error.message });
  }
});

// Generate auth URL
app.get('/auth/url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload']
  });
  
  res.json({ url: authUrl });
});

// Handle OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Save tokens
    saveCredentials(tokens);
    
    res.send('Authentication successful! You can close this window and return to the application.');
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).send('Authentication failed. Please try again.');
  }
});

// Upload video to YouTube
app.post('/upload', upload.single('videoFile'), async (req, res) => {
  try {
    let videoPath;
    
    if (req.file) {
      videoPath = req.file.path;
    } else if (req.body.videoFile) {
      // Copy the file from the other service
      const sourcePath = req.body.videoFile;
      
      if (fs.existsSync(sourcePath)) {
        const filename = path.basename(sourcePath);
        const destPath = path.join(__dirname, 'videos', filename);
        
        fs.copyFileSync(sourcePath, destPath);
        videoPath = destPath;
      } else {
        return res.status(400).json({ error: 'Video file not found' });
      }
    } else {
      return res.status(400).json({ error: 'No video file provided' });
    }
    
    // Check authentication
    try {
      const credentials = readCredentials();
      if (!credentials || !credentials.refresh_token) {
        return res.status(401).json({ 
          error: 'Not authenticated with YouTube', 
          authUrl: oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/youtube.upload']
          }) 
        });
      }
      
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Authentication error', 
        details: error.message,
        authUrl: oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/youtube.upload']
        })
      });
    }
    
    const { 
      title = 'Trending on Reddit', 
      description = 'A video about trending content on Reddit', 
      tags = ['reddit', 'trending'] 
    } = req.body;
    
    // Upload to YouTube
    const videoId = await uploadToYouTube(videoPath, {
      title,
      description,
      tags,
      privacyStatus: 'private' // Default to private, can be 'public', 'unlisted', or 'private'
    });
    
    res.json({
      videoId,
      youtubeUrl: `https://youtube.com/watch?v=${videoId}`,
      title,
      description
    });
  } catch (error) {
    console.error('Error uploading to YouTube:', error.message);
    res.status(500).json({ error: 'Failed to upload to YouTube', details: error.message });
  }
});

// Function to upload video to YouTube
async function uploadToYouTube(videoPath, metadata) {
  return new Promise((resolve, reject) => {
    const fileSize = fs.statSync(videoPath).size;
    
    const requestBody = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: '22' // People & Blogs category
      },
      status: {
        privacyStatus: metadata.privacyStatus || 'private',
        selfDeclaredMadeForKids: false
      }
    };
    
    youtube.videos.insert({
      auth: oauth2Client,
      part: 'snippet,status',
      requestBody,
      media: {
        body: fs.createReadStream(videoPath)
      }
    }, {
      onUploadProgress: evt => {
        const progress = (evt.bytesRead / fileSize) * 100;
        console.log(`Upload progress: ${Math.round(progress)}%`);
      }
    }, (err, response) => {
      if (err) {
        console.error('YouTube upload error:', err);
        return reject(err);
      }
      
      resolve(response.data.id);
    });
  });
}

// Function to read saved credentials
function readCredentials() {
  const credentialsPath = path.join(__dirname, 'credentials.json');
  
  if (!fs.existsSync(credentialsPath)) {
    return null;
  }
  
  const credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
  return JSON.parse(credentialsJson);
}

// Function to save credentials
function saveCredentials(tokens) {
  const credentialsPath = path.join(__dirname, 'credentials.json');
  fs.writeFileSync(credentialsPath, JSON.stringify(tokens, null, 2));
}

app.listen(PORT, () => {
  console.log(`YouTube uploader service running on port ${PORT}`);
});