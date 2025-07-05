//
// Module to add a match to the MatchHistory contract onchain (Saga only).
// Usage: import { addMatch } from './contractWrite.js'
//        await addMatch({ challengerName, challengerUserId, opponentName, opponentUserId, matchWinner, aiPrompt });
//

import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

dotenv.config({ path: "/Users/edi3on/Code/gamemaker/.env" }); // <-- Path to your .env file

const contractABI = [
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
  }
];

// Clean gladiator name: remove leading @, trim, lowercase, and remove spaces
function cleanGladiatorName(name) {
  return name.replace(/^@/, "").trim().toLowerCase().replace(/\s+/g, "");
}

// Clean userId: trim and remove spaces
function cleanUserId(id) {
  return id.trim().replace(/\s+/g, "");
}

/**
 * Adds a match to the contract on Saga.
 * @param {Object} matchObj - Object with keys: challengerName, challengerUserId, opponentName, opponentUserId, matchWinner, aiPrompt
 * @returns {Promise<string>} Transaction hash.
 */
export async function addMatch(matchObj) {
  const PRIVATE_KEY = process.env.PRIVATE_KEY_SAGA;
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_SAGA;
  const RPC_URL = process.env.RPC_URL_SAGA;

  if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
    throw new Error("Missing required environment variables for Saga (PRIVATE_KEY_SAGA, CONTRACT_ADDRESS_SAGA, RPC_URL_SAGA)");
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Using wallet address:", wallet.address);

  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

  // Clean and validate all fields
  const challengerName = cleanGladiatorName(matchObj.challengerName);
  const challengerUserId = cleanUserId(matchObj.challengerUserId);
  const opponentName = cleanGladiatorName(matchObj.opponentName);
  const opponentUserId = cleanUserId(matchObj.opponentUserId);
  const matchWinner = cleanGladiatorName(matchObj.matchWinner);
  const aiPrompt = (matchObj.aiPrompt || "").trim();

  if (!challengerName || !opponentName) throw new Error("Player names cannot be empty");
  if (challengerName === opponentName) throw new Error("Players must be different");
  if (!challengerUserId || !opponentUserId) throw new Error("User IDs cannot be empty");
  if (matchWinner !== challengerName && matchWinner !== opponentName) throw new Error("Match winner must be one of the players");

  console.log({
    challengerName,
    challengerUserId,
    opponentName,
    opponentUserId,
    matchWinner,
    aiPrompt
  });

  try {
    const tx = await contract.addMatch(
      challengerName,
      challengerUserId,
      opponentName,
      opponentUserId,
      matchWinner,
      aiPrompt
    );
    console.log(`addMatch tx sent on saga: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Match added on saga in block: ${receipt.blockNumber}`);
    return tx.hash;
  } catch (error) {
    if (error.code === 'CALL_EXCEPTION') {
      console.error(`❌ Transaction reverted on saga. Reason: ${error.reason || 'Check contract require statements.'}`);
    } else {
      console.error(`❌ Error in addMatch on saga:`, error.message);
    }
    throw error;
  }
}