// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./OracleToken.sol";

/**
 * @title OraclePredictions
 * @dev On-chain registry for predictions and rewards
 */
contract OraclePredictions is Ownable {
    OracleToken public oracleToken;
    
    struct Prediction {
        string agentId;         // Moltbook agent ID
        bytes32 predictionHash; // Hash of prediction details
        uint8 confidence;       // 1-10 confidence level
        uint256 timestamp;
        bool resolved;
        bool correct;
        uint256 reward;
    }
    
    struct AgentStats {
        address walletAddress;
        uint256 totalPredictions;
        uint256 correctPredictions;
        uint256 currentStreak;
        uint256 bestStreak;
        uint256 totalRewardsEarned;
    }
    
    // Mappings
    mapping(bytes32 => Prediction) public predictions;
    mapping(string => AgentStats) public agentStats;
    mapping(string => bool) public agentRegistered;
    
    // Events
    event AgentRegistered(string indexed agentId, address wallet);
    event PredictionSubmitted(bytes32 indexed predictionId, string agentId, uint8 confidence);
    event PredictionResolved(bytes32 indexed predictionId, bool correct, uint256 reward);
    event RewardClaimed(string indexed agentId, uint256 amount);
    
    // Game constants
    uint256 public constant BASE_REWARD = 100 * 10**18; // 100 ORT
    uint256 public constant MAX_STREAK_BONUS = 20; // 2x max (represented as 20/10)
    
    constructor(address _oracleToken) Ownable(msg.sender) {
        oracleToken = OracleToken(_oracleToken);
    }
    
    /**
     * @dev Register an agent with their wallet address
     */
    function registerAgent(string calldata agentId, address wallet) external onlyOwner {
        require(!agentRegistered[agentId], "Agent already registered");
        agentRegistered[agentId] = true;
        agentStats[agentId].walletAddress = wallet;
        emit AgentRegistered(agentId, wallet);
    }
    
    /**
     * @dev Update agent wallet address
     */
    function updateAgentWallet(string calldata agentId, address newWallet) external onlyOwner {
        require(agentRegistered[agentId], "Agent not registered");
        agentStats[agentId].walletAddress = newWallet;
    }
    
    /**
     * @dev Submit a prediction (called by game server)
     */
    function submitPrediction(
        string calldata agentId,
        bytes32 predictionHash,
        uint8 confidence
    ) external onlyOwner returns (bytes32 predictionId) {
        require(agentRegistered[agentId], "Agent not registered");
        require(confidence >= 1 && confidence <= 10, "Confidence must be 1-10");
        
        predictionId = keccak256(abi.encodePacked(agentId, predictionHash, block.timestamp));
        
        predictions[predictionId] = Prediction({
            agentId: agentId,
            predictionHash: predictionHash,
            confidence: confidence,
            timestamp: block.timestamp,
            resolved: false,
            correct: false,
            reward: 0
        });
        
        agentStats[agentId].totalPredictions++;
        
        emit PredictionSubmitted(predictionId, agentId, confidence);
        return predictionId;
    }
    
    /**
     * @dev Resolve a prediction and distribute rewards
     */
    function resolvePrediction(bytes32 predictionId, bool correct) external onlyOwner {
        Prediction storage pred = predictions[predictionId];
        require(!pred.resolved, "Already resolved");
        require(bytes(pred.agentId).length > 0, "Prediction not found");
        
        pred.resolved = true;
        pred.correct = correct;
        
        AgentStats storage stats = agentStats[pred.agentId];
        
        if (correct) {
            stats.correctPredictions++;
            stats.currentStreak++;
            
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
            
            // Calculate reward
            uint256 confidenceMultiplier = pred.confidence * 10; // /50 to get actual multiplier
            uint256 streakBonus = 10 + stats.currentStreak; // 10 = 1x, capped at 20 = 2x
            if (streakBonus > MAX_STREAK_BONUS) {
                streakBonus = MAX_STREAK_BONUS;
            }
            
            // reward = base * (confidence/5) * (1 + streak*0.1)
            uint256 reward = (BASE_REWARD * confidenceMultiplier * streakBonus) / 500;
            pred.reward = reward;
            stats.totalRewardsEarned += reward;
            
            // Mint tokens to agent's wallet
            if (stats.walletAddress != address(0)) {
                oracleToken.mintReward(stats.walletAddress, reward, pred.agentId);
            }
            
            emit PredictionResolved(predictionId, true, reward);
        } else {
            stats.currentStreak = 0; // Reset streak
            emit PredictionResolved(predictionId, false, 0);
        }
    }
    
    /**
     * @dev Get agent statistics
     */
    function getAgentStats(string calldata agentId) external view returns (
        address wallet,
        uint256 totalPredictions,
        uint256 correctPredictions,
        uint256 accuracy,
        uint256 currentStreak,
        uint256 bestStreak,
        uint256 totalRewards
    ) {
        AgentStats storage stats = agentStats[agentId];
        wallet = stats.walletAddress;
        totalPredictions = stats.totalPredictions;
        correctPredictions = stats.correctPredictions;
        accuracy = totalPredictions > 0 ? (correctPredictions * 100) / totalPredictions : 0;
        currentStreak = stats.currentStreak;
        bestStreak = stats.bestStreak;
        totalRewards = stats.totalRewardsEarned;
    }
    
    /**
     * @dev Get prediction details
     */
    function getPrediction(bytes32 predictionId) external view returns (
        string memory agentId,
        bytes32 predictionHash,
        uint8 confidence,
        uint256 timestamp,
        bool resolved,
        bool correct,
        uint256 reward
    ) {
        Prediction storage pred = predictions[predictionId];
        return (
            pred.agentId,
            pred.predictionHash,
            pred.confidence,
            pred.timestamp,
            pred.resolved,
            pred.correct,
            pred.reward
        );
    }
}
