"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, RefreshCw, X, Trophy, Users, Activity } from "lucide-react"
import type { Match } from "./types" // Declare the Match variable here

// Smart Contract Configuration
const RPC_URL = "YOUR_INFURA_RPC_URL_HERE"
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_HERE"

const contractABI = [
  {
    inputs: [],
    name: "getRecentPlayers",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "n", type: "uint256" }],
    name: "getRecentMatches",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "matchCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
]

interface PlayerInfo {
  twitter_handle: string
  pfp: string
  description: string
}

interface Round {
  winner_twitter_handle: string
}

interface MatchData {
  match_id: number
  players: {
    [key: string]: PlayerInfo
  }
  rounds: Round[]
  matchWinner: string
}

interface PlayerStats {
  twitter_handle: string
  pfp: string
  description: string
  totalWins: number
  totalLosses: number
  totalMatches: number
  roundWins: number
  roundLosses: number
  rank: number
  winRate: number
}

export default function GamemakerLeaderboard() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerStats[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<number>(0)
  const [refreshCooldown, setRefreshCooldown] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  const playersPerPage = 10

  // Fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Mock ethers.js integration (replace with actual ethers.js calls)
  const fetchContractData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch the test match data
      const response = await fetch("/testMatchData.json")
      if (!response.ok) {
        throw new Error("Failed to fetch match data")
      }

      const matchData: MatchData[] = await response.json()

      // Process match data to calculate player statistics
      const playerStatsMap = new Map<string, PlayerStats>()

      // Initialize player stats from match data
      matchData.forEach((match) => {
        Object.values(match.players).forEach((player) => {
          if (!playerStatsMap.has(player.twitter_handle)) {
            playerStatsMap.set(player.twitter_handle, {
              twitter_handle: player.twitter_handle,
              pfp: player.pfp,
              description: player.description,
              totalWins: 0,
              totalLosses: 0,
              totalMatches: 0,
              roundWins: 0,
              roundLosses: 0,
              rank: 0,
              winRate: 0,
            })
          }
        })
      })

      // Calculate match wins/losses and round wins/losses
      matchData.forEach((match) => {
        const playerHandles = Object.values(match.players).map((p) => p.twitter_handle)

        // Update match statistics
        playerHandles.forEach((handle) => {
          const playerStats = playerStatsMap.get(handle)!
          playerStats.totalMatches++

          if (match.matchWinner === handle) {
            playerStats.totalWins++
          } else {
            playerStats.totalLosses++
          }

          // Count round wins/losses
          match.rounds.forEach((round) => {
            if (round.winner_twitter_handle === handle) {
              playerStats.roundWins++
            } else if (playerHandles.includes(round.winner_twitter_handle)) {
              playerStats.roundLosses++
            }
          })
        })
      })

      // Calculate win rates and sort by total wins
      const processedPlayers = Array.from(playerStatsMap.values())
        .map((player) => ({
          ...player,
          winRate: player.totalMatches > 0 ? (player.totalWins / player.totalMatches) * 100 : 0,
        }))
        .sort((a, b) => b.totalWins - a.totalWins)
        .map((player, index) => ({ ...player, rank: index + 1 }))

      setPlayers(processedPlayers)

      // Convert match data to the format expected by the UI
      const convertedMatches = matchData.map((match) => ({
        matchId: match.match_id,
        players: Object.values(match.players).map((p) => p.twitter_handle),
        roundWinners: match.rounds.map((r) => r.winner_twitter_handle),
        matchWinner: match.matchWinner,
      }))

      setMatches(convertedMatches)
      setLastRefresh(Date.now())
    } catch (err) {
      setError("Failed to fetch match data")
      console.error("Data fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchContractData()
  }, [fetchContractData])

  // Filter players based on search term
  useEffect(() => {
    const filtered = players.filter((player) => player.twitter_handle.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredPlayers(filtered)
    setCurrentPage(1)
  }, [players, searchTerm])

  // Refresh cooldown timer
  useEffect(() => {
    if (refreshCooldown > 0) {
      const timer = setTimeout(() => setRefreshCooldown(refreshCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [refreshCooldown])

  const handleRefresh = () => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefresh
    const cooldownPeriod = 60000 // 1 minute

    if (timeSinceLastRefresh < cooldownPeriod) {
      const remainingCooldown = Math.ceil((cooldownPeriod - timeSinceLastRefresh) / 1000)
      setRefreshCooldown(remainingCooldown)
      return
    }

    fetchContractData()
  }

  const getPlayerMatches = (playerName: string) => {
    return matches.filter((match) => match.players.includes(playerName))
  }

  const getMatchScore = (match: Match, playerName: string) => {
    const playerWins = match.roundWinners.filter((winner) => winner === playerName).length
    const opponentWins = match.roundWinners.length - playerWins
    return `${playerWins}-${opponentWins}`
  }

  const getOpponent = (match: Match, playerName: string) => {
    return match.players.find((player) => player !== playerName) || ""
  }

  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage)
  const startIndex = (currentPage - 1) * playersPerPage
  const currentPlayers = filteredPlayers.slice(startIndex, startIndex + playersPerPage)

  const totalMatches = matches.length
  const totalGladiators = players.length
  const activeGladiators = players.filter((p) => p.totalMatches > 0).length

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 overflow-hidden">
      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 2px #e53e3e, 0 0 4px #e53e3e, 0 0 6px #e53e3e; }
          50% { text-shadow: 0 0 4px #e53e3e, 0 0 8px #e53e3e, 0 0 12px #e53e3e; }
        }
        
        .fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        
        .title-glow {
          animation: titleGlow 3s ease-in-out infinite;
        }
        
        .delay-1 { animation-delay: 0.5s; }
        .delay-2 { animation-delay: 1s; }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #dc2626;
        }
        
        body {
          overflow-x: hidden;
        }
      `}</style>

      <div className={`container mx-auto px-4 py-8 max-w-7xl ${isVisible ? "fade-in" : "opacity-0"}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-7xl font-bold text-red-500 title-glow">GAMEMAKER</h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search gladiators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 pl-10 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300"
            />
          </div>
        </div>

        {/* Current Rankings Section */}
        <div className={`mb-8 ${isVisible ? "fade-in delay-1" : "opacity-0"}`}>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold text-gray-100">Current Rankings</h2>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>

          {/* Refresh Button and Cooldown */}
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <div className="flex items-center gap-4">
              {refreshCooldown > 0 && (
                <span className="text-red-400 text-sm">Refresh available in {refreshCooldown}s</span>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshCooldown > 0}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  refreshCooldown > 0
                    ? "text-gray-600 cursor-not-allowed"
                    : "text-gray-400 hover:text-red-400 hover:bg-gray-700"
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200 w-16">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200 w-64">Player</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200 w-24">Total Wins</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200 w-24">Total Losses</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-200 w-24">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                          Loading gladiators...
                        </div>
                      </td>
                    </tr>
                  ) : currentPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No gladiators found
                      </td>
                    </tr>
                  ) : (
                    currentPlayers.map((player) => (
                      <tr
                        key={player.twitter_handle}
                        className="border-t border-gray-700 hover:bg-gray-700 transition-all duration-300"
                      >
                        <td className="px-6 py-4 text-center text-gray-200 w-16">{player.rank}</td>
                        <td className="px-6 py-4 w-64">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-400" />
                            </div>
                            <button
                              onClick={() => setSelectedPlayer(player)}
                              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer transition-colors duration-200"
                            >
                              {player.twitter_handle}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-200 w-24">{player.totalWins}</td>
                        <td className="px-6 py-4 text-center text-gray-200 w-24">{player.totalLosses}</td>
                        <td className="px-6 py-4 text-center text-gray-200 w-24">{player.winRate.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-700 px-6 py-4 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    currentPage === 1 ? "text-gray-500 cursor-not-allowed" : "text-gray-200 hover:bg-gray-600"
                  }`}
                >
                  Previous
                </button>
                <span className="text-gray-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                    currentPage === totalPages ? "text-gray-500 cursor-not-allowed" : "text-gray-200 hover:bg-gray-600"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isVisible ? "fade-in delay-2" : "opacity-0"}`}>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden">
            <div className="flex items-center gap-4">
              <Trophy className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Total Matches</h3>
                <p className="text-3xl font-bold text-red-400">{totalMatches}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden">
            <div className="flex items-center gap-4">
              <Users className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Gladiators in Arena</h3>
                <p className="text-3xl font-bold text-red-400">{totalGladiators}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-200">ACTIVE</h3>
                <p className="text-3xl font-bold text-red-400">{activeGladiators}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gladiator Profile Modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(8px)", background: "rgba(26, 26, 26, 0.8)" }}
        >
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-red-500 w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 border-b border-red-500 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Gladiator Profile: {selectedPlayer.twitter_handle}</h2>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-white hover:text-red-200 transition-colors duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Player Description */}
              {selectedPlayer.description && (
                <div className="mb-6">
                  <p className="text-gray-400 text-sm italic">{selectedPlayer.twitter_handle}</p>
                  <p className="text-gray-300 mt-2">{selectedPlayer.description}</p>
                </div>
              )}

              {/* Player Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Total Wins</h4>
                  <p className="text-2xl font-bold text-red-400">{selectedPlayer.totalWins}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Total Losses</h4>
                  <p className="text-2xl font-bold text-red-400">{selectedPlayer.totalLosses}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Win Rate</h4>
                  <p className="text-2xl font-bold text-red-400">{selectedPlayer.winRate.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-1">Round Wins</h4>
                  <p className="text-2xl font-bold text-red-400">{selectedPlayer.roundWins}</p>
                </div>
              </div>

              {/* Match History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-4">Match History</h3>
                <div className="space-y-3">
                  {getPlayerMatches(selectedPlayer.twitter_handle).map((match) => {
                    const opponent = getOpponent(match, selectedPlayer.twitter_handle)
                    const score = getMatchScore(match, selectedPlayer.twitter_handle)
                    const isWinner = match.matchWinner === selectedPlayer.twitter_handle

                    return (
                      <div key={match.matchId} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-1 rounded text-sm font-semibold ${
                                isWinner ? "bg-green-600 text-white" : "bg-red-600 text-white"
                              }`}
                            >
                              {isWinner ? "WIN" : "LOSS"}
                            </span>
                            <span className="text-gray-300">vs</span>
                            <button
                              onClick={() => {
                                const opponentPlayer = players.find((p) => p.twitter_handle === opponent)
                                if (opponentPlayer) setSelectedPlayer(opponentPlayer)
                              }}
                              className="text-red-400 hover:text-red-300 font-semibold cursor-pointer transition-colors duration-200"
                            >
                              {opponent}
                            </button>
                          </div>
                          <span className="text-gray-300 font-mono">{score}</span>
                        </div>
                      </div>
                    )
                  })}
                  {getPlayerMatches(selectedPlayer.twitter_handle).length === 0 && (
                    <p className="text-gray-400 text-center py-4">No matches found</p>
                  )}
                </div>
              </div>

              {/* Twitter Link */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <a
                  href={`https://x.com/${selectedPlayer.twitter_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 transition-colors duration-200"
                >
                  View on X (Twitter) →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
