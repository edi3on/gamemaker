# Flow User Sync Smart Contract

## Overview

The `FlowUserSync` smart contract is deployed on the Flow blockchain and serves as a **user profile and match synchronization system** for the GameMaker platform. It maintains user profiles, tracks match history, and syncs data from the Saga blockchain to provide a comprehensive user experience on the Flow network.

## Purpose

This contract acts as a **secondary data store and user management system** that:

- **Syncs Match Data**: Receives and stores match information from the Saga blockchain
- **Manages User Profiles**: Maintains comprehensive user profiles with social media links
- **Tracks Statistics**: Records match history, wins, and player performance
- **Supports Social Integration**: Links users to their Twitter handles and Ethereum addresses

## Core Functionality

### User Profile Management
The contract maintains detailed user profiles including:
- **User ID**: Platform-specific identifier
- **Twitter Handle**: Social media integration
- **Ethereum Address**: Wallet connection for cross-chain functionality
- **Creation Date**: When the user first appeared in the system
- **Match Statistics**: Total matches played and won

### Match Synchronization
- **Batch Processing**: Efficiently syncs multiple matches from Saga
- **Duplicate Prevention**: Ensures matches aren't counted multiple times
- **Winner Tracking**: Automatically updates win/loss statistics
- **Real-time Updates**: Processes match data as it becomes available

### Key Functions

#### `syncMatches(Match[] matches, uint256 latestMatchId)`
- **Purpose**: Syncs new matches from Saga blockchain
- **Access**: Owner-only for security
- **Process**: Updates user profiles and statistics for all players
- **Validation**: Ensures only new matches are processed

#### `updateEthereumAddress(string userId, address ethAddress)`
- **Purpose**: Links a user to their Ethereum wallet address
- **Access**: Owner-only
- **Use Case**: Enable cross-chain functionality and token claims

#### `getUserProfile(string userId)`
- **Purpose**: Retrieves complete user profile information
- **Returns**: User ID, Twitter handle, Ethereum address, creation date, match stats
- **Use Case**: Display user profiles and statistics

#### `getUserMatches(string userId)`
- **Purpose**: Gets all match IDs for a specific user
- **Returns**: Array of match IDs the user has played
- **Use Case**: Show user's complete match history

#### `getUserWins(string userId)`
- **Purpose**: Gets all match IDs the user has won
- **Returns**: Array of match IDs where user was the winner
- **Use Case**: Calculate win rate and display achievements

## Data Structures

```solidity
struct Match {
    uint256 matchId;          // Unique match identifier
    string challengerName;    // Challenger's display name
    string challengerUserId;  // Challenger's user ID
    string opponentName;      // Opponent's display name
    string opponentUserId;    // Opponent's user ID
    string matchWinner;       // Winner of the match
    string aiPrompt;          // AI prompt used in the match
}

struct UserProfile {
    string userId;            // Platform user identifier
    string twitterHandle;     // User's Twitter handle
    address ethereumAddress;  // User's wallet address
    uint256 createdAt;        // Account creation timestamp
    uint256 matchesPlayed;    // Total matches participated in
    uint256 matchesWon;       // Total matches won
}
```

## Events

### `UserUpdated`
Emitted when user profile information is updated, including:
- Profile creation
- Twitter handle changes
- Ethereum address updates
- Match statistics updates

### `MatchesSynced`
Emitted when new matches are synced from Saga, showing:
- Range of match IDs processed
- Confirmation of successful synchronization

## Security Features

- **Owner-Only Sync**: Only authorized parties can sync match data
- **Input Validation**: Ensures required fields are provided
- **Duplicate Prevention**: Prevents double-counting of matches
- **Bounds Checking**: Validates match ID ranges
- **OpenZeppelin Integration**: Uses battle-tested Ownable pattern

## Integration Points

### Backend Integration
- Receives match data from `saga-flow-server.js`
- Processes batch updates efficiently
- Maintains synchronization state with Saga

### Frontend Integration
- User profile pages with complete statistics
- Match history displays
- Social media integration (Twitter handles)
- Cross-chain wallet connections

### Cross-Chain Functionality
- Works with Saga as primary data source
- Integrates with Ronin for token rewards
- Provides unified user experience across networks

## Data Flow

1. **Saga Contract**: Records new matches
2. **Backend Service**: Monitors Saga for new matches
3. **Flow Contract**: Receives and processes match data
4. **User Profiles**: Updated with new statistics
5. **Frontend**: Displays updated information to users

## Use Cases

1. **User Profiles**: Complete player profiles with social links
2. **Match History**: Detailed match records and statistics
3. **Leaderboards**: Win rates and performance tracking
4. **Social Integration**: Twitter handle connections
5. **Cross-Chain Identity**: Unified user identity across networks
6. **Analytics**: Player performance and engagement metrics

## Gas Optimization

- **Efficient Mappings**: O(1) lookups for user data
- **Batch Operations**: Process multiple matches in single transaction
- **Minimal State Changes**: Only essential data stored on-chain
- **Duplicate Prevention**: Avoids unnecessary storage operations

##It is planned to move this into a cadence contract in the near future.
