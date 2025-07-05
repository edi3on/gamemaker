import { addMatch } from "./contractWrite.js";

async function main() {
  // Example test data
  const player1 = "alice";
  const player2 = "bob";
  const winner = "alice";
  const chain = "saga"; 
  
  try {
    const txHash = await addMatch(player1, player2, winner, chain);
    console.log(`Test successful! Transaction hash: ${txHash}`);
  } catch (err) {
    console.error("Test failed:", err);
  }
}
main();