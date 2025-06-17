#!/bin/bash
set -e

# Load environment variables from root directory
source ../../.env

# Create S3 buckets
echo "Creating S3 buckets..."
aws s3api create-bucket --bucket redidtrend-videos --region us-east-1
aws s3api create-bucket --bucket redidtrend-temp --region us-east-1

# Configure bucket policies
aws s3api put-bucket-lifecycle-configuration \
    --bucket redidtrend-temp \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "DeleteOldTempFiles",
                "Status": "Enabled",
                "Expiration": {
                    "Days": 1
                }
            }
        ]
    }'

# Create IAM role and policy
echo "Creating IAM role and policy..."
aws iam create-role \
    --role-name VideoServiceRole \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ec2.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

aws iam put-role-policy \
    --role-name VideoServiceRole \
    --policy-name VideoServicePolicy \
    --policy-document file://../iam-policy.json

aws iam create-instance-profile \
    --instance-profile-name VideoServiceRole

aws iam add-role-to-instance-profile \
    --instance-profile-name VideoServiceRole \
    --role-name VideoServiceRole

# Create security group
echo "Creating security group..."
aws ec2 create-security-group \
    --group-name video-service \
    --description "Security group for video service"

aws ec2 authorize-security-group-ingress \
    --group-name video-service \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name video-service \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name video-service \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Create EC2 launch template
echo "Creating EC2 launch template..."
aws ec2 create-launch-template \
    --launch-template-name video-service-template \
    --launch-template-data file://../ec2-launch.json

# Launch EC2 instance
echo "Launching EC2 instance..."
aws ec2 run-instances \
    --launch-template LaunchTemplateName=video-service-template,Version=1 \
    --count 1

echo "Setup completed successfully!" 