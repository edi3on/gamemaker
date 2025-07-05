"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, RefreshCw, X, User, ExternalLink, Award, Clock } from "lucide-react"
import { ethers } from "ethers"

// ========================================
// SMART CONTRACT CONFIGURATION
// ========================================
// IMPORTANT: Replace these placeholders with your actual values
const SMART_CONTRACT_CONFIG = {
  // Replace with your Infura RPC URL (e.g., https://sepolia.infura.io/v3/YOUR_PROJECT_ID)
  RPC_URL: "https://sepolia.infura.io/v3/e28deea6e38d41e7b75e8dd26e89e25f",

  // Replace with your deployed smart contract address
  CONTRACT_ADDRESS: "0x953947A06f9168213511eF1982C84BfAeF147592",
}

// Smart Contract ABI for the required functions
const CONTRACT_ABI = [
  {
    inputs: [],
    name: "getRecentPlayers",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "n",
        type: "uint256",
      },
    ],
    name: "getRecentMatches",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "matchCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
]

// CSS Variables for easy manipulation of key visual values
const VISUAL_CONFIG = {
  colors: {
    primary: "#e53e3e",
    primaryHover: "#dc2626",
    accent: "#ef4444",
    background: "#111827",
    surface: "#1f2937",
    surfaceLight: "#374151",
  },
  animations: {
    glowDuration: "3s",
    modalTransition: "300ms",
    pulseDelay: "2s",
    fadeInDelay: "0.5s",
    fadeInDuration: "1s",
  },
  effects: {
    titleGlowIntensity: "6px",
    modalBlur: "8px",
    shadowIntensity: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  // Rate limiting configuration
  rateLimiting: {
    refreshCooldownMs: 60000, // 1 minute cooldown
  },
}

// Interface definitions for smart contract data structures
interface SmartContractPlayer {
  gladiatorName: string
  pfpLink: string
  totalWins: number
  totalLosses: number
  totalMatches: number
  gladiatorRoundWins: number
  gladiatorRoundLosses: number
  description?: string
}

interface SmartContractMatch {
  matchId: number
  players: string[]
  roundWinners: string[]
  matchWinner: string
}

interface SmartContractPlayersResponse {
  players: SmartContractPlayer[]
  timestamp: string
}

interface SmartContractMatchesResponse {
  matches: SmartContractMatch[]
  timestamp: string
}

// Enhanced interface definitions for processed data
interface PlayerStats {
  twitter_handle: string
  description: string
  total_wins: number
  total_losses: number
  total_matches: number
  win_rate: number
}

interface PlayerMatch {
  match_id: number
  opponent_twitter_handle: string
  player_score: number
  opponent_score: number
  result: "win" | "loss"
}

export default function GamemakerLeaderboard() {
  // State management for the enhanced application
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [filteredStats, setFilteredStats] = useState<PlayerStats[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null)
  const [playerMatches, setPlayerMatches] = useState<PlayerMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [pageLoaded, setPageLoaded] = useState(false)

  // Rate limiting state
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)
  const [refreshCooldownRemaining, setRefreshCooldownRemaining] = useState<number>(0)
  const [showCooldownMessage, setShowCooldownMessage] = useState(false)

  // Smart contract data storage
  const [smartContractMatches, setSmartContractMatches] = useState<SmartContractMatch[]>([])

  // Blockchain connection state
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [configurationError, setConfigurationError] = useState<string | null>(null)

  const playersPerPage = 10

  // Initialize blockchain connection
  useEffect(() => {
    const initializeBlockchainConnection = async () => {
      try {
        // Validate configuration
        if (SMART_CONTRACT_CONFIG.RPC_URL === "YOUR_INFURA_RPC_URL_HERE") {
          setConfigurationError("Please configure your Infura RPC URL in the SMART_CONTRACT_CONFIG")
          return
        }

        if (SMART_CONTRACT_CONFIG.CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") {
          setConfigurationError("Please configure your smart contract address in the SMART_CONTRACT_CONFIG")
          return
        }

        console.log("🔗 Initializing blockchain connection...")
        console.log("📡 RPC URL:", SMART_CONTRACT_CONFIG.RPC_URL.substring(0, 50) + "...")
        console.log("📄 Contract Address:", SMART_CONTRACT_CONFIG.CONTRACT_ADDRESS)

        // Initialize provider
        const ethersProvider = new ethers.JsonRpcProvider(SMART_CONTRACT_CONFIG.RPC_URL)
        setProvider(ethersProvider)

        // Test network connection
        const network = await ethersProvider.getNetwork()
        console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`)

        // Initialize contract
        const ethersContract = new ethers.Contract(SMART_CONTRACT_CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, ethersProvider)
        setContract(ethersContract)

        console.log("✅ Smart contract instance created successfully")
        setConfigurationError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize blockchain connection"
        console.error("❌ Blockchain initialization failed:", err)
        setConfigurationError(errorMessage)
      }
    }

    initializeBlockchainConnection()
  }, [])

  // Direct smart contract data fetching functions
  const fetchSmartContractPlayers = async (): Promise<SmartContractPlayersResponse> => {
    if (!contract) {
      throw new Error("Smart contract not initialized")
    }

    console.log("🔗 Calling getRecentPlayers() on smart contract...")

    try {
      // Call the smart contract function
      const jsonString: string = await contract.getRecentPlayers()
      console.log("📥 Received players data from contract:", jsonString.substring(0, 100) + "...")

      // Parse the JSON string response
      const parsedData: SmartContractPlayersResponse = JSON.parse(jsonString)
      console.log("✅ Successfully parsed players data:", parsedData.players.length, "players")

      return parsedData
    } catch (err) {
      console.error("❌ Error calling getRecentPlayers:", err)
      throw new Error(
        `Failed to fetch players from smart contract: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  // Add this function after fetchSmartContractPlayers
  const fetchMatchCount = async (): Promise<number> => {
    if (!contract) {
      throw new Error("Smart contract not initialized")
    }

    console.log("🔗 Calling matchCount() on smart contract...")

    try {
      // Call the smart contract function to get total match count
      const matchCountBigInt: bigint = await contract.matchCount()
      const totalMatches = Number(matchCountBigInt)
      console.log("✅ Total matches available on contract:", totalMatches)

      return totalMatches
    } catch (err) {
      console.error("❌ Error calling matchCount:", err)
      throw new Error(
        `Failed to fetch match count from smart contract: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  const fetchSmartContractMatches = async (): Promise<SmartContractMatchesResponse> => {
    if (!contract) {
      throw new Error("Smart contract not initialized")
    }

    try {
      // First, get the total number of matches available
      const totalMatches = await fetchMatchCount()

      if (totalMatches === 0) {
        console.log("⚠️ No matches found on smart contract")
        return {
          matches: [],
          timestamp: Date.now().toString(),
        }
      }

      console.log(`🔗 Calling getRecentMatches(${totalMatches}) on smart contract...`)

      // Call the smart contract function with the total match count
      const jsonString: string = await contract.getRecentMatches(totalMatches)
      console.log("📥 Received matches data from contract:", jsonString.substring(0, 100) + "...")

      // Parse the JSON string response
      const parsedData: SmartContractMatchesResponse = JSON.parse(jsonString)
      console.log("✅ Successfully parsed matches data:", parsedData.matches.length, "matches")

      return parsedData
    } catch (err) {
      console.error("❌ Error calling getRecentMatches:", err)
      throw new Error(
        `Failed to fetch matches from smart contract: ${err instanceof Error ? err.message : "Unknown error"}`,
      )
    }
  }

  // Process smart contract data into leaderboard format
  const processSmartContractData = useCallback(
    (playersData: SmartContractPlayersResponse, matchesData: SmartContractMatchesResponse): PlayerStats[] => {
      console.log("🔄 Processing smart contract data for leaderboard...")

      // Create a map to store player statistics
      const playerStatsMap = new Map<string, PlayerStats>()

      // Process players data first
      playersData.players.forEach((player) => {
        const twitterHandle = player.gladiatorName.startsWith("@") ? player.gladiatorName : `@${player.gladiatorName}`

        const win_rate = player.totalMatches > 0 ? (player.totalWins / player.totalMatches) * 100 : 0

        playerStatsMap.set(twitterHandle, {
          twitter_handle: twitterHandle,
          description: player.description || "A mysterious gladiator with unknown origins.",
          total_wins: player.totalWins,
          total_losses: player.totalLosses,
          total_matches: player.totalMatches,
          win_rate: win_rate,
        })
      })

      // Store matches for match history functionality
      setSmartContractMatches(matchesData.matches)

      // Convert to array and sort by total wins, then by win rate
      const stats = Array.from(playerStatsMap.values()).sort((a, b) => {
        if (b.total_wins !== a.total_wins) {
          return b.total_wins - a.total_wins
        }
        return b.win_rate - a.win_rate
      })

      console.log("✅ Processed leaderboard data:", stats.length, "players")
      return stats
    },
    [],
  )

  // Enhanced data fetching with direct smart contract integration
  const fetchLeaderboardData = useCallback(
    async (isRefresh = false) => {
      if (configurationError) {
        setError(configurationError)
        setLoading(false)
        return
      }

      if (!contract) {
        setError("Smart contract not initialized. Please check your configuration.")
        setLoading(false)
        return
      }

      try {
        if (isRefresh) {
          setRefreshing(true)
          console.log("🔄 Manual refresh triggered - calling smart contract...")
        } else {
          setLoading(true)
          console.log("🚀 Initial data load - calling smart contract...")
        }

        setError(null)

        // Fetch data from smart contract concurrently
        console.log("📡 Making concurrent calls to smart contract...")
        const [playersResponse, matchesResponse] = await Promise.all([
          fetchSmartContractPlayers().catch((err) => {
            console.error("❌ Failed to fetch players:", err)
            throw new Error(`Players data fetch failed: ${err.message}`)
          }),
          fetchSmartContractMatches().catch((err) => {
            console.error("❌ Failed to fetch matches:", err)
            throw new Error(`Matches data fetch failed: ${err.message}`)
          }),
        ])

        // Process the combined data
        const processedStats = processSmartContractData(playersResponse, matchesResponse)

        // Update state
        setPlayerStats(processedStats)
        setFilteredStats(processedStats)

        // Update refresh timing
        const now = Date.now()
        setLastRefreshTime(now)

        if (!pageLoaded && !isRefresh) {
          // Trigger page load animation after initial data is loaded
          setTimeout(() => setPageLoaded(true), 100)
        }

        console.log("✅ Leaderboard data successfully updated from smart contract")
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred while fetching smart contract data"
        setError(errorMessage)
        console.error("❌ Smart contract data fetch failed:", err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [contract, configurationError, processSmartContractData, pageLoaded],
  )

  // Rate limiting logic for refresh button
  const handleRefreshClick = useCallback(() => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefreshTime
    const cooldownRemaining = VISUAL_CONFIG.rateLimiting.refreshCooldownMs - timeSinceLastRefresh

    if (cooldownRemaining > 0) {
      // Still in cooldown period
      setRefreshCooldownRemaining(Math.ceil(cooldownRemaining / 1000))
      setShowCooldownMessage(true)

      // Hide cooldown message after 3 seconds
      setTimeout(() => setShowCooldownMessage(false), 3000)

      console.log(`⏰ Refresh blocked - cooldown remaining: ${Math.ceil(cooldownRemaining / 1000)}s`)
      return
    }

    // Proceed with refresh
    fetchLeaderboardData(true)
  }, [lastRefreshTime, fetchLeaderboardData])

  // Initial data load on component mount
  useEffect(() => {
    // Only fetch data if contract is initialized
    if (contract && !configurationError) {
      fetchLeaderboardData(false)
    }
  }, [contract, configurationError, fetchLeaderboardData])

  // Enhanced search functionality
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredStats(playerStats)
    } else {
      const filtered = playerStats.filter(
        (player) =>
          player.twitter_handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredStats(filtered)
    }
    setCurrentPage(1) // Reset to first page when searching
  }, [searchTerm, playerStats])

  // Calculate enhanced pagination values
  const totalPages = Math.ceil(filteredStats.length / playersPerPage)
  const startIndex = (currentPage - 1) * playersPerPage
  const endIndex = startIndex + playersPerPage
  const currentPlayers = filteredStats.slice(startIndex, endIndex)

  // Get player match history from smart contract data
  // Get player match history from smart contract data - FIXED VERSION
  const getPlayerMatches = useCallback(
    (playerHandle: string): PlayerMatch[] => {
      console.log(`🔍 Getting match history for player: ${playerHandle}`)
      console.log(`📊 Total matches available: ${smartContractMatches.length}`)

      const playerMatchHistory: PlayerMatch[] = []

      smartContractMatches.forEach((match) => {
        console.log(`🎯 Checking match ${match.matchId}:`, match.players)

        // Normalize player names for comparison (remove @ if present, make lowercase)
        const normalizedPlayerHandle = playerHandle.replace("@", "").toLowerCase()
        const normalizedMatchPlayers = match.players.map((p) => p.replace("@", "").toLowerCase())

        // Check if this player participated in this match
        const playerIndex = normalizedMatchPlayers.findIndex((p) => p === normalizedPlayerHandle)

        if (playerIndex !== -1) {
          console.log(`✅ Player ${playerHandle} found in match ${match.matchId}`)

          // Get the original (non-normalized) player names
          const originalPlayerName = match.players[playerIndex]
          const opponentName = match.players.find((_, index) => index !== playerIndex)

          if (opponentName) {
            // Ensure opponent name has @ prefix for consistency
            const formattedOpponentHandle = opponentName.startsWith("@") ? opponentName : `@${opponentName}`

            // Calculate scores from round winners
            let playerScore = 0
            let opponentScore = 0

            match.roundWinners.forEach((winner) => {
              const normalizedWinner = winner.replace("@", "").toLowerCase()
              const normalizedOpponent = opponentName.replace("@", "").toLowerCase()

              if (normalizedWinner === normalizedPlayerHandle) {
                playerScore++
              } else if (normalizedWinner === normalizedOpponent) {
                opponentScore++
              }
            })

            // Determine result based on match winner
            const normalizedMatchWinner = match.matchWinner.replace("@", "").toLowerCase()
            const result = normalizedMatchWinner === normalizedPlayerHandle ? "win" : "loss"

            console.log(`📈 Match ${match.matchId} result: ${playerScore}-${opponentScore} (${result})`)

            // Add to player's match history
            playerMatchHistory.push({
              match_id: match.matchId,
              opponent_twitter_handle: formattedOpponentHandle,
              player_score: playerScore,
              opponent_score: opponentScore,
              result,
            })
          }
        }
      })

      console.log(`📋 Final match history for ${playerHandle}:`, playerMatchHistory)

      // Sort by match_id (most recent first)
      return playerMatchHistory.sort((a, b) => b.match_id - a.match_id)
    },
    [smartContractMatches],
  )

  // Enhanced modal management with player match history
  const openPlayerProfile = (player: PlayerStats) => {
    const playerMatchHistory = getPlayerMatches(player.twitter_handle)

    setSelectedPlayer(player)
    setPlayerMatches(playerMatchHistory)
    setModalVisible(true)

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden"
  }

  const closePlayerProfile = () => {
    setModalVisible(false)
    setTimeout(() => {
      setSelectedPlayer(null)
      setPlayerMatches([])
      document.body.style.overflow = "unset"
    }, 300) // Wait for animation to complete
  }

  // Handle opponent click in match history
  // Handle opponent click in match history - FIXED VERSION
  const handleOpponentClick = (opponentHandle: string) => {
    console.log(`🔍 Looking for opponent: ${opponentHandle}`)

    // Normalize the opponent handle for comparison
    const normalizedOpponentHandle = opponentHandle.replace("@", "").toLowerCase()

    // Find the opponent in the player stats using normalized comparison
    const opponent = playerStats.find((player) => {
      const normalizedPlayerHandle = player.twitter_handle.replace("@", "").toLowerCase()
      return normalizedPlayerHandle === normalizedOpponentHandle
    })

    if (opponent) {
      console.log(`✅ Found opponent in player stats: ${opponent.twitter_handle}`)

      // First close current modal with animation
      setModalVisible(false)

      // Then open new modal after animation completes
      setTimeout(() => {
        const opponentMatchHistory = getPlayerMatches(opponent.twitter_handle)
        setSelectedPlayer(opponent)
        setPlayerMatches(opponentMatchHistory)
        setModalVisible(true)
      }, 300)
    } else {
      console.log(`❌ Opponent ${opponentHandle} not found in player stats`)
      console.log(
        "Available players:",
        playerStats.map((p) => p.twitter_handle),
      )
    }
  }

  // Get Twitter URL without @ symbol
  const getTwitterUrl = (handle: string) => {
    return `https://x.com/${handle.replace("@", "")}`
  }

  // Calculate summary statistics
  const totalMatches = smartContractMatches.length
  const totalGladiators = playerStats.length
  const arenaStatus = contract ? "CONNECTED" : "DISCONNECTED"

  // Configuration error state
  if (configurationError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center overflow-x-hidden p-4">
        <div className="bg-gray-800 rounded-xl border border-yellow-500 p-8 max-w-2xl w-full text-center shadow-2xl">
          <div className="text-yellow-400 text-6xl mb-4">⚙️</div>
          <h2 className="text-yellow-400 text-2xl font-bold mb-4">Smart Contract Configuration Required</h2>
          <p className="text-gray-300 mb-6">{configurationError}</p>
          <div className="bg-gray-700 rounded-lg p-4 text-left text-sm text-gray-300 mb-6">
            <p className="font-semibold mb-2">Please update the SMART_CONTRACT_CONFIG in the code:</p>
            <p className="mb-1">• RPC_URL: Your Infura RPC endpoint</p>
            <p>• CONTRACT_ADDRESS: Your deployed smart contract address</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            Retry After Configuration
          </button>
        </div>
      </div>
    )
  }

  // Enhanced loading state with themed styling
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center overflow-x-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-red-500 border-solid mx-auto mb-4"></div>
          <div className="text-gray-300 text-xl font-semibold">Loading Arena Data...</div>
          <div className="text-gray-500 text-sm mt-2">Connecting to smart contract...</div>
          {provider && (
            <div className="text-gray-600 text-xs mt-1">
              Network: {SMART_CONTRACT_CONFIG.RPC_URL.includes("sepolia") ? "Sepolia" : "Ethereum"}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Enhanced error state with recovery options
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center overflow-x-hidden p-4">
        <div className="bg-gray-800 rounded-xl border border-red-500 p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-red-400 text-2xl font-bold mb-4">Smart Contract Connection Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => fetchLeaderboardData(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Retry Connection
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Reload Application
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 overflow-x-hidden">
      {/* Enhanced Custom Styles for Visual Effects */}
      <style jsx>{`
        /* GAMEMAKER Title Refined Glow Effect with Subtle Flicker Animation */
        .title-glow {
          text-shadow: 
            0 0 2px ${VISUAL_CONFIG.colors.primary},
            0 0 4px ${VISUAL_CONFIG.colors.primary},
            0 0 ${VISUAL_CONFIG.effects.titleGlowIntensity} ${VISUAL_CONFIG.colors.primary};
          animation: titleFlicker ${VISUAL_CONFIG.animations.glowDuration} ease-in-out infinite alternate;
        }

        @keyframes titleFlicker {
          0% {
            text-shadow: 
              0 0 2px ${VISUAL_CONFIG.colors.primary},
              0 0 4px ${VISUAL_CONFIG.colors.primary},
              0 0 ${VISUAL_CONFIG.effects.titleGlowIntensity} ${VISUAL_CONFIG.colors.primary};
          }
          100% {
            text-shadow: 
              0 0 1px ${VISUAL_CONFIG.colors.primary},
              0 0 3px ${VISUAL_CONFIG.colors.primary},
              0 0 5px ${VISUAL_CONFIG.colors.primary};
          }
        }

        /* Staggered Fade-in Animations for Page Load */
        .fade-in-title {
          opacity: 0;
          transform: translateY(-20px);
          animation: fadeInTitle ${VISUAL_CONFIG.animations.fadeInDuration} ease-out forwards;
        }

        .fade-in-content {
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInContent ${VISUAL_CONFIG.animations.fadeInDuration} ease-out ${VISUAL_CONFIG.animations.fadeInDelay} forwards;
        }

        @keyframes fadeInTitle {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInContent {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Enhanced Modal Animations */
        .modal-overlay {
          backdrop-filter: blur(${VISUAL_CONFIG.effects.modalBlur});
          background: rgba(17, 24, 39, 0.8);
          transition: all ${VISUAL_CONFIG.animations.modalTransition} ease-out;
        }

        .modal-content {
          transform: scale(0.95) translateY(-10px);
          opacity: 0;
          transition: all ${VISUAL_CONFIG.animations.modalTransition} ease-out;
        }

        .modal-content.visible {
          transform: scale(1) translateY(0);
          opacity: 1;
        }

        /* Custom Scrollbar Styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${VISUAL_CONFIG.colors.primary};
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${VISUAL_CONFIG.colors.primaryHover};
        }

        /* Pulsing Dot Animation */
        .pulse-dot {
          animation: pulse ${VISUAL_CONFIG.animations.pulseDelay} cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Summary Card Hover Effects - Prevent Overflow */
        .summary-card {
          overflow: hidden;
          position: relative;
          transform-origin: center;
          will-change: transform;
        }

        .summary-card:hover {
          transform: translateY(-4px) scale(1.02);
          transition: transform 0.3s ease-out;
        }

        /* Prevent scrollbars on large text elements */
        .stat-number {
          overflow: hidden;
          white-space: nowrap;
          display: inline-block;
          line-height: 1;
          max-width: 100%;
        }

        .stat-container {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: auto;
          min-height: 0;
        }

        /* Refresh button animations */
        .refresh-spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* CRITICAL FIX: Refresh Button Container Overflow Prevention */
        .refresh-container {
          contain: layout style paint !important;
          overflow: hidden !important;
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center;
          flex-shrink: 0 !important;
        }

        /* CRITICAL FIX: Cooldown Message Positioning */
        .cooldown-message {
          position: absolute !important;
          top: 100% !important;
          right: 0 !important;
          margin-top: 0.5rem !important;
          z-index: 9999 !important;
          pointer-events: none !important;
          contain: none !important;
          overflow: visible !important;
          white-space: nowrap !important;
          max-width: none !important;
        }

        /* CRITICAL FIX: Header Section Containment */
        .leaderboard-header {
          overflow: hidden !important;
          contain: layout style !important;
          position: relative !important;
        }

        /* CRITICAL FIX: Prevent any scrollbars on button hover/active states */
        button:hover,
        button:active,
        button:focus {
          contain: layout style paint !important;
          overflow: hidden !important;
        }

        /* CRITICAL FIX: Transform containment for all interactive elements */
        .transform {
          contain: layout style paint !important;
          overflow: hidden !important;
          will-change: transform !important;
        }

        /* CRITICAL FIX: Scale hover effects containment */
        .hover\\:scale-110:hover {
          contain: layout style paint !important;
          overflow: hidden !important;
        }
      `}</style>

      {/* Enhanced Header Section with Refined Glowing Title */}
      <header className={`bg-gray-800 border-b border-red-600 shadow-2xl ${pageLoaded ? "fade-in-title" : ""}`}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="overflow-hidden whitespace-nowrap">
              {/* Significantly Larger Title with Refined Glow */}
              <h1 className="text-7xl font-bold text-red-500 tracking-wider title-glow inline-block">GAMEMAKER</h1>
            </div>

            {/* Enhanced Search Bar with Icon */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search gladiators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg pl-12 pr-6 py-3 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 w-80 transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Main Content with Fade-in Animation */}
      <main className={`max-w-7xl mx-auto px-6 py-10 ${pageLoaded ? "fade-in-content" : ""}`}>
        {/* Enhanced Leaderboard Section with Smart Contract Integration */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden mb-10">
          {/* Enhanced Leaderboard Header with Functional Refresh Button */}
          <div className="leaderboard-header bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-b border-gray-700 px-8 py-6 flex justify-between items-center">
            <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
              <h2 className="text-3xl font-bold text-red-400">Current Rankings</h2>
              <div className="w-3 h-3 bg-red-500 rounded-full pulse-dot"></div>
              {/* Smart Contract Status Indicator */}
              <div className="flex items-center space-x-2 ml-4">
                <div className={`w-2 h-2 rounded-full ${contract ? "bg-green-400" : "bg-red-400"}`}></div>
                <span className="text-xs text-gray-400">
                  {contract ? "Contract Connected" : "Contract Disconnected"}
                </span>
              </div>
            </div>

            {/* CRITICAL FIX: Refresh Button with Proper Containment Classes */}
            <div className="refresh-container">
              <button
                onClick={handleRefreshClick}
                disabled={refreshing || !contract}
                className={`text-gray-400 hover:text-red-400 p-3 rounded-lg hover:bg-gray-700 transition-all duration-300 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                  refreshing ? "refresh-spinning" : ""
                }`}
                title={refreshing ? "Refreshing..." : "Refresh from smart contract"}
              >
                <RefreshCw className="w-6 h-6" />
              </button>

              {/* CRITICAL FIX: Cooldown Message with Proper Classes */}
              {showCooldownMessage && (
                <div className="cooldown-message bg-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg shadow-lg">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Cooldown: {refreshCooldownRemaining}s
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Leaderboard Table with Perfect Column Alignment */}
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="w-20 px-6 py-5 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="w-80 px-6 py-5 text-left text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="w-32 px-6 py-5 text-center text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Total Wins
                  </th>
                  <th className="w-32 px-6 py-5 text-center text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Total Losses
                  </th>
                  <th className="w-32 px-6 py-5 text-center text-sm font-bold text-gray-300 uppercase tracking-wider">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentPlayers.map((player, index) => {
                  const rank = startIndex + index + 1
                  return (
                    <tr key={player.twitter_handle} className="hover:bg-gray-700 transition-all duration-300">
                      {/* Rank - Perfect alignment with header */}
                      <td className="w-20 px-6 py-6 text-left">
                        <div className="flex items-center">
                          <span
                            className={`text-2xl font-bold ${
                              rank === 1
                                ? "text-yellow-400 drop-shadow-lg"
                                : rank === 2
                                  ? "text-gray-300 drop-shadow-lg"
                                  : rank === 3
                                    ? "text-orange-400 drop-shadow-lg"
                                    : "text-gray-400"
                            }`}
                          >
                            #{rank}
                          </span>
                          {rank <= 3 && (
                            <span className="ml-2 text-lg">{rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉"}</span>
                          )}
                        </div>
                      </td>

                      {/* Player - Perfect alignment with header */}
                      <td className="w-80 px-6 py-6 text-left">
                        <div className="flex items-center space-x-4">
                          {/* Enhanced Profile Picture Placeholder */}
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center border-3 border-gray-500 shadow-lg flex-shrink-0">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                          {/* Enhanced Twitter Handle - Clickable */}
                          <button
                            onClick={() => openPlayerProfile(player)}
                            className="text-red-400 hover:text-red-300 font-bold text-lg transition-all duration-200 hover:underline transform hover:scale-105 text-left"
                          >
                            {player.twitter_handle}
                          </button>
                        </div>
                      </td>

                      {/* Total Wins - Perfect center alignment with header */}
                      <td className="w-32 px-6 py-6 text-center">
                        <span className="text-green-400 font-bold text-xl drop-shadow-lg">{player.total_wins}</span>
                      </td>

                      {/* Total Losses - Perfect center alignment with header */}
                      <td className="w-32 px-6 py-6 text-center">
                        <span className="text-red-400 font-bold text-xl drop-shadow-lg">{player.total_losses}</span>
                      </td>

                      {/* Win Rate - Perfect center alignment with header */}
                      <td className="w-32 px-6 py-6 text-center">
                        <span
                          className={`font-bold text-xl drop-shadow-lg ${
                            player.win_rate >= 70
                              ? "text-green-400"
                              : player.win_rate >= 50
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {player.win_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="bg-gradient-to-r from-gray-800 via-gray-750 to-gray-800 border-t border-gray-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400 font-medium">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredStats.length)} of {filteredStats.length}{" "}
                  gladiators
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold transform hover:scale-105"
                  >
                    Previous
                  </button>
                  <span className="px-6 py-3 text-gray-300 font-semibold">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold transform hover:scale-105"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Summary Cards with Smart Contract Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 overflow-hidden">
          {/* Total Matches Card */}
          <div className="summary-card bg-gray-800 rounded-xl border border-gray-700 p-8 shadow-2xl transition-all duration-300">
            <div className="stat-container">
              <div className="stat-number text-4xl font-bold text-red-400 mb-2">{totalMatches}</div>
              <div className="text-gray-300 font-semibold text-lg">Total Matches</div>
              <div className="text-gray-500 text-sm mt-1">From Blockchain</div>
            </div>
          </div>

          {/* Gladiators in Arena Card */}
          <div className="summary-card bg-gray-800 rounded-xl border border-gray-700 p-8 shadow-2xl transition-all duration-300">
            <div className="stat-container">
              <div className="stat-number text-4xl font-bold text-red-400 mb-2">{totalGladiators}</div>
              <div className="text-gray-300 font-semibold text-lg">Gladiators in Arena</div>
              <div className="text-gray-500 text-sm mt-1">Active Combatants</div>
            </div>
          </div>

          {/* Arena Status Card */}
          <div className="summary-card bg-gray-800 rounded-xl border border-gray-700 p-8 shadow-2xl transition-all duration-300">
            <div className="stat-container">
              <div className={`stat-number text-4xl font-bold mb-2 ${contract ? "text-green-400" : "text-red-400"}`}>
                {arenaStatus}
              </div>
              <div className="text-gray-300 font-semibold text-lg">Contract Status</div>
              <div className="text-gray-500 text-sm mt-1">
                {contract ? "Blockchain Connected" : "Connection Failed"}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Gladiator Profile Modal with Smart Contract Match History */}
      {selectedPlayer && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-6 modal-overlay ${modalVisible ? "visible" : ""}`}
        >
          <div
            className={`bg-gray-800 rounded-xl border border-red-500 shadow-2xl max-w-lg w-full modal-content ${modalVisible ? "visible" : ""}`}
          >
            {/* Enhanced Modal Header */}
            <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border-b border-red-500 px-8 py-6 flex justify-between items-center rounded-t-xl">
              <h3 className="text-2xl font-bold text-red-400">Gladiator Profile: {selectedPlayer.twitter_handle}</h3>
              <button
                onClick={closePlayerProfile}
                className="text-gray-400 hover:text-red-400 transition-all duration-300 p-2 rounded-lg hover:bg-gray-700 transform hover:scale-110"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Enhanced Modal Content with Smart Contract Match History */}
            <div className="p-8 max-h-96 overflow-y-auto custom-scrollbar">
              {/* Enhanced Profile Picture Placeholder */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center border-4 border-red-500 shadow-2xl">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              </div>

              {/* Player Description */}
              <div className="text-center mb-8">
                <h4 className="text-xl font-bold text-gray-200 mb-3">{selectedPlayer.twitter_handle}</h4>
                <p className="text-gray-400 italic text-sm leading-relaxed">"{selectedPlayer.description}"</p>
              </div>

              {/* Enhanced Combat Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center bg-gray-750 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">{selectedPlayer.total_wins}</div>
                  <div className="text-gray-400 text-sm">Victories</div>
                </div>
                <div className="text-center bg-gray-750 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-400">{selectedPlayer.total_losses}</div>
                  <div className="text-gray-400 text-sm">Defeats</div>
                </div>
                <div className="text-center bg-gray-750 rounded-lg p-4">
                  <div
                    className={`text-2xl font-bold ${
                      selectedPlayer.win_rate >= 70
                        ? "text-green-400"
                        : selectedPlayer.win_rate >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {selectedPlayer.win_rate.toFixed(1)}%
                  </div>
                  <div className="text-gray-400 text-sm">Win Rate</div>
                </div>
              </div>

              {/* Smart Contract Match History Section */}
              <div className="bg-gray-750 rounded-lg p-6 mb-8">
                <h5 className="text-xl font-bold text-gray-200 mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Match History
                </h5>

                {playerMatches.length > 0 ? (
                  <div className="space-y-4">
                    {playerMatches.map((match) => (
                      <div
                        key={match.match_id}
                        className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Match #{match.match_id}</div>
                          <button
                            onClick={() => handleOpponentClick(match.opponent_twitter_handle)}
                            className="text-red-400 hover:text-red-300 font-medium transition-all duration-200 hover:underline flex items-center"
                          >
                            <User className="w-4 h-4 mr-1" />
                            {match.opponent_twitter_handle}
                          </button>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-bold ${
                              match.result === "win" ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {match.player_score} - {match.opponent_score}
                          </div>
                          <div className="text-xs uppercase font-semibold mt-1">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                match.result === "win" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"
                              }`}
                            >
                              {match.result}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-4">No match history available for this gladiator</div>
                )}
              </div>

              {/* Enhanced Twitter Link */}
              <div className="text-center mb-6">
                <a
                  href={getTwitterUrl(selectedPlayer.twitter_handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Visit Twitter Profile</span>
                </a>
              </div>
            </div>

            {/* Enhanced Modal Footer */}
            <div className="bg-gradient-to-r from-gray-800 via-gray-750 to-gray-800 border-t border-gray-700 px-8 py-6 rounded-b-xl">
              <button
                onClick={closePlayerProfile}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
