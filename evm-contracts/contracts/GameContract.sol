// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/AccessControl.sol";

// Game contract for managing player profiles and match history
contract GameContract is AccessControl {
    // Role identifier for admin
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Player profile structure
    struct Player {
        string gladiatorName; // Twitter handle used as identifier, stored without @, lowercase
        string pfpLink;      // External URL for profile picture
        uint256 lastUpdated; // Timestamp of last profile update
    }

    // Match structure
    struct Match {
        uint256 matchId;     // Match identifier
        string[2] players;   // Players, stored without @, lowercase
        string[5] roundWinners; // Round winners, stored without @, lowercase
        string matchWinner;  // Match winner, stored without @, lowercase
    }

    // Storage: Maps gladiatorName (lowercase) to Player
    mapping(string => Player) public players;
    mapping(uint256 => Match) public matches;
    uint256 public matchCount; // Tracks total matches
    string[] public playerNames; // Tracks all player names for iteration

    // Constructor: Set deployer as admin
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // Helper function to remove leading @ from string
    function removeAtSymbol(string memory input) internal pure returns (string memory) {
        if (bytes(input).length > 0 && bytes(input)[0] == bytes1("@")) {
            bytes memory inputBytes = bytes(input);
            bytes memory result = new bytes(inputBytes.length - 1);
            for (uint256 i = 0; i < result.length; i++) {
                result[i] = inputBytes[i + 1];
            }
            return string(result);
        }
        return input;
    }

    // Helper function to convert a string to lowercase
    function toLowerCase(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        bytes memory result = new bytes(inputBytes.length);
        for (uint256 i = 0; i < inputBytes.length; i++) {
            if (uint8(inputBytes[i]) >= 65 && uint8(inputBytes[i]) <= 90) {
                result[i] = bytes1(uint8(inputBytes[i]) + 32);
            } else {
                result[i] = inputBytes[i];
            }
        }
        return string(result);
    }

    // Helper function to clean gladiatorName: remove @ and convert to lowercase
    function cleanGladiatorName(string memory input) internal pure returns (string memory) {
        string memory noAt = removeAtSymbol(input);
        return toLowerCase(noAt);
    }

    // Helper function to check if a name exists in playerNames
    function nameExists(string memory name) internal view returns (bool) {
        for (uint256 i = 0; i < playerNames.length; i++) {
            if (keccak256(bytes(playerNames[i])) == keccak256(bytes(name))) {
                return true;
            }
        }
        return false;
    }

    // Helper function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }

    // Helper function to get current timestamp as ISO 8601 string (simplified)
    function getCurrentTimestamp() internal view returns (string memory) {
        // Simplified ISO 8601 format for Remix testing
        return string(abi.encodePacked(uint2str(block.timestamp), "000")); // Append milliseconds
    }

    // Get all players updated within the last 24 hours (public)
    function getRecentPlayers() external view returns (string memory) {
        string memory result = '{"players":[';
        bool first = true;
        for (uint256 i = 0; i < playerNames.length; i++) {
            string memory cleanedName = playerNames[i];
            Player memory player = players[cleanedName];
            if (bytes(player.gladiatorName).length > 0 && block.timestamp <= player.lastUpdated + 24 * 60 * 60) {
                if (!first) {
                    result = string(abi.encodePacked(result, ","));
                }
                first = false;
                // Inline getPlayerStats logic
                uint256 totalWins = 0;
                uint256 totalLosses = 0;
                for (uint256 j = 0; j < matchCount; j++) {
                    Match memory matchData = matches[j];
                    if (keccak256(bytes(matchData.players[0])) == keccak256(bytes(cleanedName))) {
                        if (keccak256(bytes(matchData.matchWinner)) == keccak256(bytes(cleanedName))) {
                            totalWins++;
                        } else {
                            totalLosses++;
                        }
                    } else if (keccak256(bytes(matchData.players[1])) == keccak256(bytes(cleanedName))) {
                        if (keccak256(bytes(matchData.matchWinner)) == keccak256(bytes(cleanedName))) {
                            totalWins++;
                        } else {
                            totalLosses++;
                        }
                    }
                }
                uint256 totalMatches = totalWins + totalLosses;
                // Inline getGladiatorRoundWins logic
                uint256 roundWins = 0;
                for (uint256 j = 0; j < matchCount; j++) {
                    Match memory matchData = matches[j];
                    for (uint256 k = 0; k < 5; k++) {
                        if (keccak256(bytes(matchData.roundWinners[k])) == keccak256(bytes(cleanedName))) {
                            roundWins++;
                        }
                    }
                }
                uint256 roundLosses = totalMatches * 5 - roundWins;
                string memory pfpLink = bytes(player.pfpLink).length > 0 ? player.pfpLink : "None";
                result = string(abi.encodePacked(
                    result,
                    '{"gladiatorName":"', player.gladiatorName,
                    '","pfpLink":"', pfpLink,
                    '","totalWins":', uint2str(totalWins),
                    ',"totalLosses":', uint2str(totalLosses),
                    ',"totalMatches":', uint2str(totalMatches),
                    ',"gladiatorRoundWins":', uint2str(roundWins),
                    ',"gladiatorRoundLosses":', uint2str(roundLosses), '}'
                ));
            }
        }
        result = string(abi.encodePacked(result, '],"timestamp":"', getCurrentTimestamp(), '"}'));
        return result;
    }

    // Update a player's profile (admin only)
    function updatePlayerProfile(
        string memory gladiatorName,
        string memory pfpLink
    ) external onlyRole(ADMIN_ROLE) {
        // Clean gladiatorName
        string memory cleanedName = cleanGladiatorName(gladiatorName);

        // Validate inputs
        require(bytes(cleanedName).length > 0, "Gladiator name cannot be empty");
        require(bytes(pfpLink).length > 0, "PFP link cannot be empty");

        // Add to playerNames if not exists
        if (!nameExists(cleanedName)) {
            playerNames.push(cleanedName);
        }

        // Update player profile
        players[cleanedName] = Player({
            gladiatorName: cleanedName,
            pfpLink: pfpLink,
            lastUpdated: block.timestamp
        });
    }

    // Add a new match (admin only)
    function addMatch(
        string[2] memory matchPlayerNames,
        string[5] memory roundWinners,
        string memory matchWinner
    ) external onlyRole(ADMIN_ROLE) {
        // Clean all inputs
        string[2] memory cleanedPlayerNames;
        cleanedPlayerNames[0] = cleanGladiatorName(matchPlayerNames[0]);
        cleanedPlayerNames[1] = cleanGladiatorName(matchPlayerNames[1]);
        string[5] memory cleanedRoundWinners;
        for (uint256 i = 0; i < 5; i++) {
            cleanedRoundWinners[i] = cleanGladiatorName(roundWinners[i]);
        }
        string memory cleanedMatchWinner = cleanGladiatorName(matchWinner);

        // Validate inputs
        require(bytes(cleanedPlayerNames[0]).length > 0 && bytes(cleanedPlayerNames[1]).length > 0, "Player names cannot be empty");
        require(keccak256(bytes(cleanedPlayerNames[0])) != keccak256(bytes(cleanedPlayerNames[1])), "Players must be different");
        for (uint256 i = 0; i < 5; i++) {
            require(
                bytes(cleanedRoundWinners[i]).length > 0 &&
                (keccak256(bytes(cleanedRoundWinners[i])) == keccak256(bytes(cleanedPlayerNames[0])) ||
                 keccak256(bytes(cleanedRoundWinners[i])) == keccak256(bytes(cleanedPlayerNames[1]))),
                "Invalid round winner"
            );
        }
        require(
            keccak256(bytes(cleanedMatchWinner)) == keccak256(bytes(cleanedPlayerNames[0])) ||
            keccak256(bytes(cleanedMatchWinner)) == keccak256(bytes(cleanedPlayerNames[1])),
            "Match winner must be one of the players"
        );

        // Validate best-of-5 rule
        uint256 player1Wins = 0;
        for (uint256 i = 0; i < 5; i++) {
            if (keccak256(bytes(cleanedRoundWinners[i])) == keccak256(bytes(cleanedPlayerNames[0]))) {
                player1Wins++;
            }
        }
        bool player1IsWinner = keccak256(bytes(cleanedMatchWinner)) == keccak256(bytes(cleanedPlayerNames[0]));
        require(
            (player1IsWinner && player1Wins >= 3) || (!player1IsWinner && player1Wins <= 2),
            "Match winner does not match round wins"
        );

        // Create or update profiles for players and add to playerNames
        for (uint256 i = 0; i < 2; i++) {
            if (bytes(players[cleanedPlayerNames[i]].gladiatorName).length == 0) {
                players[cleanedPlayerNames[i]] = Player({
                    gladiatorName: cleanedPlayerNames[i],
                    pfpLink: "",
                    lastUpdated: block.timestamp
                });
                if (!nameExists(cleanedPlayerNames[i])) {
                    playerNames.push(cleanedPlayerNames[i]);
                }
            }
        }

        // Store match
        matches[matchCount] = Match({
            matchId: matchCount,
            players: cleanedPlayerNames,
            roundWinners: cleanedRoundWinners,
            matchWinner: cleanedMatchWinner
        });
        matchCount++;
    }

    // Get a player's profile (public)
    function getPlayerProfile(string memory gladiatorName) external view returns (string memory, string memory, uint256) {
        string memory cleanedName = cleanGladiatorName(gladiatorName);
        Player memory player = players[cleanedName];
        string memory pfpLink = bytes(player.pfpLink).length > 0 ? player.pfpLink : "None";
        return (player.gladiatorName, pfpLink, player.lastUpdated);
    }

    // Get a match by ID (public)
    function getMatch(uint256 matchId) external view returns (Match memory) {
        require(matchId < matchCount, "Match does not exist");
        return matches[matchId];
    }

    // Get a player's stats: wins, losses, and total matches (public)
    function getPlayerStats(string memory gladiatorName) external view returns (uint256 totalWins, uint256 totalLosses, uint256 totalMatches) {
        string memory cleanedName = cleanGladiatorName(gladiatorName);
        totalWins = 0;
        totalLosses = 0;
        for (uint256 i = 0; i < matchCount; i++) {
            Match memory matchData = matches[i];
            if (keccak256(bytes(matchData.players[0])) == keccak256(bytes(cleanedName))) {
                if (keccak256(bytes(matchData.matchWinner)) == keccak256(bytes(cleanedName))) {
                    totalWins++;
                } else {
                    totalLosses++;
                }
            } else if (keccak256(bytes(matchData.players[1])) == keccak256(bytes(cleanedName))) {
                if (keccak256(bytes(matchData.matchWinner)) == keccak256(bytes(cleanedName))) {
                    totalWins++;
                } else {
                    totalLosses++;
                }
            }
        }
        totalMatches = totalWins + totalLosses;
    }

    // Get total rounds won by a gladiator (public)
    function getGladiatorRoundWins(string memory gladiatorName) external view returns (uint256) {
        string memory cleanedName = cleanGladiatorName(gladiatorName);
        uint256 roundWins = 0;
        for (uint256 i = 0; i < matchCount; i++) {
            Match memory matchData = matches[i];
            for (uint256 j = 0; j < 5; j++) {
                if (keccak256(bytes(matchData.roundWinners[j])) == keccak256(bytes(cleanedName))) {
                    roundWins++;
                }
            }
        }
        return roundWins;
    }

    // Get the n most recent matches in JSON format (public)
    function getRecentMatches(uint256 n) external view returns (string memory) {
        uint256 count = n < matchCount ? n : matchCount;
        string memory result = '{"matches":[';
        bool first = true;
        for (uint256 i = 0; i < count; i++) {
            Match memory matchData = matches[matchCount - count + i];
            if (!first) {
                result = string(abi.encodePacked(result, ","));
            }
            first = false;
            result = string(abi.encodePacked(
                result,
                '{"matchId":', uint2str(matchData.matchId),
                ',"players":["', matchData.players[0], '","', matchData.players[1], '"]',
                ',"roundWinners":["', matchData.roundWinners[0], '","', matchData.roundWinners[1], '","',
                matchData.roundWinners[2], '","', matchData.roundWinners[3], '","', matchData.roundWinners[4], '"]',
                ',"matchWinner":"', matchData.matchWinner, '"}'
            ));
        }
        result = string(abi.encodePacked(result, '],"timestamp":"', getCurrentTimestamp(), '"}'));
        return result;
    }
}