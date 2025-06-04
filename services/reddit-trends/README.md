# Reddit Trends Service

This microservice fetches trending posts from Reddit for content generation.

## Configuration

**Port:** `3001` (configurable via `REDDIT_SERVICE_PORT` env variable)

## API Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Get Trending Posts
```bash
curl -X POST http://localhost:3001/trends \
  -H "Content-Type: application/json" \
  -d '{
    "subreddits": ["all", "AskReddit", "todayilearned"],
    "dateRange": {"from": null, "to": null},
    "searchType": "hot",
    "customPrompt": "technology"
  }'
```

#### Parameters:
- `subreddits` (array): List of subreddits to search (default: ["all"])
- `dateRange` (object): Date range filter with `from` and `to` properties
- `searchType` (string): Type of posts to fetch - "hot", "top", "new", "rising" (default: "hot")
- `customPrompt` (string): Optional keyword filter for posts

#### Response:
```json
{
  "trends": [
    {
      "id": "post_id",
      "subreddit": "all",
      "title": "Post title",
      "content": "Post content",
      "url": "external_url",
      "permalink": "https://reddit.com/r/all/...",
      "author": "username",
      "created": 1234567890,
      "score": 1500,
      "upvoteRatio": 0.95,
      "numComments": 250,
      "isVideo": false,
      "mediaUrl": null,
      "imageUrl": "thumbnail_url"
    }
  ],
  "source": {
    "subreddits": ["all"],
    "dateRange": {"from": null, "to": null},
    "searchType": "hot"
  }
}
```

## Running the Service

```bash
cd services/reddit-trends
npm install
npm start
```

## Environment Variables

- `REDDIT_SERVICE_PORT`: Port to run the service on (default: 3001)