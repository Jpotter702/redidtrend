#!/bin/bash
set -e

# Load environment variables
source ../.env.copy

# Create S3 buckets
echo "Creating S3 buckets..."
aws s3api create-bucket --bucket redidtrend-videos --region us-east-1
aws s3api create-bucket --bucket redidtrend-temp --region us-east-1

# Configure bucket policies
aws s3api put-bucket-lifecycle-configuration \
    --bucket redidtrend-temp \
    --lifecycle-configuration file://lifecycle.json

# Create IAM role for Lambda
echo "Creating IAM role for Lambda..."
aws iam create-role \
    --role-name RedditTrendLambdaRole \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

# Attach policies to role
aws iam put-role-policy \
    --role-name RedditTrendLambdaRole \
    --policy-name RedditTrendPolicy \
    --policy-document file://../iam-policy.json

# Enable Bedrock in your account
echo "Enabling Bedrock..."
aws bedrock enable-model-access \
    --model-ids anthropic.claude-v2 amazon.titan-tts-v1

echo "Setup completed successfully!" 