// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Match history contract for managing and storing match details
contract MatchHistory is Ownable {
    // Match structure
    struct Match {
        uint256 matchId;          // Match identifier
        string challengerName;    // Challenger's name
        string challengerUserId;  // Challenger's user ID
        string opponentName;      // Opponent's name
        string opponentUserId;    // Opponent's user ID
        string matchWinner;       // Match winner
        string aiPrompt;          // AI prompt used in the match
    }

    // Mapping from matchId to Match
    mapping(uint256 => Match) public matches;
    // Array of matchIds for ordering
    uint256[] public matchIds;
    // Internal match counter
    uint256 public matchCount;

    // Event emitted when a match is added
    event MatchAdded(
        uint256 matchId,
        string challengerName,
        string challengerUserId,
        string opponentName,
        string opponentUserId,
        string matchWinner,
        string aiPrompt
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    // Add a new match (owner only)
    function addMatch(
        string memory challengerName,
        string memory challengerUserId,
        string memory opponentName,
        string memory opponentUserId,
        string memory matchWinner,
        string memory aiPrompt
    ) external onlyOwner {
        require(bytes(challengerName).length > 0, "Challenger name required");
        require(bytes(opponentName).length > 0, "Opponent name required");
        require(bytes(matchWinner).length > 0, "Winner required");

        uint256 matchId = matchCount;
        matches[matchId] = Match({
            matchId: matchId,
            challengerName: challengerName,
            challengerUserId: challengerUserId,
            opponentName: opponentName,
            opponentUserId: opponentUserId,
            matchWinner: matchWinner,
            aiPrompt: aiPrompt
        });
        matchIds.push(matchId);
        matchCount++;

        emit MatchAdded(
            matchId,
            challengerName,
            challengerUserId,
            opponentName,
            opponentUserId,
            matchWinner,
            aiPrompt
        );
    }

    // Get the last n matches (most recent first)
    function getRecentMatches(uint256 n) external view returns (Match[] memory) {
        uint256 total = matchIds.length;
        uint256 count = n < total ? n : total;
        Match[] memory result = new Match[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 idx = total - 1 - i;
            result[i] = matches[matchIds[idx]];
        }
        return result;
    }

    // Get a single match by matchId
    function getMatch(uint256 matchId) external view returns (Match memory) {
        require(matchId < matchCount, "Match does not exist");
        return matches[matchId];
    }

    // Get all matches for a player (by name)
    function getPlayerHistory(string memory playerName) external view returns (
        string memory userId,
        string[] memory opponents,
        string[] memory winners,
        uint256[] memory matchIdsOut
    ) {
        uint256 total = matchIds.length;
        uint256 count = 0;
        // First, count matches for allocation
        for (uint256 i = 0; i < total; i++) {
            Match storage m = matches[matchIds[i]];
            if (
                keccak256(bytes(m.challengerName)) == keccak256(bytes(playerName)) ||
                keccak256(bytes(m.opponentName)) == keccak256(bytes(playerName))
            ) {
                count++;
            }
        }
        opponents = new string[](count);
        winners = new string[](count);
        matchIdsOut = new uint256[](count);
        string memory foundUserId = "";
        uint256 j = 0;
        for (uint256 i = 0; i < total; i++) {
            Match storage m = matches[matchIds[i]];
            bool isChallenger = keccak256(bytes(m.challengerName)) == keccak256(bytes(playerName));
            bool isOpponent = keccak256(bytes(m.opponentName)) == keccak256(bytes(playerName));
            if (isChallenger || isOpponent) {
                opponents[j] = isChallenger ? m.opponentName : m.challengerName;
                winners[j] = m.matchWinner;
                matchIdsOut[j] = m.matchId;
                if (bytes(foundUserId).length == 0) {
                    foundUserId = isChallenger ? m.challengerUserId : m.opponentUserId;
                }
                j++;
            }
        }
        userId = foundUserId;
    }
}