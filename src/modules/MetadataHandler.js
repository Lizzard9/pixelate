import ExifReader from 'exifreader';

/**
 * Handles image metadata extraction and preservation
 */
export class MetadataHandler {
  constructor() {
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/tiff'];
  }

  /**
   * Extract metadata from an image file
   * @param {File} file - The image file
   * @returns {Promise<Object>} Extracted metadata
   */
  async extractMetadata(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer);
      
      const metadata = {
        format: this.getFileFormat(file),
        size: file.size,
        lastModified: file.lastModified,
        name: file.name,
        type: file.type,
        tags: tags,
        // Extract specific metadata types
        exif: this.extractExifData(tags),
        png: this.extractPngTextChunks(tags),
        ai: this.extractAIGenerationData(tags)
      };

      console.log('Extracted metadata:', metadata);
      return metadata;
    } catch (error) {
      console.warn('Could not extract metadata:', error);
      return {
        format: this.getFileFormat(file),
        size: file.size,
        lastModified: file.lastModified,
        name: file.name,
        type: file.type,
        error: error.message
      };
    }
  }

  /**
   * Extract EXIF data from tags
   * @param {Object} tags - ExifReader tags
   * @returns {Object} EXIF data
   */
  extractExifData(tags) {
    const exifData = {};
    
    // Common EXIF tags
    const exifKeys = [
      'Make', 'Model', 'DateTime', 'DateTimeOriginal', 'DateTimeDigitized',
      'ExposureTime', 'FNumber', 'ISO', 'FocalLength', 'Flash',
      'WhiteBalance', 'ColorSpace', 'ExifImageWidth', 'ExifImageHeight'
    ];

    exifKeys.forEach(key => {
      if (tags[key]) {
        exifData[key] = this.getTagValue(tags[key]);
      }
    });

    return exifData;
  }

  /**
   * Extract PNG text chunks (where AI generation data is often stored)
   * @param {Object} tags - ExifReader tags
   * @returns {Object} PNG text data
   */
  extractPngTextChunks(tags) {
    const pngData = {};
    
    // Look for PNG text chunks
    Object.keys(tags).forEach(key => {
      if (key.startsWith('PNG-') || 
          key.toLowerCase().includes('text') ||
          key.toLowerCase().includes('comment')) {
        pngData[key] = this.getTagValue(tags[key]);
      }
    });

    return pngData;
  }

  /**
   * Extract AI generation metadata (Stable Diffusion, etc.)
   * @param {Object} tags - ExifReader tags
   * @returns {Object} AI generation data
   */
  extractAIGenerationData(tags) {
    const aiData = {};
    
    // Look for AI-related metadata
    Object.keys(tags).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('parameters') ||
          lowerKey.includes('prompt') ||
          lowerKey.includes('steps') ||
          lowerKey.includes('sampler') ||
          lowerKey.includes('cfg') ||
          lowerKey.includes('seed') ||
          lowerKey.includes('model')) {
        aiData[key] = this.getTagValue(tags[key]);
      }
    });

    // Parse Stable Diffusion parameters if found
    if (tags['parameters'] || tags['Parameters']) {
      const paramText = this.getTagValue(tags['parameters'] || tags['Parameters']);
      if (paramText) {
        aiData.parsedParameters = this.parseStableDiffusionParameters(paramText);
      }
    }

    return aiData;
  }

  /**
   * Parse Stable Diffusion parameters text
   * @param {string} paramText - Parameters text
   * @returns {Object} Parsed parameters
   */
  parseStableDiffusionParameters(paramText) {
    const parsed = {};
    
    try {
      // Split by lines and parse key-value pairs
      const lines = paramText.split('\n');
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          parsed[key.trim()] = value;
        }
      });
      
      // Look for common patterns
      const patterns = {
        steps: /Steps:\s*(\d+)/i,
        sampler: /Sampler:\s*([^,]+)/i,
        cfgScale: /CFG scale:\s*([\d.]+)/i,
        seed: /Seed:\s*(\d+)/i,
        size: /Size:\s*(\d+x\d+)/i,
        model: /Model:\s*([^,]+)/i
      };
      
      Object.entries(patterns).forEach(([key, pattern]) => {
        const match = paramText.match(pattern);
        if (match) {
          parsed[key] = match[1];
        }
      });
      
    } catch (error) {
      console.warn('Error parsing SD parameters:', error);
    }
    
    return parsed;
  }

  /**
   * Get tag value, handling different tag formats
   * @param {*} tag - ExifReader tag
   * @returns {*} Tag value
   */
  getTagValue(tag) {
    if (typeof tag === 'object' && tag !== null) {
      if (tag.description !== undefined) return tag.description;
      if (tag.value !== undefined) return tag.value;
      if (Array.isArray(tag)) return tag;
      return tag;
    }
    return tag;
  }

  /**
   * Get file format from file
   * @param {File} file - The file
   * @returns {string} File format
   */
  getFileFormat(file) {
    const parts = file.name.split('.');
    if (parts.length === 1) return 'unknown';
    return parts.pop()?.toLowerCase() || 'unknown';
  }

  /**
   * Preserve metadata when saving (simplified version)
   * For now, we'll just return the original blob since full metadata preservation
   * in the browser is complex and would require additional libraries
   * @param {Blob} imageBlob - The processed image blob
   * @param {Object} metadata - Original metadata
   * @returns {Promise<Blob>} Blob with preserved metadata (simplified)
   */
  async preserveMetadata(imageBlob, metadata) {
    // TODO: Implement full metadata preservation
    // This would require PNG chunk manipulation or EXIF writing libraries
    // For now, we'll just return the image blob
    
    console.log('Metadata preservation not yet implemented, saving without metadata');
    console.log('Original metadata was:', metadata);
    
    return imageBlob;
  }
}
