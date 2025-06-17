#!/bin/bash

# Exit on error
set -e

# Configuration
APP_DIR="/opt/video-service/app"
BACKUP_DIR="/opt/video-service/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
echo "Creating backup..."
mkdir -p "$BACKUP_DIR"
if [ -d "$APP_DIR" ]; then
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$APP_DIR" .
fi

# Clean application directory
echo "Cleaning application directory..."
rm -rf "$APP_DIR"/*

# Copy new files
echo "Copying new files..."
cp -r ./* "$APP_DIR/"

# Install dependencies
echo "Installing dependencies..."
cd "$APP_DIR"
npm install --production

# Restart service
echo "Restarting service..."
pm2 reload video-service

# Cleanup old backups (keep last 5)
echo "Cleaning up old backups..."
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +6 | xargs -r rm

echo "Deployment completed successfully!" 