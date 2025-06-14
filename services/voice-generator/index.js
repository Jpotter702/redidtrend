require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');

// Debug logging for AWS credentials
console.log('Environment variables loaded:', {
  region: process.env.AWS_REGION || 'us-east-1',
  hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
});

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const app = express();
const PORT = process.env.VOICE_SERVICE_PORT || 3003;

// Default voice configurations for different roles
const DEFAULT_VOICES = {
  host: 'Matthew', // Male host
  cohost: 'Joanna', // Female cohost
  narrator: 'Stephen' // Neutral narrator
};

// Voice generation settings for different lengths
const VOICE_SETTINGS = {
  'short': { maxSegments: 3, pauseBetween: 0.3 },
  'medium': { maxSegments: 5, pauseBetween: 0.5 },
  'long': { maxSegments: 10, pauseBetween: 0.7 },
  'extended': { maxSegments: 20, pauseBetween: 1.0 },
  'custom': { maxSegments: null, pauseBetween: 0.5 }
};

app.use(cors());
app.use(express.json());

// Set up storage for audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'audio');
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

// Configure AWS Polly
const polly = new AWS.Polly();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'voice-generator' });
});

// Get available voices
app.get('/voices', async (req, res) => {
  try {
    const voices = await getPollyVoices();
    res.json({ 
      voices,
      defaults: DEFAULT_VOICES
    });
  } catch (error) {
    console.error('Error fetching voices:', error.message);
    res.status(500).json({ error: 'Failed to fetch voices', details: error.message });
  }
});

// Get voice settings for different lengths
app.get('/settings', (req, res) => {
  res.json({
    settings: VOICE_SETTINGS,
    defaultVoices: DEFAULT_VOICES
  });
});

// Generate voice-over for single voice
app.post('/generate', async (req, res) => {
  try {
    const { script, voiceId, length = 'medium', customSegments } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: 'No script provided' });
    }
    
    // Apply length settings if script needs segmentation
    const settings = VOICE_SETTINGS[length] || VOICE_SETTINGS.medium;
    const audioResult = await generatePollyAudio(script, voiceId, settings);
    
    res.json({
      audioFile: audioResult.audioPath,
      duration: audioResult.duration,
      voiceId: audioResult.voiceId
    });
  } catch (error) {
    console.error('Error generating voice-over:', error.message);
    res.status(500).json({ error: 'Failed to generate voice-over', details: error.message });
  }
});

// Generate voice-over for podcast format (multiple voices)
app.post('/generate/podcast', async (req, res) => {
  try {
    const { segments, voices = {}, length = 'medium', customSettings } = req.body;
    
    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({ error: 'No segments provided or invalid format' });
    }
    
    // Merge provided voices with defaults
    const selectedVoices = {
      ...DEFAULT_VOICES,
      ...voices
    };
    
    // Apply length settings
    const settings = length === 'custom' && customSettings ? customSettings : (VOICE_SETTINGS[length] || VOICE_SETTINGS.medium);
    
    // Limit segments based on length setting
    const limitedSegments = settings.maxSegments ? segments.slice(0, settings.maxSegments) : segments;
    
    // Generate audio for each segment
    const results = await Promise.all(limitedSegments.map(async (segment) => {
      const { role, text } = segment;
      const voiceId = selectedVoices[role] || DEFAULT_VOICES.narrator;
      
      return generatePollyAudio(text, voiceId, settings);
    }));
    
    // Calculate total duration
    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
    
    res.json({
      segments: results.map((result, index) => ({
        role: limitedSegments[index].role,
        audioFile: result.audioPath,
        duration: result.duration,
        voiceId: result.voiceId,
        pauseAfter: settings.pauseBetween
      })),
      totalDuration,
      settings: {
        length,
        maxSegments: settings.maxSegments,
        pauseBetween: settings.pauseBetween
      }
    });
  } catch (error) {
    console.error('Error generating podcast voice-over:', error.message);
    res.status(500).json({ error: 'Failed to generate podcast voice-over', details: error.message });
  }
});

// AWS Polly functions
async function getPollyVoices() {
  try {
    const result = await polly.describeVoices().promise();
    
    return result.Voices.map(voice => ({
      id: voice.Id,
      name: voice.Name,
      gender: voice.Gender,
      language: voice.LanguageCode,
      engine: voice.SupportedEngines.includes('neural') ? 'neural' : 'standard'
    }));
  } catch (error) {
    console.error('Error fetching AWS Polly voices:', error);
    throw new Error('Failed to fetch AWS Polly voices');
  }
}

async function generatePollyAudio(script, voiceId, settings = {}) {
  try {
    const defaultVoiceId = 'Matthew'; // Default to Matthew (neural voice)
    const voice = voiceId || defaultVoiceId;
    
    // Add SSML pauses if settings specify it
    let processedScript = script;
    if (settings.pauseBetween && settings.pauseBetween > 0) {
      processedScript = `<speak>${script}<break time="${settings.pauseBetween}s"/></speak>`;
    }
    
    const params = {
      Text: processedScript,
      TextType: settings.pauseBetween ? 'ssml' : 'text',
      OutputFormat: 'mp3',
      VoiceId: voice,
      Engine: 'neural' // Use neural engine for better quality
    };
    
    console.log('Generating audio with params:', JSON.stringify(params, null, 2));
    
    const result = await polly.synthesizeSpeech(params).promise();
    
    const audioPath = path.join(__dirname, 'audio', `${uuidv4()}.mp3`);
    
    // Ensure directory exists
    if (!fs.existsSync(path.dirname(audioPath))) {
      fs.mkdirSync(path.dirname(audioPath), { recursive: true });
    }
    
    fs.writeFileSync(audioPath, result.AudioStream);
    
    // Estimate duration (AWS Polly typically speaks at ~3 words per second)
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 3);
    
    return {
      audioPath,
      duration: estimatedDuration,
      voiceId: voice
    };
  } catch (error) {
    console.error('Error generating AWS Polly audio:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      requestId: error.requestId,
      statusCode: error.statusCode,
      time: error.time
    });
    throw new Error(`Failed to generate AWS Polly audio: ${error.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`Voice generator service running on port ${PORT}`);
});