import { Scraper } from "agent-twitter-client";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const twitterHandle = process.env.TWITTER_HANDLE;
const twitterPassword = process.env.TWITTER_PASSWORD;

async function postTextTweet(text) {
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
//   const imageFilePath = "/Users/edi3on/Code/gamemaker/js-server/pfp/opp_Cobratate_1941484647944515633.png"; // Path to your image file
  
const data = await fs.readFile('pfp//' + 'opp_trvisXX_1941486980870881579.png'); // Path to your image file
  const mediaData = [
    {
        data: data, // Placeholder for media
        mediaType: "image/png"
    }
];

console.log("Media data prepared:", mediaData);
  // Post the text-only tweet
  const tweet = await scraper.sendTweet(
    text,
    "1936273604305727767",
    mediaData
    );
  console.log("Tweet posted:", tweet);
}

postTextTweet("Woah! who is gonna win??\nthe VERY COOL Gamemaker or the Cobratate?");