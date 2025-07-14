import { Message } from '../../types/chat';
import { AI_PERSONAS, POLLINATIONS_API_TOKEN } from '../../config/constants';
import { convertFilesToUrlsForPollinations } from '../imageUploadService';

interface StreamUpdateCallback {
  (content: string, isDone: boolean): void;
}

interface ErrorCallback {
  (error: Error): void;
}

// Custom error class for rate limits
class RateLimitError extends Error {
  type: string;
  
  constructor(message: string) {
    super(message);
    this.type = 'rateLimit';
    this.name = 'RateLimitError';
  }
}

// Image generation tool configuration
const imageGenerationTool = {
  type: "function" as const,
  function: {
    name: "generate_image",
    description: "Generate an image ONLY when user wants you to generate images directly. just respond in text when not needed. Ask the user directly for clarification with the description before making the image.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Description of the image to generate. Use fully detailed prompt. Look carefully if the user mentions small details like adding text and style etc. And add more details like dreamy effects etc to make the image look aesthetically pleasing."
        },
        width: {
          type: "integer",
          description: "Width of the image in pixels",
          default: 1080,
          minimum: 1080,
          maximum: 2048
        },
        height: {
          type: "integer", 
          description: "Height of the image in pixels",
          default: 1920,
          minimum: 1080,
          maximum: 2048
        }
      },
      required: ["prompt"]
    }
  }
};

interface ImageGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
}

function generateImageUrl(params: ImageGenerationParams, referenceImageUrl?: string): string {
  const {
    prompt,
    width = 1080,
    height = 1920
  } = params;
  
  const encodedPrompt = encodeURIComponent(prompt);
  const hardcodedToken = POLLINATIONS_API_TOKEN || "Cf5zT0TTvLLEskfY";
  
  let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&enhance=true&nologo=true&model=gptimage&token=${hardcodedToken}`;
  
  // Add reference image if available
  if (referenceImageUrl) {
    url += `&image=${encodeURIComponent(referenceImageUrl)}`;
  }
  
  return url;
}

function createImageMarkdown(params: ImageGenerationParams, referenceImageUrl?: string): string {
  const imageUrl = generateImageUrl(params, referenceImageUrl);
  return `![Generated Image](${imageUrl})`;
}

export async function generateAIResponse(
  messages: Message[],
  imageData?: string | string[],
  systemPrompt: string = '', // Not used anymore, kept for compatibility
  currentPersona: keyof typeof AI_PERSONAS = 'default',
  onStreamUpdate: StreamUpdateCallback,
  onError: ErrorCallback,
  originalImageFiles?: File[] // New optional parameter for original File objects
): Promise<void> {
  try {
    const personaConfig = AI_PERSONAS[currentPersona];
    
    if (!personaConfig) {
      throw new Error('Invalid persona');
    }

    // Prepare messages for Pollinations.ai
    const apiMessages = [
      { role: 'system', content: personaConfig.systemPrompt },
      ...messages.map((msg: Message) => ({
        role: msg.isAI ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    // Prepare request body for Pollinations.ai with streaming enabled
    const requestBody = {
      model: personaConfig.model,
      messages: apiMessages,
      private: true,
      token: POLLINATIONS_API_TOKEN,
      tools: [imageGenerationTool],
      tool_choice: "auto",
      stream: true
    };

    // Make streaming request to Pollinations.ai
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new RateLimitError('Rate limit exceeded');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    let accumulatedToolCalls: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) {
            continue;
          }

          const data = line.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') {
            // Process any accumulated tool calls for image generation
            if (accumulatedToolCalls.length > 0) {
              for (const toolCall of accumulatedToolCalls) {
                if (toolCall.function?.name === 'generate_image') {
                  try {
                    const params: ImageGenerationParams = JSON.parse(toolCall.function.arguments);
                    
                    // NEW: If we have original image files, upload the first one for reference
                    let referenceImageUrl: string | undefined;
                    if (originalImageFiles && originalImageFiles.length > 0) {
                      try {
                        const urls = await convertFilesToUrlsForPollinations([originalImageFiles[0]]);
                        referenceImageUrl = urls[0];
                      } catch (uploadError) {
                        console.warn('Failed to upload reference image, generating without reference:', uploadError);
                      }
                    }
                    
                    const imageMarkdown = createImageMarkdown(params, referenceImageUrl);
                    accumulatedContent += `\n\n${imageMarkdown}`;
                    onStreamUpdate(accumulatedContent, false);
                  } catch (error) {
                    console.error('Error processing image generation:', error);
                    accumulatedContent += '\n\nSorry, I had trouble generating that image. Please try again.';
                    onStreamUpdate(accumulatedContent, false);
                  }
                }
              }
            }
            
            onStreamUpdate(accumulatedContent, true);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.content) {
              accumulatedContent += delta.content;
              onStreamUpdate(accumulatedContent, false);
            }

            if (delta?.tool_calls) {
              // Accumulate tool calls for processing after stream completes
              for (const toolCall of delta.tool_calls) {
                if (!accumulatedToolCalls[toolCall.index]) {
                  accumulatedToolCalls[toolCall.index] = {
                    function: { name: '', arguments: '' }
                  };
                }
                
                if (toolCall.function?.name) {
                  accumulatedToolCalls[toolCall.index].function.name += toolCall.function.name;
                }
                
                if (toolCall.function?.arguments) {
                  accumulatedToolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                }
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming chunk:', parseError);
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    console.error('Pollinations.ai Streaming Error:', error);
    
    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      onError(error);
      return;
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    onError(new Error(`Streaming failed: ${errorMessage}`));
  }
}