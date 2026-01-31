import { ethers } from 'ethers';
import config from '../config';

// ABIs (simplified for the functions we need)
const OracleTokenABI = [
  "function mintReward(address to, uint256 amount, string calldata reason) external",
  "function setGameContract(address _gameContract) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

const OraclePredictionsABI = [
  "function registerAgent(string calldata agentId, address wallet) external",
  "function updateAgentWallet(string calldata agentId, address newWallet) external",
  "function submitPrediction(string calldata agentId, bytes32 predictionHash, uint8 confidence) external returns (bytes32)",
  "function resolvePrediction(bytes32 predictionId, bool correct) external",
  "function getAgentStats(string calldata agentId) external view returns (address, uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getPrediction(bytes32 predictionId) external view returns (string, bytes32, uint8, uint256, bool, bool, uint256)",
];

let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let oracleToken: ethers.Contract;
let oraclePredictions: ethers.Contract;

export function initBlockchain() {
  provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
  
  if (config.blockchain.privateKey) {
    wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
  }
  
  if (config.blockchain.oracleTokenAddress) {
    oracleToken = new ethers.Contract(
      config.blockchain.oracleTokenAddress,
      OracleTokenABI,
      wallet
    );
  }
  
  if (config.blockchain.oraclePredictionsAddress) {
    oraclePredictions = new ethers.Contract(
      config.blockchain.oraclePredictionsAddress,
      OraclePredictionsABI,
      wallet
    );
  }
}

export async function registerAgentOnChain(agentId: string, walletAddress: string): Promise<string> {
  if (!oraclePredictions) throw new Error('Contracts not initialized');
  
  const tx = await oraclePredictions.registerAgent(agentId, walletAddress);
  await tx.wait();
  return tx.hash;
}

export async function submitPredictionOnChain(
  agentId: string,
  predictionText: string,
  confidence: number
): Promise<{ txHash: string; predictionId: string }> {
  if (!oraclePredictions) throw new Error('Contracts not initialized');
  
  const predictionHash = ethers.keccak256(ethers.toUtf8Bytes(predictionText));
  const tx = await oraclePredictions.submitPrediction(agentId, predictionHash, confidence);
  const receipt = await tx.wait();
  
  // Extract prediction ID from event logs
  const event = receipt.logs.find((log: any) => {
    try {
      return oraclePredictions.interface.parseLog(log)?.name === 'PredictionSubmitted';
    } catch {
      return false;
    }
  });
  
  const predictionId = event 
    ? oraclePredictions.interface.parseLog(event)?.args[0] 
    : predictionHash;
  
  return { txHash: tx.hash, predictionId };
}

export async function resolvePredictionOnChain(predictionId: string, correct: boolean): Promise<string> {
  if (!oraclePredictions) throw new Error('Contracts not initialized');
  
  const tx = await oraclePredictions.resolvePrediction(predictionId, correct);
  await tx.wait();
  return tx.hash;
}

export async function getAgentStatsOnChain(agentId: string): Promise<{
  wallet: string;
  totalPredictions: bigint;
  correctPredictions: bigint;
  accuracy: number;
  currentStreak: bigint;
  bestStreak: bigint;
  totalRewards: bigint;
}> {
  if (!oraclePredictions) throw new Error('Contracts not initialized');
  
  const stats = await oraclePredictions.getAgentStats(agentId);
  const total = stats[1];
  const correct = stats[2];
  
  return {
    wallet: stats[0],
    totalPredictions: total,
    correctPredictions: correct,
    accuracy: total > 0n ? Number((correct * 100n) / total) : 0,
    currentStreak: stats[4],
    bestStreak: stats[5],
    totalRewards: stats[6],
  };
}

export async function getTokenBalance(address: string): Promise<string> {
  if (!oracleToken) throw new Error('Contracts not initialized');
  
  const balance = await oracleToken.balanceOf(address);
  const decimals = await oracleToken.decimals();
  return ethers.formatUnits(balance, decimals);
}

export default {
  initBlockchain,
  registerAgentOnChain,
  submitPredictionOnChain,
  resolvePredictionOnChain,
  getAgentStatsOnChain,
  getTokenBalance,
};
