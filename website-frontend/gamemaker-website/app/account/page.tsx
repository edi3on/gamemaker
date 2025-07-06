"use client";

import { useEffect, useState } from "react";
import {
  ChainIds,
  ConnectorError,
  ConnectorErrorType,
  requestRoninWalletConnector,
} from "@sky-mavis/tanto-connect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wallet, RefreshCw, ExternalLink, Copy, CheckCircle, AlertCircle, Search } from "lucide-react";
import type { RoninWalletConnector } from "@sky-mavis/tanto-connect";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import * as ethers from "ethers";

// Declare Ronin wallet types
declare global {
  interface Window {
    ronin?: {
      request: (args: { method: string; params: any[] }) => Promise<any>;
      isConnected: boolean;
      isReady: boolean;
    };
  }
}

const SOLARI_CONTRACT_ADDRESS = "0x4EB6b4fD536B13A42559f30E760F2389D91F5919";
const SOLARI_ABI = [
  // ERC20 functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  
  // SolariToken specific functions
  "function getUserProfile(string userId) view returns (string, uint256, address)",
  "function addressToUserId(address) view returns (string)",
  "function claimTokens()",
  
  // Events
  "event TokensClaimed(string indexed userId, address indexed ethAddress, uint256 amount)",
  "event ProfileUpdated(string indexed userId, uint256 unclaimedTokens, address ethAddress)"
];

