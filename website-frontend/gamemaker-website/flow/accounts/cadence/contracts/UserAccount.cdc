access(all) contract UserAccountManager {

    //
    // Event definitions
    //
    access(all) event UserCreated(userId: String, ethereumAddress: String)
    access(all) event MatchParticipated(userId: String, matchId: String)
    access(all) event MatchWon(userId: String, matchId: String)

    //
    // User statistics struct
    //
    access(all) struct UserStats {
        access(all) let matchesPlayed: Int
        access(all) let matchesWon: Int
        access(all) let winRate: UFix64

        init(matchesPlayed: Int, matchesWon: Int) {
            self.matchesPlayed = matchesPlayed
            self.matchesWon = matchesWon

            if matchesPlayed > 0 {
                self.winRate = UFix64(matchesWon) / UFix64(matchesPlayed) * 100.0
            } else {
                self.winRate = 0.0
            }
        }
    }

    //
    // User profile data
    //
    access(all) struct UserProfile {
        access(all) let userId: String
        access(all) let ethereumAddress: String
        access(all) var matchesParticipated: [String]
        access(all) var matchesWon: [String]
        access(all) let createdAt: UFix64

        init(userId: String, ethereumAddress: String) {
            self.userId = userId
            self.ethereumAddress = ethereumAddress
            self.matchesParticipated = []
            self.matchesWon = []
            self.createdAt = getCurrentBlock().timestamp
        }

        access(all) fun addMatch(matchId: String) {
            if !self.matchesParticipated.contains(matchId) {
                self.matchesParticipated.append(matchId)
            }
        }

        access(all) fun addWin(matchId: String) {
            if !self.matchesWon.contains(matchId) {
                self.matchesWon.append(matchId)
            }
            self.addMatch(matchId: matchId)
        }

        access(all) fun getStats(): UserStats {
            return UserStats(
                matchesPlayed: self.matchesParticipated.length,
                matchesWon: self.matchesWon.length
            )
        }
    }

    //
    // Storage
    //
    access(all) var users: {String: UserProfile}
    access(all) var addressToUserId: {String: String}

    //
    // Initialization
    //
    init() {
        self.users = {}
        self.addressToUserId = {}
    }

    //
    // Create a new user
    //
    access(all) fun createUser(userId: String, ethereumAddress: String) {
        if self.users[userId] != nil {
            panic("User already exists")
        }
        if self.addressToUserId[ethereumAddress] != nil {
            panic("Ethereum address already linked to another user")
        }

        let profile = UserProfile(userId: userId, ethereumAddress: ethereumAddress)
        self.users[userId] = profile
        self.addressToUserId[ethereumAddress] = userId

        emit UserCreated(userId: userId, ethereumAddress: ethereumAddress)
    }

    //
    // Record match participation
    //
    access(all) fun recordMatch(userId: String, matchId: String) {
        let profile = self.users[userId] ?? panic("User not found")
        profile.addMatch(matchId: matchId)
        self.users[userId] = profile

        emit MatchParticipated(userId: userId, matchId: matchId)
    }

    //
    // Record match win
    //
    access(all) fun recordWin(userId: String, matchId: String) {
        let profile = self.users[userId] ?? panic("User not found")
        profile.addWin(matchId: matchId)
        self.users[userId] = profile

        emit MatchWon(userId: userId, matchId: matchId)
    }

    //
    // Get user stats
    //
    access(all) fun getStats(userId: String): UserStats {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.getStats()
    }

    //
    // Get all matches participated
    //
    access(all) fun getMatches(userId: String): [String] {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.matchesParticipated
    }

    //
    // Get all matches won
    //
    access(all) fun getWins(userId: String): [String] {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.matchesWon
    }

    //
    // Get Ethereum address by userId
    //
    access(all) fun getEthereumAddress(userId: String): String {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.ethereumAddress
    }

    //
    // Get userId from Ethereum address
    //
    access(all) fun getUserIdByAddress(ethereumAddress: String): String {
        return self.addressToUserId[ethereumAddress] ?? panic("Address not registered")
    }
}
