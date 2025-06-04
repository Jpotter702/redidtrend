require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.VIDEO_SERVICE_PORT || 3004;

app.use(cors());
app.use(express.json());

// Ensure directories exist
const AUDIO_DIR = path.join(__dirname, 'audio');
const IMAGES_DIR = path.join(__dirname, 'images');
const VIDEOS_DIR = path.join(__dirname, 'videos');

[AUDIO_DIR, IMAGES_DIR, VIDEOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = AUDIO_DIR;
    if (file.mimetype.startsWith('image/')) {
      dir = IMAGES_DIR;
    } else if (file.mimetype.startsWith('video/')) {
      dir = VIDEOS_DIR;
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Initialize OpenAI client for image generation
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Video style templates
const VIDEO_STYLES = {
  'podcast': {
    name: 'Podcast Style',
    description: 'Animated waveform with podcast-style background',
    handler: createPodcastVideo
  },
  'slideshow': {
    name: 'Slideshow',
    description: 'Series of AI-generated images with voice-over',
    handler: createSlideshowVideo
  },
  'captions': {
    name: 'Captions Only',
    description: 'Simple background with animated captions',
    handler: createCaptionsVideo
  },
  'reddit': {
    name: 'Reddit Style',
    description: 'Reddit post visualization with voice-over',
    handler: createRedditStyleVideo
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'video-creator' });
});

// Get available video styles
app.get('/styles', (req, res) => {
  const styles = Object.entries(VIDEO_STYLES).map(([id, style]) => ({
    id,
    name: style.name,
    description: style.description
  }));
  
  res.json({ styles });
});

// Create video endpoint
app.post('/create', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    let audioFile;
    
    if (req.files && req.files.audioFile) {
      audioFile = req.files.audioFile[0].path;
    } else if (req.body.audioFile) {
      // Copy the file from the other service
      const sourcePath = req.body.audioFile;
      
      if (fs.existsSync(sourcePath)) {
        const filename = path.basename(sourcePath);
        const destPath = path.join(AUDIO_DIR, filename);
        
        fs.copyFileSync(sourcePath, destPath);
        audioFile = destPath;
      } else {
        return res.status(400).json({ error: 'Audio file not found' });
      }
    } else {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const { script, style = 'slideshow' } = req.body;
    
    if (!VIDEO_STYLES[style]) {
      return res.status(400).json({ error: 'Invalid video style' });
    }
    
    // Generate video based on selected style
    const videoResult = await VIDEO_STYLES[style].handler({
      audioFile,
      script: typeof script === 'string' ? script : JSON.stringify(script),
      images: req.files && req.files.images ? req.files.images.map(file => file.path) : []
    });
    
    res.json({
      videoFile: videoResult.videoPath,
      duration: videoResult.duration,
      style
    });
  } catch (error) {
    console.error('Error creating video:', error.message);
    res.status(500).json({ error: 'Failed to create video', details: error.message });
  }
});

// Function to create podcast-style video
async function createPodcastVideo({ audioFile, script }) {
  const outputPath = path.join(VIDEOS_DIR, `${uuidv4()}.mp4`);
  
  // Generate a simple podcast background
  const backgroundPath = path.join(IMAGES_DIR, `podcast-bg-${uuidv4()}.png`);
  
  // Simple background generation (in a real app, you'd use better graphics)
  await generateSimpleImage(backgroundPath, 'A professional podcast studio background with microphones and soft lighting, blurred', 1920, 1080);
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(backgroundPath)
      .inputOptions(['-loop 1'])
      .input(audioFile)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-b:a 192k',
        '-shortest',
        '-pix_fmt yuv420p',
        '-vf "scale=1080:1920,setdar=9/16"' // Vertical video for YouTube Shorts
      ])
      .output(outputPath)
      .on('end', () => {
        // Get duration
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          if (err) {
            return reject(err);
          }
          
          resolve({
            videoPath: outputPath,
            duration: metadata.format.duration
          });
        });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Function to create slideshow video
