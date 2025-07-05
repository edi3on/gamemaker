access(all) contract UserAccountManager2 {

    //
    // Events
    //
    access(all) event UserCreated(userId: String, ethereumAddress: String?)
    access(all) event MatchParticipated(userId: String, matchId: String)
    access(all) event MatchWon(userId: String, matchId: String)
    access(all) event EthereumAddressUpdated(userId: String, newAddress: String)

    //
    // User statistics
    //
    access(all) struct UserStats {
        access(all) let matchesPlayed: Int
        access(all) let matchesWon: Int
        access(all) let winRate: UFix64

        init(matchesPlayed: Int, matchesWon: Int) {
            self.matchesPlayed = matchesPlayed
            self.matchesWon = matchesWon
            self.winRate = matchesPlayed > 0 ? UFix64(matchesWon) / UFix64(matchesPlayed) * 100.0 : 0.0
        }
    }

    //
    // User profile
    //
    access(all) struct UserProfile {
        access(all) let userId: String
        access(all) var ethereumAddress: String?
        access(all) var matchesParticipated: [String]
        access(all) var matchesWon: [String]
        access(all) let createdAt: UFix64

        init(userId: String, ethereumAddress: String?) {
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

        access(all) fun setEthereumAddress(newAddress: String?) {
            self.ethereumAddress = newAddress
        }
    }

    //
    // Storage
    //
    access(all) var users: {String: UserProfile}
    access(all) var addressToUserId: {String: String}

    //
    // Init
    //
    init() {
        self.users = {}
        self.addressToUserId = {}
    }

    //
    // Create new user
    //
    access(all) fun createUser(userId: String, ethereumAddress: String?) {
        if self.users[userId] != nil {
            panic("User already exists")
        }

        if ethereumAddress != nil && self.addressToUserId[ethereumAddress!] != nil {
            panic("Ethereum address already linked")
        }

        let profile = UserProfile(userId: userId, ethereumAddress: ethereumAddress)
        self.users[userId] = profile

        if ethereumAddress != nil {
            self.addressToUserId[ethereumAddress!] = userId
        }

        emit UserCreated(userId: userId, ethereumAddress: ethereumAddress)
    }

    //
    // Update Ethereum address
    //
    access(all) fun updateEthereumAddress(userId: String, newAddress: String) {
        let profile = self.users[userId] ?? panic("User not found")

        if self.addressToUserId[newAddress] != nil {
            panic("Ethereum address already in use")
        }

        let oldAddress = profile.ethereumAddress
        if oldAddress != nil {
            self.addressToUserId.remove(key: oldAddress!)
        }

        profile.setEthereumAddress(newAddress: newAddress)
        self.users[userId] = profile
        self.addressToUserId[newAddress] = userId

        emit EthereumAddressUpdated(userId: userId, newAddress: newAddress)
    }

    //
    // Record match
    //
    access(all) fun recordMatch(userId: String, matchId: String) {
        let profile = self.users[userId] ?? panic("User not found")
        profile.addMatch(matchId: matchId)
        self.users[userId] = profile

        emit MatchParticipated(userId: userId, matchId: matchId)
    }

    access(all) fun recordWin(userId: String, matchId: String) {
        let profile = self.users[userId] ?? panic("User not found")
        profile.addWin(matchId: matchId)
        self.users[userId] = profile

        emit MatchWon(userId: userId, matchId: matchId)
    }

    //
    // Read functions
    //
    access(all) fun getStats(userId: String): UserStats {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.getStats()
    }

    access(all) fun getMatches(userId: String): [String] {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.matchesParticipated
    }

    access(all) fun getWins(userId: String): [String] {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.matchesWon
    }

    access(all) fun getEthereumAddress(userId: String): String? {
        let profile = self.users[userId] ?? panic("User not found")
        return profile.ethereumAddress
    }

    access(all) fun getUserIdByAddress(ethereumAddress: String): String {
        return self.addressToUserId[ethereumAddress] ?? panic("Address not registered")
    }
}
