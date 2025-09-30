import ExifReader from "exifreader";

/**
 * Handles image metadata extraction and preservation
 */
export class MetadataHandler {
  constructor() {
    this.supportedFormats = ["image/jpeg", "image/png", "image/tiff"];
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
        ai: this.extractAIGenerationData(tags),
      };

      console.log("Extracted metadata:", metadata);
      return metadata;
    } catch (error) {
      console.warn("Could not extract metadata:", error);
      return {
        format: this.getFileFormat(file),
        size: file.size,
        lastModified: file.lastModified,
        name: file.name,
        type: file.type,
        error: error.message,
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
      "Make",
      "Model",
      "DateTime",
      "DateTimeOriginal",
      "DateTimeDigitized",
      "ExposureTime",
      "FNumber",
      "ISO",
      "FocalLength",
      "Flash",
      "WhiteBalance",
      "ColorSpace",
      "ExifImageWidth",
      "ExifImageHeight",
    ];

    exifKeys.forEach((key) => {
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
    Object.keys(tags).forEach((key) => {
      if (
        key.startsWith("PNG-") ||
        key.toLowerCase().includes("text") ||
        key.toLowerCase().includes("comment")
      ) {
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
    Object.keys(tags).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("parameters") ||
        lowerKey.includes("prompt") ||
        lowerKey.includes("steps") ||
        lowerKey.includes("sampler") ||
        lowerKey.includes("cfg") ||
        lowerKey.includes("seed") ||
        lowerKey.includes("model")
      ) {
        aiData[key] = this.getTagValue(tags[key]);
      }
    });

    // Parse Stable Diffusion parameters if found
    if (tags["parameters"] || tags["Parameters"]) {
      const paramText = this.getTagValue(
        tags["parameters"] || tags["Parameters"]
      );
      if (paramText) {
        aiData.parsedParameters =
          this.parseStableDiffusionParameters(paramText);
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
      // Find the "Negative prompt:" marker to split positive and negative prompts
      const negativePromptIndex = paramText.indexOf("Negative prompt:");

      let positivePromptText = "";
      let remainingText = paramText;

      if (negativePromptIndex !== -1) {
        // Split at "Negative prompt:"
        positivePromptText = paramText.substring(0, negativePromptIndex).trim();
        remainingText = paramText.substring(negativePromptIndex);
      } else {
        // No negative prompt found, need to find where parameters start
        const lines = paramText.split("\n");
        const parameterLineIndex = lines.findIndex(
          (line) =>
            line.includes("Steps:") ||
            line.includes("Sampler:") ||
            (line.includes(":") && line.includes(","))
        );

        if (parameterLineIndex !== -1) {
          positivePromptText = lines
            .slice(0, parameterLineIndex)
            .join("\n")
            .trim();
          remainingText = lines.slice(parameterLineIndex).join("\n");
        } else {
          positivePromptText = paramText.trim();
          remainingText = "";
        }
      }

      // Process positive prompt
      if (positivePromptText) {
        // Extract LoRA information first
        const loraMatches = positivePromptText.match(/<lora:([^:>]+):[^>]*>/g);
        if (loraMatches) {
          parsed.loras = loraMatches
            .map((lora) => {
              const match = lora.match(/<lora:([^:>]+):([^>]*)>/);
              return match ? { name: match[1], weight: match[2] } : null;
            })
            .filter(Boolean);
        }

        // Clean positive prompt (remove LoRA tags and normalize whitespace)
        const cleanPositivePrompt = positivePromptText
          .replace(/<lora:[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanPositivePrompt) {
          parsed.positivePrompt = cleanPositivePrompt;
        }
      }

      // Process remaining text (negative prompt and parameters)
      if (remainingText) {
        const lines = remainingText.split("\n");
        let negativePromptLines = [];
        let inNegativePrompt = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Check if this line starts with "Negative prompt:"
          if (line.startsWith("Negative prompt:")) {
            inNegativePrompt = true;
            const negativeStart = line.replace("Negative prompt:", "").trim();
            if (negativeStart) {
              negativePromptLines.push(negativeStart);
            }
            continue;
          }

          // Check if we've hit the parameters section
          if (
            line.includes("Steps:") ||
            line.includes("Sampler:") ||
            (line.includes(":") && line.includes(","))
          ) {
            inNegativePrompt = false;
            this.parseParameterLine(line, parsed);
            continue;
          }

          // If we're in negative prompt section, collect the line
          if (inNegativePrompt) {
            negativePromptLines.push(line);
          }
        }

        // Set negative prompt if we found any
        if (negativePromptLines.length > 0) {
          parsed.negativePrompt = negativePromptLines
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        }
      }

      // Post-process LoRA hashes if available
      if (parsed.loraHashes && parsed.loras) {
        this.matchLoraHashes(parsed);
      }
    } catch (error) {
      console.warn("Error parsing SD parameters:", error);
    }

    return parsed;
  }

  /**
   * Parse a parameter line with comma-separated key-value pairs
   * @param {string} line - Parameter line
   * @param {Object} parsed - Parsed parameters object to update
   */
  parseParameterLine(line, parsed) {
    // Split by comma, but be careful with nested structures
    const parts = this.smartSplit(line, ",");

    parts.forEach((part) => {
      const colonIndex = part.indexOf(":");
      if (colonIndex === -1) return;

      const key = part.substring(0, colonIndex).trim();
      const value = part.substring(colonIndex + 1).trim();

      // Handle special cases
      switch (key.toLowerCase()) {
        case "steps":
          parsed.steps = value;
          break;
        case "sampler":
          parsed.sampler = value;
          break;
        case "schedule type":
          parsed.scheduleType = value;
          break;
        case "cfg scale":
          parsed.cfgScale = value;
          break;
        case "seed":
          parsed.seed = value;
          break;
        case "size":
          parsed.size = value;
          const sizeMatch = value.match(/(\d+)x(\d+)/);
          if (sizeMatch) {
            parsed.width = parseInt(sizeMatch[1]);
            parsed.height = parseInt(sizeMatch[2]);
          }
          break;
        case "model hash":
          parsed.modelHash = value;
          break;
        case "model":
          parsed.model = value;
          break;
        case "vae hash":
          parsed.vaeHash = value;
          break;
        case "vae":
          parsed.vae = value;
          break;
        case "lora hashes":
          parsed.loraHashes = this.parseLoraHashes(value);
          break;
        case "version":
          parsed.version = value;
          break;
        default:
          // Store other parameters as-is
          parsed[this.camelCase(key)] = value;
      }
    });
  }

  /**
   * Smart split that respects quoted strings and nested structures
   * @param {string} str - String to split
   * @param {string} delimiter - Delimiter to split on
   * @returns {Array} Split parts
   */
  smartSplit(str, delimiter) {
    const parts = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = "";
      } else if (char === "{" || char === "[") {
        depth++;
      } else if (char === "}" || char === "]") {
        depth--;
      }

      if (char === delimiter && !inQuotes && depth === 0) {
        parts.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * Parse LoRA hashes string
   * @param {string} hashStr - LoRA hashes string
   * @returns {Object} Parsed LoRA hashes
   */
  parseLoraHashes(hashStr) {
    const hashes = {};

    // Remove quotes and parse the hash string
    const cleanStr = hashStr.replace(/^["']|["']$/g, "");
    const parts = this.smartSplit(cleanStr, ",");

    parts.forEach((part) => {
      const colonIndex = part.lastIndexOf(":");
      if (colonIndex !== -1) {
        const name = part.substring(0, colonIndex).trim();
        const hash = part.substring(colonIndex + 1).trim();
        hashes[name] = hash;
      }
    });

    return hashes;
  }

  /**
   * Match LoRA names with their hashes
   * @param {Object} parsed - Parsed parameters object
   */
  matchLoraHashes(parsed) {
    if (!parsed.loras || !parsed.loraHashes) return;

    parsed.loras.forEach((lora) => {
      if (parsed.loraHashes[lora.name]) {
        lora.hash = parsed.loraHashes[lora.name];
      }
    });
  }

  /**
   * Convert string to camelCase
   * @param {string} str - String to convert
   * @returns {string} camelCase string
   */
  camelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, "");
  }

  /**
   * Get tag value, handling different tag formats
   * @param {*} tag - ExifReader tag
   * @returns {*} Tag value
   */
  getTagValue(tag) {
    if (typeof tag === "object" && tag !== null) {
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
    const parts = file.name.split(".");
    if (parts.length === 1) return "unknown";
    return parts.pop()?.toLowerCase() || "unknown";
  }

  /**
   * Format metadata for display in the UI
   * @param {Object} metadata - Extracted metadata
   * @returns {string} HTML formatted metadata
   */
  formatMetadataForDisplay(metadata) {
    if (!metadata) {
      return '<div class="alert alert-warning">No metadata available</div>';
    }

    let html = "";

    // File Information Section
    html += '<div class="metadata-section mb-4">';
    html +=
      '<h6 class="text-primary border-bottom pb-2"><i class="bi bi-file-earmark me-2"></i>File Information</h6>';
    html += '<div class="row">';
    html += `<div class="col-sm-6"><strong>Name:</strong> ${
      metadata.name || "Unknown"
    }</div>`;
    html += `<div class="col-sm-6"><strong>Format:</strong> ${
      metadata.format?.toUpperCase() || "Unknown"
    }</div>`;
    html += `<div class="col-sm-6"><strong>Type:</strong> ${
      metadata.type || "Unknown"
    }</div>`;
    html += `<div class="col-sm-6"><strong>Size:</strong> ${this.formatFileSize(
      metadata.size
    )}</div>`;
    if (metadata.lastModified) {
      html += `<div class="col-sm-12"><strong>Modified:</strong> ${new Date(
        metadata.lastModified
      ).toLocaleString()}</div>`;
    }
    html += "</div></div>";

    // AI Generation Data Section
    if (metadata.ai && Object.keys(metadata.ai).length > 0) {
      html += '<div class="metadata-section mb-4">';
      html +=
        '<h6 class="text-success border-bottom pb-2"><i class="bi bi-robot me-2"></i>AI Generation Parameters</h6>';

      // Show parsed parameters if available
      if (
        metadata.ai.parsedParameters &&
        Object.keys(metadata.ai.parsedParameters).length > 0
      ) {
        const params = metadata.ai.parsedParameters;

        // Positive Prompt
        if (params.positivePrompt) {
          html += '<div class="mb-3">';
          html += '<strong class="text-success">Positive Prompt:</strong><br>';
          html += `<div class="text-muted small bg-light p-2 rounded">${this.escapeHtml(
            params.positivePrompt
          )}</div>`;
          html += "</div>";
        }

        // Negative Prompt
        if (params.negativePrompt) {
          html += '<div class="mb-3">';
          html += '<strong class="text-danger">Negative Prompt:</strong><br>';
          html += `<div class="text-muted small bg-light p-2 rounded">${this.escapeHtml(
            params.negativePrompt
          )}</div>`;
          html += "</div>";
        }

        // Generation Settings
        html += '<div class="row mb-3">';
        if (params.steps)
          html += `<div class="col-sm-6 mb-2"><strong>Steps:</strong> ${params.steps}</div>`;
        if (params.sampler)
          html += `<div class="col-sm-6 mb-2"><strong>Sampler:</strong> ${this.escapeHtml(
            params.sampler
          )}</div>`;
        if (params.scheduleType)
          html += `<div class="col-sm-6 mb-2"><strong>Schedule Type:</strong> ${this.escapeHtml(
            params.scheduleType
          )}</div>`;
        if (params.cfgScale)
          html += `<div class="col-sm-6 mb-2"><strong>CFG Scale:</strong> ${params.cfgScale}</div>`;
        if (params.seed)
          html += `<div class="col-sm-6 mb-2"><strong>Seed:</strong> ${params.seed}</div>`;
        if (params.size)
          html += `<div class="col-sm-6 mb-2"><strong>Size:</strong> ${this.escapeHtml(
            params.size
          )}</div>`;
        html += "</div>";

        // Model Information
        if (params.model || params.modelHash) {
          html += '<div class="mb-3">';
          html += '<strong class="text-info">Model:</strong><br>';
          if (params.model) {
            html += `<div class="small">${this.escapeHtml(params.model)}`;
            if (params.modelHash) {
              html += ` <span class="text-muted">(Hash: ${this.escapeHtml(
                params.modelHash
              )})</span>`;
            }
            html += "</div>";
          }
          html += "</div>";
        }

        // VAE Information
        if (params.vae || params.vaeHash) {
          html += '<div class="mb-3">';
          html += '<strong class="text-warning">VAE:</strong><br>';
          if (params.vae) {
            html += `<div class="small">${this.escapeHtml(params.vae)}`;
            if (params.vaeHash) {
              html += ` <span class="text-muted">(Hash: ${this.escapeHtml(
                params.vaeHash
              )})</span>`;
            }
            html += "</div>";
          }
          html += "</div>";
        }

        // LoRA Information
        if (params.loras && params.loras.length > 0) {
          html += '<div class="mb-3">';
          html += '<strong class="text-primary">LoRAs:</strong><br>';
          html += '<div class="small">';
          params.loras.forEach((lora, index) => {
            html += `<div class="mb-1">• ${this.escapeHtml(lora.name)}`;
            if (lora.weight)
              html += ` <span class="text-muted">(Weight: ${this.escapeHtml(
                lora.weight
              )})</span>`;
            if (lora.hash)
              html += ` <span class="text-muted">(Hash: ${this.escapeHtml(
                lora.hash
              )})</span>`;
            html += "</div>";
          });
          html += "</div>";
          html += "</div>";
        }

        // Version
        if (params.version) {
          html += `<div class="mb-2"><strong>Version:</strong> ${this.escapeHtml(
            params.version
          )}</div>`;
        }
      }

      // Show raw AI data
      html += '<div class="mt-3">';
      html +=
        '<button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#aiRawData" aria-expanded="false">Show Raw AI Data</button>';
      html += '<div class="collapse mt-2" id="aiRawData">';
      html +=
        '<pre class="bg-light p-2 small">' +
        this.escapeHtml(JSON.stringify(metadata.ai, null, 2)) +
        "</pre>";
      html += "</div></div>";
      html += "</div>";
    }

    // EXIF Data Section
    if (metadata.exif && Object.keys(metadata.exif).length > 0) {
      html += '<div class="metadata-section mb-4">';
      html +=
        '<h6 class="text-info border-bottom pb-2"><i class="bi bi-camera me-2"></i>EXIF Data</h6>';
      html += '<div class="row">';
      Object.entries(metadata.exif).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          html += `<div class="col-sm-6 mb-2"><strong>${this.formatKey(
            key
          )}:</strong> ${this.escapeHtml(value)}</div>`;
        }
      });
      html += "</div></div>";
    }

    // PNG Text Chunks Section
    if (metadata.png && Object.keys(metadata.png).length > 0) {
      html += '<div class="metadata-section mb-4">';
      html +=
        '<h6 class="text-warning border-bottom pb-2"><i class="bi bi-file-text me-2"></i>PNG Text Data</h6>';
      html += '<div class="row">';
      Object.entries(metadata.png).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          html += `<div class="col-12 mb-2"><strong>${this.formatKey(
            key
          )}:</strong><br>`;
          html += `<div class="text-muted small">${this.escapeHtml(
            value
          )}</div></div>`;
        }
      });
      html += "</div></div>";
    }

    // Error Section
    if (metadata.error) {
      html += '<div class="metadata-section mb-4">';
      html += '<div class="alert alert-danger">';
      html += '<i class="bi bi-exclamation-triangle me-2"></i>';
      html += `<strong>Error:</strong> ${this.escapeHtml(metadata.error)}`;
      html += "</div></div>";
    }

    // Raw Data Section (collapsible)
    html += '<div class="metadata-section">';
    html +=
      '<button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#rawMetadata" aria-expanded="false">Show All Raw Data</button>';
    html += '<div class="collapse mt-2" id="rawMetadata">';
    html +=
      '<pre class="bg-light p-2 small" style="max-height: 300px; overflow-y: auto;">' +
      this.escapeHtml(JSON.stringify(metadata, null, 2)) +
      "</pre>";
    html += "</div></div>";

    return html;
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Format metadata key for display
   * @param {string} key - Metadata key
   * @returns {string} Formatted key
   */
  formatKey(key) {
    return key
      .replace(/([A-Z])/g, " $1") // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize each word
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (typeof text !== "string") {
      text = String(text);
    }
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Preserve metadata when saving by writing PNG tEXt chunks
   * @param {Blob} imageBlob - The processed image blob
   * @param {Object} metadata - Original metadata
   * @returns {Promise<Blob>} Blob with preserved metadata
   */
  async preserveMetadata(imageBlob, metadata) {
    if (!metadata) {
      console.log("No metadata to preserve");
      return imageBlob;
    }

    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await imageBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check if it's a PNG file
      if (!this.isPNG(uint8Array)) {
        console.log("Not a PNG file, cannot preserve metadata in this format");
        return imageBlob;
      }

      // Create PNG with metadata
      const pngWithMetadata = await this.addMetadataToPNG(uint8Array, metadata);
      
      console.log("Successfully preserved metadata in PNG file");
      return new Blob([pngWithMetadata], { type: 'image/png' });
      
    } catch (error) {
      console.warn("Failed to preserve metadata:", error);
      console.log("Saving without metadata");
      return imageBlob;
    }
  }

  /**
   * Check if the data is a PNG file
   * @param {Uint8Array} data - Image data
   * @returns {boolean} True if PNG
   */
  isPNG(data) {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    
    if (data.length < 8) return false;
    
    for (let i = 0; i < 8; i++) {
      if (data[i] !== pngSignature[i]) return false;
    }
    
    return true;
  }

  /**
   * Add metadata to PNG as tEXt chunks
   * @param {Uint8Array} pngData - Original PNG data
   * @param {Object} metadata - Metadata to add
   * @returns {Uint8Array} PNG data with metadata
   */
  async addMetadataToPNG(pngData, metadata) {
    const chunks = this.parsePNGChunks(pngData);
    const metadataChunks = this.createMetadataChunks(metadata);
    
    // Insert metadata chunks before IEND chunk
    const iendIndex = chunks.findIndex(chunk => chunk.type === 'IEND');
    if (iendIndex === -1) {
      throw new Error('Invalid PNG: no IEND chunk found');
    }
    
    // Insert metadata chunks before IEND
    chunks.splice(iendIndex, 0, ...metadataChunks);
    
    // Rebuild PNG
    return this.buildPNG(chunks);
  }

  /**
   * Parse PNG chunks
   * @param {Uint8Array} data - PNG data
   * @returns {Array} Array of chunk objects
   */
  parsePNGChunks(data) {
    const chunks = [];
    let offset = 8; // Skip PNG signature
    
    while (offset < data.length) {
      if (offset + 8 > data.length) break;
      
      // Read chunk length (4 bytes, big-endian)
      const length = (data[offset] << 24) | (data[offset + 1] << 16) | 
                    (data[offset + 2] << 8) | data[offset + 3];
      
      // Read chunk type (4 bytes)
      const type = String.fromCharCode(data[offset + 4], data[offset + 5], 
                                      data[offset + 6], data[offset + 7]);
      
      // Read chunk data
      const chunkData = data.slice(offset + 8, offset + 8 + length);
      
      // Read CRC (4 bytes)
      const crc = data.slice(offset + 8 + length, offset + 12 + length);
      
      chunks.push({
        type,
        data: chunkData,
        crc,
        length
      });
      
      offset += 12 + length; // 4 (length) + 4 (type) + length (data) + 4 (crc)
    }
    
    return chunks;
  }

  /**
   * Create metadata chunks for PNG
   * @param {Object} metadata - Metadata object
   * @returns {Array} Array of tEXt chunk objects
   */
  createMetadataChunks(metadata) {
    const chunks = [];
    
    // Create tEXt chunks for various metadata
    const textData = this.prepareTextMetadata(metadata);
    
    for (const [keyword, text] of Object.entries(textData)) {
      if (text && text.length > 0) {
        const chunk = this.createTextChunk(keyword, text);
        if (chunk) chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  /**
   * Prepare text metadata for PNG tEXt chunks
   * @param {Object} metadata - Original metadata
   * @returns {Object} Key-value pairs for tEXt chunks
   */
  prepareTextMetadata(metadata) {
    const textData = {};
    
    // Add file information
    if (metadata.name) {
      textData['Source'] = metadata.name;
    }
    
    // Add AI generation parameters if available
    if (metadata.ai && metadata.ai.parsedParameters) {
      const params = metadata.ai.parsedParameters;
      
      if (params.positivePrompt) {
        textData['Positive Prompt'] = params.positivePrompt;
      }
      
      if (params.negativePrompt) {
        textData['Negative Prompt'] = params.negativePrompt;
      }
      
      if (params.steps) {
        textData['Steps'] = params.steps.toString();
      }
      
      if (params.sampler) {
        textData['Sampler'] = params.sampler;
      }
      
      if (params.cfgScale) {
        textData['CFG Scale'] = params.cfgScale.toString();
      }
      
      if (params.seed) {
        textData['Seed'] = params.seed.toString();
      }
      
      if (params.model) {
        textData['Model'] = params.model;
      }
      
      if (params.size) {
        textData['Size'] = params.size;
      }
      
      // Combine all parameters as a single chunk for compatibility
      const allParams = [];
      if (params.positivePrompt) allParams.push(params.positivePrompt);
      if (params.negativePrompt) allParams.push(`Negative prompt: ${params.negativePrompt}`);
      
      const paramParts = [];
      if (params.steps) paramParts.push(`Steps: ${params.steps}`);
      if (params.sampler) paramParts.push(`Sampler: ${params.sampler}`);
      if (params.scheduleType) paramParts.push(`Schedule type: ${params.scheduleType}`);
      if (params.cfgScale) paramParts.push(`CFG scale: ${params.cfgScale}`);
      if (params.seed) paramParts.push(`Seed: ${params.seed}`);
      if (params.size) paramParts.push(`Size: ${params.size}`);
      if (params.model) paramParts.push(`Model: ${params.model}`);
      if (params.modelHash) paramParts.push(`Model hash: ${params.modelHash}`);
      if (params.vae) paramParts.push(`VAE: ${params.vae}`);
      if (params.vaeHash) paramParts.push(`VAE hash: ${params.vaeHash}`);
      if (params.version) paramParts.push(`Version: ${params.version}`);
      
      if (paramParts.length > 0) {
        allParams.push(paramParts.join(', '));
      }
      
      if (allParams.length > 0) {
        textData['parameters'] = allParams.join('\n');
      }
    }
    
    // Add EXIF data if available
    if (metadata.exif) {
      for (const [key, value] of Object.entries(metadata.exif)) {
        if (value && typeof value === 'string' && value.length > 0) {
          textData[`EXIF:${key}`] = value;
        }
      }
    }
    
    // Add processing information
    textData['Software'] = 'Pixelate Editor v2.0';
    textData['Processing Date'] = new Date().toISOString();
    
    return textData;
  }

  /**
   * Create a PNG tEXt chunk
   * @param {string} keyword - Keyword (max 79 characters)
   * @param {string} text - Text content
   * @returns {Object} Chunk object
   */
  createTextChunk(keyword, text) {
    try {
      // Ensure keyword is valid (1-79 characters, Latin-1)
      if (!keyword || keyword.length === 0 || keyword.length > 79) {
        console.warn(`Invalid keyword length: ${keyword}`);
        return null;
      }
      
      // Convert strings to bytes
      const keywordBytes = this.stringToLatin1Bytes(keyword);
      const textBytes = this.stringToLatin1Bytes(text);
      
      // Create chunk data: keyword + null separator + text
      const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
      chunkData.set(keywordBytes, 0);
      chunkData[keywordBytes.length] = 0; // null separator
      chunkData.set(textBytes, keywordBytes.length + 1);
      
      // Calculate CRC
      const typeBytes = this.stringToLatin1Bytes('tEXt');
      const crcData = new Uint8Array(typeBytes.length + chunkData.length);
      crcData.set(typeBytes, 0);
      crcData.set(chunkData, typeBytes.length);
      
      const crc = this.calculateCRC32(crcData);
      const crcBytes = new Uint8Array(4);
      crcBytes[0] = (crc >>> 24) & 0xFF;
      crcBytes[1] = (crc >>> 16) & 0xFF;
      crcBytes[2] = (crc >>> 8) & 0xFF;
      crcBytes[3] = crc & 0xFF;
      
      return {
        type: 'tEXt',
        data: chunkData,
        crc: crcBytes,
        length: chunkData.length
      };
    } catch (error) {
      console.warn(`Failed to create tEXt chunk for ${keyword}:`, error);
      return null;
    }
  }

  /**
   * Convert string to Latin-1 bytes
   * @param {string} str - Input string
   * @returns {Uint8Array} Latin-1 bytes
   */
  stringToLatin1Bytes(str) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      // Convert to Latin-1, replacing non-Latin-1 characters with '?'
      bytes[i] = charCode <= 255 ? charCode : 63; // 63 = '?'
    }
    return bytes;
  }

  /**
   * Build PNG from chunks
   * @param {Array} chunks - Array of chunk objects
   * @returns {Uint8Array} Complete PNG data
   */
  buildPNG(chunks) {
    // Calculate total size
    let totalSize = 8; // PNG signature
    for (const chunk of chunks) {
      totalSize += 12 + chunk.length; // 4 (length) + 4 (type) + data + 4 (crc)
    }
    
    const result = new Uint8Array(totalSize);
    let offset = 0;
    
    // Write PNG signature
    const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    result.set(signature, offset);
    offset += 8;
    
    // Write chunks
    for (const chunk of chunks) {
      // Write length (big-endian)
      result[offset] = (chunk.length >>> 24) & 0xFF;
      result[offset + 1] = (chunk.length >>> 16) & 0xFF;
      result[offset + 2] = (chunk.length >>> 8) & 0xFF;
      result[offset + 3] = chunk.length & 0xFF;
      offset += 4;
      
      // Write type
      const typeBytes = this.stringToLatin1Bytes(chunk.type);
      result.set(typeBytes, offset);
      offset += 4;
      
      // Write data
      result.set(chunk.data, offset);
      offset += chunk.length;
      
      // Write CRC
      result.set(chunk.crc, offset);
      offset += 4;
    }
    
    return result;
  }

  /**
   * Calculate CRC32 for PNG chunks
   * @param {Uint8Array} data - Data to calculate CRC for
   * @returns {number} CRC32 value
   */
  calculateCRC32(data) {
    // CRC32 table (standard PNG CRC table)
    if (!this.crcTable) {
      this.crcTable = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        this.crcTable[i] = c;
      }
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = this.crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0; // Ensure unsigned 32-bit
  }
}
