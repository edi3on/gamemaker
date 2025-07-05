# Saga GameMaker Smart Contract

## Overview

The `MatchHistory` smart contract is a Solidity contract deployed on the Saga blockchain that manages and stores game match data for the GameMaker platform. It serves as the primary data store for all match-related information including player details, match outcomes, and AI prompts used during gameplay.

## Purpose

This contract provides a **decentralized, immutable record** of all game matches played on the GameMaker platform. It ensures:

- **Transparency**: All match data is publicly verifiable on the blockchain
- **Immutability**: Once recorded, match data cannot be altered or deleted
- **Accessibility**: Match history is available to anyone on the Saga network
- **Data Integrity**: Cryptographic guarantees that match data is authentic

## Core Functionality

### Match Storage
The contract stores comprehensive match information including:
- **Match ID**: Unique identifier for each match
- **Player Information**: Names and user IDs for both challenger and opponent
- **Match Results**: Winner of each match
- **AI Context**: The AI prompt used during the match for context

### Key Functions

#### `addMatch()`
- **Purpose**: Records a new match in the blockchain
- **Access**: Owner-only function for security
- **Data**: Stores challenger, opponent, winner, and AI prompt
- **Validation**: Ensures required fields are provided

#### `getRecentMatches(uint256 n)`
- **Purpose**: Retrieves the most recent matches
- **Returns**: Array of match data, most recent first
- **Use Case**: For displaying recent match history on frontend

#### `getMatch(uint256 matchId)`
- **Purpose**: Gets a specific match by its ID
- **Returns**: Complete match data structure
- **Use Case**: For detailed match information display

#### `getPlayerHistory(string playerName)`
- **Purpose**: Retrieves all matches for a specific player
- **Returns**: Player's user ID, opponents, winners, and match IDs
- **Use Case**: For player profile pages and statistics

## Data Structure

```solidity
struct Match {
    uint256 matchId;          // Unique match identifier
    string challengerName;    // Challenger's display name
    string challengerUserId;  // Challenger's unique user ID
    string opponentName;      // Opponent's display name
    string opponentUserId;    // Opponent's unique user ID
    string matchWinner;       // Winner of the match
    string aiPrompt;          // AI prompt used in the match
}
```

## Events

### `MatchAdded`
Emitted when a new match is recorded, containing all match details for:
- **Frontend Updates**: Real-time UI updates when new matches are added
- **Indexing**: External services can listen for new matches
- **Analytics**: Track match creation patterns

## Security Features

- **Owner-Only Access**: Only the contract owner can add matches
- **Input Validation**: Ensures required fields are provided
- **Bounds Checking**: Prevents access to non-existent matches
- **OpenZeppelin Integration**: Uses battle-tested Ownable pattern

## Integration Points

### Backend Integration
- The `saga-flow-server.js` service monitors this contract for new matches
- Automatically syncs new match data to other blockchain networks
- Provides real-time data for the GameMaker platform

### Frontend Integration
- Match history display on leaderboards
- Player profile pages with match statistics
- Real-time match updates via event listening

## Gas Optimization

- **Efficient Storage**: Uses mappings for O(1) lookups
- **Batch Operations**: `getRecentMatches` returns multiple matches in one call
- **Minimal State Changes**: Only stores essential match data

## Use Cases

1. **Leaderboards**: Display recent matches and winners
2. **Player Profiles**: Show individual player match history
3. **Analytics**: Track game patterns and player performance
4. **Cross-Chain Sync**: Source of truth for other blockchain networks
5. **Verification**: Prove match authenticity and results

## Contract Address

The contract is deployed on the Saga blockchain and serves as the authoritative source for all GameMaker match data. All other blockchain networks (Flow, Ronin) reference this contract as the primary data source.
