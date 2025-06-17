#!/bin/bash

# Exit on error
set -e

# Update system
echo "Updating system..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
echo "Installing FFmpeg..."
sudo apt-get install -y ffmpeg

# Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# Install AWS CLI
echo "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /opt/video-service/{app,config,logs,temp,scripts}

# Set up Nginx configuration
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/video-service << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:3004/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/video-service /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Configure PM2
echo "Configuring PM2..."
sudo tee /opt/video-service/config/pm2.json << EOF
{
  "apps": [{
    "name": "video-service",
    "script": "index.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "VIDEO_SERVICE_PORT": "3004"
    },
    "log_date_format": "YYYY-MM-DD HH:mm:ss",
    "error_file": "/opt/video-service/logs/error.log",
    "out_file": "/opt/video-service/logs/output.log",
    "merge_logs": true,
    "max_memory_restart": "1G"
  }]
}
EOF

# Set up log rotation
echo "Configuring log rotation..."
sudo tee /etc/logrotate.d/video-service << EOF
/opt/video-service/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Set up systemd service for PM2
echo "Configuring PM2 systemd service..."
sudo tee /etc/systemd/system/pm2.service << EOF
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=ubuntu
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
Environment=PM2_HOME=/home/ubuntu/.pm2
PIDFile=/home/ubuntu/.pm2/pm2.pid
Restart=on-failure

ExecStart=/usr/local/bin/pm2 start /opt/video-service/config/pm2.json
ExecReload=/usr/local/bin/pm2 reload all
ExecStop=/usr/local/bin/pm2 stop all

[Install]
WantedBy=multi-user.target
EOF

# Set up cleanup cron job
echo "Setting up cleanup cron job..."
sudo tee /etc/cron.d/video-service-cleanup << EOF
0 0 * * * ubuntu find /opt/video-service/temp -type f -mtime +1 -delete
EOF

# Set permissions
echo "Setting permissions..."
sudo chown -R ubuntu:ubuntu /opt/video-service

# Start services
echo "Starting services..."
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl enable pm2
sudo systemctl start pm2

# Install application dependencies
echo "Installing application dependencies..."
cd /opt/video-service/app
npm install

echo "Setup completed successfully!" 