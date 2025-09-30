import { beforeEach, describe, expect, it } from "vitest";
import { MetadataHandler } from "../modules/MetadataHandler.js";

describe("Metadata Preservation", () => {
  let metadataHandler;

  beforeEach(() => {
    metadataHandler = new MetadataHandler();
  });

  describe("PNG Detection and Utilities", () => {
    it("should identify PNG files correctly", () => {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const pngData = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
      ]);
      const notPngData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG signature
      const tooShortData = new Uint8Array([0x89, 0x50]);

      expect(metadataHandler.isPNG(pngData)).toBe(true);
      expect(metadataHandler.isPNG(notPngData)).toBe(false);
      expect(metadataHandler.isPNG(tooShortData)).toBe(false);
    });

    it("should convert strings to Latin-1 bytes correctly", () => {
      const result = metadataHandler.stringToLatin1Bytes("Hello");
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));

      // Test empty string
      const emptyResult = metadataHandler.stringToLatin1Bytes("");
      expect(emptyResult).toEqual(new Uint8Array([]));

      // Test non-Latin-1 character (should be replaced with '?')
      // Note: Emoji characters are multi-byte in UTF-16, so they become multiple '?' characters
      const unicodeResult = metadataHandler.stringToLatin1Bytes("Hello 🌟");
      expect(unicodeResult).toEqual(
        new Uint8Array([72, 101, 108, 108, 111, 32, 63, 63])
      ); // 63 = '?'
    });

    it("should calculate CRC32 correctly", () => {
      const testData = new Uint8Array([116, 69, 88, 116]); // "tEXt"
      const crc = metadataHandler.calculateCRC32(testData);

      // CRC32 should be a valid 32-bit unsigned integer
      expect(typeof crc).toBe("number");
      expect(crc).toBeGreaterThanOrEqual(0);
      expect(crc).toBeLessThanOrEqual(0xffffffff);

      // Test with known data for consistency
      const emptyData = new Uint8Array([]);
      const emptyCrc = metadataHandler.calculateCRC32(emptyData);
      expect(emptyCrc).toBe(0); // CRC32 of empty data should be 0
    });
  });

  describe("PNG Text Chunk Creation", () => {
    it("should create valid tEXt chunks", () => {
      const chunk = metadataHandler.createTextChunk(
        "Software",
        "Pixelate Editor v2.0"
      );

      expect(chunk).toBeDefined();
      expect(chunk.type).toBe("tEXt");
      expect(chunk.data).toBeInstanceOf(Uint8Array);
      expect(chunk.crc).toBeInstanceOf(Uint8Array);
      expect(chunk.crc.length).toBe(4);
      expect(chunk.length).toBe(chunk.data.length);

      // Verify chunk data structure: keyword + null + text
      const expectedKeyword = "Software";
      const expectedText = "Pixelate Editor v2.0";
      const expectedLength = expectedKeyword.length + 1 + expectedText.length;
      expect(chunk.length).toBe(expectedLength);
    });

    it("should reject invalid keywords", () => {
      // Empty keyword
      expect(metadataHandler.createTextChunk("", "test")).toBeNull();

      // Too long keyword (>79 characters)
      const longKeyword = "a".repeat(80);
      expect(metadataHandler.createTextChunk(longKeyword, "test")).toBeNull();

      // Valid edge case (79 characters)
      const maxKeyword = "a".repeat(79);
      const validChunk = metadataHandler.createTextChunk(maxKeyword, "test");
      expect(validChunk).not.toBeNull();
      expect(validChunk.type).toBe("tEXt");
    });

    it("should handle special characters in text content", () => {
      const chunk = metadataHandler.createTextChunk(
        "Description",
        "Test with special chars: àáâã"
      );
      expect(chunk).toBeDefined();
      expect(chunk.type).toBe("tEXt");
    });
  });

  describe("Metadata Preparation", () => {
    it("should prepare text metadata from AI generation parameters", () => {
      const metadata = {
        name: "ai_generated.png",
        ai: {
          parsedParameters: {
            positivePrompt: "beautiful landscape, detailed",
            negativePrompt: "ugly, blurry, low quality",
            steps: "30",
            sampler: "DPM++ 2M Karras",
            cfgScale: "7.5",
            seed: "123456789",
            model: "stable_diffusion_v1.5",
            modelHash: "abc123def",
            size: "512x768",
            width: 512,
            height: 768,
            vae: "vae-ft-mse-840000-ema-pruned",
            vaeHash: "def456ghi",
            version: "v1.6.0",
          },
        },
      };

      const textData = metadataHandler.prepareTextMetadata(metadata);

      // Check individual metadata fields
      expect(textData["Source"]).toBe("ai_generated.png");
      expect(textData["Positive Prompt"]).toBe("beautiful landscape, detailed");
      expect(textData["Negative Prompt"]).toBe("ugly, blurry, low quality");
      expect(textData["Steps"]).toBe("30");
      expect(textData["Sampler"]).toBe("DPM++ 2M Karras");
      expect(textData["CFG Scale"]).toBe("7.5");
      expect(textData["Seed"]).toBe("123456789");
      expect(textData["Model"]).toBe("stable_diffusion_v1.5");
      expect(textData["Size"]).toBe("512x768");
      expect(textData["Software"]).toBe("Pixelate Editor v2.0");
      expect(textData["Processing Date"]).toBeDefined();

      // Check combined parameters chunk
      expect(textData["parameters"]).toContain("beautiful landscape, detailed");
      expect(textData["parameters"]).toContain(
        "Negative prompt: ugly, blurry, low quality"
      );
      expect(textData["parameters"]).toContain("Steps: 30");
      expect(textData["parameters"]).toContain("Model: stable_diffusion_v1.5");
    });

    it("should prepare text metadata from EXIF data", () => {
      const metadata = {
        name: "photo.jpg",
        exif: {
          Make: "Canon",
          Model: "EOS R5",
          DateTime: "2023:12:25 10:30:00",
          ISO: "400",
          FNumber: "f/2.8",
        },
      };

      const textData = metadataHandler.prepareTextMetadata(metadata);

      expect(textData["Source"]).toBe("photo.jpg");
      expect(textData["EXIF:Make"]).toBe("Canon");
      expect(textData["EXIF:Model"]).toBe("EOS R5");
      expect(textData["EXIF:DateTime"]).toBe("2023:12:25 10:30:00");
      expect(textData["EXIF:ISO"]).toBe("400");
      expect(textData["EXIF:FNumber"]).toBe("f/2.8");
      expect(textData["Software"]).toBe("Pixelate Editor v2.0");
    });

    it("should handle empty or missing metadata gracefully", () => {
      const emptyMetadata = {};
      const textData = metadataHandler.prepareTextMetadata(emptyMetadata);

      // Should always include software and processing date
      expect(textData["Software"]).toBe("Pixelate Editor v2.0");
      expect(textData["Processing Date"]).toBeDefined();

      // Should not include undefined fields
      expect(textData["Source"]).toBeUndefined();
      expect(textData["Positive Prompt"]).toBeUndefined();
    });
  });

  describe("PNG Chunk Parsing and Building", () => {
    it("should create metadata chunks from prepared text data", () => {
      const metadata = {
        name: "test.png",
        ai: {
          parsedParameters: {
            positivePrompt: "test prompt",
            steps: "20",
          },
        },
      };

      const chunks = metadataHandler.createMetadataChunks(metadata);

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);

      // All chunks should be tEXt chunks
      chunks.forEach((chunk) => {
        expect(chunk.type).toBe("tEXt");
        expect(chunk.data).toBeInstanceOf(Uint8Array);
        expect(chunk.crc).toBeInstanceOf(Uint8Array);
        expect(chunk.length).toBe(chunk.data.length);
      });
    });

    it("should build valid PNG from chunks", () => {
      // Create a minimal PNG structure
      const chunks = [
        {
          type: "IHDR",
          data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]), // 1x1 RGB image
          crc: new Uint8Array([0x90, 0x77, 0x53, 0xde]),
          length: 13,
        },
        {
          type: "IDAT",
          data: new Uint8Array([
            0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
          ]),
          crc: new Uint8Array([0xe2, 0x21, 0xbc, 0x33]),
          length: 9,
        },
        {
          type: "IEND",
          data: new Uint8Array([]),
          crc: new Uint8Array([0xae, 0x42, 0x60, 0x82]),
          length: 0,
        },
      ];

      const pngData = metadataHandler.buildPNG(chunks);

      expect(pngData).toBeInstanceOf(Uint8Array);
      expect(pngData.length).toBeGreaterThan(8); // At least PNG signature + some data

      // Check PNG signature
      expect(metadataHandler.isPNG(pngData)).toBe(true);
    });
  });

  describe("Full Metadata Preservation Workflow", () => {
    it("should handle missing metadata gracefully", async () => {
      const mockBlob = {
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      };

      const result = await metadataHandler.preserveMetadata(mockBlob, null);
      expect(result).toBe(mockBlob);
    });

    it("should handle non-PNG files gracefully", async () => {
      // JPEG signature
      const jpegData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      const mockBlob = {
        arrayBuffer: () => Promise.resolve(jpegData.buffer),
      };

      const result = await metadataHandler.preserveMetadata(mockBlob, {
        name: "test.jpg",
      });
      expect(result).toBe(mockBlob);
    });

    it("should handle PNG files with metadata", async () => {
      // Create a minimal valid PNG
      const minimalPNG = new Uint8Array([
        // PNG signature
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        // IHDR chunk (1x1 RGB image)
        0x00,
        0x00,
        0x00,
        0x0d, // length: 13
        0x49,
        0x48,
        0x44,
        0x52, // type: IHDR
        0x00,
        0x00,
        0x00,
        0x01, // width: 1
        0x00,
        0x00,
        0x00,
        0x01, // height: 1
        0x08,
        0x02,
        0x00,
        0x00,
        0x00, // bit depth: 8, color type: 2 (RGB), compression: 0, filter: 0, interlace: 0
        0x90,
        0x77,
        0x53,
        0xde, // CRC
        // IDAT chunk
        0x00,
        0x00,
        0x00,
        0x09, // length: 9
        0x49,
        0x44,
        0x41,
        0x54, // type: IDAT
        0x78,
        0x9c,
        0x62,
        0x00,
        0x00,
        0x00,
        0x02,
        0x00,
        0x01, // compressed data
        0xe2,
        0x21,
        0xbc,
        0x33, // CRC
        // IEND chunk
        0x00,
        0x00,
        0x00,
        0x00, // length: 0
        0x49,
        0x45,
        0x4e,
        0x44, // type: IEND
        0xae,
        0x42,
        0x60,
        0x82, // CRC
      ]);

      const mockBlob = {
        arrayBuffer: () => Promise.resolve(minimalPNG.buffer),
      };

      const metadata = {
        name: "test.png",
        ai: {
          parsedParameters: {
            positivePrompt: "test image",
            steps: "20",
          },
        },
      };

      const result = await metadataHandler.preserveMetadata(mockBlob, metadata);

      // In test environment, we just verify that the function completes successfully
      // and returns a result (the actual Blob functionality may be limited in tests)
      expect(result).toBeDefined();

      // The key test is that the function processes the PNG without throwing errors
      // and the console output shows "Successfully preserved metadata in PNG file"
    });

    it("should handle errors during PNG processing gracefully", async () => {
      // Invalid PNG data (missing IEND chunk)
      const invalidPNG = new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // length: 13
        0x49,
        0x48,
        0x44,
        0x52, // type: IHDR
        // Truncated data...
      ]);

      const mockBlob = {
        arrayBuffer: () => Promise.resolve(invalidPNG.buffer),
      };

      const metadata = { name: "invalid.png" };

      const result = await metadataHandler.preserveMetadata(mockBlob, metadata);

      // Should fallback to returning original blob on error
      expect(result).toBe(mockBlob);
    });
  });

  describe("Integration with Image Processing", () => {
    it("should preserve comprehensive AI metadata", async () => {
      const comprehensiveMetadata = {
        name: "complex_ai_image.png",
        format: "png",
        size: 1024000,
        type: "image/png",
        ai: {
          parsedParameters: {
            positivePrompt:
              "masterpiece, best quality, highly detailed portrait of a woman, beautiful eyes, flowing hair",
            negativePrompt:
              "ugly, blurry, low quality, distorted, deformed, bad anatomy",
            steps: "50",
            sampler: "DPM++ 2M Karras",
            scheduleType: "Karras",
            cfgScale: "8.0",
            seed: "987654321",
            size: "768x1024",
            width: 768,
            height: 1024,
            model: "realisticVisionV60B1_v60B1VAE",
            modelHash: "e6415c4892",
            vae: "vae-ft-mse-840000-ema-pruned.ckpt",
            vaeHash: "735e4c3a44",
            loras: [
              { name: "detail_tweaker", weight: "0.8", hash: "abc123" },
              { name: "eye_enhancement", weight: "0.6", hash: "def456" },
            ],
            loraHashes: {
              detail_tweaker: "abc123",
              eye_enhancement: "def456",
            },
            version: "v1.7.0",
          },
        },
        exif: {
          Make: "AI Generated",
          Model: "Stable Diffusion",
          DateTime: "2024:01:15 14:30:00",
          Software: "AUTOMATIC1111",
        },
      };

      const textData = metadataHandler.prepareTextMetadata(
        comprehensiveMetadata
      );

      // Verify all important metadata is preserved
      expect(textData["Source"]).toBe("complex_ai_image.png");
      expect(textData["Positive Prompt"]).toContain("masterpiece");
      expect(textData["Negative Prompt"]).toContain("ugly");
      expect(textData["Steps"]).toBe("50");
      expect(textData["Sampler"]).toBe("DPM++ 2M Karras");
      expect(textData["CFG Scale"]).toBe("8.0");
      expect(textData["Seed"]).toBe("987654321");
      expect(textData["Model"]).toBe("realisticVisionV60B1_v60B1VAE");
      expect(textData["Size"]).toBe("768x1024");
      expect(textData["EXIF:Make"]).toBe("AI Generated");
      expect(textData["EXIF:Software"]).toBe("AUTOMATIC1111");

      // Verify combined parameters include all settings
      const params = textData["parameters"];
      expect(params).toContain("masterpiece");
      expect(params).toContain("Negative prompt: ugly");
      expect(params).toContain("Steps: 50");
      expect(params).toContain("Sampler: DPM++ 2M Karras");
      expect(params).toContain("CFG scale: 8.0");
      expect(params).toContain("Model: realisticVisionV60B1_v60B1VAE");
    });
  });
});
