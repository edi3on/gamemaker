import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

// Polyfill dirname for ES modules
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config({ path: path.resolve(dirname, "../.env") });

// --- CONFIGURATION ---
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_RONIN;
const PRIVATE_KEY = process.env.PRIVATE_KEY_RONIN;
const RPC_URL = process.env.RPC_URL_RONIN;

// --- ABI for updateEthAddress ---
const contractABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "userId", "type": "string" },
      { "internalType": "address", "name": "ethAddress", "type": "address" }
    ],
    "name": "updateEthAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// --- Prompt for userId and ethAddress ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  if (!CONTRACT_ADDRESS || !PRIVATE_KEY || !RPC_URL) {
    console.error("Missing env vars: CONTRACT_ADDRESS_RONIN, PRIVATE_KEY_RONIN, RPC_URL_RONIN");
    process.exit(1);
  }

  const userId = await ask("Enter userId: ");
  const ethAddress = await ask("Enter ETH address: ");
  rl.close();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

  try {
    const tx = await contract.updateEthAddress(userId.trim(), ethAddress.trim());
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Eth address updated for userId "${userId}" in block: ${receipt.blockNumber}`);
  } catch (err) {
    console.error("❌ Error updating eth address:", err);
  }
}

main(); 