// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OracleToken (ORT)
 * @dev ERC20 token for Oracle Challenge rewards
 * Minted to accurate prediction makers
 */
contract OracleToken is ERC20, Ownable {
    address public gameContract;
    
    event GameContractUpdated(address indexed oldContract, address indexed newContract);
    event RewardMinted(address indexed to, uint256 amount, string reason);
    
    constructor(uint256 initialSupply) ERC20("Oracle Token", "ORT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10**decimals());
    }
    
    /**
     * @dev Set the game contract address that can mint rewards
     */
    function setGameContract(address _gameContract) external onlyOwner {
        address oldContract = gameContract;
        gameContract = _gameContract;
        emit GameContractUpdated(oldContract, _gameContract);
    }
    
    /**
     * @dev Mint reward tokens to a user (only callable by game contract)
     */
    function mintReward(address to, uint256 amount, string calldata reason) external {
        require(msg.sender == gameContract || msg.sender == owner(), "Not authorized");
        _mint(to, amount);
        emit RewardMinted(to, amount, reason);
    }
    
    /**
     * @dev Returns the number of decimals (18 standard)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
