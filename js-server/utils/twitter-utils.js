/**
 * Twitter utilities for data processing and validation
 */

import fs from "fs/promises";

// Helper to load processed tweet IDs
export async function loadProcessedTweetIds(filename = "processedFlowTweets.json") {
  try {
    const data = await fs.readFile(`data/${filename}`, "utf8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

// Helper to save processed tweet IDs
export async function saveProcessedTweetIds(newIdsSet, filename = "processedFlowTweets.json") {
  try {
    // Load existing processed IDs
    const existingIds = await loadProcessedTweetIds(filename);
    
    // Merge with new IDs
    const allIds = new Set([...existingIds, ...newIdsSet]);
    
    // Save the combined set
    await fs.writeFile(`data/${filename}`, JSON.stringify([...allIds], null, 2));
  } catch (error) {
    console.error(`❌ Error saving processed tweet IDs:`, error);
    // Fallback: just save the new IDs
    await fs.writeFile(`data/${filename}`, JSON.stringify([...newIdsSet], null, 2));
  }
}

// Helper to get notifications (mentions)
export async function getNotifications(scraper) {
  try {
    console.log(`🔔 Trying to get notifications...`);
    const notifications = await scraper.getNotifications();
    console.log(`📊 Found ${notifications?.length || 0} notifications`);
    return notifications || [];
  } catch (err) {
    console.log(`❌ Could not get notifications: ${err.message}`);
    return [];
  }
}

// Format tweet timestamp
export function formatTweetTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

// Extract user info from tweet
export function extractUserInfo(tweet) {
  return {
    username: tweet.username,
    userId: tweet.id,
    text: tweet.text,
    timestamp: formatTweetTimestamp(tweet.timestamp),
    isReply: tweet.isReply || false
  };
}

// Validate Twitter handle format
export function isValidTwitterHandle(handle) {
  const handleRegex = /^[a-zA-Z0-9_]{1,15}$/;
  return handleRegex.test(handle);
}

// Normalize Twitter handle (remove @ if present)
export function normalizeTwitterHandle(handle) {
  return handle.replace(/^@/, '');
} 