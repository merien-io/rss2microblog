// imageProcessor.js
const sharp = require('sharp');

class ImageProcessor {
  static MAX_FILE_SIZE = 800 * 1024; // 800KB in bytes
  static TARGET_QUALITY = 90; // Maintain good quality
  
  static async optimizeImage(buffer) {
    // First, get image metadata
    const metadata = await sharp(buffer).metadata();
    
    // Estimate output size based on dimensions and format
    const estimatedSize = this.estimateFileSize(metadata);
    
    // Calculate target dimensions if needed
    const { width, height } = this.calculateOptimalDimensions(
      metadata.width,
      metadata.height,
      estimatedSize
    );

    // Process image
    let processedImage = sharp(buffer)
      .jpeg({ quality: this.TARGET_QUALITY }) // Convert to JPEG
      .withMetadata(); // Preserve metadata

    // Resize if necessary
    if (width < metadata.width) {
      processedImage = processedImage.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Get the processed buffer
    const outputBuffer = await processedImage.toBuffer();
    
    // If still too large, try progressive reduction
    if (outputBuffer.length > this.MAX_FILE_SIZE) {
      return this.progressiveReduction(buffer);
    }

    return outputBuffer;
  }

  static estimateFileSize(metadata) {
    // Rough estimation based on dimensions and color depth
    const bitsPerPixel = 24; // For JPEG
    const compressionRatio = 0.7; // Typical JPEG compression
    return (metadata.width * metadata.height * bitsPerPixel / 8) * compressionRatio;
  }

  static calculateOptimalDimensions(width, height, estimatedSize) {
    if (estimatedSize <= this.MAX_FILE_SIZE) {
      return { width, height };
    }

    const ratio = Math.sqrt(this.MAX_FILE_SIZE / estimatedSize);
    return {
      width: Math.floor(width * ratio),
      height: Math.floor(height * ratio)
    };
  }

  static async progressiveReduction(buffer) {
    const sizes = [2048, 1600, 1200, 1024, 800];
    
    for (const maxDimension of sizes) {
      try {
        console.log(`Attempting dimension: ${maxDimension}`);
        const processed = await sharp(buffer)
          .resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: this.TARGET_QUALITY })
          .toBuffer();

        if (processed.length <= this.MAX_FILE_SIZE) {
          return processed;
        }
      } catch (error) {
        console.error(`Failed at dimension ${maxDimension}:`, error);
      }
    }

    // Final fallback with more aggressive compression
    console.log('Using final fallback compression');

    return sharp(buffer)
      .resize(800, 800, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}

module.exports = ImageProcessor;