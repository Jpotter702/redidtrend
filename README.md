# RediTrend

RediTrend is a comprehensive application for creating YouTube Shorts from trending Reddit content. The application follows a microservices architecture where each component can run independently or as part of a complete pipeline.

## Features

- **Reddit Trends Analysis**: Find trending content from Reddit subreddits
- **Script Generation**: Create engaging scripts from Reddit content
- **Voice-Over Generation**: Convert scripts to professional voice-overs
- **Video Creation**: Generate visually appealing videos with various styles
- **YouTube Upload**: Automatically upload videos as YouTube Shorts
- **Analytics Tracking**: Monitor performance of uploaded videos

## Architecture

RediTrend uses a microservices architecture with the following components:

- **Orchestrator**: Coordinates the entire pipeline
- **API Gateway**: Routes requests to appropriate services
- **Frontend**: User interface for managing the pipeline
- **Microservices**:
  - Reddit Trends Service
  - Script Generator Service
  - Voice Generator Service
  - Video Creator Service
  - YouTube Uploader Service
  - Analytics Service

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (for analytics)
- FFmpeg (for video creation)
- API keys for external services:
  - OpenAI (for script generation)
  - ElevenLabs or AWS Polly (for voice generation)
  - YouTube API (for uploading)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/reditrend.git
   cd reditrend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create `.env` file:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your configuration and API keys.

## Starting the Application

### Frontend (React App)
```bash
cd frontend
npm start
```
The frontend will be available at `http://localhost:3000`

### API Gateway
```bash
cd api-gateway
npm start
```
The API Gateway will be available at `http://localhost:8000`

### Orchestrator
```bash
cd orchestrator
npm start
```

### Individual Services
```bash
# Reddit Trends Service
cd services/reddit-trends
npm start

# Script Generator Service
cd services/script-generator
npm start

# Voice Generator Service
cd services/voice-generator
npm start

# Video Creator Service
cd services/video-creator
npm start

# YouTube Uploader Service
cd services/youtube-uploader
npm start

# Analytics Service
cd services/analytics
npm start
```

### Start All Services (if npm run dev is configured)
```bash
npm run dev
```

## Usage

1. Access the dashboard at `http://localhost:8000`
2. Use the wizard to create a new video:
   - Select subreddits and search criteria
   - Choose voice provider and voice
   - Select script style
   - Configure video options
   - Optionally enable YouTube upload
3. Track performance in the analytics section

## API Endpoints

The API Gateway exposes endpoints for all services at `/api/v1/[service-name]`

Example endpoints:
- `/api/v1/reddit/trends` - Get trending Reddit content
- `/api/v1/script/generate` - Generate a script
- `/api/v1/voice/generate` - Generate voice-over
- `/api/v1/video/create` - Create a video
- `/api/v1/youtube/upload` - Upload to YouTube
- `/api/v1/analytics/videos` - Get video analytics
- `/api/v1/pipeline` - Run the entire pipeline

## Running Individual Services

Each service can be run independently:

```bash
# Reddit Trends Service
cd services/reddit-trends
npm install
npm run dev

# Script Generator Service
cd services/script-generator
npm install
npm run dev

# And so on for other services...
```

## Docker Support

Docker Compose configuration is available for running the full stack:

```bash
docker-compose up
```

## License

MIT# redidtrend
