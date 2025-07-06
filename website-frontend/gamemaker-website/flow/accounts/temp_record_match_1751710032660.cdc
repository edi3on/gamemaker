
import UserAccountManager from 0x2c1ac42d77578075

transaction(userId: String, matchId: String) {
  prepare(acct: &Account) {
    // Transaction preparation
  }
  
  execute {
    UserAccountManager.recordMatch(userId: userId, matchId: matchId)
  }
}
    