import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const artifactsDir = path.join(__dirname, '..', 'artifacts');

// Load contract artifacts
const OracleTokenArtifact = JSON.parse(
  fs.readFileSync(path.join(artifactsDir, 'OracleToken.json'), 'utf8')
);
const OraclePredictionsArtifact = JSON.parse(
  fs.readFileSync(path.join(artifactsDir, 'OraclePredictions.json'), 'utf8')
);

async function main() {
  console.log('\n🚀 Deploying Oracle Challenge contracts to BASE...\n');
  
  // Configuration
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const INITIAL_SUPPLY = 10_000_000; // 10M ORT
  
  if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY not set in environment');
    process.exit(1);
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('📍 Deployer address:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');
  
  if (balance === 0n) {
    console.error('❌ Wallet has no ETH for gas fees');
    process.exit(1);
  }
  
  // Deploy OracleToken
  console.log('📝 Deploying OracleToken...');
  const OracleTokenFactory = new ethers.ContractFactory(
    OracleTokenArtifact.abi,
    OracleTokenArtifact.bytecode,
    wallet
  );
  
  const oracleToken = await OracleTokenFactory.deploy(INITIAL_SUPPLY);
  await oracleToken.waitForDeployment();
  const tokenAddress = await oracleToken.getAddress();
  console.log('✅ OracleToken deployed at:', tokenAddress);
  
  // Deploy OraclePredictions
  console.log('\n📝 Deploying OraclePredictions...');
  const OraclePredictionsFactory = new ethers.ContractFactory(
    OraclePredictionsArtifact.abi,
    OraclePredictionsArtifact.bytecode,
    wallet
  );
  
  const oraclePredictions = await OraclePredictionsFactory.deploy(tokenAddress);
  await oraclePredictions.waitForDeployment();
  const predictionsAddress = await oraclePredictions.getAddress();
  console.log('✅ OraclePredictions deployed at:', predictionsAddress);
  
  // Set game contract on token
  console.log('\n🔗 Linking contracts...');
  const tokenContract = new ethers.Contract(tokenAddress, OracleTokenArtifact.abi, wallet);
  const tx = await tokenContract.setGameContract(predictionsAddress);
  await tx.wait();
  console.log('✅ Game contract set on OracleToken');
  
  // Save deployment info
  const deploymentInfo = {
    network: 'BASE Mainnet',
    deployer: wallet.address,
    oracleToken: {
      address: tokenAddress,
      symbol: 'ORT',
      name: 'Oracle Token',
      initialSupply: `${INITIAL_SUPPLY.toLocaleString()} ORT`,
    },
    oraclePredictions: {
      address: predictionsAddress,
    },
    deployedAt: new Date().toISOString(),
    explorerUrls: {
      token: `https://basescan.org/address/${tokenAddress}`,
      predictions: `https://basescan.org/address/${predictionsAddress}`,
    },
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log('Network:', deploymentInfo.network);
  console.log('OracleToken (ORT):', tokenAddress);
  console.log('OraclePredictions:', predictionsAddress);
  console.log('Initial Supply:', deploymentInfo.oracleToken.initialSupply);
  console.log('='.repeat(60));
  console.log('\n💾 Deployment info saved to deployment.json');
  
  console.log('\n📝 Add these to your .env file:');
  console.log(`ORACLE_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`ORACLE_PREDICTIONS_ADDRESS=${predictionsAddress}`);
}

main().catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});