export default function AccountPage() {
  const [connector, setConnector] = useState<RoninWalletConnector | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [userAddresses, setUserAddresses] = useState<string[] | undefined>();
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userIdInput, setUserIdInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ userId: string; unclaimed: number; ethAddress: string } | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenSymbol, setTokenSymbol] = useState<string>("SOLI");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [flowUserId, setFlowUserId] = useState<string | null>(null);
  const [flowProfile, setFlowProfile] = useState<{ userId: string; twitterHandle: string; ethereumAddress: string; createdAt: number; matchesPlayed: number; matchesWon: number } | null>(null);
  const [flowProfileError, setFlowProfileError] = useState<string | null>(null);

  const switchChain = async (chainId: number) => {
    // Always switch to Saigon testnet
    try {
      await connector?.switchChain(ChainIds.RoninTestnet);
      setCurrentChainId(ChainIds.RoninTestnet);
    } catch (error) {
      console.error(error);
    }
  };

  const getRoninWalletConnector = async () => {
    try {
      const connector = await requestRoninWalletConnector();
      return connector;
    } catch (error) {
      if (error instanceof ConnectorError) {
        setError(error.name);
      }
      return null;
    }
  };

  const connectRoninWallet = async () => {
    if (!connector && error === ConnectorErrorType.PROVIDER_NOT_FOUND) {
      window.open("https://wallet.roninchain.com", "_blank");
      return;
    }

    setIsConnecting(true);
    try {
      const connectResult = await connector?.connect();

      if (connectResult) {
        console.log('[DEBUG] Ronin wallet returned address:', connectResult.account);
        setConnectedAddress(connectResult.account);
        
        // Always switch to Saigon testnet
        await switchChain(ChainIds.RoninTestnet);
      }

      const accounts = await connector?.getAccounts();

      if (accounts) {
        console.log('[DEBUG] Ronin wallet getAccounts returned:', accounts);
        setUserAddresses(accounts);
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    getRoninWalletConnector().then((connector) => {
      setConnector(connector);
    });
  }, []);

  // Fetch user data when wallet connects
  useEffect(() => {
    if (connectedAddress) {
      fetchFlowProfile(connectedAddress);
    }
  }, [connectedAddress]);

  // Solari contract configuration
  const SOLARI_CONTRACT_CONFIG = {
    RPC_URL: "https://saigon-testnet.roninchain.com/rpc",
    CONTRACT_ADDRESS: "0x4EB6b4fD536B13A42559f30E760F2389D91F5919"
  }

  // Flow contract configuration
  const FLOW_CONTRACT_CONFIG = {
    RPC_URL: "https://testnet.evm.nodes.onflow.org/",
    FALLBACK_RPC_URL: "https://mainnet.evm.nodes.onflow.org/", // Fallback to mainnet if testnet fails
    CONTRACT_ADDRESS: "0xeE90B01f8C0Dbb7836DFfbb09Fd894A799911cB1"
  }

  const FLOW_CONTRACT_ABI = [
    {
      "inputs": [
        { "internalType": "string", "name": "userId", "type": "string" }
      ],
      "name": "getUserProfile",
      "outputs": [
        { "internalType": "string", "name": "", "type": "string" },
        { "internalType": "string", "name": "", "type": "string" },
        { "internalType": "address", "name": "", "type": "address" },
        { "internalType": "uint256", "name": "", "type": "uint256" },
        { "internalType": "uint256", "name": "", "type": "uint256" },
        { "internalType": "uint256", "name": "", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "ethAddress", "type": "address" }
      ],
      "name": "getUserIdByAddress",
      "outputs": [
        { "internalType": "string", "name": "", "type": "string" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]

  // Fetch Solari token data using Flow userId
  const fetchSolariTokenData = async (flowUserId: string, address: string) => {
    console.log("🔄 Starting Solari token fetch with Flow userId:", flowUserId)
    
    if (!flowUserId || !address) {
      console.log("❌ Missing Flow userId or address, skipping Solari token fetch")
      setProfileError("Missing Flow userId or address")
      return
    }

    console.log("📡 Connected address:", address)
    console.log("🏗️ Solari contract address:", SOLARI_CONTRACT_CONFIG.CONTRACT_ADDRESS)

    try {
      console.log("🔗 Creating Solari provider and contract...")
      
      // Use JsonRpcProvider for Ronin testnet with timeout
      const provider = new ethers.JsonRpcProvider(SOLARI_CONTRACT_CONFIG.RPC_URL)
      const contract = new ethers.Contract(SOLARI_CONTRACT_CONFIG.CONTRACT_ADDRESS, SOLARI_ABI, provider)
      
      // Test connection with timeout
      const networkPromise = provider.getNetwork()
      const networkTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Ronin network timeout after 8 seconds")), 8000)
      )
      
      await Promise.race([networkPromise, networkTimeoutPromise])
      console.log("✅ Solari contract created successfully")

      // Get token balance and info using the Flow userId with timeout
      console.log("🔍 Fetching token data for Flow userId:", flowUserId)
      
      const dataPromise = Promise.all([
        contract.balanceOf(address),
        contract.symbol(),
        contract.decimals(),
        contract.getUserProfile(flowUserId)
      ])
      
      const dataTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Solari contract calls timeout after 15 seconds")), 15000)
      )
      
      const [balance, symbol, decimals, userProfile] = await Promise.race([dataPromise, dataTimeoutPromise]) as any
      
      // Extract unclaimed tokens from user profile
      const [userId, unclaimedTokens, ethAddress] = userProfile
      console.log("💰 Balance:", ethers.formatEther(balance))
      console.log("🎁 Unclaimed tokens:", Number(unclaimedTokens))

      setTokenBalance(Number(balance) / Math.pow(10, Number(decimals)))
      setTokenSymbol(symbol)
      setTokenDecimals(Number(decimals))

      // Set profile with Flow userId
      setProfile({
        userId: flowUserId,
        unclaimed: Number(unclaimedTokens),
        ethAddress: address
      })
      setProfileError(null)

      console.log("✅ Solari token data successfully fetched using Flow userId")

    } catch (err) {
      console.error("❌ Error fetching Solari token data:", err)
      console.error("❌ Error details:", {
        message: err instanceof Error ? err.message : "Unknown error",
        code: err instanceof Error ? (err as any).code : "Unknown",
        stack: err instanceof Error ? err.stack : "No stack trace"
      })
      setProfile(null)
      setProfileError(err instanceof Error ? err.message : "Failed to fetch Solari token data")
    }
  }

  // Fetch Flow profile using connected wallet address
  const fetchFlowProfile = async (address: string) => {
    console.log("🔄 Starting Flow profile fetch...")
    
    if (!address) {
      console.log("❌ No connected address, skipping Flow profile fetch")
      setFlowProfileError("No connected address")
      return
    }

    console.log("📡 Connected address:", address)
    console.log("🏗️ Flow contract address:", FLOW_CONTRACT_CONFIG.CONTRACT_ADDRESS)

    try {
      console.log("🔗 Creating Flow provider and contract...")
      
      let flowProvider: ethers.JsonRpcProvider
      let flowContract: ethers.Contract

      // Try primary RPC first, then fallback
      try {
        console.log("🌐 Trying primary Flow RPC:", FLOW_CONTRACT_CONFIG.RPC_URL)
        flowProvider = new ethers.JsonRpcProvider(FLOW_CONTRACT_CONFIG.RPC_URL)
        
        // Test connection with timeout
        const networkPromise = flowProvider.getNetwork()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Primary Flow RPC timeout after 8 seconds")), 8000)
        )
        
        await Promise.race([networkPromise, timeoutPromise])
        console.log("✅ Primary Flow RPC connected successfully")
        
      } catch (primaryErr) {
        console.warn("⚠️ Primary Flow RPC failed, trying fallback:", primaryErr)
        
        console.log("🌐 Trying fallback Flow RPC:", FLOW_CONTRACT_CONFIG.FALLBACK_RPC_URL)
        flowProvider = new ethers.JsonRpcProvider(FLOW_CONTRACT_CONFIG.FALLBACK_RPC_URL)
        
        const networkPromise = flowProvider.getNetwork()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Fallback Flow RPC timeout after 8 seconds")), 8000)
        )
        
        await Promise.race([networkPromise, timeoutPromise])
        console.log("✅ Fallback Flow RPC connected successfully")
      }

      flowContract = new ethers.Contract(FLOW_CONTRACT_CONFIG.CONTRACT_ADDRESS, FLOW_CONTRACT_ABI, flowProvider)
      console.log("✅ Flow contract created successfully")

      // Convert address to lowercase for lookup
      const lowercaseAddress = address.toLowerCase()
      console.log("🔍 Calling getUserIdByAddress with address:", lowercaseAddress)
      
      // Add timeout to contract calls
      const userIdPromise = flowContract.getUserIdByAddress(lowercaseAddress)
      const userIdTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("getUserIdByAddress timeout after 10 seconds")), 10000)
      )
      
      const userId = await Promise.race([userIdPromise, userIdTimeoutPromise]) as string
      console.log("📥 getUserIdByAddress result:", userId)
      
      if (userId && userId !== "") {
        console.log("✅ Found userId:", userId)
        
        // Get user profile using the userId with timeout
        const profilePromise = flowContract.getUserProfile(userId)
        const profileTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("getUserProfile timeout after 10 seconds")), 10000)
        )
        
        const profile = await Promise.race([profilePromise, profileTimeoutPromise]) as any
        console.log("📋 User profile:", profile)
        
        setFlowUserId(userId)
        setFlowProfile({
          userId: userId,
          twitterHandle: profile[1] || "",
          ethereumAddress: profile[2] || "",
          createdAt: Number(profile[3]) || 0,
          matchesPlayed: Number(profile[4]) || 0,
          matchesWon: Number(profile[5]) || 0
        })
        setFlowProfileError(null)

        // Now fetch Solari token data using the Flow userId
        console.log("🔄 Fetching Solari token data with Flow userId:", userId)
        await fetchSolariTokenData(userId, address)
      } else {
        console.log("❌ No userId found for address:", address)
        setFlowUserId("")
        setFlowProfile(null)
        setFlowProfileError("No profile found for this address")
      }

    } catch (err) {
      console.error("❌ Error fetching Flow profile:", err)
      console.error("❌ Error details:", {
        message: err instanceof Error ? err.message : "Unknown error",
        code: err instanceof Error ? (err as any).code : "Unknown",
        stack: err instanceof Error ? err.stack : "No stack trace"
      })
      setFlowUserId("")
      setFlowProfile(null)
      setFlowProfileError(err instanceof Error ? err.message : "Failed to fetch Flow profile")
    }
  }

  // Claim tokens
  async function claimTokens() {
    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(false);
    try {
      if (!connector) throw new Error("No wallet connector");
      if (!flowUserId) throw new Error("No Flow userId found");
      
      console.log("🔍 Claiming tokens for Flow userId:", flowUserId)
      
      // Create transaction data
      const contract = new ethers.Contract(SOLARI_CONTRACT_CONFIG.CONTRACT_ADDRESS, SOLARI_ABI);
      const data = contract.interface.encodeFunctionData("claimTokens");
      
      console.log("📝 Transaction data:", data)
      
      // Send transaction using connector's provider
      const provider = await connector.getProvider();
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          to: SOLARI_CONTRACT_CONFIG.CONTRACT_ADDRESS,
          data: data,
          from: connectedAddress,
          value: '0x0',
          //gas: '0x186a0'
        }]
      });
      
      console.log("✅ Transaction sent:", txHash)
      setClaimSuccess(true);
      
      // Wait a bit then refresh profile and token balance
      setTimeout(async () => {
        if (connectedAddress && flowUserId) {
          await fetchSolariTokenData(flowUserId, connectedAddress);
        }
      }, 2000);
      
    } catch (err: any) {
      console.error("Claim error:", err);
      setClaimError(err.message || "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  const formatConnectedChain = (chainId: number | null) => {
    switch (chainId) {
      case ChainIds.RoninMainnet:
        return "Ronin Mainnet";
      case ChainIds.RoninTestnet:
        return "Saigon Testnet";
      case null:
        return "Unknown Chain";
      default:
        return `Unknown Chain (${chainId})`;
    }
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainColor = (chainId: number | null) => {
    switch (chainId) {
      case ChainIds.RoninMainnet:
        return "bg-green-100 text-green-800";
      case ChainIds.RoninTestnet:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 overflow-hidden">
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .title-glow {
          animation: titleGlow 3s ease-in-out infinite;
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 2px #e53e3e, 0 0 4px #e53e3e, 0 0 6px #e53e3e; }
          50% { text-shadow: 0 0 4px #e53e3e, 0 0 8px #e53e3e, 0 0 12px #e53e3e; }
        }
      `}</style>
      <div className="container mx-auto px-4 py-8 max-w-4xl fade-in">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-red-500 title-glow mb-2">Account</h1>
          <p className="text-gray-400">Connect your Ronin Wallet to manage your account</p>
        </div>
        <div className="grid gap-6">
          {/* Connection Status Card */}
          <Card className="bg-gray-800 border border-gray-700 text-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Wallet className="h-5 w-5 text-red-400" />
                Wallet Connection
              </CardTitle>
              <CardDescription className="text-gray-400">
                Connect your Ronin Wallet to access your account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!connectedAddress ? (
                <div className="space-y-4">
                  {error === ConnectorErrorType.PROVIDER_NOT_FOUND && (
                    <div className="flex items-center gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div>
                        <p className="text-sm font-medium text-red-300">
                          Ronin Wallet not found
                        </p>
                        <p className="text-sm text-red-400">
                          Please install Ronin Wallet extension to continue
                        </p>
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={connectRoninWallet} 
                    disabled={isConnecting}
                    className="w-full bg-red-500 hover:bg-red-400 text-white border-none"
                    size="lg"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4 mr-2" />
                        Connect Ronin Wallet
                      </>
                    )}
                  </Button>
                  {error === ConnectorErrorType.PROVIDER_NOT_FOUND && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open("https://wallet.roninchain.com", "_blank")}
                      className="w-full border-gray-700 text-gray-200 hover:bg-gray-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Install Ronin Wallet
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-sm font-medium text-green-200">
                      Wallet Connected Successfully
                    </span>
                  </div>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium text-gray-300">Connected Address:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-800 px-2 py-1 rounded text-gray-200 border border-gray-700">
                          {formatAddress(connectedAddress)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-red-400"
                          onClick={() => copyToClipboard(connectedAddress)}
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium text-gray-300">Network:</span>
                      <Badge className="bg-blue-100 text-blue-800 border-none">
                        Saigon Testnet
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solari Token Card */}
          {connectedAddress && (
            <Card className="bg-gray-800 border border-gray-700 text-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-100">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">S</span>
                  </div>
                  Solari Token ({tokenSymbol})
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Claim your earned tokens from matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profileError === "notfound" ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <div className="text-4xl mb-2">🏛️</div>
                      <p className="text-lg font-medium">No Profile Found</p>
                      <p className="text-sm">This address is not linked to any user profile</p>
                    </div>
                  </div>
                ) : profile ? (
                  <div className="space-y-4">
                    {/* Token Balance */}
                    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Current Balance</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {tokenBalance.toLocaleString()} {tokenSymbol}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <span className="text-yellow-400 font-bold">S</span>
                      </div>
                    </div>

                    {/* Unclaimed Tokens */}
                    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div>
                        <p className="text-sm font-medium text-gray-400">Unclaimed Tokens</p>
                        <p className="text-2xl font-bold text-green-400">
                          {profile.unclaimed} {tokenSymbol}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                        <span className="text-green-400 font-bold">🎁</span>
                      </div>
                    </div>

                    {/* User ID */}
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium text-gray-300">User ID:</span>
                      <code className="text-sm bg-gray-800 px-2 py-1 rounded text-gray-200 border border-gray-700">
                        {profile.userId}
                      </code>
                    </div>

                    {/* Claim Button */}
                    {profile.unclaimed > 0 && (
                      <div className="space-y-3">
                        <Separator className="bg-gray-700" />
                        <Button
                          onClick={claimTokens}
                          disabled={claiming}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white border-none"
                          size="lg"
                        >
                          {claiming ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Claiming {profile.unclaimed} {tokenSymbol}...
                            </>
                          ) : (
                            <>
                              <span className="text-lg mr-2">🎁</span>
                              Claim {profile.unclaimed} {tokenSymbol}
                            </>
                          )}
                        </Button>
                        
                        {claimSuccess && (
                          <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="text-sm font-medium text-green-200">
                              Successfully claimed {profile.unclaimed} {tokenSymbol}!
                            </span>
                          </div>
                        )}
                        
                        {claimError && (
                          <div className="flex items-center gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-red-400" />
                            <span className="text-sm font-medium text-red-200">
                              {claimError}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {profile.unclaimed === 0 && (
                      <div className="text-center py-4">
                        <div className="text-gray-400">
                          <div className="text-2xl mb-2">✅</div>
                          <p className="text-sm">No tokens to claim</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-red-500 border-solid mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading profile...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Flow Profile Card */}
          {connectedAddress && (
            <Card className="bg-gray-800 border border-gray-700 text-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-100">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">F</span>
                  </div>
                  Flow Profile
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Your profile from the Flow contract
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flowProfileError ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <div className="text-4xl mb-2">🏛️</div>
                      <p className="text-lg font-medium">No Flow Profile Found</p>
                      <p className="text-sm">{flowProfileError}</p>
                    </div>
                  </div>
                ) : flowProfile ? (
                  <div className="space-y-4">
                    {/* User ID */}
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium text-gray-300">Flow User ID:</span>
                      <code className="text-sm bg-gray-800 px-2 py-1 rounded text-gray-200 border border-gray-700">
                        {flowProfile.userId}
                      </code>
                    </div>

                    {/* Twitter Handle */}
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium text-gray-300">Twitter Handle:</span>
                      <span className="text-sm font-medium text-blue-400">
                        {flowProfile.twitterHandle}
                      </span>
                    </div>

                    {/* Match Statistics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center bg-gray-900 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-400">{flowProfile.matchesWon}</div>
                        <div className="text-gray-400 text-sm">Matches Won</div>
                      </div>
                      <div className="text-center bg-gray-900 rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-400">{flowProfile.matchesPlayed - flowProfile.matchesWon}</div>
                        <div className="text-gray-400 text-sm">Matches Lost</div>
                      </div>
                    </div>

                    {/* Total Matches */}
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium text-gray-300">Total Matches:</span>
                      <span className="text-sm font-bold text-gray-200">
                        {flowProfile.matchesPlayed}
                      </span>
                    </div>

                    {/* Win Rate */}
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium text-gray-300">Win Rate:</span>
                      <span className={`text-sm font-bold ${
                        flowProfile.matchesPlayed > 0 
                          ? (flowProfile.matchesWon / flowProfile.matchesPlayed * 100) >= 70
                            ? "text-green-400"
                            : (flowProfile.matchesWon / flowProfile.matchesPlayed * 100) >= 50
                              ? "text-yellow-400"
                              : "text-red-400"
                          : "text-gray-400"
                      }`}>
                        {flowProfile.matchesPlayed > 0 
                          ? `${(flowProfile.matchesWon / flowProfile.matchesPlayed * 100).toFixed(1)}%`
                          : "N/A"
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 border-solid mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading Flow profile...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 