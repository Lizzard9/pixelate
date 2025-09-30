/**
 * Utility to create test images for testing image processing functionality
 */

/**
 * Create a simple test image as a PNG buffer
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} pattern - Pattern type ('solid', 'gradient', 'checkerboard')
 * @param {Array} colors - Array of RGB color arrays
 * @returns {Buffer} PNG image buffer
 */
export function createTestImage(width = 100, height = 100, pattern = 'gradient', colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255]]) {
  // Create RGBA pixel data
  const pixelData = new Uint8Array(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      let r, g, b;
      
      switch (pattern) {
        case 'solid':
          [r, g, b] = colors[0] || [128, 128, 128];
          break;
          
        case 'gradient':
          // Horizontal gradient between first two colors
          const color1 = colors[0] || [255, 0, 0];
          const color2 = colors[1] || [0, 0, 255];
          const ratio = x / (width - 1);
          r = Math.round(color1[0] * (1 - ratio) + color2[0] * ratio);
          g = Math.round(color1[1] * (1 - ratio) + color2[1] * ratio);
          b = Math.round(color1[2] * (1 - ratio) + color2[2] * ratio);
          break;
          
        case 'checkerboard':
          const checkSize = 10;
          const checkX = Math.floor(x / checkSize);
          const checkY = Math.floor(y / checkSize);
          const colorIndex = (checkX + checkY) % colors.length;
          [r, g, b] = colors[colorIndex] || [128, 128, 128];
          break;
          
        default:
          r = g = b = 128;
      }
      
      pixelData[index] = r;     // Red
      pixelData[index + 1] = g; // Green
      pixelData[index + 2] = b; // Blue
      pixelData[index + 3] = 255; // Alpha
    }
  }
  
  return createPNGBuffer(pixelData, width, height);
}

/**
 * Create a PNG buffer from RGBA pixel data
 * This is a simplified PNG creation - in a real scenario you'd use a proper PNG library
 * For testing purposes, we'll create a minimal structure
 */
function createPNGBuffer(pixelData, width, height) {
  // This is a simplified approach - we'll create a basic structure
  // that can be recognized as image data for testing
  const header = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A // PNG signature
  ]);
  
  // For testing, we'll just return the pixel data with a header
  // In a real implementation, you'd need proper PNG chunk structure
  const buffer = new Uint8Array(header.length + pixelData.length + 8);
  buffer.set(header, 0);
  
  // Add width and height as simple 4-byte values
  const view = new DataView(buffer.buffer);
  view.setUint32(header.length, width, false);
  view.setUint32(header.length + 4, height, false);
  
  buffer.set(pixelData, header.length + 8);
  
  return Buffer.from(buffer);
}

/**
 * Create a test image blob for browser testing
 */
export function createTestImageBlob(width = 100, height = 100, pattern = 'gradient') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = width;
  canvas.height = height;
  
  // Create the pattern
  switch (pattern) {
    case 'gradient':
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'red');
      gradient.addColorStop(0.5, 'green');
      gradient.addColorStop(1, 'blue');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
      
    case 'checkerboard':
      const checkSize = 10;
      for (let y = 0; y < height; y += checkSize) {
        for (let x = 0; x < width; x += checkSize) {
          const isEven = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
          ctx.fillStyle = isEven ? '#FF0000' : '#0000FF';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }
      break;
      
    default:
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, width, height);
  }
  
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

/**
 * Create test colors for RGB555 testing
 */
export function createRGB555TestColors() {
  return [
    [255, 255, 255], // White -> should become [248, 248, 248]
    [128, 128, 128], // Gray -> should become [120, 120, 120]
    [255, 0, 0],     // Red -> should become [248, 0, 0]
    [0, 255, 0],     // Green -> should become [0, 248, 0]
    [0, 0, 255],     // Blue -> should become [0, 0, 248]
    [127, 63, 31],   // Mixed -> should become [120, 56, 24]
  ];
}

/**
 * Calculate expected RGB555 values
 */
export function applyRGB555ToColor([r, g, b]) {
  return [
    (r >> 3) << 3,
    (g >> 3) << 3,
    (b >> 3) << 3
  ];
}
