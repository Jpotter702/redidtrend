# Voice Generator Service

This microservice generates voice-over audio from scripts using ElevenLabs or AWS Polly.

## Configuration

**Port:** `3003` (configurable via `VOICE_SERVICE_PORT` env variable)

## API Endpoints

### Health Check
```bash
curl http://localhost:3003/health
```

### Get Available Voice Providers
```bash
curl http://localhost:3003/providers
```

#### Response:
```json
{
  "providers": [
    {"id": "elevenlabs", "name": "ElevenLabs"},
    {"id": "aws-polly", "name": "AWS Polly"}
  ]
}
```

### Get Available Voices for a Provider
```bash
curl http://localhost:3003/voices/elevenlabs
curl http://localhost:3003/voices/aws-polly
```

#### Response (ElevenLabs):
```json
{
  "voices": [
    {
      "id": "EXAVITQu4vr4xnSDxMaL",
      "name": "Bella",
      "gender": "female",
      "preview": "preview_url"
    }
  ]
}
```

#### Response (AWS Polly):
```json
{
  "voices": [
    {
      "id": "Amy",
      "name": "Amy",
      "gender": "Female",
      "language": "en-GB"
    }
  ]
}
```

### Generate Voice-Over
```bash
curl -X POST http://localhost:3003/generate \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Welcome to our amazing video about octopuses! Did you know they have three hearts?",
    "provider": "elevenlabs",
    "voiceId": "EXAVITQu4vr4xnSDxMaL"
  }'
```

#### Parameters:
- `script` (string): Text to convert to speech (required)
- `provider` (string): Voice provider - "elevenlabs" or "aws-polly" (default: "elevenlabs")
- `voiceId` (string): ID of the voice to use (optional, uses default if not provided)

#### Response:
```json
{
  "audioFile": "/path/to/generated/audio.mp3",
  "duration": 15,
  "provider": "elevenlabs",
  "voiceId": "EXAVITQu4vr4xnSDxMaL"
}
```

## Running the Service

```bash
cd services/voice-generator
npm install
npm start
```

## Environment Variables

- `VOICE_SERVICE_PORT`: Port to run the service on (default: 3003)
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key (optional)
- `AWS_ACCESS_KEY_ID`: Your AWS access key (optional)
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key (optional)
- `AWS_REGION`: AWS region (default: us-east-1)

## Notes

- At least one voice provider must be configured
- Generated audio files are saved locally in the `audio/` directory
- Duration is estimated based on word count