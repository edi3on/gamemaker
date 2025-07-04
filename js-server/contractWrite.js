//
// Module to add a match to the GameContract onchain.
// Usage: import { addMatch } from './contractWrite.js'
//        await addMatch(player1, player2, winner);
//
// Assumes the winner won all 5 rounds.
//

import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

dotenv.config();

const contractABI = [
  {
    "inputs": [
      { "internalType": "string[2]", "name": "playerNames", "type": "string[2]" },
      { "internalType": "string[5]", "name": "roundWinners", "type": "string[5]" },
      { "internalType": "string", "name": "matchWinner", "type": "string" }
    ],
    "name": "addMatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const { PRIVATE_KEY, CONTRACT_ADDRESS, SEPOLIA_RPC_URL } = process.env;

let contractInstance = null;

/**
 * Initializes and returns the ethers.Contract instance (singleton).
 */
async function getContract() {
  if (contractInstance) return contractInstance;
  if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !SEPOLIA_RPC_URL) {
    throw new Error("Missing required environment variables (PRIVATE_KEY, CONTRACT_ADDRESS, SEPOLIA_RPC_URL).");
  }
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  contractInstance = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
  return contractInstance;
}

/**
 * Adds a match to the contract.
 * @param {string} player1 - First player's name/handle.
 * @param {string} player2 - Second player's name/handle.
 * @param {string} winner - Winner's name/handle.
 * @returns {Promise<string>} Transaction hash.
 */
export async function addMatch(player1, player2, winner) {
  const contract = await getContract();
  // Winner wins all 5 rounds
  const playerNames = [player1, player2];
  const roundWinners = Array(5).fill(winner);
  const matchWinner = winner;

  try {
    const tx = await contract.addMatch(playerNames, roundWinners, matchWinner);
    console.log(`addMatch tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Match added in block: ${receipt.blockNumber}`);
    return tx.hash;
  } catch (error) {
    if (error.code === 'CALL_EXCEPTION') {
      console.error(`❌ Transaction reverted. Reason: ${error.reason || 'Check contract require statements.'}`);
    } else {
      console.error(`❌ Error in addMatch:`, error.message);
    }
    throw error;
  }
}