import fs from "fs/promises";
import { Scraper, SearchMode } from "agent-twitter-client";
import dotenv from "dotenv";
import { extractEthereumAddresses, normalizeEthereumAddress } from "./utils/ethereum-utils.js";
import { getNotifications, formatTweetTimestamp } from "./utils/twitter-utils.js";
import path from "path";
import { fileURLToPath } from "url";
import { ethers, getAddress } from "ethers";

// Polyfill __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load .env from the project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const twitterHandle = process.env.TWITTER_HANDLE;

// Simple functions to load and save processed tweet IDs
async function loadProcessedTweetIds() {
  const filePath = 'processed_tweets.json';
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return new Set(JSON.parse(data));
  } catch (error) {
    // File doesn't exist or is invalid, return empty set
    return new Set();
  }
}

async function saveProcessedTweetIds(newIds) {
  const filePath = 'processed_tweets.json';
  try {
    // Load existing IDs
    const existingIds = await loadProcessedTweetIds();
    // Merge with new IDs
    const allIds = new Set([...existingIds, ...newIds]);
    // Save to JSON file
    await fs.writeFile(filePath, JSON.stringify([...allIds], null, 2));
    console.log(`💾 Saved ${newIds.size} new tweet IDs to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error saving processed tweet IDs:`, error);
  }
}

// --- Flow contract config ---
const FLOW_CONTRACT_ADDRESS = "YOUR_FLOW_CONTRACT_ADDRESS";
const FLOW_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "userId", "type": "string" },
      { "internalType": "address", "name": "ethAddress", "type": "address" }
    ],
    "name": "updateEthereumAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  // ...add other ABI items if needed
];

// --- Setup ethers.js signer (must have private key with permission) ---
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_FLOW);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY_FLOW, provider);
const flowContract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS_FLOW,
  FLOW_CONTRACT_ABI,
  signer
);

// --- After extracting userId and ethAddress for each mention ---
async function updateUserOnChain(userId, ethAddress) {
  try {
    // ethers.js will normalize the address, no need to lowercase
    const tx = await flowContract.updateEthereumAddress(userId, ethAddress);
    console.log(`✅ On-chain update: userId ${userId} mapped to ${ethAddress} (tx: ${tx.hash})`);
    await tx.wait();
    console.log(`🎉 Transaction confirmed for userId ${userId}`);
  } catch (err) {
    console.error(`❌ Failed to update userId ${userId} on chain:`, err);
  }
}

