# AWS Deployment Setup

This directory contains scripts for deploying the RedidTrend application to AWS EC2.

## Prerequisites

1. **AWS CLI Installation**
   ```bash
   # Download AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   
   # Install unzip if needed
   sudo apt-get install unzip
   
   # Unzip the installer
   unzip awscliv2.zip
   
   # Run the install program
   sudo ./aws/install
   
   # Verify installation
   aws --version
   ```

2. **AWS Configuration**
   ```bash
   aws configure
   ```
   You'll need to enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-east-1)
   - Default output format (press Enter for default)

## Available Scripts

1. **setup.sh**
   - Creates EC2 instance (g4dn.xlarge with GPU)
   - Sets up security group
   - Creates key pair
   - Saves instance information

2. **deploy.sh**
   - Packages application
   - Deploys to EC2 instance
   - Sets up Docker and Docker Compose
   - Starts services

3. **cleanup.sh**
   - Terminates EC2 instance
   - Removes security group
   - Deletes key pair
   - Cleans up instance information

## Usage

1. **Initial Setup**
   ```bash
   ./aws/setup.sh
   ```
   This will create the EC2 instance and save the connection details.

2. **Deploy Application**
   ```bash
   ./aws/deploy.sh
   ```
   This will deploy the application to the EC2 instance.

3. **Cleanup**
   ```bash
   ./aws/cleanup.sh
   ```
   This will remove all AWS resources created by setup.sh.

## Environment Variables

The following environment variables are required in your `.env` file:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=your_region
S3_BUCKET=your_bucket_name
VOICE_SERVICE_URL=http://voice-generator:8000
SCRIPT_SERVICE_URL=http://script-generator:8000
```

## Notes

- The EC2 instance uses a g4dn.xlarge instance type with GPU support
- The instance runs Ubuntu 22.04 LTS
- All services are containerized using Docker
- The API Gateway is exposed on port 80
- Internal services communicate on ports 8000-8002 