import "dotenv/config";
import { Agent, run } from "@openai/agents";
import fs from "node:fs/promises";
import path from "node:path";

// Emperor Agent to evaluate gladiators based on audience sentiment
const emperorAgent = new Agent({
  name: "emperor_agent",
  model: "gpt-4.1-nano-2025-04-14",
  instructions: `Given audience text about two gladiators, analyze the sentiment and assign a base score (0-100) for each gladiator based on how much the audience likes them. 
  Return a JSON object like:
  {
    "challenger": {"name": "challenger_name", "baseScore": number},
    "opponent": {"name": "opponent_name", "baseScore": number}
  }
  IMPORTANT: There cannot be a tie. If the scores would be equal, slightly favor the gladiator with even a marginally more positive sentiment or, if sentiment is truly equal, favor the challenger.`,
});

// Helper to extract audience dialogue for a conversationId
async function getAudienceDialogue(conversationId, tweetRepliesPath) {
  const data = await fs.readFile(tweetRepliesPath, "utf8");
  const replies = JSON.parse(data)[conversationId];
  if (!replies || replies.length === 0) {
    // No replies, return empty string
    return "";
  }
  // Format dialogue
  return replies.map(r =>
    `${r.username} says: "${r.text}" [likes: ${r.likes}]`
  ).join("\n");
}

/**
 * Get the winner between two gladiators based on audience sentiment.
 * @param {string} conversationId - The conversation ID to analyze.
 * @param {string} challengerName - The challenger handle.
 * @param {string} opponentName - The opponent handle.
 * @param {string} [tweetRepliesPath='./tweetReplies.json'] - Path to tweetReplies.json.
 * @returns {Promise<{winner: string, prompt: string}>} - Object containing the winner's handle and the full AI prompt used.
 */
export async function getGladiatorWinner(conversationId, challengerName, opponentName, tweetRepliesPath = './tweetReplies.json') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing. Set it in the shell or a .env file.");
  }

  const dialogue = await getAudienceDialogue(conversationId, tweetRepliesPath);

  // Optionally log the dialogue for debugging
  // console.log("\nAudience Dialogue:\n", dialogue);

  try {
  // Step 1: Get base scores from Emperor Agent
  const prompt = `Audience text: "${dialogue}"\nGladiators: ${challengerName} vs ${opponentName}`;
  const baseScoreRes = await run(emperorAgent, prompt);

    console.log(`🤖 Emperor Agent response: ${baseScoreRes.finalOutput}`);

  let baseScores;
  try {
    baseScores = JSON.parse(baseScoreRes.finalOutput);
  } catch (err) {
      console.error(`❌ JSON parse error: ${err.message}`);
      console.error(`Raw response: ${baseScoreRes.finalOutput}`);
      
      // Try to extract JSON from the response if it's wrapped in other text
      const jsonMatch = baseScoreRes.finalOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          baseScores = JSON.parse(jsonMatch[0]);
          console.log(`✅ Extracted JSON from response:`, baseScores);
        } catch (extractErr) {
          throw new Error(`Emperor Agent did not return valid JSON. Raw response: ${baseScoreRes.finalOutput}`);
        }
      } else {
        throw new Error(`Emperor Agent did not return valid JSON. Raw response: ${baseScoreRes.finalOutput}`);
      }
  }

  const challengerScore = baseScores.challenger.baseScore || 0;
  const opponentScore = baseScores.opponent.baseScore || 0;

  // Determine the winner (no tie possible due to prompt)
  const winner = challengerScore > opponentScore ? challengerName : opponentName;
  
  // Return both winner and the full prompt used
  return {
    winner: winner,
    prompt: prompt
  };
    
  } catch (error) {
    console.error(`❌ Emperor Agent failed: ${error.message}`);
    console.log(`🔄 Falling back to random winner selection...`);
    
    // Fallback: Random winner selection
    const randomWinner = Math.random() > 0.5 ? challengerName : opponentName;
    console.log(`🎲 Random winner selected: ${randomWinner}`);
    
    // Create fallback prompt
    const fallbackPrompt = `Audience text: "${dialogue}"\nGladiators: ${challengerName} vs ${opponentName}\n[FALLBACK: Emperor Agent failed, random selection used]`;
    
    return {
      winner: randomWinner,
      prompt: fallbackPrompt
    };
  }
}

// Hardcoded conversationId for demo
const conversationId = "1936115604223885313";
const tweetRepliesPath = path.resolve("./tweetReplies.json");

// Remove or comment out everything below this line:
// --- ADDED: Run emperor agent using tweetReplies.json ---

// async function runFromTweetReplies() {
//   try {
//     const { dialogue, challengerName, opponentName } = await getAudienceDialogueAndNames(conversationId, tweetRepliesPath);

//     console.log("\nAudience Dialogue:\n", dialogue);
//     await main(dialogue, challengerName, opponentName, "gladiatorMetrics.json");
//   } catch (err) {
//     console.error(err);
//   }
// }

// --- Run emperor agent using tweetReplies.json and show dialogue ---
// runFromTweetReplies();

// If you want to keep the manual example, comment it out or leave as is:
// const audienceText = "The crowd roars for Maximus, chanting his name wildly! They like Lucius too, but the cheers are quieter.";
// main(audienceText, "Maximus", "Lucius", "gladiatorMetrics.json").catch(console.error);