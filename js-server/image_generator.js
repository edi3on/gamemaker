const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const yargs = require('yargs');

class ImageGenerator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.openai.com/v1';
        this.headers = {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        };
    }

    async saveDebugLog(outputPath, logData, logType = 'api_call') {
        try {
            const baseName = path.parse(outputPath).name;
            const debugLogPath = `images/${baseName}_${logType}.dbg.log`;
            
            await fs.mkdir('images', { recursive: true });
            
            logData.timestamp = new Date().toISOString();
            logData.log_type = logType;

            let logContent = '='.repeat(80) + '\n';
            logContent += `DEBUG LOG: ${logType.toUpperCase()}\n`;
            logContent += `Timestamp: ${logData.timestamp}\n`;
            logContent += '='.repeat(80) + '\n\n';
            logContent += JSON.stringify(logData, null, 2) + '\n\n';

            if (logData.request_payload) {
                logContent += 'REQUEST PAYLOAD:\n';
                logContent += '-'.repeat(40) + '\n';
                logContent += JSON.stringify(logData.request_payload, null, 2) + '\n\n';
            }

            if (logData.response_data) {
                logContent += 'RESPONSE DATA:\n';
                logContent += '-'.repeat(40) + '\n';
                logContent += JSON.stringify(logData.response_data, null, 2) + '\n\n';
            }

            if (logData.error_info) {
                logContent += 'ERROR INFORMATION:\n';
                logContent += '-'.repeat(40) + '\n';
                logContent += logData.error_info.toString() + '\n\n';
            }

            await fs.writeFile(debugLogPath, logContent, 'utf-8');
            console.log(`Debug log saved to: ${debugLogPath}`);
            return debugLogPath;
        } catch (error) {
            console.warn(`Warning: Failed to save debug log: ${error.message}`);
            return null;
        }
    }

    async encodeImageToBase64(imagePath) {
        try {
            const imageBuffer = await fs.readFile(imagePath);
            return imageBuffer.toString('base64');
        } catch (error) {
            throw new Error(`Error encoding image ${imagePath}: ${error.message}`);
        }
    }

    async validateImage(imagePath) {
        try {
            const exists = await fs.access(imagePath).then(() => true).catch(() => false);
            if (!exists) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
            const fileExt = path.extname(imagePath).toLowerCase();

            if (!supportedFormats.includes(fileExt)) {
                throw new Error(`Unsupported image format: ${fileExt}. Supported formats: ${supportedFormats.join(', ')}`);
            }

            return true;
        } catch (error) {
            throw error;
        }
    }

    async analyzeImagesWithGpt4o(imagePaths, prompt, outputPath = 'generated_image.png') {
        if (!imagePaths.length) return prompt;

        for (const imagePath of imagePaths) {
            await this.validateImage(imagePath);
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
        `.trim();

        try {
            const content = [{ type: 'text', text: analysisPrompt }];

            for (const imagePath of imagePaths) {
                const base64Image = await this.encodeImageToBase64(imagePath);
                content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                });
            }

            const gptPayload = {
                model: 'gpt-4o',
                messages: [{ role: 'user', content }],
                max_tokens: 1000,
            };

            console.log(`Analyzing ${imagePaths.length} image(s) with GPT-4o...`);
            const response = await axios.post(`${this.baseUrl}/chat/completions`, gptPayload, {
                headers: this.headers,
                timeout: 60000,
            });

            const debugData = {
                api_endpoint: `${this.baseUrl}/chat/completions`,
                model: 'gpt-4o',
                input_images: imagePaths,
                original_prompt: prompt,
                analysis_prompt: analysisPrompt,
                request_payload: gptPayload,
                response_status: response.status,
                response_headers: response.headers,
            };

            if (response.status === 200) {
                const gptResult = response.data;
                debugData.response_data = gptResult;

                const analysis = gptResult.choices[0].message.content;
                debugData.extracted_analysis = analysis;

                console.log(`Image analysis: ${analysis}`);
                await this.saveDebugLog(outputPath, debugData, 'gpt4o_analysis');

                return analysis;
            } else {
                debugData.error_info = {
                    status_code: response.status,
                    response_text: response.data,
                };
                await this.saveDebugLog(outputPath, debugData, 'gpt4o_analysis_error');
                throw new Error(`GPT-4o analysis failed with status ${response.status}`);
            }
        } catch (error) {
            const debugData = {
                api_endpoint: `${this.baseUrl}/chat/completions`,
                model: 'gpt-4o',
                input_images: imagePaths,
                original_prompt: prompt,
                error_info: {
                    exception_type: error.name,
                    exception_message: error.message,
                },
            };
            await this.saveDebugLog(outputPath, debugData, 'gpt4o_analysis_exception');
            throw new Error(`GPT-4o analysis failed: ${error.message}`);
        }
    }

    async generateImageFromImagesAndPrompt(imagePaths, prompt, outputPath = 'generated_image.png', model = 'gpt-4o') {
        for (const imagePath of imagePaths) {
            await this.validateImage(imagePath);
        }

        const content = [{ type: 'text', text: prompt }];

        for (const imagePath of imagePaths) {
            const base64Image = await this.encodeImageToBase64(imagePath);
            content.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            });
        }

        const payload = {
            model,
            messages: [{ role: 'user', content }],
            max_tokens: 1000,
        };

        try {
            console.log(`Making API call to OpenAI with ${imagePaths.length} image(s) and prompt: '${prompt}'`);
            const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
                headers: this.headers,
                timeout: 60000,
            });

            const debugData = {
                api_endpoint: `${this.baseUrl}/chat/completions`,
                model,
                input_images: imagePaths,
                prompt,
                request_payload: payload,
                response_status: response.status,
                response_headers: response.headers,
            };

            if (response.status === 200) {
                const result = response.data;
                debugData.response_data = result;

                const generatedText = result.choices[0].message.content;
                debugData.extracted_text = generatedText;

                console.log(`Generated response: ${generatedText}`);
                await this.saveDebugLog(outputPath, debugData, 'gpt4o_text_generation');

                const textOutputPath = outputPath.replace('.png', '.txt');
                await fs.writeFile(
                    textOutputPath,
                    `Prompt: ${prompt}\nInput images: ${imagePaths.length ? imagePaths.join(', ') : 'None'}\nGenerated response: ${generatedText}\n`
                );

                console.log(`Response saved to: ${textOutputPath}`);
                console.log('Note: GPT-4o provides text responses. For actual image generation, consider using DALL-E API.');
                return textOutputPath;
            } else {
                debugData.error_info = {
                    status_code: response.status,
                    response_text: response.data,
                };
                await this.saveDebugLog(outputPath, debugData, 'gpt4o_text_generation_error');
                throw new Error(`API request failed with status ${response.status}`);
            }
        } catch (error) {
            const debugData = {
                api_endpoint: `${this.baseUrl}/chat/completions`,
                model,
                input_images: imagePaths,
                prompt,
                error_info: {
                    exception_type: error.name,
                    exception_message: error.message,
                },
            };
            await this.saveDebugLog(outputPath, debugData, 'gpt4o_text_generation_exception');
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    async generateImageWithDalle(imagePaths, prompt, outputPath = 'generated_image.png', useGpt4oAnalysis = true) {
        for (const imagePath of imagePaths) {
            await this.validateImage(imagePath);
        }

        let dallePrompt = prompt;
        if (useGpt4oAnalysis && imagePaths.length) {
            console.log('Step 1: Analyzing input images with GPT-4o...');
            const analysis = await this.analyzeImagesWithGpt4o(imagePaths, prompt, outputPath);
            dallePrompt = `
Create a photorealistic image based on this analysis: ${analysis}

Original request: ${prompt}

Generate a high-quality, detailed image that incorporates the described elements in the requested scene.
Make sure the image is realistic, well-lit, and captures the essence of the original request.
            `.trim();
        } else {
            console.log('Step 1: Using original prompt directly (no GPT-4o analysis)...');
        }

        dallePrompt = dallePrompt.split(/\s+/).join(' ');

        console.log('Step 2: Generating image with DALL-E 3...');
        console.log(`DALL-E prompt: ${dallePrompt}`);

        try {
            const dallePayload = {
                model: 'dall-e-3',
                prompt: dallePrompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
            };

            const response = await axios.post(`${this.baseUrl}/images/generations`, dallePayload, {
                headers: this.headers,
                timeout: 60000,
            });

            const debugData = {
                api_endpoint: `${this.baseUrl}/images/generations`,
                model: 'dall-e-3',
                input_images: imagePaths,
                original_prompt: prompt,
                final_prompt: dallePrompt,
                use_gpt4o_analysis: useGpt4oAnalysis,
                request_payload: dallePayload,
                response_status: response.status,
                response_headers: response.headers,
            };

            if (response.status === 200) {
                const dalleResult = response.data;
                debugData.response_data = dalleResult;

                const imageUrl = dalleResult.data[0].url;
                debugData.generated_image_url = imageUrl;

                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                await fs.writeFile(outputPath, imageResponse.data);

                debugData.image_saved_to = outputPath;
                await this.saveDebugLog(outputPath, debugData, 'dalle_generation');

                const analysisFile = outputPath.replace('.png', '_analysis.txt');
                await fs.writeFile(
                    analysisFile,
                    `Original prompt: ${prompt}\n\n${useGpt4oAnalysis && imagePaths.length ? `GPT-4o analysis: ${analysis}\n\n` : 'No GPT-4o analysis used (direct prompt mode)\n\n'}DALL-E prompt: ${dallePrompt}\n`
                );

                console.log(`Generated image saved to: ${outputPath}`);
                console.log(`Analysis saved to: ${analysisFile}`);
                return outputPath;
            } else {
                debugData.error_info = {
                    status_code: response.status,
                    response_text: response.data,
                };
                await this.saveDebugLog(outputPath, debugData, 'dalle_generation_error');
                throw new Error(`DALL-E API request failed with status ${response.status}`);
            }
        } catch (error) {
            const debugData = {
                api_endpoint: `${this.baseUrl}/images/generations`,
                model: 'dall-e-3',
                input_images: imagePaths,
                original_prompt: prompt,
                final_prompt: dallePrompt,
                use_gpt4o_analysis: useGpt4oAnalysis,
                error_info: {
                    exception_type: error.name,
                    exception_message: error.message,
                },
            };
            await this.saveDebugLog(outputPath, debugData, 'dalle_generation_exception');
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    async generateImageWithGptImage(imagePaths, prompt, outputPath = 'generated_image.png', useGpt4oAnalysis = true) {
        for (const imagePath of imagePaths) {
            await this.validateImage(imagePath);
        }

        let gptImagePrompt = prompt;
        if (useGpt4oAnalysis && imagePaths.length) {
            console.log('Step 1: Analyzing input images with GPT-4o...');
            const analysis = await this.analyzeImagesWithGpt4o(imagePaths, prompt, outputPath);
            gptImagePrompt = `
Create a photorealistic image based on this analysis: ${analysis}

Original request: ${prompt}

Generate a high-quality, detailed image that incorporates the described elements in the requested scene.
Make sure the image is realistic, well-lit, and captures the essence of the original request.
            `.trim();
        } else {
            console.log('Step 1: Using original prompt directly (no GPT-4o analysis)...');
        }

        gptImagePrompt = gptImagePrompt.split(/\s+/).join(' ');

        console.log('Step 2: Attempting to generate image with gpt-image-1...');
        console.log(`gpt-image-1 prompt: ${gptImagePrompt}`);

        try {
            const gptImagePayload = {
                model: 'gpt-image-1',
                prompt: gptImagePrompt,
                n: 1,
                size: '1024x1024',
            };

            if (imagePaths.length) {
                gptImagePayload.images = [];
                for (const imagePath of imagePaths) {
                    const base64Image = await this.encodeImageToBase64(imagePath);
                    gptImagePayload.images.push({ url: `data:image/jpeg;base64,${base64Image}` });
                }
            }

            const response = await axios.post(`${this.baseUrl}/images/generations`, gptImagePayload, {
                headers: this.headers,
                timeout: 120000,
            });

            const debugData = {
                api_endpoint: `${this.baseUrl}/images/generations`,
                model: 'gpt-image-1',
                input_images: imagePaths,
                original_prompt: prompt,
                final_prompt: gptImagePrompt,
                use_gpt4o_analysis: useGpt4oAnalysis,
                request_payload: gptImagePayload,
                response_status: response.status,
                response_headers: response.headers,
            };

            if (response.status === 200) {
                const gptImageResult = response.data;
                debugData.response_data = gptImageResult;

                console.log('🔍 gpt-image-1 response structure:');
                console.log(JSON.stringify(gptImageResult, null, 2));

                let imageData = null;
                if (gptImageResult.data && gptImageResult.data.length > 0) {
                    const firstItem = gptImageResult.data[0];
                    if (firstItem.url) imageData = firstItem.url;
                    else if (firstItem.image_url) imageData = firstItem.image_url;
                    else if (firstItem.b64_json) imageData = Buffer.from(firstItem.b64_json, 'base64');
                }

                if (!imageData) {
                    console.log('❌ Could not find image data in response');
                    console.log(`Response structure: ${JSON.stringify(gptImageResult, null, 2)}`);
                    debugData.error_info = { error_type: 'no_image_data', message: 'Could not find image data in response' };
                    await this.saveDebugLog(outputPath, debugData, 'gpt_image_no_data');
                    throw new Error('No image data found in response');
                }

                if (typeof imageData === 'string') {
                    console.log(`Downloading image from: ${imageData}`);
                    const imageResponse = await axios.get(imageData, { responseType: 'arraybuffer' });
                    await fs.writeFile(outputPath, imageResponse.data);
                } else {
                    await fs.writeFile(outputPath, imageData);
                }

                debugData.image_saved_to = outputPath;
                debugData.image_data_type = typeof imageData === 'string' ? 'url' : 'bytes';
                await this.saveDebugLog(outputPath, debugData, 'gpt_image_generation');

                const analysisFile = outputPath.replace('.png', '_analysis.txt');
                await fs.writeFile(
                    analysisFile,
                    `Original prompt: ${prompt}\n\n${useGpt4oAnalysis && imagePaths.length ? `GPT-4o analysis: ${analysis}\n\n` : 'No GPT-4o analysis used (direct prompt mode)\n\n'}gpt-image-1 prompt: ${gptImagePrompt}\n`
                );

                console.log(`✅ Generated image saved to: ${outputPath}`);
                console.log(`Analysis saved to: ${analysisFile}`);
                return outputPath;
            } else if (response.status === 403) {
                console.log('❌ gpt-image-1 model is not available with your API key');
                console.log('This model may require special access or is not yet publicly available.');
                console.log('Saving the analysis and enhanced prompt for manual use...');

                debugData.error_info = {
                    error_type: 'model_not_available',
                    status_code: 403,
                    message: 'gpt-image-1 model is not available with your API key',
                };
                await this.saveDebugLog(outputPath, debugData, 'gpt_image_not_available');

                const analysisFile = outputPath.replace('.png', '_analysis.txt');
                await fs.writeFile(
                    analysisFile,
                    `Original prompt: ${prompt}\n\n${useGpt4oAnalysis && imagePaths.length ? `GPT-4o analysis: ${analysis}\n\n` : 'No GPT-4o analysis used (direct prompt mode)\n\n'}Enhanced prompt for image generation: ${gptImagePrompt}\n\nNote: gpt-image-1 is not available. You can use this enhanced prompt\nwith other image generation tools like DALL-E 3, Midjourney, or Stable Diffusion.\n`
                );

                console.log(`Analysis saved to: ${analysisFile}`);
                return analysisFile;
            } else {
                debugData.error_info = {
                    status_code: response.status,
                    response_text: response.data,
                };
                await this.saveDebugLog(outputPath, debugData, 'gpt_image_generation_error');
                throw new Error(`API request failed with status ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Error with gpt-image-1: ${error.message}`);
            console.log('Saving the analysis and enhanced prompt for manual use...');

            const debugData = {
                api_endpoint: `${this.baseUrl}/images/generations`,
                model: 'gpt-image-1',
                input_images: imagePaths,
                original_prompt: prompt,
                final_prompt: gptImagePrompt,
                use_gpt4o_analysis: useGpt4oAnalysis,
                error_info: {
                    exception_type: error.name,
                    exception_message: error.message,
                },
            };
            await this.saveDebugLog(outputPath, debugData, 'gpt_image_generation_exception');

            const analysisFile = outputPath.replace('.png', '_analysis.txt');
            await fs.writeFile(
                analysisFile,
                `Original prompt: ${prompt}\n\n${useGpt4oAnalysis && imagePaths.length ? `GPT-4o analysis: ${analysis}\n\n` : 'No GPT-4o analysis used (direct prompt mode)\n\n'}Enhanced prompt for image generation: ${gptImagePrompt}\n\nNote: gpt-image-1 failed. You can use this enhanced prompt\nwith other image generation tools like DALL-E 3, Midjourney, or Stable Diffusion.\n`
            );

            console.log(`Analysis saved to: ${analysisFile}`);
            return analysisFile;
        }
    }

    async combineImagesSideBySide(imagePaths) {
        if (!imagePaths.length) {
            throw new Error('No images provided for combination');
        }

        const images = [];
        for (const path of imagePaths) {
            const img = await sharp(path).resize({ height: 512 }).toBuffer();
            images.push({ buffer: img, metadata: await sharp(img).metadata() });
        }

        const totalWidth = images.reduce((sum, img) => sum + img.metadata.width, 0);
        const maxHeight = Math.max(...images.map(img => img.metadata.height));

        const combinedImage = await sharp({
            create: {
                width: totalWidth,
                height: maxHeight,
                channels: 3,
                background: { r: 255, g: 255, b: 255 },
            },
        })
            .composite(images.map((img, index) => ({
                input: img.buffer,
                left: images.slice(0, index).reduce((sum, prev) => sum + prev.metadata.width, 0),
                top: Math.floor((maxHeight - img.metadata.height) / 2),
            })))
            .png()
            .toBuffer();

        const combinedPath = 'combined_input_images.png';
        await fs.writeFile(combinedPath, combinedImage);
        return combinedPath;
    }
}

async function main() {
    const argv = yargs
        .scriptName('imageGenerator')
        .usage('$0 [images...] <prompt> [options]')
        .positional('images', { describe: 'Paths to input images (0, 1, 2, or more)', array: true, default: [] })
        .positional('prompt', { describe: 'Text prompt describing what to generate', type: 'string' })
        .option('output', { alias: 'o', describe: 'Output image path', default: 'generated_image.png', type: 'string' })
        .option('api-key', { describe: 'OpenAI API key (or set OPENAI_API_KEY environment variable)', type: 'string' })
        .option('use-dalle', { describe: 'Use DALL-E API for image generation', type: 'boolean', default: false })
        .option('use-gpt-image', { describe: 'Use GPT-4o with gpt-image-1 for direct image generation', type: 'boolean', default: false })
        .option('no-analysis', { describe: 'Skip GPT-4o analysis and use prompt directly', type: 'boolean', default: false })
        .option('model', { describe: 'OpenAI model to use', default: 'gpt-4o', type: 'string' })
        .help()
        .argv;

    const apiKey = argv.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('Error: OpenAI API key is required. Set OPENAI_API_KEY environment variable or use --api-key');
        process.exit(1);
    }

    const generator = new ImageGenerator(apiKey);

    try {
        const imagePaths = argv.images;

        let outputPath;
        if (argv.useGptImage) {
            console.log('Using GPT-4o with gpt-image-1 for direct image generation...');
            outputPath = await generator.generateImageWithGptImage(imagePaths, argv.prompt, argv.output, !argv.noAnalysis);
        } else if (argv.useDalle) {
            console.log('Using DALL-E API for image generation...');
            outputPath = await generator.generateImageWithDalle(imagePaths, argv.prompt, argv.output, !argv.noAnalysis);
        } else {
            console.log('Using GPT-4o for text analysis...');
            outputPath = await generator.generateImageFromImagesAndPrompt(imagePaths, argv.prompt, argv.output, argv.model);
        }

        console.log(`Success! Output saved to: ${outputPath}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ImageGenerator;