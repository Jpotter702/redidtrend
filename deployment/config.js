// Deployment configuration for different AWS options
const deploymentOptions = {
  lambda: {
    name: 'AWS Lambda + API Gateway',
    description: 'Serverless deployment with pay-per-use pricing',
    services: {
      orchestrator: 'lambda',
      'reddit-trends': 'lambda',
      'script-generator': 'lambda',
      'voice-generator': 'lambda',
      'video-creator': 'lambda',
      'youtube-uploader': 'lambda',
      analytics: 'lambda'
    },
    routing: 'api-gateway',
    storage: 's3',
    database: 'dynamodb'
  },
  
  bedrock: {
    name: 'AWS Bedrock + Lambda',
    description: 'AI-powered deployment using Bedrock models',
    services: {
      orchestrator: 'lambda',
      'reddit-trends': 'lambda',
      'script-generator': 'bedrock-claude',
      'voice-generator': 'bedrock-voice',
      'video-creator': 'lambda',
      'youtube-uploader': 'lambda',
      analytics: 'lambda'
    },
    routing: 'api-gateway',
    storage: 's3',
    database: 'dynamodb'
  },
  
  ec2: {
    name: 'EC2 Instance',
    description: 'Traditional server deployment with full control',
    services: {
      orchestrator: 'ec2',
      'reddit-trends': 'ec2',
      'script-generator': 'ec2',
      'voice-generator': 'ec2',
      'video-creator': 'ec2',
      'youtube-uploader': 'ec2',
      analytics: 'ec2'
    },
    routing: 'nginx',
    storage: 'ebs',
    database: 'mongodb-ec2'
  }
};

module.exports = { deploymentOptions };