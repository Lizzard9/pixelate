// Test setup for Vitest
import { vi } from "vitest";

// Mock ImageData properly for testing
global.ImageData = class MockImageData {
  constructor(data, width, height) {
    if (data instanceof Uint8ClampedArray) {
      this.data = data;
      this.width = width;
      this.height = height;
    } else if (typeof data === "number") {
      // ImageData(width, height) constructor
      this.width = data;
      this.height = width;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    }
  }
};

// Mock Uint8ClampedArray if needed
if (typeof Uint8ClampedArray === "undefined") {
  global.Uint8ClampedArray = Uint8Array;
}

// Mock canvas and image APIs for testing
global.HTMLCanvasElement = vi.fn();
global.CanvasRenderingContext2D = vi.fn();
global.Image = vi.fn();
global.URL = {
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
};

// Mock file APIs
global.File = vi.fn();
global.FileReader = vi.fn();
global.Blob = vi.fn();

// Setup DOM elements that tests might need
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:3000",
  },
});
