# YouTube Uploader Service

This microservice uploads videos to YouTube using the YouTube Data API.

## Configuration

**Port:** `3005` (configurable via `YOUTUBE_SERVICE_PORT` env variable)

## API Endpoints

### Health Check
```bash
curl http://localhost:3005/health
```

### Check Authentication Status
```bash
curl http://localhost:3005/auth/status
```

#### Response:
```json
{
  "authenticated": true
}
```

### Get Authentication URL
```bash
curl http://localhost:3005/auth/url
```

#### Response:
```json
{
  "url": "https://accounts.google.com/oauth/authorize?..."
}
```

### Upload Video to YouTube
```bash
# Using multipart form data
curl -X POST http://localhost:3005/upload \
  -F "videoFile=@/path/to/video.mp4" \
  -F "title=Amazing Octopus Facts!" \
  -F "description=Learn fascinating facts about octopuses" \
  -F "tags=octopus,marine biology,educational"

# Using JSON with file path
curl -X POST http://localhost:3005/upload \
  -H "Content-Type: application/json" \
  -d '{
    "videoFile": "/path/to/generated/video.mp4",
    "title": "Amazing Octopus Facts You Never Knew!",
    "description": "Learn fascinating facts about octopuses and their unique biology. Did you know they have three hearts?",
    "tags": ["octopus", "marine biology", "educational", "facts", "animals"]
  }'
```

#### Parameters:
- `videoFile` (file/string): Video file to upload (required)
- `title` (string): Video title (default: "Trending on Reddit")
- `description` (string): Video description (default: "A video about trending content on Reddit")
- `tags` (array): Array of tags (default: ["reddit", "trending"])

#### Response (Success):
```json
{
  "videoId": "dQw4w9WgXcQ",
  "youtubeUrl": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "Amazing Octopus Facts You Never Knew!",
  "description": "Learn fascinating facts about octopuses..."
}
```

#### Response (Not Authenticated):
```json
{
  "error": "Not authenticated with YouTube",
  "authUrl": "https://accounts.google.com/oauth/authorize?..."
}
```

## Authentication Flow

1. **Get Auth URL**: Call `/auth/url` to get Google OAuth URL
2. **User Authorization**: Direct user to the URL to authorize the application
3. **Callback**: Google redirects to `/auth/callback` with authorization code
4. **Token Storage**: Service automatically stores refresh tokens for future use

## Running the Service

```bash
cd services/youtube-uploader
npm install
npm start
```

## Environment Variables

- `YOUTUBE_SERVICE_PORT`: Port to run the service on (default: 3005)
- `YOUTUBE_CLIENT_ID`: Google OAuth2 client ID (required)
- `YOUTUBE_CLIENT_SECRET`: Google OAuth2 client secret (required)
- `YOUTUBE_REDIRECT_URI`: OAuth2 redirect URI (required)

## Setup Google API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable YouTube Data API v3
4. Create OAuth2 credentials
5. Add your redirect URI (e.g., `http://localhost:3005/auth/callback`)
6. Set the environment variables

## Notes

- Videos are uploaded as private by default
- The service stores authentication tokens locally in `credentials.json`
- Upload progress is logged to console
- Videos are categorized as "People & Blogs" (category ID: 22)
- Requires YouTube API quota for uploads