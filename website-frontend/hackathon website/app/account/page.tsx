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
import { Wallet, RefreshCw, ExternalLink, Copy, CheckCircle, AlertCircle } from "lucide-react";
import type { RoninWalletConnector } from "@sky-mavis/tanto-connect";
import { BrowserProvider, Contract } from "ethers";

const SOLARI_CONTRACT_ADDRESS = "0xE1Dc4EcBb8EF2Eaf19103A54dDeeD3A0F8274aE7";
const SOLARI_ABI = [
  "function getUserIdByAddress(address) view returns (string)",
  "function getUserProfile(string userId) view returns (string,uint256,address)",
  "function claimTokens()",
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

  const switchChain = async (chainId: number) => {
    try {
      await connector?.switchChain(chainId);
      setCurrentChainId(chainId);
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
        setCurrentChainId(connectResult.chainId);
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

  // Fetch userId and profile when wallet connects
  useEffect(() => {
    async function fetchUserIdAndProfile() {
      setUserId(null);
      setProfile(null);
      setProfileError(null);
      setClaimSuccess(false);
      setClaimError(null);
      if (!connectedAddress) return;
      try {
        if (!window.ronin) return;
        const provider = new BrowserProvider(window.ronin);
        const contract = new Contract(SOLARI_CONTRACT_ADDRESS, SOLARI_ABI, provider);
        const userId = await contract.getUserIdByAddress(connectedAddress);
        if (!userId || userId === "") {
          setProfileError("notfound");
          return;
        }
        setUserId(userId);
        const [uid, unclaimed, ethAddress] = await contract.getUserProfile(userId);
        setProfile({ userId: uid, unclaimed: Number(unclaimed), ethAddress });
      } catch (err: any) {
        setProfile(null);
        setProfileError("notfound");
      }
    }
    fetchUserIdAndProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress]);

  // Claim tokens
  async function claimTokens() {
    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(false);
    try {
      if (!window.ronin) throw new Error("No wallet");
      const provider = new BrowserProvider(window.ronin);
      const signer = await provider.getSigner();
      const contract = new Contract(SOLARI_CONTRACT_ADDRESS, SOLARI_ABI, signer);
      const tx = await contract.claimTokens();
      await tx.wait();
      setClaimSuccess(true);
      // Refresh profile
      if (userId) {
        const [uid, unclaimed, ethAddress] = await contract.getUserProfile(userId);
        setProfile({ userId: uid, unclaimed: Number(unclaimed), ethAddress });
      }
    } catch (err: any) {
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
                      <span className="text-sm font-medium text-gray-300">Current Chain:</span>
                      <Badge className={getChainColor(currentChainId) + " border-none"}>
                        {formatConnectedChain(currentChainId)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Chain Switching Card */}
          {connectedAddress && (
            <Card className="bg-gray-800 border border-gray-700 text-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-100">Network Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Switch between Ronin Mainnet and Saigon Testnet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={currentChainId === ChainIds.RoninMainnet ? "default" : "outline"}
                      onClick={() => switchChain(ChainIds.RoninMainnet)}
                      className={
                        (currentChainId === ChainIds.RoninMainnet
                          ? "bg-red-500 hover:bg-red-400 text-white border-none"
                          : "bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-700") +
                        " justify-start"
                      }
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Ronin Mainnet
                      </div>
                    </Button>
                    <Button
                      variant={currentChainId === ChainIds.RoninTestnet ? "default" : "outline"}
                      onClick={() => switchChain(ChainIds.RoninTestnet)}
                      className={
                        (currentChainId === ChainIds.RoninTestnet
                          ? "bg-red-500 hover:bg-red-400 text-white border-none"
                          : "bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-700") +
                        " justify-start"
                      }
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Saigon Testnet
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Wallet Details Card */}
          {connectedAddress && userAddresses && (
            <Card className="bg-gray-800 border border-gray-700 text-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-100">Wallet Details</CardTitle>
                <CardDescription className="text-gray-400">
                  All addresses associated with your Ronin Wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userAddresses.map((address, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-400">
                          Address {index + 1}:
                        </span>
                        <code className="text-sm bg-gray-800 px-2 py-1 rounded text-gray-200 border border-gray-700">
                          {formatAddress(address)}
                        </code>
                        {address === connectedAddress && (
                          <Badge variant="secondary" className="text-xs bg-red-500 text-white border-none">
                            Active
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-400"
                        onClick={() => copyToClipboard(address)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 