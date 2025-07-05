import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

// Polyfill __dirname for ES modules
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// --- CONFIGURATION ---
const SAGA_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_SAGA;
const SAGA_RPC_URL = process.env.RPC_URL_SAGA;
const SAGA_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "initialOwner", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "matchId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "challengerName", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "challengerUserId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "opponentName", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "opponentUserId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "matchWinner", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "aiPrompt", "type": "string" }
    ],
    "name": "MatchAdded",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "challengerName", "type": "string" },
      { "internalType": "string", "name": "challengerUserId", "type": "string" },
      { "internalType": "string", "name": "opponentName", "type": "string" },
      { "internalType": "string", "name": "opponentUserId", "type": "string" },
      { "internalType": "string", "name": "matchWinner", "type": "string" },
      { "internalType": "string", "name": "aiPrompt", "type": "string" }
    ],
    "name": "addMatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "n", "type": "uint256" }],
    "name": "getRecentMatches",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "matchId", "type": "uint256" },
          { "internalType": "string", "name": "challengerName", "type": "string" },
          { "internalType": "string", "name": "challengerUserId", "type": "string" },
          { "internalType": "string", "name": "opponentName", "type": "string" },
          { "internalType": "string", "name": "opponentUserId", "type": "string" },
          { "internalType": "string", "name": "matchWinner", "type": "string" },
          { "internalType": "string", "name": "aiPrompt", "type": "string" }
        ],
        "internalType": "struct MatchHistory.Match[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "matchId", "type": "uint256" }],
    "name": "getMatch",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "matchId", "type": "uint256" },
          { "internalType": "string", "name": "challengerName", "type": "string" },
          { "internalType": "string", "name": "challengerUserId", "type": "string" },
          { "internalType": "string", "name": "opponentName", "type": "string" },
          { "internalType": "string", "name": "opponentUserId", "type": "string" },
          { "internalType": "string", "name": "matchWinner", "type": "string" },
          { "internalType": "string", "name": "aiPrompt", "type": "string" }
        ],
        "internalType": "struct MatchHistory.Match",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "matchCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const FLOW_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_FLOW;
const FLOW_RPC_URL = process.env.RPC_URL_FLOW;
const FLOW_PRIVATE_KEY = process.env.PRIVATE_KEY_FLOW;
const FLOW_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "initialOwner", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "string", "name": "userId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "twitterHandle", "type": "string" },
      { "indexed": false, "internalType": "address", "name": "ethAddress", "type": "address" }
    ],
    "name": "UserUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "fromMatchId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "toMatchId", "type": "uint256" }
    ],
    "name": "MatchesSynced",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "matchId", "type": "uint256" },
          { "internalType": "string", "name": "challengerName", "type": "string" },
          { "internalType": "string", "name": "challengerUserId", "type": "string" },
          { "internalType": "string", "name": "opponentName", "type": "string" },
          { "internalType": "string", "name": "opponentUserId", "type": "string" },
          { "internalType": "string", "name": "matchWinner", "type": "string" },
          { "internalType": "string", "name": "aiPrompt", "type": "string" }
        ],
        "internalType": "struct FlowUserSync.Match[]",
        "name": "matches",
        "type": "tuple[]"
      },
      { "internalType": "uint256", "name": "latestMatchId", "type": "uint256" }
    ],
    "name": "syncMatches",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "userId", "type": "string" },
      { "internalType": "address", "name": "ethAddress", "type": "address" }
    ],
    "name": "updateEthereumAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lastSyncedMatchId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "userId", "type": "string" }],
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
    "inputs": [{ "internalType": "string", "name": "userId", "type": "string" }],
    "name": "getUserMatches",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "userId", "type": "string" }],
    "name": "getUserWins",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// --- RONIN CONFIGURATION ---
const RONIN_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_RONIN;
const RONIN_RPC_URL = process.env.RPC_URL_RONIN;
const RONIN_PRIVATE_KEY = process.env.PRIVATE_KEY_RONIN;
const RONIN_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "initialOwner", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "string", "name": "userId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "twitterHandle", "type": "string" },
      { "indexed": false, "internalType": "address", "name": "ethAddress", "type": "address" }
    ],
    "name": "UserUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "fromMatchId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "toMatchId", "type": "uint256" }
    ],
    "name": "MatchesSynced",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "matchId", "type": "uint256" },
          { "internalType": "string", "name": "challengerName", "type": "string" },
          { "internalType": "string", "name": "challengerUserId", "type": "string" },
          { "internalType": "string", "name": "opponentName", "type": "string" },
          { "internalType": "string", "name": "opponentUserId", "type": "string" },
          { "internalType": "string", "name": "matchWinner", "type": "string" },
          { "internalType": "string", "name": "aiPrompt", "type": "string" }
        ],
        "internalType": "struct FlowUserSync.Match[]",
        "name": "matches",
        "type": "tuple[]"
      },
      { "internalType": "uint256", "name": "latestMatchId", "type": "uint256" }
    ],
    "name": "syncMatches",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "userId", "type": "string" },
      { "internalType": "address", "name": "ethAddress", "type": "address" }
    ],
    "name": "updateEthereumAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lastSyncedMatchId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "userId", "type": "string" }],
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
    "inputs": [{ "internalType": "string", "name": "userId", "type": "string" }],
    "name": "getUserMatches",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "string", "name": "userId", "type": "string" }],
    "name": "getUserWins",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string[]", "name": "userIds", "type": "string[]" }
    ],
    "name": "batchIncrementUnclaimedTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// --- SETUP PROVIDERS & CONTRACTS ---
