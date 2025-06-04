# Video Creator Service

This microservice creates videos from audio files and scripts using FFmpeg and OpenAI image generation.

## Configuration

**Port:** `3004` (configurable via `VIDEO_SERVICE_PORT` env variable)

## API Endpoints

### Health Check
```bash
curl http://localhost:3004/health
```

### Get Available Video Styles
```bash
curl http://localhost:3004/styles
```

#### Response:
```json
{
  "styles": [
    {
      "id": "podcast",
      "name": "Podcast Style",
      "description": "Animated waveform with podcast-style background"
    },
    {
      "id": "slideshow",
      "name": "Slideshow",
      "description": "Series of AI-generated images with voice-over"
    },
    {
      "id": "captions",
      "name": "Captions Only",
      "description": "Simple background with animated captions"
    },
    {
      "id": "reddit",
      "name": "Reddit Style",
      "description": "Reddit post visualization with voice-over"
    }
  ]
}
```

### Create Video
```bash
# Using multipart form data
curl -X POST http://localhost:3004/create \
  -F "audioFile=@/path/to/audio.mp3" \
  -F "script={\"script\":\"Welcome to our video...\"}" \
  -F "style=slideshow"

# Using JSON with file path
curl -X POST http://localhost:3004/create \
  -H "Content-Type: application/json" \
  -d '{
    "audioFile": "/path/to/generated/audio.mp3",
    "script": {
      "script": "Welcome to our amazing video about octopuses!",
      "sourceTrend": {
        "title": "TIL octopuses have three hearts",
        "subreddit": "todayilearned"
      }
    },
    "style": "slideshow"
  }'
```

#### Parameters:
- `audioFile` (file/string): Audio file (upload or path to existing file)
- `script` (string/object): Script content and metadata
- `style` (string): Video style - "podcast", "slideshow", "captions", "reddit" (default: "slideshow")
- `images` (files): Optional custom images (for multipart uploads)

#### Response:
```json
{
  "videoFile": "/path/to/generated/video.mp4",
  "duration": 45.2,
  "style": "slideshow"
}
```

## Video Styles

### Podcast Style
- Creates a static background with podcast studio aesthetics
- Simple waveform visualization
- Good for audio-focused content

### Slideshow
- Generates AI images based on script content
- Each paragraph becomes a slide
- Smooth transitions between images
- Best for educational or storytelling content

### Captions Only
- Simple gradient background
- Animated text captions synchronized with audio
- Clean and minimal design
- Good for quote-based or text-heavy content

### Reddit Style
- Recreates Reddit post appearance
- Shows subreddit and post title
- Authentic Reddit look and feel

## Running the Service

```bash
cd services/video-creator
npm install
npm start
```

## Environment Variables

- `VIDEO_SERVICE_PORT`: Port to run the service on (default: 3004)
- `OPENAI_API_KEY`: Your OpenAI API key (required for image generation)

## Dependencies

- FFmpeg must be installed on the system
- Generated files are saved in `videos/`, `audio/`, and `images/` directories
- Videos are created in vertical format (9:16) for YouTube Shorts

## Notes

- Video creation can take several minutes depending on style and length
- AI image generation requires OpenAI API credits
- All generated content is stored locally