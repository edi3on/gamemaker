import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { createWriteStream, unlink, existsSync } from 'fs';

class ImageGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://api.openai.com/v1";
        this.headers = {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        };
    }

    async saveDebugLog(outputPath, logData, logType = "api_call") {
        try {
            const baseName = path.basename(outputPath, path.extname(outputPath));
            const debugLogPath = `images/${baseName}_${logType}.dbg.log`;
            
            // Ensure images directory exists
            await fs.mkdir("images", { recursive: true });
            
            // Add timestamp to log data
            logData.timestamp = new Date().toISOString();
            logData.logType = logType;
            
            // Save debug log
            let logContent = "=".repeat(80) + "\n";
            logContent += `DEBUG LOG: ${logType.toUpperCase()}\n`;
            logContent += `Timestamp: ${logData.timestamp}\n`;
            logContent += "=".repeat(80) + "\n\n";
            
            // Write structured log data
            logContent += JSON.stringify(logData, null, 2) + "\n\n";
            
            // Write additional formatted information
            if (logData.requestPayload) {
                logContent += "REQUEST PAYLOAD:\n";
                logContent += "-".repeat(40) + "\n";
                logContent += JSON.stringify(logData.requestPayload, null, 2) + "\n\n";
            }
            
            if (logData.responseData) {
                logContent += "RESPONSE DATA:\n";
                logContent += "-".repeat(40) + "\n";
                logContent += JSON.stringify(logData.responseData, null, 2) + "\n\n";
            }
            
            if (logData.errorInfo) {
                logContent += "ERROR INFORMATION:\n";
                logContent += "-".repeat(40) + "\n";
                logContent += String(logData.errorInfo) + "\n\n";
            }
            
            await fs.writeFile(debugLogPath, logContent, 'utf8');
            console.log(`Debug log saved to: ${debugLogPath}`);
            return debugLogPath;
            
        } catch (e) {
            console.log(`Warning: Failed to save debug log: ${String(e)}`);
            return null;
        }
    }

    async encodeImageToBase64(imagePath) {
        try {
            const imageBuffer = await fs.readFile(imagePath);
            return imageBuffer.toString('base64');
        } catch (e) {
            throw new Error(`Error encoding image ${imagePath}: ${String(e)}`);
        }
    }

    validateImage(imagePath) {
        if (!existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }
        
        const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const fileExt = path.extname(imagePath).toLowerCase();
        
        if (!supportedFormats.includes(fileExt)) {
            throw new Error(`Unsupported image format: ${fileExt}. Supported formats: ${supportedFormats.join(', ')}`);
        }
        
        return true;
    }

    async analyzeImagesWithGpt4o(imagePaths, prompt, outputPath = "generated_image.png") {
        if (!imagePaths || imagePaths.length === 0) {
            return prompt;
        }
        
        // Validate input images
        for (const imagePath of imagePaths) {
            this.validateImage(imagePath);
        }
        
        const analysisPrompt = `
        Analyze these ${imagePaths.length} image(s) and describe what you see. Focus on:
        1. Physical characteristics (if people: hair color, style, facial features, clothing)
        2. Age and gender (if applicable)
        3. Any distinctive features or expressions
        4. Objects, scenes, or environments present
        5. Overall mood or atmosphere
        
        Then, based on the prompt: "${prompt}", create a detailed description for generating a new image.
        The description should be suitable for image generation and incorporate elements from the analyzed images.
        `;
        
        try {
            // Prepare content for GPT-4o analysis
            const content = [{ type: "text", text: analysisPrompt }];
            
            // Add images to the content
            for (const imagePath of imagePaths) {
                const base64Image = await this.encodeImageToBase64(imagePath);
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Image}`
                    }
                });
            }
            
            // Make GPT-4o API call for analysis
            const gptPayload = {
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: content
                    }
                ],
                max_tokens: 1000
            };
            
            console.log(`Analyzing ${imagePaths.length} image(s) with GPT-4o...`);
            
            const gptResponse = await this.makeApiRequest(
                `${this.baseUrl}/chat/completions`,
                gptPayload
            );
            
            // Save debug log for GPT-4o analysis
            const debugData = {
                apiEndpoint: `${this.baseUrl}/chat/completions`,
                model: "gpt-4o",
                inputImages: imagePaths,
                originalPrompt: prompt,
                analysisPrompt: analysisPrompt,
                requestPayload: gptPayload,
                responseData: gptResponse
            };
            
            // Extract the analysis
            const analysis = gptResponse.choices[0].message.content;
            debugData.extractedAnalysis = analysis;
            
            console.log(`Image analysis: ${analysis}`);
            
            // Save successful analysis debug log
            await this.saveDebugLog(outputPath, debugData, "gpt4o_analysis");
            
            return analysis;
            
        } catch (e) {
            // Save exception debug log
            const debugData = {
                apiEndpoint: `${this.baseUrl}/chat/completions`,
                model: "gpt-4o",
                inputImages: imagePaths,
                originalPrompt: prompt,
                errorInfo: {
                    exceptionType: e.constructor.name,
                    exceptionMessage: String(e)
                }
            };
            await this.saveDebugLog(outputPath, debugData, "gpt4o_analysis_exception");
            throw new Error(`GPT-4o analysis failed: ${String(e)}`);
        }
    }

    async makeApiRequest(url, payload) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            
            const options = {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(url, options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (e) {
                            reject(new Error(`Failed to parse response: ${String(e)}`));
                        }
                    } else {
                        reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                    }
                });
            });
            
            req.on('error', (e) => {
                reject(new Error(`Request error: ${String(e)}`));
            });
            
            // Add timeout
            req.setTimeout(120000, () => { // 2 minutes timeout
                req.destroy();
                reject(new Error('Request timeout after 2 minutes'));
            });
            
            req.write(postData);
            req.end();
        });
    }

    async generateImageWithDalle(imagePaths, prompt, outputPath = "generated_image.png", useGpt4oAnalysis = true) {
        // Validate input images if any provided
        for (const imagePath of imagePaths) {
            this.validateImage(imagePath);
        }
        
        let analysis;
        let dallePrompt;
        
        // Step 1: Optionally analyze the images with GPT-4o to understand what's in them
        if (useGpt4oAnalysis && imagePaths.length > 0) {
            console.log("Step 1: Analyzing input images with GPT-4o...");
            analysis = await this.analyzeImagesWithGpt4o(imagePaths, prompt, outputPath);
            
            // Step 2: Use the analysis to create a better DALL-E prompt
            dallePrompt = `
            Create a photorealistic image based on this analysis: ${analysis}
            
            Original request: ${prompt}
            
            Generate a high-quality, detailed image that incorporates the described elements in the requested scene.
            Make sure the image is realistic, well-lit, and captures the essence of the original request.
            `;
        } else {
            console.log("Step 1: Using original prompt directly (no GPT-4o analysis)...");
            dallePrompt = prompt;
        }
        
        // Clean up the prompt for DALL-E (remove extra whitespace and newlines)
        dallePrompt = dallePrompt.replace(/\s+/g, ' ').trim();
        
        console.log(`Step 2: Generating image with DALL-E 3...`);
        console.log(`DALL-E prompt: ${dallePrompt}`);
        
        try {
            // Use DALL-E 3 for image generation
            const dallePayload = {
                model: "dall-e-3",
                prompt: dallePrompt,
                n: 1,
                size: "1024x1024",
                quality: "standard"
            };
            
            const dalleResponse = await this.makeApiRequest(
                `${this.baseUrl}/images/generations`,
                dallePayload
            );
            
            // Save debug log for DALL-E call
            const debugData = {
                apiEndpoint: `${this.baseUrl}/images/generations`,
                model: "dall-e-3",
                inputImages: imagePaths,
                originalPrompt: prompt,
                finalPrompt: dallePrompt,
                useGpt4oAnalysis: useGpt4oAnalysis,
                requestPayload: dallePayload,
                responseData: dalleResponse
            };
            
            // Download the generated image
            const imageUrl = dalleResponse.data[0].url;
            debugData.generatedImageUrl = imageUrl;
            
            const imageBuffer = await this.downloadImage(imageUrl);
            
            // Save the original image first
            const originalPath = outputPath.replace('.png', '_original.png');
            await fs.writeFile(originalPath, imageBuffer);
            
            // Compress the image to reduce file size
            try {
                await this.compressImage(originalPath, outputPath, 5); // Max 5MB
                console.log(`✅ Image compressed and saved to: ${outputPath}`);
                
                // Get file size info
                const stats = await fs.stat(outputPath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                console.log(`📊 Compressed image size: ${sizeMB} MB`);
                
            } catch (compressError) {
                console.log(`⚠️  Compression failed, using original image: ${compressError.message}`);
                // If compression fails, use the original
                await fs.copyFile(originalPath, outputPath);
            }
            
            debugData.imageSavedTo = outputPath;
            
            // Save successful debug log
            await this.saveDebugLog(outputPath, debugData, "dalle_generation");
            
            // Save the analysis and prompt for reference
            const analysisFile = outputPath.replace('.png', '_analysis.txt');
            let analysisContent = `Original prompt: ${prompt}\n\n`;
            if (useGpt4oAnalysis && imagePaths.length > 0) {
                analysisContent += `GPT-4o analysis: ${analysis}\n\n`;
            } else {
                analysisContent += "No GPT-4o analysis used (direct prompt mode)\n\n";
            }
            analysisContent += `DALL-E prompt: ${dallePrompt}\n`;
            
            await fs.writeFile(analysisFile, analysisContent, 'utf8');
            
            console.log(`Generated image saved to: ${outputPath}`);
            console.log(`Analysis saved to: ${analysisFile}`);
            
            return outputPath;
            
        } catch (e) {
            // Save exception debug log
            const debugData = {
                apiEndpoint: `${this.baseUrl}/images/generations`,
                model: "dall-e-3",
                inputImages: imagePaths,
                originalPrompt: prompt,
                finalPrompt: dallePrompt,
                useGpt4oAnalysis: useGpt4oAnalysis,
                errorInfo: {
                    exceptionType: e.constructor.name,
                    exceptionMessage: String(e)
                }
            };
            await this.saveDebugLog(outputPath, debugData, "dalle_generation_exception");
            throw new Error(`API request failed: ${String(e)}`);
        }
    }

    async compressImage(inputPath, outputPath, maxSizeMB = 5) {
        try {
            // Read the original image
            const originalBuffer = await fs.readFile(inputPath);
            const originalSizeMB = originalBuffer.length / (1024 * 1024);
            
            console.log(`📊 Original image size: ${originalSizeMB.toFixed(2)} MB`);
            
            // If image is already small enough, just copy it
            if (originalSizeMB <= maxSizeMB) {
                await fs.copyFile(inputPath, outputPath);
                console.log(`✅ Image already small enough, copied as-is`);
                return outputPath;
            }
            
            // For now, just copy the original since we don't have image processing libraries
            // In a real implementation, you'd use sharp, jimp, or similar
            await fs.copyFile(inputPath, outputPath);
            console.log(`⚠️  Image compression not implemented, using original (${originalSizeMB.toFixed(2)} MB)`);
            
            return outputPath;
        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    async downloadImage(url) {
        return new Promise((resolve, reject) => {
            const req = https.get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download image: ${res.statusCode}`));
                    return;
                }
                
                const chunks = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                
                res.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
            
            req.on('error', (e) => {
                reject(new Error(`Download error: ${String(e)}`));
            });
            
            // Add timeout
            req.setTimeout(60000, () => { // 1 minute timeout
                req.destroy();
                reject(new Error('Image download timeout after 1 minute'));
            });
        });
    }

    async generateWinnerImage(winnerHandle, challengerHandle, opponentHandle, conversationId) {
        try {
            // Construct paths to the downloaded profile pictures
            const challengerPfpPath = path.join("pfp", `chall_${challengerHandle}_${conversationId}.png`);
            const opponentPfpPath = path.join("pfp", `opp_${opponentHandle}_${conversationId}.png`);
            
            // Check if both profile pictures exist and prepare input images with labels
            const inputImages = [];
            let hasChallengerPfp = false;
            let hasOpponentPfp = false;
            
            if (await fs.access(challengerPfpPath).then(() => true).catch(() => false)) {
                inputImages.push(challengerPfpPath);
                hasChallengerPfp = true;
                console.log(`Found challenger profile picture: ${challengerPfpPath}`);
            }
            if (await fs.access(opponentPfpPath).then(() => true).catch(() => false)) {
                inputImages.push(opponentPfpPath);
                hasOpponentPfp = true;
                console.log(`Found opponent profile picture: ${opponentPfpPath}`);
            }
            
            // Create a detailed prompt that specifies which profile picture is which
            let prompt = `Create a dramatic colosseum scene featuring @${winnerHandle} as the victorious gladiator champion. `;
            
            if (hasChallengerPfp && hasOpponentPfp) {
                prompt += `The first image shows @${challengerHandle} (the challenger) and the second image shows @${opponentHandle} (the opponent). `;
                prompt += `Use their facial features and appearance from these profile pictures to create the scene. `;
            } else if (hasChallengerPfp) {
                prompt += `The first image shows @${challengerHandle} (the challenger). Use their facial features and appearance from this profile picture. `;
            } else if (hasOpponentPfp) {
                prompt += `The first image shows @${opponentHandle} (the opponent). Use their facial features and appearance from this profile picture. `;
            }
            
            prompt += `The scene should show @${winnerHandle} standing triumphantly in the center of an ancient Roman colosseum, `;
            prompt += `with the defeated challengers @${challengerHandle} and @${opponentHandle} visible in the background. `;
            prompt += `The colosseum should be filled with cheering crowds, dramatic lighting, and epic atmosphere. `;
            prompt += `Make it cinematic and heroic, with the winner clearly the focus of the scene. `;
            prompt += `Ensure the facial features and characteristics from the provided profile pictures are accurately represented in the final scene.`;
            
            const outputPath = `images/winner_${winnerHandle}_${conversationId}.png`;
            
            // Ensure images directory exists
            await fs.mkdir("images", { recursive: true });
            
            // Generate the winner image using DALL-E with profile pictures as input
            const generatedImagePath = await this.generateImageWithDalle(
                inputImages, // Use the profile pictures as input
                prompt,
                outputPath,
                true // Use GPT-4o analysis to understand the profile pictures
            );
            
            console.log(`Winner image generated: ${generatedImagePath}`);
            
            // Verify the file actually exists
            if (generatedImagePath) {
                const fileExists = await fs.access(generatedImagePath).then(() => true).catch(() => false);
                if (fileExists) {
                    const stats = await fs.stat(generatedImagePath);
                    console.log(`✅ Generated image verified: ${generatedImagePath} (${stats.size} bytes)`);
                    return generatedImagePath;
                } else {
                    console.log(`❌ Generated image file not found: ${generatedImagePath}`);
                    return null;
                }
            }
            
            return generatedImagePath;
            
        } catch (e) {
            console.error(`Error generating winner image: ${String(e)}`);
            return null;
        }
    }
}

export default ImageGenerator; 