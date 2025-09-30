import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { MetadataHandler } from "../modules/MetadataHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Integration Tests", () => {
  describe("Real Image Metadata Extraction", () => {
    it("should extract metadata from the test image", async () => {
      const metadataHandler = new MetadataHandler();

      try {
        // Load the actual test image
        const testImagePath = resolve(
          __dirname,
          "69745990-0ede-4812-8f41-834df0749e2c_a1111.png"
        );
        const imageBuffer = readFileSync(testImagePath);

        // Create a mock File object
        const mockFile = {
          name: "69745990-0ede-4812-8f41-834df0749e2c_a1111.png",
          type: "image/png",
          size: imageBuffer.length,
          lastModified: Date.now(),
          arrayBuffer: () =>
            Promise.resolve(
              imageBuffer.buffer.slice(
                imageBuffer.byteOffset,
                imageBuffer.byteOffset + imageBuffer.byteLength
              )
            ),
        };

        const metadata = await metadataHandler.extractMetadata(mockFile);

        // Basic checks
        expect(metadata.format).toBe("png");
        expect(metadata.name).toBe(
          "69745990-0ede-4812-8f41-834df0749e2c_a1111.png"
        );
        expect(metadata.type).toBe("image/png");
        expect(metadata.size).toBeGreaterThan(0);

        // Check that we have some tags
        expect(metadata.tags).toBeDefined();
        expect(typeof metadata.tags).toBe("object");

        console.log("Extracted metadata keys:", Object.keys(metadata.tags));

        // Look for AI generation parameters
        const aiKeys = Object.keys(metadata.tags).filter(
          (key) =>
            key.toLowerCase().includes("parameters") ||
            key.toLowerCase().includes("prompt") ||
            key.toLowerCase().includes("text")
        );

        if (aiKeys.length > 0) {
          console.log("Found AI-related metadata keys:", aiKeys);

          // Check if we found the expected Stable Diffusion parameters
          const paramKey = aiKeys.find((key) =>
            key.toLowerCase().includes("parameters")
          );

          if (paramKey) {
            const paramValue = metadataHandler.getTagValue(
              metadata.tags[paramKey]
            );
            console.log("Parameters value:", paramValue);

            // Should contain some of the expected content
            if (typeof paramValue === "string") {
              expect(paramValue).toContain("Steps:");
              expect(paramValue).toContain("Sampler:");
              expect(paramValue).toContain("CFG scale:");
              expect(paramValue).toContain("Seed:");
            }
          }
        }

        // Test AI data extraction
        expect(metadata.ai).toBeDefined();
        expect(typeof metadata.ai).toBe("object");

        // Test PNG data extraction
        expect(metadata.png).toBeDefined();
        expect(typeof metadata.png).toBe("object");
      } catch (error) {
        if (error.code === "ENOENT") {
          console.warn("Test image not found, skipping real image test");
          expect(true).toBe(true); // Pass the test if image is not available
        } else {
          throw error;
        }
      }
    });
  });

  describe("Metadata Parsing", () => {
    it("should parse Stable Diffusion parameters correctly", () => {
      const metadataHandler = new MetadataHandler();

      // Test with the expected format from the identify command
      const testParams = `magical fantasy forest, epic oak trees, beautiful detailed face, beautiful detailed eyes,  CosmicStyle <lora:CosmicStyleSDXL:1.2> <lora:TrendCraft_The_Peoples_Style_Detailer-v2.3I-4_15_2025-SDXL:0.88> <lora:add-detail-xl:0.8>
Negative prompt: ugly, bad anatomy, watermark, user name, poorly drawn, simple background, suggestive, explicit, nudity, cleavage, nipples, nsfw
Steps: 30, Sampler: DPM++ 3M, Schedule type: Karras, CFG scale: 6.5, Seed: 2921279476, Size: 888x1184, Model hash: 501235c0cd, Model: jibMixRealisticXL_v180SkinSupreme, VAE hash: f03e48fe77, VAE: sdxl-vae-fp16-fix.safetensors, Lora hashes: "CosmicStyleSDXL: ccfe5cfff7, TrendCraft_The_Peoples_Style_Detailer-v2.3I-4_15_2025-SDXL: cb53ea89e2, add-detail-xl: 0d9bd1b873", Version: v1.9.4`;

      const parsed = metadataHandler.parseStableDiffusionParameters(testParams);

      expect(parsed.steps).toBe("30");
      expect(parsed.sampler).toBe("DPM++ 3M");
      expect(parsed.cfgScale).toBe("6.5");
      expect(parsed.seed).toBe("2921279476");
      expect(parsed.size).toBe("888x1184");
      expect(parsed.model).toBe("jibMixRealisticXL_v180SkinSupreme");

      console.log("Parsed SD parameters:", parsed);
    });
  });
});
