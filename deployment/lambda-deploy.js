// AWS Lambda deployment scripts
const AWS = require('aws-sdk');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const lambda = new AWS.Lambda();
const apigateway = new AWS.APIGateway();
const iam = new AWS.IAM();

class LambdaDeployment {
  constructor(config) {
    this.config = config;
    this.functionNames = Object.keys(config.services);
  }

  async deployAll() {
    console.log('Starting Lambda deployment...');
    
    // Create IAM role for Lambda functions
    await this.createLambdaRole();
    
    // Deploy each service as Lambda function
    for (const serviceName of this.functionNames) {
      await this.deployService(serviceName);
    }
    
    // Create API Gateway
    await this.createApiGateway();
    
    console.log('Lambda deployment complete!');
  }

  async createLambdaRole() {
    const roleName = 'RedditTrendLambdaRole';
    
    const assumeRolePolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: 'lambda.amazonaws.com' },
          Action: 'sts:AssumeRole'
        }
      ]
    };

    try {
      await iam.createRole({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
        Description: 'Role for Reddit Trend Lambda functions'
      }).promise();

      // Attach basic execution policy
      await iam.attachRolePolicy({
        RoleName: roleName,
        PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
      }).promise();

      // Attach S3 and DynamoDB policies
      await iam.attachRolePolicy({
        RoleName: roleName,
        PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess'
      }).promise();

      console.log(`Created IAM role: ${roleName}`);
    } catch (error) {
      if (error.code !== 'EntityAlreadyExists') {
        throw error;
      }
      console.log(`IAM role ${roleName} already exists`);
    }
  }

  async deployService(serviceName) {
    const functionName = `reddit-trend-${serviceName}`;
    const zipBuffer = await this.createDeploymentPackage(serviceName);
    
    const params = {
      FunctionName: functionName,
      Runtime: 'nodejs18.x',
      Role: `arn:aws:iam::${await this.getAccountId()}:role/RedditTrendLambdaRole`,
      Handler: 'lambda-handler.handler',
      Code: { ZipFile: zipBuffer },
      Description: `Reddit Trend ${serviceName} service`,
      Timeout: 300,
      MemorySize: 1024,
      Environment: {
        Variables: {
          NODE_ENV: 'production',
          AWS_REGION: process.env.AWS_REGION || 'us-east-1'
        }
      }
    };

    try {
      await lambda.createFunction(params).promise();
      console.log(`Created Lambda function: ${functionName}`);
    } catch (error) {
      if (error.code === 'ResourceConflictException') {
        // Update existing function
        await lambda.updateFunctionCode({
          FunctionName: functionName,
          ZipFile: zipBuffer
        }).promise();
        console.log(`Updated Lambda function: ${functionName}`);
      } else {
        throw error;
      }
    }
  }

  async createDeploymentPackage(serviceName) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip');
      const chunks = [];

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // Add service files
      const servicePath = path.join(__dirname, '..', 'services', serviceName);
      archive.directory(servicePath, false);

      // Add Lambda handler wrapper
      const lambdaHandler = this.generateLambdaHandler(serviceName);
      archive.append(lambdaHandler, { name: 'lambda-handler.js' });

      archive.finalize();
    });
  }

  generateLambdaHandler(serviceName) {
    return `
const serverless = require('serverless-http');
const app = require('./index.js');

// Wrap Express app for Lambda
module.exports.handler = serverless(app);
`;
  }

  async createApiGateway() {
    const apiName = 'reddit-trend-api';
    
    try {
      const api = await apigateway.createRestApi({
        name: apiName,
        description: 'Reddit Trend API Gateway',
        endpointConfiguration: { types: ['REGIONAL'] }
      }).promise();

      console.log(`Created API Gateway: ${api.id}`);
      
      // Create resources and methods for each service
      for (const serviceName of this.functionNames) {
        await this.createApiResource(api.id, serviceName);
      }

      // Deploy API
      await apigateway.createDeployment({
        restApiId: api.id,
        stageName: 'prod'
      }).promise();

      console.log(`API Gateway deployed: https://${api.id}.execute-api.${process.env.AWS_REGION}.amazonaws.com/prod`);
    } catch (error) {
      console.error('Error creating API Gateway:', error);
    }
  }

  async createApiResource(apiId, serviceName) {
    // Implementation for creating API Gateway resources
    // This would create the routing for each service
    console.log(`Creating API resource for ${serviceName}`);
  }

  async getAccountId() {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    return identity.Account;
  }
}

module.exports = LambdaDeployment;