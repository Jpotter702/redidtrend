# Script Generator Service

This microservice generates video scripts from Reddit trend data using OpenAI.

## Configuration

**Port:** `3002` (configurable via `SCRIPT_SERVICE_PORT` env variable)

## API Endpoints

### Health Check
```bash
curl http://localhost:3002/health
```

### Get Available Script Styles
```bash
curl http://localhost:3002/styles
```

#### Response:
```json
{
  "styles": ["podcast", "storytelling", "educational", "humorous", "newscast"]
}
```

### Generate Script
```bash
curl -X POST http://localhost:3002/generate \
  -H "Content-Type: application/json" \
  -d '{
    "trendData": {
      "trends": [
        {
          "id": "abc123",
          "subreddit": "todayilearned",
          "title": "TIL that octopuses have three hearts",
          "content": "Two pump blood to the gills...",
          "permalink": "/r/todayilearned/comments/abc123/",
          "score": 5000,
          "numComments": 150
        }
      ]
    },
    "style": "educational"
  }'
```

#### Parameters:
- `trendData` (object): Response from reddit-trends service containing trend data
- `style` (string): Script style - "podcast", "storytelling", "educational", "humorous", "newscast" (default: "podcast")

#### Response:
```json
{
  "title": "Amazing Octopus Facts You Never Knew!",
  "description": "Learn fascinating facts about octopuses and their unique biology",
  "tags": ["octopus", "marine biology", "educational", "facts", "animals"],
  "script": "HOST: Did you know that octopuses have not one, not two, but THREE hearts? That's right...",
  "sourceTrend": {
    "id": "abc123",
    "subreddit": "todayilearned",
    "title": "TIL that octopuses have three hearts",
    "url": "/r/todayilearned/comments/abc123/"
  }
}
```

## Running the Service

```bash
cd services/script-generator
npm install
npm start
```

## Environment Variables

- `SCRIPT_SERVICE_PORT`: Port to run the service on (default: 3002)
- `OPENAI_API_KEY`: Your OpenAI API key (required)