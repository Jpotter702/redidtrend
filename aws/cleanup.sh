#!/bin/bash

# Exit on error
set -e

# Check if instance info exists
if [ ! -f aws/instance-info.txt ]; then
    echo "Error: Instance information not found. Please run setup.sh first."
    exit 1
fi

# Read instance information
INSTANCE_ID=$(grep "Instance ID:" aws/instance-info.txt | cut -d' ' -f3)
GROUP_ID=$(grep "Security Group ID:" aws/instance-info.txt | cut -d' ' -f3)
KEY_NAME=$(grep "Key Name:" aws/instance-info.txt | cut -d' ' -f3)

# Terminate EC2 instance
echo "Terminating EC2 instance..."
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# Wait for instance to be terminated
echo "Waiting for instance to be terminated..."
aws ec2 wait instance-terminated --instance-ids $INSTANCE_ID

# Delete security group
echo "Deleting security group..."
aws ec2 delete-security-group --group-id $GROUP_ID

# Delete key pair
echo "Deleting key pair..."
aws ec2 delete-key-pair --key-name $KEY_NAME
rm -f $KEY_NAME.pem

# Remove instance info file
rm -f aws/instance-info.txt

echo "Cleanup completed successfully!" 