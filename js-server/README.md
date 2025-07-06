This directory contains the core server-side components for the GameMaker platform, including Twitter bot automation, AI-powered game logic, image generation, and blockchain integration.

## Core Components

### 1. Twitter Bot (`twitterbot.js`)

The main Twitter automation system that powers the GameMaker gladiator arena.

#### Purpose
- **Monitors Twitter**: Continuously searches for mentions and challenges
- **Processes Duels**: Handles gladiator challenges and match creation
- **AI Integration**: Uses AI to determine match winners based on audience sentiment
- **Image Generation**: Creates visual representations of match results
- **Blockchain Integration**: Records match results on the blockchain

#### Key Features
- **Real-time Monitoring**: Polls Twitter every few minutes for new mentions
- **Conversation Management**: Tracks ongoing duels and audience participation
- **Cookie Management**: Maintains Twitter session for automated posting
- **Media Handling**: Posts match results with generated images
- **Duplicate Prevention**: Avoids processing the same tweets multiple times

#### Workflow
1. Searches for tweets mentioning the bot
2. Identifies new challenges and ongoing conversations
3. Collects audience replies and sentiment
4. Uses AI to determine the winner
5. Generates match result images
6. Posts results to Twitter
7. Records match on blockchain

### 2. Image Generator (`imageGenerator.js`)

Advanced AI-powered image generation system using OpenAI's DALL-E and GPT-4o.

#### Purpose
- **Match Visualization**: Creates images representing gladiator battles
- **Profile Pictures**: Generates character avatars based on user profiles
- **AI Analysis**: Uses GPT-4o to analyze existing images and create detailed prompts
- **Image Processing**: Handles compression, validation, and format conversion

#### Key Features
- **Multi-Model Support**: Uses both DALL-E and GPT-4o for different tasks
- **Image Analysis**: Analyzes existing images to create better prompts
- **Debug Logging**: Comprehensive logging for troubleshooting
- **Format Support**: Handles PNG, JPG, JPEG, WebP, GIF formats
- **Error Handling**: Robust error handling with fallback mechanisms

#### Methods
- `generateImageWithDalle()` - Creates images using DALL-E
- `analyzeImagesWithGpt4o()` - Analyzes images with GPT-4o
- `generateWinnerImage()` - Creates match result images
- `compressImage()` - Optimizes image file sizes to avoid twitter limits.
- `downloadImage()` - Downloads images from URLs

### 3. Emperor Agent (`ai/emperorAgent.js`)

AI-powered judge that determines match winners based on audience sentiment.

#### Purpose
- **Sentiment Analysis**: Analyzes audience reactions and comments
- **Winner Determination**: Uses AI to fairly judge gladiator battles
- **Fallback System**: Provides random selection if AI fails
- **Audience Engagement**: Incorporates crowd feedback into match outcomes

#### Key Features
- **GPT-4 Integration**: Uses OpenAI's latest model for analysis
- **JSON Output**: Returns structured data for easy processing
- **No Ties**: Ensures every match has a clear winner
- **Error Recovery**: Falls back to random selection if AI fails
- **Audience Dialogue**: Processes all audience comments and reactions

#### Workflow
1. Collects all audience replies to a match
2. Analyzes sentiment for each gladiator
3. Assigns base scores (0-100) to each fighter
4. Determines winner based on higher score
5. Returns winner's name for blockchain recording

### 4. Contract Writer (`contractWrite.js`)

Blockchain integration module for recording match results on Saga network.

#### Purpose
- **Match Recording**: Adds match results to the blockchain
- **Data Validation**: Ensures match data is clean and valid
- **Transaction Management**: Handles blockchain transactions and confirmations
- **Error Handling**: Provides detailed error messages for failed transactions

#### Key Features
- **Saga Integration**: Specifically designed for Saga blockchain
- **Data Cleaning**: Normalizes usernames and user IDs
- **Validation**: Ensures match data meets contract requirements
- **Transaction Tracking**: Logs transaction hashes and block numbers
- **Environment Configuration**: Uses environment variables for security

#### Functions
- `addMatch()` - Records a complete match on the blockchain
- `cleanGladiatorName()` - Normalizes gladiator names
- `cleanUserId()` - Normalizes user IDs
