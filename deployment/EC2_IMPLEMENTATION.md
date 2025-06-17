# EC2 Video Generation Service Implementation Guide

## Overview

This document outlines the implementation of the video generation service on AWS EC2, designed to handle the full pipeline of video creation from Reddit trends to YouTube uploads.

## Architecture

### Components
1. **EC2 Instance**
   - Primary video processing server
   - Handles FFmpeg operations
   - Manages image generation
   - Processes video creation

2. **S3 Storage**
   - Stores generated videos
   - Caches generated images
   - Stores intermediate files
   - Handles file distribution

3. **Auto Scaling**
   - Scales based on processing load
   - Handles concurrent video generations
   - Manages resource utilization

4. **Load Balancer**
   - Distributes incoming requests
   - Handles health checks
   - Manages SSL termination

## Implementation Steps

### 1. EC2 Instance Setup

#### Instance Configuration
```json
{
  "instanceType": "t3.large",
  "vCPU": 2,
  "memory": "8 GiB",
  "storage": {
    "root": 30,
    "data": 100
  },
  "network": "Up to 5 Gbps"
}
```

#### Required Software
- Node.js 16+
- FFmpeg 4.4+
- AWS CLI
- PM2 (Process Manager)
- Nginx (Reverse Proxy)

#### Directory Structure
```
/opt/video-service/
├── app/
│   ├── index.js
│   ├── package.json
│   └── node_modules/
├── config/
│   ├── nginx.conf
│   └── pm2.json
├── logs/
├── temp/
└── scripts/
    ├── setup.sh
    └── deploy.sh
```

### 2. AWS Resources Setup

#### IAM Roles
```json
{
  "RoleName": "VideoServiceRole",
  "Policies": [
    "AmazonS3FullAccess",
    "CloudWatchLogsFullAccess",
    "EC2AutoScalingFullAccess"
  ]
}
```

#### Security Groups
```json
{
  "GroupName": "VideoServiceSG",
  "InboundRules": [
    {
      "Port": 80,
      "Source": "0.0.0.0/0"
    },
    {
      "Port": 443,
      "Source": "0.0.0.0/0"
    },
    {
      "Port": 3004,
      "Source": "VPC_CIDR"
    }
  ]
}
```

#### S3 Bucket Structure
```
s3://video-service/
├── videos/
│   ├── shorts/
│   ├── standard/
│   └── long/
├── images/
│   ├── cache/
│   └── temp/
└── audio/
    └── temp/
```

### 3. Auto Scaling Configuration

#### Launch Template
```json
{
  "minSize": 1,
  "maxSize": 3,
  "desiredCapacity": 1,
  "targetCPUUtilization": 70,
  "cooldown": 300
}
```

#### Scaling Policies
- Scale up when CPU > 70% for 5 minutes
- Scale down when CPU < 30% for 15 minutes
- Scale based on memory utilization
- Scale based on queue length

### 4. Monitoring Setup

#### CloudWatch Metrics
- CPU Utilization
- Memory Usage
- Disk Space
- Network I/O
- Request Count
- Error Rate
- Processing Time

#### Alarms
- High CPU Usage (>80%)
- Low Disk Space (<20%)
- High Error Rate (>5%)
- Processing Time (>15 minutes)

### 5. Deployment Process

#### Initial Setup
```bash
# 1. Launch EC2 instance
aws ec2 run-instances --launch-template ...

# 2. Install dependencies
./scripts/setup.sh

# 3. Configure services
sudo systemctl enable nginx
sudo systemctl enable pm2

# 4. Deploy application
./scripts/deploy.sh
```

#### Continuous Deployment
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build assets
npm run build

# 4. Restart service
pm2 restart video-service
```

### 6. Performance Optimization

#### FFmpeg Settings
```bash
# Short videos (15-60s)
ffmpeg -i input.mp4 -c:v libx264 -preset faster -crf 23 -c:a aac -b:a 128k output.mp4

# Standard videos (1-5min)
ffmpeg -i input.mp4 -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k output.mp4

# Long videos (5-15min)
ffmpeg -i input.mp4 -c:v libx264 -preset slow -crf 20 -c:a aac -b:a 256k output.mp4
```

#### Image Processing
- Use parallel processing for image generation
- Implement caching for frequently used images
- Optimize image sizes based on video format

#### Resource Management
- Implement request queuing
- Set up resource limits per request
- Clean up temporary files automatically

### 7. Error Handling

#### Retry Mechanisms
- Retry failed video processing
- Implement exponential backoff
- Handle partial failures

#### Error Logging
- Log all errors to CloudWatch
- Set up error notifications
- Track error patterns

### 8. Cost Optimization

#### Instance Management
- Use spot instances for non-critical workloads
- Implement auto-shutdown during low usage
- Use reserved instances for base capacity

#### Storage Optimization
- Implement lifecycle policies for S3
- Clean up temporary files
- Compress stored videos

## Testing

### Load Testing
```bash
# Simulate concurrent requests
ab -n 1000 -c 10 http://video-service/create

# Test video processing
./scripts/test-processing.sh
```

### Performance Testing
- Measure processing time
- Monitor resource usage
- Test auto-scaling

## Maintenance

### Regular Tasks
- Update dependencies
- Rotate logs
- Clean up temporary files
- Monitor costs

### Backup Strategy
- Backup configuration files
- Backup user data
- Implement disaster recovery

## Security

### Access Control
- Implement API authentication
- Use IAM roles
- Secure file access

### Data Protection
- Encrypt stored videos
- Secure file transfers
- Implement access logging

## Monitoring and Alerts

### Key Metrics
- Processing time
- Error rate
- Resource usage
- Cost metrics

### Alert Configuration
- Set up CloudWatch alarms
- Configure SNS notifications
- Implement on-call rotation

## Cost Estimation

### Monthly Costs (Base)
- EC2: $100-200
- S3: $50-100
- Data Transfer: $20-50
- Other Services: $30-50

### Scaling Costs
- Additional instances: $100-200 each
- Increased storage: $0.023/GB
- Additional data transfer: $0.09/GB

## Next Steps

1. Set up EC2 instance
2. Configure IAM roles and security
3. Deploy application
4. Set up monitoring
5. Test performance
6. Implement auto-scaling
7. Configure backups
8. Set up alerts

## Support and Maintenance

### Contact Information
- Technical Support: support@example.com
- Emergency Contact: oncall@example.com

### Documentation
- API Documentation
- Troubleshooting Guide
- Maintenance Procedures 