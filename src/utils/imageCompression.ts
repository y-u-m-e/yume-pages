/**
 * Image Compression Utility
 * 
 * Uses the browser's Canvas API to compress images client-side
 * before uploading. This avoids the Workers AI size limit (1MB)
 * without requiring any external services.
 */

// Maximum size for AI processing (1MB)
export const MAX_AI_SIZE = 1024 * 1024;

// Maximum size for storage (5MB)
export const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Compress an image using Canvas API
 * 
 * @param file - The original image file
 * @param maxSizeBytes - Target max size in bytes (default 1MB for AI)
 * @param maxWidth - Maximum width to resize to (default 1280px)
 * @returns Compressed file info or original if already small enough
 */
export async function compressImage(
  file: File, 
  maxSizeBytes: number = MAX_AI_SIZE,
  maxWidth: number = 1280
): Promise<CompressionResult> {
  const originalSize = file.size;
  
  // If already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    return { file, originalSize, compressedSize: file.size, wasCompressed: false };
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image to canvas with white background (for transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      /**
       * Try to compress at a specific quality level
       */
      const tryCompress = (quality: number): Promise<Blob> => {
        return new Promise((res, rej) => {
          canvas.toBlob(
            (blob) => {
              if (blob) res(blob);
              else rej(new Error('Failed to create blob'));
            },
            'image/jpeg',
            quality
          );
        });
      };
      
      /**
       * Binary search to find optimal quality that meets size requirement
       */
      const findOptimalQuality = async (): Promise<Blob> => {
        let low = 0.1;
        let high = 0.92;
        let bestBlob: Blob | null = null;
        
        // Try a few iterations to find good quality
        for (let i = 0; i < 6; i++) {
          const mid = (low + high) / 2;
          const blob = await tryCompress(mid);
          
          if (blob.size <= maxSizeBytes) {
            bestBlob = blob;
            low = mid; // Try higher quality
          } else {
            high = mid; // Need lower quality
          }
        }
        
        // If we couldn't get under limit, try lowest reasonable quality
        if (!bestBlob || bestBlob.size > maxSizeBytes) {
          bestBlob = await tryCompress(0.5);
          
          // If still too large, try even smaller dimensions
          if (bestBlob.size > maxSizeBytes && maxWidth > 800) {
            // Recurse with smaller dimensions
            const smallerResult = await compressImage(file, maxSizeBytes, maxWidth - 200);
            resolve(smallerResult);
            return bestBlob; // This won't be used, just for type safety
          }
        }
        
        return bestBlob;
      };
      
      findOptimalQuality()
        .then((blob) => {
          const compressedFile = new File(
            [blob], 
            file.name.replace(/\.[^.]+$/, '.jpg'), 
            { type: 'image/jpeg' }
          );
          resolve({
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            wasCompressed: true
          });
        })
        .catch(reject);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

