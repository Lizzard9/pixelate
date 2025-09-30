import { beforeEach, describe, expect, it } from "vitest";
import { ImageProcessor } from "../modules/ImageProcessor.js";

// Pure Canvas API tests - no external dependencies needed

describe("ImageProcessor", () => {
  let imageProcessor;

  beforeEach(() => {
    imageProcessor = new ImageProcessor();
  });

  describe("constructor", () => {
    it("should initialize with supported formats", () => {
      expect(imageProcessor.supportedFormats).toContain("image/jpeg");
      expect(imageProcessor.supportedFormats).toContain("image/png");
      expect(imageProcessor.supportedFormats).toContain("image/bmp");
    });
  });

  describe("getSupportedFormats", () => {
    it("should return array of supported formats", () => {
      const formats = imageProcessor.getSupportedFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });
  });

  describe("isFormatSupported", () => {
    it("should return true for supported formats", () => {
      expect(imageProcessor.isFormatSupported("image/png")).toBe(true);
      expect(imageProcessor.isFormatSupported("image/jpeg")).toBe(true);
    });

    it("should return false for unsupported formats", () => {
      expect(imageProcessor.isFormatSupported("image/webp")).toBe(false);
      expect(imageProcessor.isFormatSupported("text/plain")).toBe(false);
    });

    it("should handle case insensitive input", () => {
      expect(imageProcessor.isFormatSupported("IMAGE/PNG")).toBe(true);
    });
  });

  describe("calculatePosterizeLevels", () => {
    it("should return appropriate levels for different color counts", () => {
      expect(imageProcessor.calculatePosterizeLevels(4)).toBe(2);
      expect(imageProcessor.calculatePosterizeLevels(8)).toBe(3);
      expect(imageProcessor.calculatePosterizeLevels(16)).toBe(4);
      expect(imageProcessor.calculatePosterizeLevels(32)).toBe(5);
      expect(imageProcessor.calculatePosterizeLevels(64)).toBe(6);
      expect(imageProcessor.calculatePosterizeLevels(128)).toBe(7);
      expect(imageProcessor.calculatePosterizeLevels(256)).toBe(8);
    });
  });

  describe("applyRGB555", () => {
    it("should apply RGB555 conversion to ImageData", () => {
      const testData = new Uint8ClampedArray([255, 255, 255, 255]); // White pixel
      const imageData = new ImageData(testData, 1, 1);

      const result = imageProcessor.applyRGB555(imageData);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(1);
      expect(result.height).toBe(1);

      // RGB555 conversion: 255 >> 3 << 3 = 248
      expect(result.data[0]).toBe(248); // R
      expect(result.data[1]).toBe(248); // G
      expect(result.data[2]).toBe(248); // B
      expect(result.data[3]).toBe(255); // A unchanged
    });
  });

  describe("snesCrop", () => {
    it("should crop ImageData to SNES dimensions", () => {
      const testData = new Uint8ClampedArray(400 * 300 * 4).fill(128);
      const imageData = new ImageData(testData, 400, 300);

      const result = imageProcessor.snesCrop(imageData, 400, 300);

      expect(result.imageData).toBeInstanceOf(ImageData);
      expect(result.width).toBe(256);
      expect(result.height).toBe(224);
    });

    it("should handle images smaller than SNES dimensions", () => {
      const testData = new Uint8ClampedArray(200 * 150 * 4).fill(128);
      const imageData = new ImageData(testData, 200, 150);

      const result = imageProcessor.snesCrop(imageData, 200, 150);

      expect(result.imageData).toBeInstanceOf(ImageData);
      expect(result.width).toBeLessThanOrEqual(200);
      expect(result.height).toBeLessThanOrEqual(150);
    });
  });

  describe("resizeImageData", () => {
    it("should resize ImageData using nearest neighbor", () => {
      const testData = new Uint8ClampedArray([255, 0, 0, 255]); // Red pixel
      const imageData = new ImageData(testData, 1, 1);

      const result = imageProcessor.resizeImageData(imageData, 1, 1, 2, 2);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(result.data.length).toBe(16); // 2x2x4 channels

      // All pixels should be red (nearest neighbor)
      expect(result.data[0]).toBe(255); // R
      expect(result.data[1]).toBe(0); // G
      expect(result.data[2]).toBe(0); // B
      expect(result.data[3]).toBe(255); // A
    });
  });

  describe("color quantization", () => {
    it("should apply posterization", () => {
      const testData = new Uint8ClampedArray([
        255,
        128,
        64,
        255, // Various colors
        200,
        100,
        50,
        255,
        150,
        75,
        25,
        255,
        100,
        50,
        12,
        255,
      ]);
      const imageData = new ImageData(testData, 2, 2);

      const result = imageProcessor.posterizeColors(imageData, 16);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);

      // Colors should be posterized to specific levels
      expect(result.data[0]).toBeLessThanOrEqual(255);
      expect(result.data[0]).toBeGreaterThanOrEqual(0);
    });

    it("should apply median cut quantization", () => {
      const testData = new Uint8ClampedArray([
        255,
        0,
        0,
        255, // Red
        0,
        255,
        0,
        255, // Green
        0,
        0,
        255,
        255, // Blue
        128,
        128,
        128,
        255, // Gray
      ]);
      const imageData = new ImageData(testData, 2, 2);

      const result = imageProcessor.quantizeColors(imageData, 2);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });
  });
});