async function main() {
  let scraper;
  let updateIndex = 0;

  try {
    console.log("🚀 Starting Twitter Bot (Console Mode)...");
    console.log(`📱 Monitoring mentions for @${twitterHandle} and printing data to console`);
    console.log("🔄 Bot will run continuously and check for new mentions every 30 seconds");
    console.log("📁 Processed tweets will be saved to: processed_tweets.json");
    console.log("✅ Console mode initialized - no blockchain operations");

    scraper = new Scraper();
    const cookiesFile = `gamemakercookies_${twitterHandle}.txt`;

    // --- Cookie login sequence (EXACTLY like twitterbot.js) ---
    try {
      if (await fs.access(cookiesFile).then(() => true).catch(() => false)) {
        console.log("🍪 Loading saved cookies...");
        const cookiesData = await fs.readFile(cookiesFile, "utf8");
        const cookiesArray = JSON.parse(cookiesData);
        const cookieStrings = cookiesArray.map(cookie =>
          `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""}; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"}`
        );
        await scraper.setCookies(cookieStrings);
        console.log("✅ Cookies loaded successfully");
      } else {
        console.log("🔐 Logging in to Twitter...");
        await scraper.login(process.env.TWITTER_HANDLE, process.env.TWITTER_PASSWORD);
        const cookies = await scraper.getCookies();
        await fs.writeFile(cookiesFile, JSON.stringify(cookies));
        console.log("✅ Login successful, cookies saved");
      }
    } catch (cookieError) {
      console.error("❌ Cookie handling error:", cookieError);
      return;
    }

    // --- Start continuous monitoring loop ---
    while (true) {
      try {
        console.log(`\n[Update ${updateIndex}] 🔍 Checking for new mentions with Ethereum addresses...`);

        // Search for tweets mentioning the bot
        const tweetsArr = [];
        const searchQuery = `@${twitterHandle} -from:${twitterHandle}`;
        console.log(`🔍 Search query: "${searchQuery}"`);

        const tweetsIter = await scraper.searchTweets(searchQuery, 50, SearchMode.Latest);

        for await (const tweet of tweetsIter) {
          tweetsArr.push(tweet);
        }

        console.log(`📊 Found ${tweetsArr.length} tweets mentioning @${twitterHandle}`);

        // Try alternative search if no results
        if (tweetsArr.length === 0) {
          console.log(`🔍 Trying alternative search: just "@${twitterHandle}"`);
          const altTweetsIter = await scraper.searchTweets(`@${twitterHandle}`, 50, SearchMode.Latest);
          const altTweetsArr = [];
          for await (const tweet of altTweetsIter) {
            if (tweet.username !== twitterHandle) { // Exclude own tweets
              altTweetsArr.push(tweet);
            }
          }
          console.log(`📊 Alternative search found ${altTweetsArr.length} tweets`);
          tweetsArr.push(...altTweetsArr);
        }

        // Try notifications if still no results
        if (tweetsArr.length === 0) {
          console.log(`🔔 Trying notifications as fallback...`);
          const notifications = await getNotifications(scraper);
          for (const notification of notifications) {
            if (notification.type === 'mention' && notification.tweet) {
              tweetsArr.push(notification.tweet);
            }
          }
          console.log(`📊 Notifications found ${tweetsArr.length} mention tweets`);
        }

        // Debug: Show all found tweets
        if (tweetsArr.length > 0) {
          console.log(`\n🔍 All found tweets:`);
          tweetsArr.forEach((tweet, index) => {
            console.log(`${index + 1}. @${tweet.username}: "${tweet.text}" (ID: ${tweet.id})`);
          });
        }

        // Load previously processed mentions
        const processedTweetIds = await loadProcessedTweetIds();
        console.log(`📋 Previously processed tweet IDs: ${Array.from(processedTweetIds).length}`);

        let newProcessedIds = new Set();
        let totalEthAddresses = 0;
        let totalAccountsCreated = 0;
        let skippedTweets = 0;

        // Process each mention
        for (const tweet of tweetsArr) {
          // Skip if already processed
          if (processedTweetIds.has(tweet.id)) {
            console.log(`⏭️ Skipping already processed tweet: ${tweet.id} from @${tweet.username}`);
            skippedTweets++;
            continue;
          }

          const mentionerHandle = tweet.username;
          const tweetText = tweet.text;
          const tweetId = tweet.id;
          const timestamp = formatTweetTimestamp(tweet.timestamp);

          console.log(`\n🎯 New mention detected!`);
          console.log(`📝 Tweet: "${tweetText}"`);
          console.log(`👤 From: @${mentionerHandle}`);
          console.log(`🕐 Time: ${timestamp}`);
          console.log(`🆔 Tweet ID: ${tweetId}`);

          // Extract Ethereum addresses
          const ethAddresses = extractEthereumAddresses(tweetText);

          if (ethAddresses.length > 0) {
            console.log(`🔗 Found ${ethAddresses.length} Ethereum address(es):`);
            ethAddresses.forEach((address, index) => {
              console.log(`   ${index + 1}. ${address}`);
              totalEthAddresses++;
            });

            // Get the sender's profile to extract their Twitter ID
            try {
              console.log(`🔍 Fetching profile for @${mentionerHandle}...`);
              const profile = await scraper.getProfile(mentionerHandle);

              if (profile && profile.userId) {
                console.log(`🆔 Twitter ID: ${profile.userId}`);
                console.log(`📛 Display Name: ${profile.name || 'N/A'}`);
                console.log(`👥 Followers: ${profile.followersCount || 'N/A'}`);
                console.log(`📈 Following: ${profile.followingCount || 'N/A'}`);
                console.log(`📊 Tweet Count: ${profile.tweetsCount || 'N/A'}`);

                // Process each Ethereum address found
                for (const ethereumAddress of ethAddresses) {
                  console.log(`\n🔗 Processing Ethereum address: ${ethereumAddress}`);

                  // Normalize address to lowercase for contract storage
                  const normalizedAddress = normalizeEthereumAddress(ethereumAddress);
                  console.log(`🔧 Normalized address: ${normalizedAddress}`);

                  // Console mode: Print what would be saved
                  console.log(`📋 WOULD SAVE TO BLOCKCHAIN:`);
                  console.log(`   • User ID: ${profile.userId}`);
                  console.log(`   • Twitter Handle: @${mentionerHandle}`);
                  console.log(`   • Display Name: ${profile.name || 'N/A'}`);
                  console.log(`   • Ethereum Address: ${normalizedAddress}`);
                  console.log(`   • Followers: ${profile.followersCount || 'N/A'}`);
                  console.log(`   • Following: ${profile.followingCount || 'N/A'}`);
                  console.log(`   • Tweet Count: ${profile.tweetsCount || 'N/A'}`);
                  console.log(`   • Tweet ID: ${tweetId}`);
                  console.log(`   • Tweet Text: "${tweetText}"`);
                  console.log(`   • Timestamp: ${timestamp}`);

                  totalAccountsCreated++;

                  // Update on-chain (uncomment to enable)
                  // await updateUserOnChain(profile.userId, normalizedAddress);
                }
              } else {
                console.log(`❌ Could not get Twitter ID for @${mentionerHandle}`);
                console.log(`🔍 Profile data:`, JSON.stringify(profile, null, 2));
              }
            } catch (err) {
              console.error(`❌ Error fetching profile for @${mentionerHandle}:`, err.message);
            }
          } else {
            console.log(`📝 No Ethereum addresses found in this tweet`);

            // Even without Ethereum address, we can create a user account
            try {
              console.log(`🔍 Fetching profile for @${mentionerHandle}...`);
              const profile = await scraper.getProfile(mentionerHandle);

              if (profile && profile.userId) {
                console.log(`🆔 Twitter ID: ${profile.userId}`);
                console.log(`📛 Display Name: ${profile.name || 'N/A'}`);
                console.log(`👥 Followers: ${profile.followersCount || 'N/A'}`);
                console.log(`📈 Following: ${profile.followingCount || 'N/A'}`);
                console.log(`📊 Tweet Count: ${profile.tweetsCount || 'N/A'}`);

                // Console mode: Print what would be saved (without Ethereum address)
                console.log(`📋 WOULD SAVE TO BLOCKCHAIN (NO ETH ADDRESS):`);
                console.log(`   • User ID: ${profile.userId}`);
                console.log(`   • Twitter Handle: @${mentionerHandle}`);
                console.log(`   • Display Name: ${profile.name || 'N/A'}`);
                console.log(`   • Ethereum Address: None`);
                console.log(`   • Followers: ${profile.followersCount || 'N/A'}`);
                console.log(`   • Following: ${profile.followingCount || 'N/A'}`);
                console.log(`   • Tweet Count: ${profile.tweetsCount || 'N/A'}`);
                console.log(`   • Tweet ID: ${tweetId}`);
                console.log(`   • Tweet Text: "${tweetText}"`);
                console.log(`   • Timestamp: ${timestamp}`);

                totalAccountsCreated++;
              } else {
                console.log(`❌ Could not get Twitter ID for @${mentionerHandle}`);
                console.log(`🔍 Profile data:`, JSON.stringify(profile, null, 2));
              }
            } catch (err) {
              console.error(`❌ Error fetching profile for @${mentionerHandle}:`, err.message);
            }
          }

          // Mark as processed
          newProcessedIds.add(tweetId);
          console.log(`✅ Processed mention from @${mentionerHandle}`);
        }

        // Save processed tweet IDs
        if (newProcessedIds.size > 0) {
          await saveProcessedTweetIds(newProcessedIds);
          console.log(`💾 Saved ${newProcessedIds.size} new processed tweet IDs`);
        }

        // Summary
        console.log(`\n📊 Update Summary:`);
        console.log(`   • Total tweets found: ${tweetsArr.length}`);
        console.log(`   • Tweets skipped (already processed): ${skippedTweets}`);
        console.log(`   • New mentions processed: ${newProcessedIds.size}`);
        console.log(`   • Ethereum addresses found: ${totalEthAddresses}`);
        console.log(`   • User profiles processed: ${totalAccountsCreated}`);
        console.log(`   • Mode: Console (no blockchain operations)`);

        updateIndex++;

        // Wait before next check
        console.log(`\n⏳ Waiting 30 seconds before next check...`);
        await new Promise(resolve => setTimeout(resolve, 30000));

      } catch (error) {
        console.error(`❌ Error in monitoring loop:`, error);
        console.log(`⏳ Waiting 30 seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

  } catch (error) {
    console.error("❌ Fatal error:", error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main().catch(console.error);