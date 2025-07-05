//
// Module to add a match to the GameContract onchain.
// Usage: import { addMatch } from './contractWrite.js'
//        await addMatch(player1, player2, winner, chain);
//
// Assumes the winner won all 5 rounds.
// Supports chain selection: "saga", "ronin", "flow".
//

import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

dotenv.config({ path: "/Users/edi3on/Code/gamemaker/.env" }); // <-- Add the path to your .env file

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

// Helper to get env variable by chain and key
function getChainEnv(chain, key) {
  const upperChain = chain.toUpperCase();
  return process.env[`${key}_${upperChain}`];
}

let contractInstances = {};

/**
 * Initializes and returns the ethers.Contract instance for the given chain (singleton per chain).
 */
async function getContract(chain) {
  if (!chain) throw new Error("Chain must be specified (e.g., 'saga', 'ronin', 'flow').");
  if (contractInstances[chain]) return contractInstances[chain];

  const PRIVATE_KEY = getChainEnv(chain, "PRIVATE_KEY");
  const CONTRACT_ADDRESS = getChainEnv(chain, "CONTRACT_ADDRESS");
  const RPC_URL = getChainEnv(chain, "RPC_URL");

  if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !RPC_URL) {
    throw new Error(`Missing required environment variables for chain ${chain} (PRIVATE_KEY_${chain.toUpperCase()}, CONTRACT_ADDRESS_${chain.toUpperCase()}, RPC_URL_${chain.toUpperCase()})`);
  }
  console.log(RPC_URL);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log("Using wallet address:", wallet.address); // <-- Add this line
  contractInstances[chain] = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
  return contractInstances[chain];
}

function cleanGladiatorName(name) {
  // Remove leading @, trim, and lowercase
  return name.replace(/^@/, "").trim().toLowerCase();
}

/**
 * Adds a match to the contract on the specified chain.
 * @param {string} player1 - First player's name/handle.
 * @param {string} player2 - Second player's name/handle.
 * @param {string} winner - Winner's name/handle.
 * @param {string} chain - Chain name ("saga", "ronin", "flow").
 * @returns {Promise<string>} Transaction hash.
 */
export async function addMatch(player1, player2, winner, chain) {
  const contract = await getContract(chain);

  // Clean all names before sending to contract
  const cleanedPlayer1 = cleanGladiatorName(player1);
  const cleanedPlayer2 = cleanGladiatorName(player2);
  const cleanedWinner = cleanGladiatorName(winner);

  const playerNames = [cleanedPlayer1, cleanedPlayer2];
  const roundWinners = Array(5).fill(cleanedWinner);
  const matchWinner = cleanedWinner;

  console.log({
    player1, player2, winner, chain,
    cleanedPlayer1, cleanedPlayer2, cleanedWinner,
    playerNames, roundWinners, matchWinner
  });

  try {
    const tx = await contract.addMatch(playerNames, roundWinners, matchWinner, {
        gasLimit: 1000000, // Set a reasonable gas limit
        gasPrice: ethers.parseUnits("10", "gwei") // Adjust gas price as needed
    });
    console.log(`addMatch tx sent on ${chain}: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Match added on ${chain} in block: ${receipt.blockNumber}`);
    return tx.hash;
  } catch (error) {
    if (error.code === 'CALL_EXCEPTION') {
      console.error(`❌ Transaction reverted on ${chain}. Reason: ${error.reason || 'Check contract require statements.'}`);
    } else {
      console.error(`❌ Error in addMatch on ${chain}:`, error.message);
    }
    throw error;
  }
}