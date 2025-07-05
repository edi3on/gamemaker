// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Solari Token contract with user profile and claim system
contract SolariToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 1e18; // 10 million tokens, 18 decimals

    struct UserProfile {
        string userId;
        uint256 unclaimedTokens;
        address ethAddress;
    }

    // userId => UserProfile
    mapping(string => UserProfile) public profiles;

    // eth address => userId (for quick lookup)
    mapping(address => string) public addressToUserId;

    event ProfileUpdated(string indexed userId, uint256 unclaimedTokens, address ethAddress);
    event EthAddressUpdated(string indexed userId, address ethAddress);
    event TokensClaimed(string indexed userId, address indexed ethAddress, uint256 amount);

    constructor(address initialOwner) ERC20("Solari", "SOLI") Ownable(initialOwner) {
        _mint(address(this), INITIAL_SUPPLY); // Contract holds all tokens initially
    }

    // Owner: update unclaimed tokens for a userId
    function updateUnclaimedTokens(string memory userId, uint256 amount) external onlyOwner {
        require(bytes(userId).length > 0, "userId required");
        profiles[userId].userId = userId;
        profiles[userId].unclaimedTokens = amount;
        emit ProfileUpdated(userId, amount, profiles[userId].ethAddress);
    }

    // Owner: update eth address for a userId
    function updateEthAddress(string memory userId, address ethAddress) external onlyOwner {
        require(bytes(userId).length > 0, "userId required");
        profiles[userId].userId = userId;
        profiles[userId].ethAddress = ethAddress;
        addressToUserId[ethAddress] = userId;
        emit EthAddressUpdated(userId, ethAddress);
    }

    // Owner: increment unclaimed tokens for a userId by 1
    function incrementUnclaimedTokens(string memory userId) external onlyOwner {
        require(bytes(userId).length > 0, "userId required");
        profiles[userId].userId = userId;
        profiles[userId].unclaimedTokens += 1;
        emit ProfileUpdated(userId, profiles[userId].unclaimedTokens, profiles[userId].ethAddress);
    }

    // Batch increment unclaimed tokens for a list of userIds (owner only)
    function batchIncrementUnclaimedTokens(string[] memory userIds) external onlyOwner {
        for (uint256 i = 0; i < userIds.length; i++) {
            string memory userId = userIds[i];
            require(bytes(userId).length > 0, "userId required");
            profiles[userId].userId = userId;
            profiles[userId].unclaimedTokens += 1;
            emit ProfileUpdated(userId, profiles[userId].unclaimedTokens, profiles[userId].ethAddress);
        }
    }

    // User: claim tokens to their eth address
    function claimTokens() external {
        string memory userId = addressToUserId[msg.sender];
        require(bytes(userId).length > 0, "No userId linked to this address");
        UserProfile storage profile = profiles[userId];
        require(profile.ethAddress == msg.sender, "Not authorized for this userId");
        uint256 amount = profile.unclaimedTokens;
        require(amount > 0, "No tokens to claim");
        uint256 tokenAmount = amount * 10 ** decimals();
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient contract balance");
        profile.unclaimedTokens = 0;
        _transfer(address(this), msg.sender, tokenAmount);
        emit TokensClaimed(userId, msg.sender, tokenAmount);
    }

    // View: get user profile by userId
    function getUserProfile(string memory userId) external view returns (
        string memory,
        uint256,
        address
    ) {
        UserProfile memory profile = profiles[userId];
        return (profile.userId, profile.unclaimedTokens, profile.ethAddress);
    }
}