const sagaProvider = new ethers.JsonRpcProvider(SAGA_RPC_URL);
const sagaContract = new ethers.Contract(SAGA_CONTRACT_ADDRESS, SAGA_CONTRACT_ABI, sagaProvider);

const flowProvider = new ethers.JsonRpcProvider(FLOW_RPC_URL);
const flowWallet = new ethers.Wallet(FLOW_PRIVATE_KEY, flowProvider);
const flowContract = new ethers.Contract(FLOW_CONTRACT_ADDRESS, FLOW_CONTRACT_ABI, flowWallet);

const roninProvider = new ethers.JsonRpcProvider(RONIN_RPC_URL);
const roninWallet = new ethers.Wallet(RONIN_PRIVATE_KEY, roninProvider);
const roninContract = new ethers.Contract(RONIN_CONTRACT_ADDRESS, RONIN_CONTRACT_ABI, roninWallet);

// --- MAIN SYNC FUNCTION ---
async function syncSagaToFlow() {
  try {
    // 1. Get last synced matchId from Flow contract
    const lastSyncedMatchId = await flowContract.lastSyncedMatchId();

    // 2. Get all new matches from Saga contract
    // Assume sagaContract has a function: getRecentMatches(uint256 n)
    // We'll fetch 100 at a time, but only those with matchId > lastSyncedMatchId
    const batchSize = 100;
    let newMatches = [];
    let keepFetching = true;
    let offset = 0;

    while (keepFetching) {
      const matches = await sagaContract.getRecentMatches(batchSize + offset);
      // matches[0] is the most recent, so reverse to get ascending order
      const matchesAsc = [];
      for (let i = matches.length - 1; i >= 0; i--) {
        matchesAsc.push(matches[i]);
      }
      for (const m of matchesAsc) {
        if (m.matchId > lastSyncedMatchId) {
          newMatches.push(m);
        }
      }
      if (matchesAsc.length < batchSize || newMatches.length === 0) {
        keepFetching = false;
      } else {
        offset += batchSize;
      }
    }

    if (newMatches.length === 0) {
      console.log("No new matches to sync.");
      return;
    }

    // 3. Prepare matches for Flow contract (convert to expected struct)
    const flowMatches = newMatches.map(m => ({
      matchId: m.matchId,
      challengerName: m.challengerName,
      challengerUserId: m.challengerUserId,
      opponentName: m.opponentName,
      opponentUserId: m.opponentUserId,
      matchWinner: m.matchWinner,
      aiPrompt: m.aiPrompt
    }));

    // --- Collect updated userIds ---
    const updatedUserIds = new Set();
    for (const m of flowMatches) {
      if (m.challengerUserId) updatedUserIds.add(m.challengerUserId);
      if (m.opponentUserId) updatedUserIds.add(m.opponentUserId);
    }

    // 4. Call syncMatches on Flow contract
    const latestMatchId = flowMatches[flowMatches.length - 1].matchId;
    const tx = await flowContract.syncMatches(flowMatches, latestMatchId);
    console.log(`Syncing ${flowMatches.length} matches to Flow... TX: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Synced up to matchId ${latestMatchId}`);

    // --- Collect userIds to increment ---
    const incrementUserIds = new Set();
    for (const m of flowMatches) {
      if (m.challengerUserId) incrementUserIds.add(m.challengerUserId);
      if (m.opponentUserId) incrementUserIds.add(m.opponentUserId);
    }
    const userIdsArray = Array.from(incrementUserIds);

    if (userIdsArray.length > 0) {
      try {
        const tx = await roninContract.batchIncrementUnclaimedTokens(userIdsArray);
        console.log(`Incremented unclaimed tokens for ${userIdsArray.length} userIds on Ronin. TX: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Ronin increment complete.");
      } catch (err) {
        console.error("Error incrementing on Ronin:", err);
      }
    }

    // --- Print updated user IDs ---
    console.log("User IDs updated in this sync:", Array.from(updatedUserIds));
  } catch (err) {
    console.error("Error syncing matches:", err);
  }
}

// --- POLLING LOOP ---
async function main() {
  while (true) {
    await syncSagaToFlow();
    console.log("Waiting 2 minutes before next sync...");
    await new Promise(res => setTimeout(res, 2 * 60 * 1000));
  }
}

main();