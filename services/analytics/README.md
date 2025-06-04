# Analytics Service

This microservice tracks YouTube video performance metrics and analytics.

## Configuration

**Port:** `3006` (configurable via `ANALYTICS_SERVICE_PORT` env variable)

## API Endpoints

### Health Check
```bash
curl http://localhost:3006/health
```

### Start Tracking a Video
```bash
curl -X POST http://localhost:3006/track \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ",
    "title": "Amazing Octopus Facts",
    "description": "Educational video about octopuses",
    "source": "reddit",
    "sourceData": {
      "subreddit": "todayilearned",
      "postId": "abc123",
      "originalTitle": "TIL octopuses have three hearts"
    }
  }'
```

#### Parameters:
- `videoId` (string): YouTube video ID (required)
- `title` (string): Video title (optional)
- `description` (string): Video description (optional)
- `source` (string): Source type - "reddit", "manual", "other" (default: "reddit")
- `sourceData` (object): Additional source information (optional)

#### Response:
```json
{
  "message": "Video tracking started",
  "video": {
    "_id": "...",
    "videoId": "dQw4w9WgXcQ",
    "title": "Amazing Octopus Facts",
    "uploadDate": "2023-10-15T10:30:00.000Z",
    "source": {
      "type": "reddit",
      "sourceData": {
        "subreddit": "todayilearned",
        "postId": "abc123"
      }
    },
    "metrics": []
  }
}
```

### Get All Tracked Videos
```bash
curl http://localhost:3006/videos
```

#### Response:
```json
{
  "videos": [
    {
      "_id": "...",
      "videoId": "dQw4w9WgXcQ",
      "title": "Amazing Octopus Facts",
      "uploadDate": "2023-10-15T10:30:00.000Z",
      "metrics": [
        {
          "date": "2023-10-15T16:30:00.000Z",
          "views": 1250,
          "likes": 45,
          "comments": 12,
          "estimatedRevenue": 2.35,
          "watchTimeHours": 8.5
        }
      ]
    }
  ]
}
```

### Get Specific Video Analytics
```bash
curl http://localhost:3006/videos/dQw4w9WgXcQ
```

#### Response:
```json
{
  "video": {
    "_id": "...",
    "videoId": "dQw4w9WgXcQ",
    "title": "Amazing Octopus Facts",
    "metrics": [
      {
        "date": "2023-10-15T10:30:00.000Z",
        "views": 1000,
        "likes": 40,
        "comments": 8,
        "estimatedRevenue": 1.85,
        "watchTimeHours": 6.2
      },
      {
        "date": "2023-10-15T16:30:00.000Z",
        "views": 1250,
        "likes": 45,
        "comments": 12,
        "estimatedRevenue": 2.35,
        "watchTimeHours": 8.5
      }
    ]
  }
}
```

### Manually Update Video Metrics
```bash
curl -X POST http://localhost:3006/videos/dQw4w9WgXcQ/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "views": 1500,
    "likes": 50,
    "comments": 15,
    "estimatedRevenue": 3.25,
    "watchTimeHours": 12.5
  }'
```

#### Parameters (all optional):
- `views` (number): Total view count
- `likes` (number): Total like count
- `comments` (number): Total comment count
- `estimatedRevenue` (number): Estimated revenue in USD
- `watchTimeHours` (number): Total watch time in hours

## Automated Metrics Collection

The service automatically collects metrics from YouTube every 6 hours for all tracked videos. This requires:

1. YouTube API authentication (same as youtube-uploader service)
2. YouTube Partner Program access for revenue data
3. Valid YouTube credentials stored in `../youtube-uploader/credentials.json`

## Running the Service

```bash
cd services/analytics
npm install
npm start
```

## Environment Variables

- `ANALYTICS_SERVICE_PORT`: Port to run the service on (default: 3006)
- `MONGO_URI`: MongoDB connection string (default: mongodb://localhost:27017/reditrend-analytics)
- `YOUTUBE_CLIENT_ID`: Google OAuth2 client ID (for YouTube API)
- `YOUTUBE_CLIENT_SECRET`: Google OAuth2 client secret (for YouTube API)
- `YOUTUBE_REDIRECT_URI`: OAuth2 redirect URI (for YouTube API)

## Database Schema

The service uses MongoDB to store video tracking data:

```javascript
{
  videoId: "dQw4w9WgXcQ",
  title: "Video Title",
  description: "Video Description",
  uploadDate: Date,
  source: {
    type: "reddit|manual|other",
    sourceData: {} // Additional source info
  },
  metrics: [
    {
      date: Date,
      views: Number,
      likes: Number,
      comments: Number,
      estimatedRevenue: Number,
      watchTimeHours: Number
    }
  ]
}
```

## Notes

- Metrics are collected automatically every 6 hours
- Revenue data requires YouTube Partner Program access
- All metrics are stored with timestamps for historical tracking
- Duplicate video tracking is prevented
- MongoDB must be running and accessible