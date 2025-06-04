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

// Generate voice-over for single voice
app.post('/generate', async (req, res) => {
  try {
    const { script, voiceId } = req.body;
    
    if (!script) {
      return res.status(400).json({ error: 'No script provided' });
    }
    
    const audioResult = await generatePollyAudio(script, voiceId);
    
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
    const { segments, voices = {} } = req.body;
    
    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({ error: 'No segments provided or invalid format' });
    }
    
    // Merge provided voices with defaults
    const selectedVoices = {
      ...DEFAULT_VOICES,
      ...voices
    };
    
    // Generate audio for each segment
    const results = await Promise.all(segments.map(async (segment) => {
      const { role, text } = segment;
      const voiceId = selectedVoices[role] || DEFAULT_VOICES.narrator;
      
      return generatePollyAudio(text, voiceId);
    }));
    
    // Calculate total duration
    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
    
    res.json({
      segments: results.map((result, index) => ({
        role: segments[index].role,
        audioFile: result.audioPath,
        duration: result.duration,
        voiceId: result.voiceId
      })),
      totalDuration
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

async function generatePollyAudio(script, voiceId) {
  try {
    const defaultVoiceId = 'Matthew'; // Default to Matthew (neural voice)
    const voice = voiceId || defaultVoiceId;
    
    const params = {
      Text: script,
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