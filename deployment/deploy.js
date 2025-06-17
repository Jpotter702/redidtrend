#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Main deployment script with option selection
const { deploymentOptions } = require('./config');
const LambdaDeployment = require('./lambda-deploy');
const BedrockDeployment = require('./bedrock-deploy');
const EC2Deployment = require('./ec2-deploy');

class DeploymentManager {
  constructor() {
    this.selectedOption = null;
  }

  displayOptions() {
    console.log('\n🚀 Reddit Trend Deployment Options:\n');
    
    Object.entries(deploymentOptions).forEach(([key, option], index) => {
      console.log(`${index + 1}. ${option.name}`);
      console.log(`   ${option.description}`);
      console.log(`   Services: ${Object.values(option.services).join(', ')}`);
      console.log(`   Storage: ${option.storage} | Database: ${option.database}`);
      console.log('');
    });
  }

  async selectOption() {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      readline.question('Select deployment option (1-3): ', (answer) => {
        const options = Object.keys(deploymentOptions);
        const selectedKey = options[parseInt(answer) - 1];
        
        if (selectedKey) {
          this.selectedOption = selectedKey;
          console.log(`\n✅ Selected: ${deploymentOptions[selectedKey].name}\n`);
          resolve(selectedKey);
        } else {
          console.log('❌ Invalid selection');
          resolve(this.selectOption());
        }
        readline.close();
      });
    });
  }

  async deploy() {
    if (!this.selectedOption) {
      await this.selectOption();
    }

    const config = deploymentOptions[this.selectedOption];
    let deployer;

    switch (this.selectedOption) {
      case 'lambda':
        deployer = new LambdaDeployment(config);
        break;
      case 'bedrock':
        deployer = new BedrockDeployment(config);
        break;
      case 'ec2':
        deployer = new EC2Deployment(config);
        break;
      default:
        throw new Error('Invalid deployment option');
    }

    // Validate AWS credentials
    if (!this.validateAWSCredentials()) {
      console.error('❌ AWS credentials not found. Please check your .env file.');
      process.exit(1);
    }

    console.log(`🚀 Starting ${config.name} deployment...\n`);
    
    try {
      await deployer.deployAll();
      console.log(`\n✅ ${config.name} deployment completed successfully!`);
      this.displayEndpoints();
    } catch (error) {
      console.error(`❌ Deployment failed:`, error.message);
      process.exit(1);
    }
  }

  validateAWSCredentials() {
    const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
    return requiredVars.every(varName => process.env[varName]);
  }

  displayEndpoints() {
    const config = deploymentOptions[this.selectedOption];
    
    console.log('\n📍 Service Endpoints:');
    
    switch (this.selectedOption) {
      case 'lambda':
        console.log('API Gateway: https://your-api-id.execute-api.region.amazonaws.com/prod');
        console.log('Individual functions: Check AWS Lambda console');
        break;
      case 'bedrock':
        console.log('API Gateway: https://your-api-id.execute-api.region.amazonaws.com/prod');
        console.log('Bedrock Models: Claude v2, Titan TTS');
        break;
      case 'ec2':
        console.log('Main Application: http://your-ec2-public-dns');
        console.log('Orchestrator: http://your-ec2-public-dns:3000');
        console.log('Services: http://your-ec2-public-dns:3001-3006');
        break;
    }
  }

  // Quick deploy methods for each option
  async deployLambda() {
    this.selectedOption = 'lambda';
    return this.deploy();
  }

  async deployBedrock() {
    this.selectedOption = 'bedrock';
    return this.deploy();
  }

  async deployEC2() {
    this.selectedOption = 'ec2';
    return this.deploy();
  }
}

// CLI interface
if (require.main === module) {
  const manager = new DeploymentManager();
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const option = args[0].toLowerCase();
    switch (option) {
      case 'lambda':
        manager.deployLambda();
        break;
      case 'bedrock':
        manager.deployBedrock();
        break;
      case 'ec2':
        manager.deployEC2();
        break;
      case 'list':
        manager.displayOptions();
        break;
      default:
        console.log('Usage: node deploy.js [lambda|bedrock|ec2|list]');
        process.exit(1);
    }
  } else {
    // Interactive mode
    manager.displayOptions();
    manager.deploy();
  }
}

module.exports = DeploymentManager;