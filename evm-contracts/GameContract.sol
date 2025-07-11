// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";

// Simplified game contract for managing player profiles and match history
contract GameContract is Ownable {
    // Player profile structure
    struct Player {
        string gladiatorName; // Player identifier, must be lowercase, no @
        string pfpLink;      // External URL for profile picture
        uint256 lastUpdated; // Timestamp of last profile update
    }

    // Player stats structure
    struct PlayerStats {
        uint256 totalWins;
        uint256 totalLosses;
    }

    // Match structure
    struct Match {
        uint256 matchId;    // Match identifier
        string[2] players;  // Two players, must be lowercase, no @
        string matchWinner; // Match winner, must be lowercase, no @
    }

    // Storage
    mapping(string => Player) public players;          // Maps gladiatorName to Player
    mapping(string => PlayerStats) public playerStats; // Maps gladiatorName to stats
    mapping(uint256 => Match) public matches;          // Maps matchId to Match
    mapping(string => bool) public isPlayer;           // Tracks player existence
    uint256 public matchCount;                        // Tracks total matches

    // Constructor: Set deployer as owner
    constructor() Ownable(msg.sender) {}

    // Update a player's profile (owner only)
    function updatePlayerProfile(
        string memory gladiatorName,
        string memory pfpLink
    ) external onlyOwner {
        require(bytes(gladiatorName).length > 0, "Gladiator name cannot be empty");
        require(bytes(pfpLink).length > 0, "PFP link cannot be empty");

        if (!isPlayer[gladiatorName]) {
            isPlayer[gladiatorName] = true;
        }

        players[gladiatorName] = Player({
            gladiatorName: gladiatorName,
            pfpLink: pfpLink,
            lastUpdated: block.timestamp
        });
    }

    // Add a new match (owner only)
    function addMatch(
        string[2] memory matchPlayerNames,
        string memory matchWinner
    ) external onlyOwner {
        require(
            bytes(matchPlayerNames[0]).length > 0 &&
            bytes(matchPlayerNames[1]).length > 0,
            "Player names cannot be empty"
        );
        require(
            keccak256(bytes(matchPlayerNames[0])) != keccak256(bytes(matchPlayerNames[1])),
            "Players must be different"
        );
        require(
            keccak256(bytes(matchWinner)) == keccak256(bytes(matchPlayerNames[0])) ||
            keccak256(bytes(matchWinner)) == keccak256(bytes(matchPlayerNames[1])),
            "Match winner must be one of the players"
        );

        // Create or update player profiles
        for (uint256 i = 0; i < 2; i++) {
            string memory player = matchPlayerNames[i];
            if (!isPlayer[player]) {
                players[player] = Player({
                    gladiatorName: player,
                    pfpLink: "",
                    lastUpdated: block.timestamp
                });
                isPlayer[player] = true;
            }
            if (keccak256(bytes(player)) == keccak256(bytes(matchWinner))) {
                playerStats[player].totalWins++;
            } else {
                playerStats[player].totalLosses++;
            }
        }

        // Store match
        matches[matchCount] = Match({
            matchId: matchCount,
            players: matchPlayerNames,
            matchWinner: matchWinner
        });
        matchCount++;
    }

    // Get a player's profile (public)
    function getPlayerProfile(string memory gladiatorName)
        external
        view
        returns (string memory, string memory, uint256)
    {
        Player memory player = players[gladiatorName];
        string memory pfpLink = bytes(player.pfpLink).length > 0 ? player.pfpLink : "None";
        return (player.gladiatorName, pfpLink, player.lastUpdated);
    }

    // Get a match by ID (public)
    function getMatch(uint256 matchId) external view returns (Match memory) {
        require(matchId < matchCount, "Match does not exist");
        return matches[matchId];
    }

    // Get a player's stats: wins, losses, and total matches (public)
    function getPlayerStats(string memory gladiatorName)
        external
        view
        returns (uint256 totalWins, uint256 totalLosses, uint256 totalMatches)
    {
        PlayerStats memory stats = playerStats[gladiatorName];
        totalWins = stats.totalWins;
        totalLosses = stats.totalLosses;
        totalMatches = totalWins + totalLosses;
    }

    // Get recent matches (public)
    function getRecentMatches(uint256 n) external view returns (Match[] memory) {
        uint256 count = n < matchCount ? n : matchCount;
        Match[] memory result = new Match[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = matches[matchCount - count + i];
        }
        return result;
    }
}