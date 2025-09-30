import { Jimp } from "jimp/es";

/**
 * Handles image processing operations using Jimp and custom algorithms
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
   * Process an image with pixelation and retro effects
   * @param {HTMLImageElement} image - Source image
   * @param {Object} params - Processing parameters
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<ImageData>} Processed image data
   */
  async processImage(image, params, progressCallback = () => {}) {
    progressCallback("Starting image processing...");

    try {
      // Convert HTML image to Jimp image
      const jimpImage = await this.htmlImageToJimp(image);
      progressCallback(
        `Loaded image: ${jimpImage.getWidth()}x${jimpImage.getHeight()}`
      );

      let processedImage = jimpImage.clone();

      // Step 1: Downscale for pixelation effect
      if (params.scale > 1) {
        const newWidth = Math.floor(processedImage.getWidth() / params.scale);
        const newHeight = Math.floor(processedImage.getHeight() / params.scale);

        processedImage = processedImage.resize(
          newWidth,
          newHeight,
          "nearestNeighbor"
        );
        progressCallback(
          `Downscaled by ${params.scale}x to ${newWidth}x${newHeight}`
        );
      }

      // Step 2: Color quantization
      if (params.colors < 256) {
        if (params.quantize) {
          // Use Jimp's built-in quantization (similar to LIBIMAGEQUANT)
          processedImage = processedImage.posterize(
            this.calculatePosterizeLevels(params.colors)
          );
          progressCallback(
            `Quantized to ~${params.colors} colors using posterize`
          );
        } else {
          // Use median cut quantization (fallback to posterize for now)
          processedImage = processedImage.posterize(
            this.calculatePosterizeLevels(params.colors)
          );
          progressCallback(
            `Applied color reduction to ${params.colors} colors`
          );
        }
      }

      // Step 3: RGB555 conversion (SNES color simulation)
      if (params.rgb555) {
        processedImage = this.applyRGB555(processedImage);
        progressCallback("Applied RGB555 color conversion");
      }

      // Step 4: SNES cropping
      if (params.snescrop) {
        processedImage = this.snesCrop(processedImage);
        progressCallback(
          `Cropped to SNES size: ${processedImage.getWidth()}x${processedImage.getHeight()}`
        );
      }

      // Step 5: Upscale back to larger size
      if (params.rescale && params.scale > 1) {
        const finalWidth = processedImage.getWidth() * params.scale;
        const finalHeight = processedImage.getHeight() * params.scale;

        processedImage = processedImage.resize(
          finalWidth,
          finalHeight,
          "nearestNeighbor"
        );
        progressCallback(`Rescaled to ${finalWidth}x${finalHeight}`);
      }

      // Convert back to ImageData for canvas display
      const imageData = await this.jimpToImageData(processedImage);
      progressCallback("Processing complete!");

      return imageData;
    } catch (error) {
      console.error("Image processing error:", error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Convert HTML Image element to Jimp image
   * @param {HTMLImageElement} htmlImage - HTML image element
   * @returns {Promise<Jimp>} Jimp image
   */
  async htmlImageToJimp(htmlImage) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = htmlImage.naturalWidth || htmlImage.width;
      canvas.height = htmlImage.naturalHeight || htmlImage.height;

      ctx.drawImage(htmlImage, 0, 0);

      canvas.toBlob(async (blob) => {
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const jimpImage = await Jimp.fromBuffer(buffer);
          resolve(jimpImage);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Convert Jimp image to ImageData
   * @param {Jimp} jimpImage - Jimp image
   * @returns {Promise<ImageData>} ImageData object
   */
  async jimpToImageData(jimpImage) {
    const width = jimpImage.getWidth();
    const height = jimpImage.getHeight();
    const buffer = jimpImage.bitmap.data;

    // Create ImageData from the buffer
    const imageData = new ImageData(
      new Uint8ClampedArray(buffer),
      width,
      height
    );
    return imageData;
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
   * Apply median cut color quantization
   * @param {Jimp} image - Jimp image
   * @param {number} colorCount - Target color count
   * @returns {Promise<Jimp>} Quantized image
   */
  async medianCutQuantization(image, colorCount) {
    // For now, use Jimp's built-in quantization as a fallback
    // TODO: Implement proper median cut algorithm
    return image.posterize(this.calculatePosterizeLevels(colorCount));
  }

  /**
   * Apply RGB555 color conversion (SNES-style)
   * @param {Jimp} image - Jimp image
   * @returns {Jimp} Image with RGB555 conversion applied
   */
  applyRGB555(image) {
    return image.scan(
      0,
      0,
      image.getWidth(),
      image.getHeight(),
      function (x, y, idx) {
        // Apply RGB555 conversion: reduce to 5 bits per channel
        this.bitmap.data[idx] = (this.bitmap.data[idx] >> 3) << 3; // Red
        this.bitmap.data[idx + 1] = (this.bitmap.data[idx + 1] >> 3) << 3; // Green
        this.bitmap.data[idx + 2] = (this.bitmap.data[idx + 2] >> 3) << 3; // Blue
        // Alpha channel remains unchanged
      }
    );
  }

  /**
   * Crop image to SNES resolution (256x224)
   * @param {Jimp} image - Jimp image
   * @returns {Jimp} Cropped image
   */
  snesCrop(image) {
    const targetWidth = 256;
    const targetHeight = 224;
    const currentWidth = image.getWidth();
    const currentHeight = image.getHeight();

    // Calculate crop area (center crop)
    const left = Math.max(0, Math.floor((currentWidth - targetWidth) / 2));
    const top = Math.max(0, Math.floor((currentHeight - targetHeight) / 2));
    const right = Math.min(currentWidth, left + targetWidth);
    const bottom = Math.min(currentHeight, top + targetHeight);

    return image.crop(left, top, right - left, bottom - top);
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
