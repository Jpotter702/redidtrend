#!/bin/bash

# Exit on error
set -e

# Configuration
INSTANCE_TYPE="g4dn.xlarge"  # GPU instance
AMI_ID="ami-0c7217cdde317cfec"  # Ubuntu 22.04 LTS
KEY_NAME="redidtrend-key"
SECURITY_GROUP_NAME="redidtrend-sg"
VOLUME_SIZE=100  # GB
KEY_DIR="aws/keys"

# Create key pair
echo "Creating key pair..."
aws ec2 create-key-pair \
    --key-name $KEY_NAME \
    --query 'KeyMaterial' \
    --output text > "$KEY_DIR/$KEY_NAME.pem"
chmod 400 "$KEY_DIR/$KEY_NAME.pem"

# Create security group
echo "Creating security group..."
GROUP_ID=$(aws ec2 create-security-group \
    --group-name $SECURITY_GROUP_NAME \
    --description "Security group for RedidTrend video generation" \
    --query 'GroupId' \
    --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress \
    --group-id $GROUP_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $GROUP_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $GROUP_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Launch EC2 instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $GROUP_ID \
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=$VOLUME_SIZE}" \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=redidtrend-video}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

# Wait for instance to be running
echo "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Instance launched successfully!"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "SSH command: ssh -i $KEY_DIR/$KEY_NAME.pem ubuntu@$PUBLIC_IP"

# Save instance information
echo "Saving instance information..."
cat > aws/instance-info.txt << EOF
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Security Group ID: $GROUP_ID
Key Name: $KEY_NAME
EOF 