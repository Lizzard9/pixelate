// Pure Canvas API implementation - no external dependencies needed

/**
 * Handles image processing operations using pure Canvas API
 * Browser-native implementation with no external dependencies
 */
export class ImageProcessor {
  constructor() {
    this.supportedFormats = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/bmp",
      "image/gif",
      "image/tiff",
    ];
  }

  /**
   * Process an image with pixelation and retro effects using pure Canvas API
   * @param {HTMLImageElement} image - Source image
   * @param {Object} params - Processing parameters
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<ImageData>} Processed image data
   */
  async processImage(image, params, progressCallback = () => {}) {
    progressCallback("Starting image processing...");

    try {
      // Create working canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      
      // Draw original image
      ctx.drawImage(image, 0, 0);
      progressCallback(`Loaded image: ${canvas.width}x${canvas.height}`);

      let currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let currentWidth = canvas.width;
      let currentHeight = canvas.height;

      // Step 1: Downscale for pixelation effect
      if (params.scale > 1) {
        const newWidth = Math.floor(currentWidth / params.scale);
        const newHeight = Math.floor(currentHeight / params.scale);
        
        currentImageData = this.resizeImageData(currentImageData, currentWidth, currentHeight, newWidth, newHeight);
        currentWidth = newWidth;
        currentHeight = newHeight;
        
        progressCallback(`Downscaled by ${params.scale}x to ${newWidth}x${newHeight}`);
      }

      // Step 2: Color quantization
      if (params.colors < 256) {
        if (params.quantize) {
          currentImageData = this.quantizeColors(currentImageData, params.colors);
          progressCallback(`Quantized to ${params.colors} colors`);
        } else {
          currentImageData = this.posterizeColors(currentImageData, params.colors);
          progressCallback(`Applied color reduction to ${params.colors} colors`);
        }
      }

      // Step 3: RGB555 conversion (SNES color simulation)
      if (params.rgb555) {
        currentImageData = this.applyRGB555(currentImageData);
        progressCallback("Applied RGB555 color conversion");
      }

      // Step 4: SNES cropping
      if (params.snescrop) {
        const croppedData = this.snesCrop(currentImageData, currentWidth, currentHeight);
        currentImageData = croppedData.imageData;
        currentWidth = croppedData.width;
        currentHeight = croppedData.height;
        progressCallback(`Cropped to SNES size: ${currentWidth}x${currentHeight}`);
      }

      // Step 5: Upscale back to larger size
      if (params.rescale && params.scale > 1) {
        const finalWidth = currentWidth * params.scale;
        const finalHeight = currentHeight * params.scale;
        
        currentImageData = this.resizeImageData(currentImageData, currentWidth, currentHeight, finalWidth, finalHeight);
        progressCallback(`Rescaled to ${finalWidth}x${finalHeight}`);
      }

      progressCallback("Processing complete!");
      return currentImageData;
      
    } catch (error) {
      console.error("Image processing error:", error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Resize ImageData using nearest neighbor algorithm for pixelation
   * @param {ImageData} imageData - Source image data
   * @param {number} srcWidth - Source width
   * @param {number} srcHeight - Source height
   * @param {number} destWidth - Destination width
   * @param {number} destHeight - Destination height
   * @returns {ImageData} Resized image data
   */
  resizeImageData(imageData, srcWidth, srcHeight, destWidth, destHeight) {
    const srcData = imageData.data;
    const destData = new Uint8ClampedArray(destWidth * destHeight * 4);
    
    const xRatio = srcWidth / destWidth;
    const yRatio = srcHeight / destHeight;
    
    for (let y = 0; y < destHeight; y++) {
      for (let x = 0; x < destWidth; x++) {
        const srcX = Math.floor(x * xRatio);
        const srcY = Math.floor(y * yRatio);
        
        const srcIndex = (srcY * srcWidth + srcX) * 4;
        const destIndex = (y * destWidth + x) * 4;
        
        destData[destIndex] = srcData[srcIndex];         // R
        destData[destIndex + 1] = srcData[srcIndex + 1]; // G
        destData[destIndex + 2] = srcData[srcIndex + 2]; // B
        destData[destIndex + 3] = srcData[srcIndex + 3]; // A
      }
    }
    
    return new ImageData(destData, destWidth, destHeight);
  }

  /**
   * Apply color quantization using median cut algorithm
   * @param {ImageData} imageData - Source image data
   * @param {number} colorCount - Target number of colors
   * @returns {ImageData} Quantized image data
   */
  quantizeColors(imageData, colorCount) {
    // Simplified quantization - collect unique colors and reduce
    const pixels = [];
    const data = imageData.data;
    
    // Collect all pixels
    for (let i = 0; i < data.length; i += 4) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    
    // Apply median cut algorithm (simplified)
    const palette = this.medianCut(pixels, colorCount);
    
    // Map each pixel to nearest palette color
    const newData = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const pixel = [data[i], data[i + 1], data[i + 2]];
      const nearestColor = this.findNearestColor(pixel, palette);
      
      newData[i] = nearestColor[0];     // R
      newData[i + 1] = nearestColor[1]; // G
      newData[i + 2] = nearestColor[2]; // B
      newData[i + 3] = data[i + 3];     // A (unchanged)
    }
    
    return new ImageData(newData, imageData.width, imageData.height);
  }

  /**
   * Apply posterization (simpler color reduction)
   * @param {ImageData} imageData - Source image data
   * @param {number} colorCount - Target number of colors
   * @returns {ImageData} Posterized image data
   */
  posterizeColors(imageData, colorCount) {
    const levels = this.calculatePosterizeLevels(colorCount);
    const step = 255 / (levels - 1);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < data.length; i += 4) {
      newData[i] = Math.round(data[i] / step) * step;         // R
      newData[i + 1] = Math.round(data[i + 1] / step) * step; // G
      newData[i + 2] = Math.round(data[i + 2] / step) * step; // B
      newData[i + 3] = data[i + 3];                           // A
    }
    
    return new ImageData(newData, imageData.width, imageData.height);
  }

  /**
   * Calculate posterize levels for approximate color count
   * @param {number} targetColors - Target number of colors
   * @returns {number} Posterize levels
   */
  calculatePosterizeLevels(targetColors) {
    // Rough approximation: posterize levels to achieve target colors
    // This is not exact but gives a similar effect
    if (targetColors <= 4) return 2;
    if (targetColors <= 8) return 3;
    if (targetColors <= 16) return 4;
    if (targetColors <= 32) return 5;
    if (targetColors <= 64) return 6;
    if (targetColors <= 128) return 7;
    return 8;
  }

  /**
   * Median cut algorithm for color quantization
   * @param {Array} pixels - Array of [r, g, b] pixel values
   * @param {number} colorCount - Target number of colors
   * @returns {Array} Array of [r, g, b] palette colors
   */
  medianCut(pixels, colorCount) {
    if (colorCount === 1 || pixels.length === 0) {
      // Return average color
      const avgR = pixels.reduce((sum, p) => sum + p[0], 0) / pixels.length || 0;
      const avgG = pixels.reduce((sum, p) => sum + p[1], 0) / pixels.length || 0;
      const avgB = pixels.reduce((sum, p) => sum + p[2], 0) / pixels.length || 0;
      return [[Math.round(avgR), Math.round(avgG), Math.round(avgB)]];
    }

    // Find the channel with the greatest range
    const ranges = [0, 1, 2].map(channel => {
      const values = pixels.map(p => p[channel]);
      return Math.max(...values) - Math.min(...values);
    });
    
    const splitChannel = ranges.indexOf(Math.max(...ranges));
    
    // Sort pixels by the channel with greatest range
    pixels.sort((a, b) => a[splitChannel] - b[splitChannel]);
    
    // Split in half
    const mid = Math.floor(pixels.length / 2);
    const left = pixels.slice(0, mid);
    const right = pixels.slice(mid);
    
    // Recursively quantize each half
    const leftColors = this.medianCut(left, Math.floor(colorCount / 2));
    const rightColors = this.medianCut(right, Math.ceil(colorCount / 2));
    
    return [...leftColors, ...rightColors];
  }

  /**
   * Find the nearest color in a palette
   * @param {Array} pixel - [r, g, b] pixel color
   * @param {Array} palette - Array of [r, g, b] palette colors
   * @returns {Array} Nearest [r, g, b] color from palette
   */
  findNearestColor(pixel, palette) {
    let minDistance = Infinity;
    let nearestColor = palette[0];
    
    for (const color of palette) {
      const distance = Math.sqrt(
        Math.pow(pixel[0] - color[0], 2) +
        Math.pow(pixel[1] - color[1], 2) +
        Math.pow(pixel[2] - color[2], 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestColor = color;
      }
    }
    
    return nearestColor;
  }

  /**
   * Apply RGB555 color conversion (SNES-style) to ImageData
   * @param {ImageData} imageData - Source image data
   * @returns {ImageData} Image data with RGB555 conversion applied
   */
  applyRGB555(imageData) {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply RGB555 conversion: reduce to 5 bits per channel
      newData[i] = (data[i] >> 3) << 3;         // Red
      newData[i + 1] = (data[i + 1] >> 3) << 3; // Green
      newData[i + 2] = (data[i + 2] >> 3) << 3; // Blue
      newData[i + 3] = data[i + 3];             // Alpha unchanged
    }
    
    return new ImageData(newData, imageData.width, imageData.height);
  }

  /**
   * Crop image data to SNES resolution (256x224)
   * @param {ImageData} imageData - Source image data
   * @param {number} width - Current width
   * @param {number} height - Current height
   * @returns {Object} Object with cropped imageData, width, and height
   */
  snesCrop(imageData, width, height) {
    const targetWidth = 256;
    const targetHeight = 224;

    // Calculate crop area (center crop)
    const left = Math.max(0, Math.floor((width - targetWidth) / 2));
    const top = Math.max(0, Math.floor((height - targetHeight) / 2));
    const cropWidth = Math.min(targetWidth, width - left);
    const cropHeight = Math.min(targetHeight, height - top);

    const srcData = imageData.data;
    const destData = new Uint8ClampedArray(cropWidth * cropHeight * 4);
    
    for (let y = 0; y < cropHeight; y++) {
      for (let x = 0; x < cropWidth; x++) {
        const srcIndex = ((top + y) * width + (left + x)) * 4;
        const destIndex = (y * cropWidth + x) * 4;
        
        destData[destIndex] = srcData[srcIndex];         // R
        destData[destIndex + 1] = srcData[srcIndex + 1]; // G
        destData[destIndex + 2] = srcData[srcIndex + 2]; // B
        destData[destIndex + 3] = srcData[srcIndex + 3]; // A
      }
    }
    
    return {
      imageData: new ImageData(destData, cropWidth, cropHeight),
      width: cropWidth,
      height: cropHeight
    };
  }

  /**
   * Get supported image formats
   * @returns {Array<string>} Array of supported MIME types
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Check if image format is supported
   * @param {string} mimeType - MIME type to check
   * @returns {boolean} Whether format is supported
   */
  isFormatSupported(mimeType) {
    return this.supportedFormats.includes(mimeType.toLowerCase());
  }
}
