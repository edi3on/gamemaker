import fs from "fs/promises";
import { Scraper, SearchMode } from "agent-twitter-client";
import https from "https";
import path from "path";
import dotenv from "dotenv";
import { getGladiatorWinner } from "./ai/emperorAgent.js";
import { createWriteStream, unlink } from "fs";
import { finished } from "stream/promises";
import { addMatch } from "./contractWrite.js";
import ImageGenerator from "./imageGenerator.js";
import { fileURLToPath } from "url";

// Polyfill __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load .env from the project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Specify the chain at the top; default is "saga"
const CHAIN = process.env.GAME_CHAIN || "saga";

const twitterHandle = process.env.TWITTER_HANDLE;
const twitterPassword = process.env.TWITTER_PASSWORD;
const openaiApiKey = process.env.OPENAI_API_KEY; // Make sure this is in your .env

async function downloadImageToFile(url, filename) {
  const filePath = path.join("pfp", filename);
  return new Promise((resolve, reject) => {
    const file = createWriteStream(filePath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      unlink(filePath, () => reject(err));
    });
  });
}

const processedTweetsFile = "processedTweets.json";
const tweetRepliesFile = "tweetReplies.json";

// Helper to load processed tweet IDs
async function loadProcessedTweetIds() {
  try {
    const data = await fs.readFile(processedTweetsFile, "utf8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

// Helper to save processed tweet IDs
async function saveProcessedTweetIds(idsSet) {
  await fs.writeFile(processedTweetsFile, JSON.stringify([...idsSet], null, 2));
}

// Helper to load existing replies
async function loadTweetReplies() {
  try {
    const data = await fs.readFile(tweetRepliesFile, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Helper to save replies
async function saveTweetReplies(repliesObj) {
  await fs.writeFile(tweetRepliesFile, JSON.stringify(repliesObj, null, 2));
}

// Helper to get all replies to a tweet by searching for tweets to your handle
async function getRepliesToTweet(scraper, tweet) {
  const replies = [];
  const query = `to:${twitterHandle}`;
  const iterator = await scraper.searchTweets(query, 100, SearchMode.Latest);
  for await (const t of iterator) {
    if (t.in_reply_to_status_id && t.in_reply_to_status_id === tweet.id) {
      replies.push(t);
    }
  }
  return replies;
}

// Helper: get all main tweets (not replies, not processed)
function getUnprocessedMainTweets(tweets, processedTweetIds) {
  return tweets
    .filter(t => !t.isReply && !processedTweetIds.has(t.id))
    .sort((a, b) => a.timestamp - b.timestamp); // oldest first
}

// Helper: group replies by conversationId
function groupRepliesByConversationId(tweets) {
  const groups = {};
  for (const t of tweets) {
    if (t.isReply && t.conversationId) {
      if (!groups[t.conversationId]) groups[t.conversationId] = [];
      groups[t.conversationId].push(t);
    }
  }
  return groups;
}

// Helper to get absolute path (for image posting)
function getAbsolutePath(relativePath) {
  // __dirname polyfill for ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.isAbsolute(relativePath) ? relativePath : path.join(__dirname, relativePath);
}

// --- Add this helper for posting tweets with media (from testTweet.js) ---
async function postTextTweet(text, conversationId, imageFilePath) {
  const scraper = new Scraper();
  const cookiesFile = `gamemakercookies_${twitterHandle}.txt`;

  // Load cookies if they exist
  if (await fs.access(cookiesFile).then(() => true).catch(() => false)) {
    console.log("Loading saved cookies...");
    const cookiesData = await fs.readFile(cookiesFile, "utf8");
    const cookiesArray = JSON.parse(cookiesData);
    const cookieStrings = cookiesArray.map(cookie =>
      `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""}; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"}`
    );
    await scraper.setCookies(cookieStrings);
    console.log("Cookies loaded successfully");
  } else {
    // Fallback to login if no cookies
    await scraper.login(twitterHandle, twitterPassword);
    console.log("Logged in with username and password.");
  }

  let mediaData = [];
  if (imageFilePath) {
    const absImagePath = getAbsolutePath(imageFilePath);
    const data = await fs.readFile(absImagePath);
    mediaData = [
      {
        data: data,
        mediaType: "image/png"
      }
    ];
  }

  const tweet = await scraper.sendTweet(
    text,
    conversationId,
    mediaData.length > 0 ? mediaData : undefined
  );
  console.log("Tweet posted:", tweet);
}

(async () => {
  let scraper;
  let updateIndex = 0;
  const pendingDuels = [];
  const imageGen = new ImageGenerator(openaiApiKey); // <-- Create image generator instance

  try {
    scraper = new Scraper();
    const cookiesFile = `gamemakercookies_${twitterHandle}.txt`;

    // Load cookies if they exist
    try {
      if (await fs.access(cookiesFile).then(() => true).catch(() => false)) {
        console.log("Loading saved cookies...");
        const cookiesData = await fs.readFile(cookiesFile, "utf8");
        const cookiesArray = JSON.parse(cookiesData);
        const cookieStrings = cookiesArray.map(cookie => 
          `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""}; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"}`
        );
        await scraper.setCookies(cookieStrings);
        console.log("Cookies loaded successfully");
      } else {
        console.log("Logging in...");
        await scraper.login(process.env.TWITTER_HANDLE, process.env.TWITTER_PASSWORD);
        const cookies = await scraper.getCookies();
        await fs.writeFile(cookiesFile, JSON.stringify(cookies));
        console.log("Cookies saved successfully");
      }
    } catch (cookieError) {
      console.error("Cookie handling error:", cookieError);
      return;
    }

    // --- Start polling loop ---
    while (true) {
      try {
        console.log(`\n[Update ${updateIndex}] Searching tweets mentioning @${twitterHandle}...`);
        const tweetsArr = [];
        const tweetsIter = await scraper.searchTweets(`@gamemakertest -from:gamemakertest`, 100, SearchMode.Latest);
        for await (const t of tweetsIter) tweetsArr.push(t);
        // console.log("Found tweets:", tweetsArr.map(t => ({ id: t.id, text: t.text, isReply: t.isReply, timestamp: t.timestamp })));

        // Load processed tweet IDs
        const processedTweetIds = await loadProcessedTweetIds();
        let newProcessedIds = new Set();

        // Load existing replies
        const tweetReplies = await loadTweetReplies();

        // Get all unprocessed main tweets (oldest first)
        const mainTweets = getUnprocessedMainTweets(tweetsArr, processedTweetIds);

        // Group replies to main tweets by conversationId
        const repliesByConvId = groupRepliesByConversationId(tweetsArr);

        // Only process the oldest unprocessed main tweet
        const mainTweet = mainTweets[0];
        if (!mainTweet) {
          console.log("No unprocessed tweets found.");
        } else {
          // If main tweet is older than 12h, skip processing and mark as processed
          const now = Math.floor(Date.now() / 1000);
          if (now - mainTweet.timestamp > 12 * 60 * 60) {
            console.log("Oldest unprocessed main tweet is over 12h old. Skipping and marking as processed.");
            newProcessedIds.add(mainTweet.id);
            const allIds = new Set([...processedTweetIds, ...newProcessedIds]);
            await saveProcessedTweetIds(allIds);
          } else {
            // Process main tweet (challenge)
            const myHandle = twitterHandle.toLowerCase();
            const regex = /@([a-zA-Z0-9_]+)/g;
            let opponentHandle = null;
            let match;
            while ((match = regex.exec(mainTweet.text)) !== null) {
              if (match[1].toLowerCase() !== myHandle) {
                opponentHandle = match[1];
                break;
              }
            }

            if (opponentHandle) {
              const challengerHandle = mainTweet.username;
              const conversationId = mainTweet.id; // Use conversationId for filenames

              console.log(`\n@${challengerHandle}: ${mainTweet.text}`);
              console.log(`Opponent: @${opponentHandle}`);

              const pfpDir = "./pfp";
              try { await fs.mkdir(pfpDir, { recursive: true }); } catch {}

              // Download challenger pfp and get userId
              let challengerUserId = "";
              try {
                const challengerProfile = await scraper.getProfile(challengerHandle);
                const challengerPfp = challengerProfile?.avatar;
                challengerUserId = challengerProfile?.userId || "";
                if (challengerPfp) {
                  const challFileName = `chall_${challengerHandle}_${conversationId}.png`;
                  await downloadImageToFile(challengerPfp, challFileName);
                  console.log(`Challenger profile picture saved as ${challFileName}`);
                }
              } catch (err) {
                console.error(`Could not fetch profile for challenger @${challengerHandle}:`, err);
              }

              // Download opponent pfp and get userId
              let opponentUserId = "";
              try {
                const opponentProfile = await scraper.getProfile(opponentHandle);
                const opponentPfp = opponentProfile?.avatar;
                opponentUserId = opponentProfile?.userId || "";
                if (opponentPfp) {
                  const oppFileName = `opp_${opponentHandle}_${conversationId}.png`;
                  await downloadImageToFile(opponentPfp, oppFileName);
                  console.log(`Opponent profile picture saved as ${oppFileName}`);
                }
              } catch (err) {
                console.error(`Could not fetch profile for opponent @${opponentHandle}:`, err);
              }

              // Save replies' info (only selected fields)
              const replyFields = [
                "conversationId",
                "likes",
                "name",
                "permanentUrl",
                "text",
                "username",
                "isReply",
                "timestamp"
              ];

              // Save all replies for this main tweet by conversationId
              const replies = repliesByConvId[mainTweet.id] || [];
              tweetReplies[mainTweet.id] = replies.map(r => {
                const filtered = {};
                for (const key of replyFields) {
                  if (r[key] !== undefined) filtered[key] = r[key];
                }
                return filtered;
              });
              await saveTweetReplies(tweetReplies);
              console.log(`Saved ${replies.length} replies for tweet ${mainTweet.id}`);

              // Mark main tweet as processed
              newProcessedIds.add(mainTweet.id);
              const allIds = new Set([...processedTweetIds, ...newProcessedIds]);
              await saveProcessedTweetIds(allIds);

              // --- Add to pending duels ---
              pendingDuels.push({
                dueIndex: updateIndex + 1, // <-- Only wait 1 update before judging winner (for testing)
                conversationId: mainTweet.id,
                challenger: challengerHandle,
                opponent: opponentHandle,
                challengerUserId, // <-- add this
                opponentUserId    // <-- add this
              });
              console.log(`Scheduled winner check for tweet ${mainTweet.id} at update ${updateIndex + 1}`);
            } else {
              console.log("No opponent found in the main tweet.");
            }
          }
        }

        // --- Check for duels that are due ---
        for (let i = pendingDuels.length - 1; i >= 0; i--) {
          const duel = pendingDuels[i];
          if (updateIndex >= duel.dueIndex) {
            try {
              // Before judging, refresh replies for this conversationId
              const tweetsArrLatest = [];
              const tweetsIterLatest = await scraper.searchTweets(`@gamemakertest -from:gamemakertest`, 100, SearchMode.Latest);
              for await (const t of tweetsIterLatest) tweetsArrLatest.push(t);
              const repliesByConvIdLatest = groupRepliesByConversationId(tweetsArrLatest);

              const replyFields = [
                "conversationId",
                "likes",
                "name",
                "permanentUrl",
                "text",
                "username",
                "isReply",
                "timestamp"
              ];
              const latestReplies = repliesByConvIdLatest[duel.conversationId] || [];
              const tweetRepliesLatest = await loadTweetReplies();
              tweetRepliesLatest[duel.conversationId] = latestReplies.map(r => {
                const filtered = {};
                for (const key of replyFields) {
                  if (r[key] !== undefined) filtered[key] = r[key];
                }
                return filtered;
              });
              await saveTweetReplies(tweetRepliesLatest);

              // Run emperor agent
              console.log(`Getting winner for tweet ${duel.conversationId}...`);
              const winner = await getGladiatorWinner(duel.conversationId, duel.challenger, duel.opponent);
              console.log(`🏆 Winner for match ${duel.conversationId}: ${winner}`);

              // --- Generate winner image using AI ---
              let winnerImagePath = null;
              try {
                winnerImagePath = await imageGen.generateWinnerImage(
                  winner,
                  duel.challenger,
                  duel.opponent,
                  duel.conversationId
                );
                if (winnerImagePath) {
                  console.log(`AI winner image generated at: ${winnerImagePath}`);
                } else {
                  console.log("AI winner image generation failed or not found.");
                }
              } catch (imgErr) {
                console.error("Error generating AI winner image:", imgErr);
              }

              // --- Compose and post the tweet using testTweet.js logic ---
              const text = `🏆 The winner of the duel between @${duel.challenger} and @${duel.opponent} is @${winner}!`;
              try {
                // Use the absolute path for the image
                await postTextTweet(text, duel.conversationId, winnerImagePath);
              } catch (tweetErr) {
                console.error("Error posting tweet:", tweetErr);
              }

              // --- Call contractWrite to record the match onchain (updated contract) ---
              try {
                // You must provide all required fields for the new contract
                await addMatch({
                  challengerName: duel.challenger,
                  challengerUserId: duel.challengerUserId || "", // Will set below
                  opponentName: duel.opponent,
                  opponentUserId: duel.opponentUserId || "",     // Will set below
                  matchWinner: winner,
                  aiPrompt: duel.aiPrompt || ""
                });
                console.log(`Match recorded onchain: ${duel.challenger} vs ${duel.opponent}, winner: ${winner}`);
              } catch (err) {
                console.error("Error recording match onchain:", err);
              }

            } catch (err) {
              console.error("Error running emperor agent or updating replies:", err);
            }
            pendingDuels.splice(i, 1); // Remove from pending
          }
        }

        updateIndex++;
      } catch (error) {
        console.error("Script execution error:", error);
      } finally {
        console.log("Waiting 1 minute before next poll...");
        await new Promise(res => setTimeout(res, 60 * 1000));
      }
    }
    // --- End polling loop ---

  } catch (error) {
    console.error("Fatal error:", error);
  }
})();