async function createSlideshowVideo({ audioFile, script }) {
  const outputPath = path.join(VIDEOS_DIR, `${uuidv4()}.mp4`);
  
  // Parse script to extract key phrases for image generation
  let scriptObj;
  try {
    scriptObj = typeof script === 'string' ? JSON.parse(script) : script;
  } catch (e) {
    scriptObj = { script };
  }
  
  const scriptContent = scriptObj.script || script;
  
  // Generate images based on script content
  const imagePrompts = extractImagePrompts(scriptContent);
  const imagePaths = [];
  
  for (let i = 0; i < imagePrompts.length; i++) {
    const imagePath = path.join(IMAGES_DIR, `slide-${i}-${uuidv4()}.png`);
    await generateImage(imagePath, imagePrompts[i]);
    imagePaths.push(imagePath);
  }
  
  // Get audio duration
  const audioDuration = await getAudioDuration(audioFile);
  
  // Calculate duration for each image
  const slideDuration = audioDuration / imagePaths.length;
  
  return new Promise((resolve, reject) => {
    let ffmpegCommand = ffmpeg();
    
    // Add each image as input
    imagePaths.forEach((imagePath) => {
      ffmpegCommand = ffmpegCommand.input(imagePath);
    });
    
    // Add audio input
    ffmpegCommand = ffmpegCommand.input(audioFile);
    
    // Create complex filter for slideshow
    const filterComplex = imagePaths.map((_, i) => {
      return `[${i}:v]scale=1080:1920,setpts=PTS-STARTPTS+${i}*${slideDuration}/TB[v${i}]`;
    }).join(';');
    
    const concatFilter = imagePaths.map((_, i) => `[v${i}]`).join('') + 
      `concat=n=${imagePaths.length}:v=1:a=0[outv]`;
    
    ffmpegCommand
      .complexFilter(filterComplex + ';' + concatFilter)
      .outputOptions([
        '-map [outv]',
        `-map ${imagePaths.length}:a`,
        '-c:v libx264',
        '-c:a aac',
        '-b:a 192k',
        '-shortest',
        '-pix_fmt yuv420p'
      ])
      .output(outputPath)
      .on('end', () => {
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          if (err) {
            return reject(err);
          }
          
          resolve({
            videoPath: outputPath,
            duration: metadata.format.duration
          });
        });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Function to create captions video
async function createCaptionsVideo({ audioFile, script }) {
  const outputPath = path.join(VIDEOS_DIR, `${uuidv4()}.mp4`);
  
  // Generate a simple background
  const backgroundPath = path.join(IMAGES_DIR, `caption-bg-${uuidv4()}.png`);
  await generateSimpleImage(backgroundPath, 'A simple gradient background, suitable for text captions', 1080, 1920);
  
  // Extract sentences for captions
  let scriptText;
  try {
    const scriptObj = typeof script === 'string' ? JSON.parse(script) : script;
    scriptText = scriptObj.script || script;
  } catch (e) {
    scriptText = script;
  }
  
  const sentences = scriptText
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .filter(s => s.trim().length > 0);
  
  // Create a temporary subtitle file
  const subtitlePath = path.join(__dirname, `temp-${uuidv4()}.srt`);
  let subtitleContent = '';
  
  // Get audio duration
  const audioDuration = await getAudioDuration(audioFile);
  
  // Divide duration evenly among sentences
  const sentenceDuration = audioDuration / sentences.length;
  
  sentences.forEach((sentence, index) => {
    const startTime = formatSrtTime(index * sentenceDuration);
    const endTime = formatSrtTime((index + 1) * sentenceDuration);
    
    subtitleContent += `${index + 1}\n${startTime} --> ${endTime}\n${sentence.trim()}\n\n`;
  });
  
  fs.writeFileSync(subtitlePath, subtitleContent);
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(backgroundPath)
      .inputOptions(['-loop 1'])
      .input(audioFile)
      .input(subtitlePath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-b:a 192k',
        '-shortest',
        '-pix_fmt yuv420p',
        '-vf "scale=1080:1920,setdar=9/16,subtitles=\'' + subtitlePath.replace(/\\/g, '\\\\') + '\':force_style=\'Alignment=10,FontSize=24,PrimaryColour=&H00ffffff,OutlineColour=&H00000000,BackColour=&H00000000,Outline=1,Shadow=1,MarginL=20,MarginR=20,MarginV=20\'"'
      ])
      .output(outputPath)
      .on('end', () => {
        // Remove temporary subtitle file
        fs.unlinkSync(subtitlePath);
        
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          if (err) {
            return reject(err);
          }
          
          resolve({
            videoPath: outputPath,
            duration: metadata.format.duration
          });
        });
      })
      .on('error', (err) => {
        // Try to clean up subtitle file if possible
        if (fs.existsSync(subtitlePath)) {
          fs.unlinkSync(subtitlePath);
        }
        reject(err);
      })
      .run();
  });
}

