interface UploadResponse {
  success: boolean;
  url: string;
}

/**
 * Upload an image file to get a public URL for Pollinations API
 * This is only used when generating images that need to reference uploaded images
 * @param file - The image file to upload
 * @returns Promise<string> - The public URL of the uploaded image
 * @throws Error if upload fails
 */
export async function uploadImageForPollinations(file: File): Promise<string> {
  const UPLOAD_URL = 'https://upload.deolsugam.workers.dev/';
  
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
    }

    const result: UploadResponse = await response.json();
    
    if (!result.success || !result.url) {
      throw new Error('Upload failed: Invalid response from server');
    }

    return result.url;

  } catch (error) {
    console.error('Failed to upload image for Pollinations:', error);
    throw error instanceof Error ? error : new Error('Upload failed');
  }
}

/**
 * Convert File objects to URLs for Pollinations image generation
 * @param files - Array of File objects from user input
 * @returns Promise<string[]> - Array of public URLs
 */
export async function convertFilesToUrlsForPollinations(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  
  try {
    const uploadPromises = files.map(file => uploadImageForPollinations(file));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Failed to convert files to URLs:', error);
    return []; // Return empty array on failure, don't break the flow
  }
}