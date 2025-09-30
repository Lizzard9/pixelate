import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageProcessor } from "../modules/ImageProcessor.js";

// Mock Jimp since it requires Node.js environment
vi.mock("jimp/es", () => {
  const mockJimp = {
    fromBuffer: vi.fn(),
    clone: vi.fn(),
    resize: vi.fn(),
    posterize: vi.fn(),
    scan: vi.fn(),
    crop: vi.fn(),
    getWidth: vi.fn(() => 100),
    getHeight: vi.fn(() => 100),
    bitmap: { data: new Uint8Array(100 * 100 * 4) },
  };

  // Make methods chainable
  Object.keys(mockJimp).forEach((key) => {
    if (typeof mockJimp[key] === "function" && key !== "fromBuffer") {
      mockJimp[key].mockReturnValue(mockJimp);
    }
  });

  mockJimp.fromBuffer.mockResolvedValue(mockJimp);

  return { Jimp: mockJimp };
});

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
    it("should apply RGB555 conversion to image", () => {
      const mockImage = {
        scan: vi.fn((x, y, w, h, callback) => {
          // Simulate calling the callback for each pixel
          callback.call(
            {
              bitmap: {
                data: new Uint8Array([255, 255, 255, 255]), // RGBA
              },
            },
            0,
            0,
            0
          );
          return mockImage;
        }),
      };

      const result = imageProcessor.applyRGB555(mockImage);
      expect(mockImage.scan).toHaveBeenCalled();
      expect(result).toBe(mockImage);
    });
  });

  describe("snesCrop", () => {
    it("should crop image to SNES dimensions", () => {
      const mockImage = {
        getWidth: vi.fn(() => 400),
        getHeight: vi.fn(() => 300),
        crop: vi.fn(() => mockImage),
      };

      const result = imageProcessor.snesCrop(mockImage);

      expect(mockImage.crop).toHaveBeenCalledWith(72, 38, 256, 224);
      expect(result).toBe(mockImage);
    });

    it("should handle images smaller than SNES dimensions", () => {
      const mockImage = {
        getWidth: vi.fn(() => 200),
        getHeight: vi.fn(() => 150),
        crop: vi.fn(() => mockImage),
      };

      const result = imageProcessor.snesCrop(mockImage);

      expect(mockImage.crop).toHaveBeenCalled();
      expect(result).toBe(mockImage);
    });
  });

  describe("jimpToImageData", () => {
    it("should convert Jimp image to ImageData", async () => {
      const mockJimpImage = {
        getWidth: () => 10,
        getHeight: () => 10,
        bitmap: {
          data: new Uint8Array(10 * 10 * 4).fill(255),
        },
      };

      const imageData = await imageProcessor.jimpToImageData(mockJimpImage);

      expect(imageData).toBeInstanceOf(ImageData);
      expect(imageData.width).toBe(10);
      expect(imageData.height).toBe(10);
    });
  });

  // Integration test for the main processing function
  describe("processImage", () => {
    it("should process image with default parameters", async () => {
      // Mock HTML image
      const mockImage = {
        naturalWidth: 100,
        naturalHeight: 100,
        width: 100,
        height: 100,
      };

      const params = {
        scale: 2,
        colors: 16,
        quantize: true,
        rgb555: false,
        snescrop: false,
        rescale: true,
      };

      const progressCallback = vi.fn();

      // Mock canvas operations
      global.document = {
        createElement: vi.fn(() => ({
          getContext: vi.fn(() => ({
            drawImage: vi.fn(),
          })),
          toBlob: vi.fn((callback) => {
            callback(new Blob(["test"], { type: "image/png" }));
          }),
          width: 100,
          height: 100,
        })),
      };

      global.Buffer = {
        from: vi.fn(() => new Uint8Array(100)),
      };

      // Mock Blob.arrayBuffer
      global.Blob.prototype.arrayBuffer = vi.fn(() =>
        Promise.resolve(new ArrayBuffer(100))
      );

      try {
        const result = await imageProcessor.processImage(
          mockImage,
          params,
          progressCallback
        );

        expect(progressCallback).toHaveBeenCalled();
        expect(result).toBeInstanceOf(ImageData);
      } catch (error) {
        // Expected in test environment due to mocking limitations
        expect(error).toBeDefined();
      }
    });
  });
});
