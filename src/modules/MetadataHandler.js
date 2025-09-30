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
          parsed.steps = parseInt(value);
          break;
        case "sampler":
          parsed.sampler = value;
          break;
        case "schedule type":
          parsed.scheduleType = value;
          break;
        case "cfg scale":
          parsed.cfgScale = parseFloat(value);
          break;
        case "seed":
          parsed.seed = parseInt(value);
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
   * Get metadata as plain text for copying
   * @param {Object} metadata - Extracted metadata
   * @returns {string} Plain text metadata
   */
  getMetadataAsText(metadata) {
    if (!metadata) return "No metadata available";

    let text = "=== IMAGE METADATA ===\n\n";

    // File Information
    text += "--- File Information ---\n";
    text += `Name: ${metadata.name || "Unknown"}\n`;
    text += `Format: ${metadata.format?.toUpperCase() || "Unknown"}\n`;
    text += `Type: ${metadata.type || "Unknown"}\n`;
    text += `Size: ${this.formatFileSize(metadata.size)}\n`;
    if (metadata.lastModified) {
      text += `Modified: ${new Date(metadata.lastModified).toLocaleString()}\n`;
    }
    text += "\n";

    // AI Generation Data
    if (metadata.ai && Object.keys(metadata.ai).length > 0) {
      text += "--- AI Generation Parameters ---\n";
      if (metadata.ai.parsedParameters) {
        Object.entries(metadata.ai.parsedParameters).forEach(([key, value]) => {
          if (value && value.toString().trim()) {
            text += `${this.formatKey(key)}: ${value}\n`;
          }
        });
      }
      text += "\n";
    }

    // EXIF Data
    if (metadata.exif && Object.keys(metadata.exif).length > 0) {
      text += "--- EXIF Data ---\n";
      Object.entries(metadata.exif).forEach(([key, value]) => {
        if (value && value.toString().trim()) {
          text += `${this.formatKey(key)}: ${value}\n`;
        }
      });
      text += "\n";
    }

    return text;
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

    console.log(
      "Metadata preservation not yet implemented, saving without metadata"
    );
    console.log("Original metadata was:", metadata);

    return imageBlob;
  }
}