// Function to create Reddit-style video
async function createRedditStyleVideo({ audioFile, script }) {
  const outputPath = path.join(VIDEOS_DIR, `${uuidv4()}.mp4`);
  
  // Parse script to get Reddit post info
  let scriptObj;
  try {
    scriptObj = typeof script === 'string' ? JSON.parse(script) : script;
  } catch (e) {
    scriptObj = { script };
  }
  
  // Generate a Reddit-style post image
  const postImagePath = path.join(IMAGES_DIR, `reddit-post-${uuidv4()}.png`);
  
  // In a real app, you'd use a proper template and rendering library
  // Here we'll just generate a simple image with text
  const postTitle = scriptObj.sourceTrend?.title || 'Trending on Reddit';
  const subreddit = scriptObj.sourceTrend?.subreddit || 'all';
  
  await generateRedditPostImage(postImagePath, postTitle, subreddit);
  
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(postImagePath)
      .inputOptions(['-loop 1'])
      .input(audioFile)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-b:a 192k',
        '-shortest',
        '-pix_fmt yuv420p',
        '-vf "scale=1080:1920,setdar=9/16"' // Vertical video for YouTube Shorts
      ])
      .output(outputPath)
      .on('end', () => {
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          if (err) {
            return reject(err);
          }
          
          resolve({
            videoPath: outputPath,
            duration: metadata.format.duration
          });
        });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Utility function to extract image prompts from script
function extractImagePrompts(script) {
  // Split script into paragraphs
  const paragraphs = script.split(/\n\n+/);
  
  // For each paragraph, create an image prompt
  const imagePrompts = paragraphs.map(para => {
    // Remove speaker labels if present
    const content = para.replace(/^[A-Za-z]+\s*:\s*/g, '');
    
    // Extract key phrases
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const mainSentence = sentences[0];
    
    // Generate a descriptive image prompt
    return `High quality image for a YouTube video thumbnail: ${mainSentence}. Clean, professional style.`;
  });
  
  // Ensure we have at least one image
  if (imagePrompts.length === 0) {
    imagePrompts.push('High quality image for a YouTube video thumbnail. Clean, professional style.');
  }
  
  // Limit to max 5 images to keep video creation fast
  return imagePrompts.slice(0, 5);
}

// Utility function to generate image with OpenAI
async function generateImage(outputPath, prompt) {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });
    
    const imageUrl = response.data[0].url;
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.buffer();
    
    fs.writeFileSync(outputPath, buffer);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating image with OpenAI:', error);
    // Fallback to simple image generation
    return generateSimpleImage(outputPath, prompt);
  }
}

// Utility function to generate a simple colored image with text
async function generateSimpleImage(outputPath, prompt, width = 1080, height = 1920) {
  return new Promise((resolve, reject) => {
    // Generate a simple colored background with text
    ffmpeg()
      .input('color=c=blue:s=1080x1920:d=1')
      .inputOptions(['-f lavfi'])
      .complexFilter([
        `drawtext=text='${prompt.substring(0, 50)}...':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2`
      ])
      .outputOptions([
        '-frames:v 1',
        '-q:v 1'
      ])
      .output(outputPath)
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Utility function to generate a Reddit-style post image
async function generateRedditPostImage(outputPath, title, subreddit) {
  return new Promise((resolve, reject) => {
    // Create a simple Reddit-like post image
    ffmpeg()
      .input('color=c=white:s=1080x1920:d=1')
      .inputOptions(['-f lavfi'])
      .complexFilter([
        `drawtext=text='r/${subreddit}':fontcolor=blue:fontsize=32:x=20:y=20`,
        `drawtext=text='${title.substring(0, 150)}':fontcolor=black:fontsize=36:x=20:y=70:line_spacing=10:fontcolor_expr=ff0000`
      ])
      .outputOptions([
        '-frames:v 1',
        '-q:v 1'
      ])
      .output(outputPath)
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

// Utility function to get audio duration
async function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      
      resolve(metadata.format.duration);
    });
  });
}

// Utility function to format time for SRT files
function formatSrtTime(seconds) {
  const date = new Date(0);
  date.setSeconds(seconds);
  
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const secs = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
  
  return `${hours}:${minutes}:${secs},${ms}`;
}

app.listen(PORT, () => {
  console.log(`Video creator service running on port ${PORT}`);
});