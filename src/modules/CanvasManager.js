/**
 * Manages canvas operations and image display
 */
export class CanvasManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Initialize canvas manager
   */
  init() {
    this.canvas = document.getElementById('canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      // Set default canvas size
      this.canvas.width = 500;
      this.canvas.height = 500;
    } else {
      console.error('Canvas element not found');
    }
  }

  /**
   * Display an HTML image on the canvas
   * @param {HTMLImageElement} image - Image to display
   */
  displayImage(image) {
    if (!this.canvas || !this.ctx) {
      console.error('Canvas not initialized');
      return;
    }

    // Resize canvas to match image
    this.canvas.width = image.naturalWidth || image.width;
    this.canvas.height = image.naturalHeight || image.height;

    // Clear canvas and draw image
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(image, 0, 0);
  }

  /**
   * Display ImageData on the canvas
   * @param {ImageData} imageData - ImageData to display
   */
  displayImageData(imageData) {
    if (!this.canvas || !this.ctx) {
      console.error('Canvas not initialized');
      return;
    }

    // Resize canvas to match image data
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;

    // Clear canvas and put image data
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Get current canvas ImageData
   * @returns {ImageData|null} Current canvas image data
   */
  getImageData() {
    if (!this.canvas || !this.ctx) {
      console.error('Canvas not initialized');
      return null;
    }

    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Get canvas as a blob
   * @param {string} type - Image type (default: 'image/png')
   * @param {number} quality - Image quality for JPEG (0-1)
   * @returns {Promise<Blob>} Canvas as blob
   */
  getCanvasBlob(type = 'image/png', quality = 0.92) {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, type, quality);
    });
  }

  /**
   * Get canvas as data URL
   * @param {string} type - Image type (default: 'image/png')
   * @param {number} quality - Image quality for JPEG (0-1)
   * @returns {string} Canvas as data URL
   */
  getCanvasDataURL(type = 'image/png', quality = 0.92) {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    return this.canvas.toDataURL(type, quality);
  }

  /**
   * Clear the canvas
   */
  clear() {
    if (!this.canvas || !this.ctx) {
      console.error('Canvas not initialized');
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Resize canvas
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    if (!this.canvas) {
      console.error('Canvas not initialized');
      return;
    }

    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Get canvas element
   * @returns {HTMLCanvasElement|null} Canvas element
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Get canvas context
   * @returns {CanvasRenderingContext2D|null} Canvas context
   */
  getContext() {
    return this.ctx;
  }

  /**
   * Apply image smoothing settings
   * @param {boolean} enabled - Whether to enable image smoothing
   */
  setImageSmoothing(enabled) {
    if (!this.ctx) {
      console.error('Canvas context not initialized');
      return;
    }

    this.ctx.imageSmoothingEnabled = enabled;
    this.ctx.webkitImageSmoothingEnabled = enabled;
    this.ctx.mozImageSmoothingEnabled = enabled;
    this.ctx.msImageSmoothingEnabled = enabled;
  }

  /**
   * Set image smoothing quality
   * @param {string} quality - Quality setting ('low', 'medium', 'high')
   */
  setImageSmoothingQuality(quality) {
    if (!this.ctx) {
      console.error('Canvas context not initialized');
      return;
    }

    if (this.ctx.imageSmoothingQuality !== undefined) {
      this.ctx.imageSmoothingQuality = quality;
    }
  }

  /**
   * Get canvas dimensions
   * @returns {Object} Canvas width and height
   */
  getDimensions() {
    if (!this.canvas) {
      return { width: 0, height: 0 };
    }

    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }
}
