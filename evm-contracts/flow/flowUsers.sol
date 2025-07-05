// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract FlowUserSync is Ownable {
    struct Match {
        uint256 matchId;
        string challengerName;
        string challengerUserId;
        string opponentName;
        string opponentUserId;
        string matchWinner;
        string aiPrompt;
    }

    struct UserProfile {
        string userId;
        string twitterHandle;
        address ethereumAddress;
        uint256 createdAt;
        uint256 matchesPlayed;
        uint256 matchesWon;
    }

    // userId => UserProfile
    mapping(string => UserProfile) public users;
    // userId => matchIds played
    mapping(string => uint256[]) public userMatches;
    // userId => matchIds won
    mapping(string => uint256[]) public userWins;
    mapping(address => string) public addressToUserId;

    // Last matchId that has been synced from Saga
    uint256 public lastSyncedMatchId;

    event UserUpdated(string userId, string twitterHandle, address ethAddress);
    event MatchesSynced(uint256 fromMatchId, uint256 toMatchId);

    constructor() Ownable(msg.sender) {}

    // Sync new matches from Saga contract and update user stats
    function syncMatches(Match[] calldata matches, uint256 latestMatchId) external onlyOwner {
        require(latestMatchId > lastSyncedMatchId, "No new matches to sync");
        for (uint256 i = 0; i < matches.length; i++) {
            Match calldata m = matches[i];

            // Update challenger profile
            _updateUser(m.challengerUserId, m.challengerName, address(0), m.matchId, keccak256(bytes(m.matchWinner)) == keccak256(bytes(m.challengerName)));
            // Update opponent profile
            _updateUser(m.opponentUserId, m.opponentName, address(0), m.matchId, keccak256(bytes(m.matchWinner)) == keccak256(bytes(m.opponentName)));
        }
        emit MatchesSynced(lastSyncedMatchId, latestMatchId);
        lastSyncedMatchId = latestMatchId;
    }

    // Internal: update or create user and stats
    function _updateUser(
        string memory userId,
        string memory twitterHandle,
        address ethAddress,
        uint256 matchId,
        bool isWinner
    ) internal {
        UserProfile storage user = users[userId];
        if (bytes(user.userId).length == 0) {
            // New user
            user.userId = userId;
            user.twitterHandle = twitterHandle;
            user.ethereumAddress = ethAddress;
            user.createdAt = block.timestamp;
            allUserIds.push(userId); // Add new userId to allUserIds
        }
        // Update twitter handle if changed
        if (keccak256(bytes(user.twitterHandle)) != keccak256(bytes(twitterHandle))) {
            user.twitterHandle = twitterHandle;
        }
        // Only add match if not already present
        if (userMatches[userId].length == 0 || userMatches[userId][userMatches[userId].length - 1] != matchId) {
            userMatches[userId].push(matchId);
            user.matchesPlayed += 1;
        }
        if (isWinner) {
            if (userWins[userId].length == 0 || userWins[userId][userWins[userId].length - 1] != matchId) {
                userWins[userId].push(matchId);
                user.matchesWon += 1;
            }
        }
        addressToUserId[ethAddress] = userId;
        emit UserUpdated(userId, twitterHandle, user.ethereumAddress);
    }

    // Owner: update a user's ethereum address
    function updateEthereumAddress(string memory userId, address ethAddress) external onlyOwner {
        require(bytes(users[userId].userId).length != 0, "User not found");
        users[userId].ethereumAddress = ethAddress;
        addressToUserId[ethAddress] = userId;
        emit UserUpdated(userId, users[userId].twitterHandle, ethAddress);
    }

    // --- Read functions ---

    function getUserProfile(string memory userId) external view returns (
        string memory,
        string memory,
        address,
        uint256,
        uint256,
        uint256
    ) {
        UserProfile storage user = users[userId];
        return (
            user.userId,
            user.twitterHandle,
            user.ethereumAddress,
            user.createdAt,
            user.matchesPlayed,
            user.matchesWon
        );
    }

    function getUserMatches(string memory userId) external view returns (uint256[] memory) {
        return userMatches[userId];
    }

    function getUserWins(string memory userId) external view returns (uint256[] memory) {
        return userWins[userId];
    }

    string[] public allUserIds;

    function getAllUserIds() external view returns (string[] memory) {
        return allUserIds;
    }

    function getAllUsers() external view returns (
        string[] memory userIds,
        string[] memory twitterHandles,
        address[] memory ethereumAddresses,
        uint256[] memory createdAts,
        uint256[] memory matchesPlayeds,
        uint256[] memory matchesWons
    ) {
        uint256 len = allUserIds.length;
        userIds = new string[](len);
        twitterHandles = new string[](len);
        ethereumAddresses = new address[](len);
        createdAts = new uint256[](len);
        matchesPlayeds = new uint256[](len);
        matchesWons = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            string memory uid = allUserIds[i];
            UserProfile storage user = users[uid];
            userIds[i] = user.userId;
            twitterHandles[i] = user.twitterHandle;
            ethereumAddresses[i] = user.ethereumAddress;
            createdAts[i] = user.createdAt;
            matchesPlayeds[i] = user.matchesPlayed;
            matchesWons[i] = user.matchesWon;
        }
    }

    function toLower(string memory str) public pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Uppercase character...
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                // So we add 32 to make it lowercase
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    function getUserIdByAddress(address ethAddress) external view returns (string memory) {
        return addressToUserId[ethAddress];
    }
}