# Ronin Solari Token Smart Contract

## Overview

The `SolariToken` smart contract is an ERC-20 token contract deployed on the Ronin blockchain that manages a reward token system for the GameMaker platform. It handles user profiles, unclaimed token tracking, and token distribution to players based on their game performance.

## Purpose

This contract implements a **reward and token management system** that:

- **Distributes Rewards**: Awards Solari tokens to players for their game achievements
- **Tracks User Profiles**: Maintains user data including unclaimed token balances
- **Enables Token Claims**: Allows users to claim their earned tokens to their Ethereum addresses
- **Provides Incentives**: Creates a token economy to encourage platform engagement

## Core Functionality

### Token Management
- **Token Name**: Solari (SOLI)
- **Initial Supply**: 10 million tokens with 18 decimals
- **Distribution**: All tokens initially held by the contract for controlled distribution
- **Standard**: Full ERC-20 compliance for compatibility

### User Profile System
The contract maintains user profiles with:
- **User ID**: Platform-specific user identifier
- **Unclaimed Tokens**: Number of tokens earned but not yet claimed
- **Ethereum Address**: User's wallet address for token delivery

### Key Functions

#### `updateUnclaimedTokens(string userId, uint256 amount)`
- **Purpose**: Sets the total unclaimed token balance for a user
- **Access**: Owner-only for security
- **Use Case**: Award tokens for game achievements or milestones

#### `incrementUnclaimedTokens(string userId)`
- **Purpose**: Adds 1 token to a user's unclaimed balance
- **Access**: Owner-only
- **Use Case**: Reward individual game wins or achievements

#### `updateEthAddress(string userId, address ethAddress)`
- **Purpose**: Links a user ID to their Ethereum wallet address
- **Access**: Owner-only
- **Use Case**: Enable users to claim their tokens

#### `claimTokens()`
- **Purpose**: Allows users to claim their unclaimed tokens
- **Access**: Public (any user with linked address)
- **Process**: Transfers tokens from contract to user's wallet
- **Validation**: Ensures user has unclaimed tokens and proper authorization

#### `getUserProfile(string userId)`
- **Purpose**: Retrieves user profile information
- **Returns**: User ID, unclaimed token count, and Ethereum address
- **Use Case**: Display user's token status and balance

## Data Structure

```solidity
struct UserProfile {
    string userId;           // Platform user identifier
    uint256 unclaimedTokens; // Tokens earned but not claimed
    address ethAddress;      // User's wallet address
}
```

## Events

### `ProfileUpdated`
Emitted when user profile is updated with new token balance

### `EthAddressUpdated`
Emitted when a user's Ethereum address is linked or updated

### `TokensClaimed`
Emitted when tokens are successfully claimed by a user

## Security Features

- **Owner-Only Functions**: Critical operations restricted to contract owner
- **Input Validation**: Ensures required fields are provided
- **Authorization Checks**: Users can only claim tokens for their linked address
- **Balance Verification**: Ensures contract has sufficient tokens for claims
- **OpenZeppelin Integration**: Uses battle-tested ERC-20 and Ownable patterns

## Token Economics

### Distribution Model
- **Initial Supply**: 10 million SOLI tokens
- **Controlled Release**: Tokens distributed based on game performance
- **Claim Mechanism**: Users must actively claim their earned tokens
- **Incentive Structure**: Rewards engagement and achievement

### Reward Triggers
- Game wins and achievements
- Platform milestones
- Special events or tournaments
- Community participation

## Integration Points

### Backend Integration
- Game servers can call `updateUnclaimedTokens()` to award tokens
- User management systems can link addresses via `updateEthAddress()`
- Analytics can track token distribution patterns

### Frontend Integration
- User dashboards showing unclaimed token balances
- Claim interfaces for token withdrawal
- Profile pages with token statistics

### Cross-Chain Integration
- Works with the multi-chain sync system
- Tokens earned on other chains can be reflected here
- Provides unified reward system across platforms

## Use Cases

1. **Game Rewards**: Award tokens for winning matches
2. **Achievement System**: Reward players for milestones
3. **Tournament Prizes**: Distribute tokens for competition winners
4. **Community Incentives**: Encourage platform engagement
5. **Loyalty Program**: Reward long-term users

## Gas Optimization

- **Efficient Mappings**: O(1) lookups for user profiles
- **Batch Operations**: Support for bulk token updates
- **Minimal State Changes**: Only essential data stored on-chain

## Contract Address

The contract is deployed on the Ronin blockchain and serves as the reward token system for the GameMaker platform, providing incentives and value to the gaming ecosystem.
