#!/bin/bash

# Exit on error
set -e

# Check if instance info exists
if [ ! -f aws/instance-info.txt ]; then
    echo "Error: Instance information not found. Please run setup.sh first."
    exit 1
fi

# Read instance information
PUBLIC_IP=$(grep "Public IP:" aws/instance-info.txt | cut -d' ' -f3)
KEY_NAME=$(grep "Key Name:" aws/instance-info.txt | cut -d' ' -f3)

# Create deployment package
echo "Creating deployment package..."
tar -czf deploy.tar.gz \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    .

# Copy files to instance
echo "Copying files to instance..."
scp -i $KEY_NAME.pem deploy.tar.gz ubuntu@$PUBLIC_IP:~/
scp -i $KEY_NAME.pem .env ubuntu@$PUBLIC_IP:~/

# Execute setup commands on instance
echo "Setting up instance..."
ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP << 'EOF'
    # Install Docker and Docker Compose
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose

    # Add user to docker group
    sudo usermod -aG docker $USER

    # Extract deployment package
    tar -xzf deploy.tar.gz
    rm deploy.tar.gz

    # Start services
    docker-compose up -d

    # Show logs
    docker-compose logs -f
EOF

echo "Deployment completed successfully!" 