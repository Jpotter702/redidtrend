// EC2 deployment with Docker containers
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const ec2 = new AWS.EC2();
const ssm = new AWS.SSM();

class EC2Deployment {
  constructor(config) {
    this.config = config;
    this.instanceId = null;
  }

  async deployAll() {
    console.log('Starting EC2 deployment...');
    
    // Create security group
    await this.createSecurityGroup();
    
    // Launch EC2 instance
    await this.launchInstance();
    
    // Wait for instance to be running
    await this.waitForInstance();
    
    // Deploy application
    await this.deployApplication();
    
    console.log('EC2 deployment complete!');
  }

  async createSecurityGroup() {
    const groupName = 'reddit-trend-sg';
    
    try {
      const result = await ec2.createSecurityGroup({
        GroupName: groupName,
        Description: 'Security group for Reddit Trend application'
      }).promise();

      this.securityGroupId = result.GroupId;

      // Add inbound rules
      await ec2.authorizeSecurityGroupIngress({
        GroupId: this.securityGroupId,
        IpPermissions: [
          {
            IpProtocol: 'tcp',
            FromPort: 22,
            ToPort: 22,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }]
          },
          {
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }]
          },
          {
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }]
          },
          {
            IpProtocol: 'tcp',
            FromPort: 3000,
            ToPort: 3010,
            IpRanges: [{ CidrIp: '0.0.0.0/0' }]
          }
        ]
      }).promise();

      console.log(\`Created security group: \${this.securityGroupId}\`);
    } catch (error) {
      if (error.code === 'InvalidGroup.Duplicate') {
        console.log('Security group already exists');
      } else {
        throw error;
      }
    }
  }

  async launchInstance() {
    const userData = this.generateUserData();
    
    const params = {
      ImageId: 'ami-0c02fb55956c7d316', // Amazon Linux 2 AMI
      InstanceType: 't3.large',
      KeyName: 'reddit-trend-key', // You'll need to create this key pair
      SecurityGroupIds: [this.securityGroupId],
      MinCount: 1,
      MaxCount: 1,
      UserData: Buffer.from(userData).toString('base64'),
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: 'Reddit-Trend-Server' },
            { Key: 'Project', Value: 'RedditTrend' }
          ]
        }
      ]
    };

    const result = await ec2.runInstances(params).promise();
    this.instanceId = result.Instances[0].InstanceId;
    
    console.log(\`Launched EC2 instance: \${this.instanceId}\`);
  }

  generateUserData() {
    return \`#!/bin/bash
yum update -y
yum install -y docker git

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install FFmpeg
yum install -y epel-release
yum install -y ffmpeg

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/reddit-trend
cd /opt/reddit-trend

# Clone repository (you'll need to update this with your repo URL)
git clone https://github.com/yourusername/redidtrend.git .

# Create environment file
cat > .env << 'EOF'
ORCHESTRATOR_PORT=3000
REDDIT_SERVICE_PORT=3001
SCRIPT_SERVICE_PORT=3002
VOICE_SERVICE_PORT=3003
VIDEO_SERVICE_PORT=3004
YOUTUBE_SERVICE_PORT=3005
ANALYTICS_SERVICE_PORT=3006

OPENAI_API_KEY=\${process.env.OPENAI_API_KEY}
AWS_REGION=\${process.env.AWS_REGION}
AWS_ACCESS_KEY_ID=\${process.env.AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=\${process.env.AWS_SECRET_ACCESS_KEY}

YOUTUBE_CLIENT_ID=\${process.env.YOUTUBE_CLIENT_ID}
YOUTUBE_CLIENT_SECRET=\${process.env.YOUTUBE_CLIENT_SECRET}
YOUTUBE_REDIRECT_URI=http://localhost:3005/auth/callback

MONGO_URI=mongodb://localhost:27017/reditrend-analytics
EOF

# Install dependencies
npm install

# Install service dependencies
for service in services/*/; do
  if [ -d "\$service" ]; then
    cd "\$service"
    npm install
    cd ../..
  fi
done

# Create Docker Compose file
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  reddit-trends:
    build: 
      context: .
      dockerfile: services/reddit-trends/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb

  script-generator:
    build:
      context: .
      dockerfile: services/script-generator/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production

  voice-generator:
    build:
      context: .
      dockerfile: services/voice-generator/Dockerfile
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production

  video-creator:
    build:
      context: .
      dockerfile: services/video-creator/Dockerfile
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production

  youtube-uploader:
    build:
      context: .
      dockerfile: services/youtube-uploader/Dockerfile
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production

  analytics:
    build:
      context: .
      dockerfile: services/analytics/Dockerfile
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongodb

  orchestrator:
    build:
      context: .
      dockerfile: orchestrator/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - reddit-trends
      - script-generator
      - voice-generator
      - video-creator
      - youtube-uploader
      - analytics

volumes:
  mongodb_data:
EOF

# Create Dockerfiles
mkdir -p services/reddit-trends
cat > services/reddit-trends/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY services/reddit-trends/package*.json ./
RUN npm ci --only=production
COPY services/reddit-trends/ .
EXPOSE 3001
CMD ["npm", "start"]
EOF

# Create nginx config
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream orchestrator {
        server localhost:3000;
    }

    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://orchestrator;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        }

        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Start services
docker-compose up -d

# Install and start nginx
yum install -y nginx
cp nginx.conf /etc/nginx/nginx.conf
systemctl start nginx
systemctl enable nginx

# Set up log rotation
cat > /etc/logrotate.d/reddit-trend << 'EOF'
/var/log/reddit-trend/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 root root
}
EOF

echo "Reddit Trend application deployed successfully!"
\`;
  }

  async waitForInstance() {
    console.log('Waiting for instance to be running...');
    
    const params = {
      InstanceIds: [this.instanceId]
    };

    await ec2.waitFor('instanceRunning', params).promise();
    
    const result = await ec2.describeInstances(params).promise();
    const instance = result.Reservations[0].Instances[0];
    
    console.log(\`Instance is running at: \${instance.PublicDnsName}\`);
    return instance.PublicDnsName;
  }

  async deployApplication() {
    console.log('Application deployment completed via user data script');
    console.log('Services will be available at:');
    console.log('- Orchestrator: http://your-ec2-public-dns:3000');
    console.log('- Individual services: http://your-ec2-public-dns:3001-3006');
    console.log('- Nginx proxy: http://your-ec2-public-dns');
  }
}

module.exports = EC2Deployment;