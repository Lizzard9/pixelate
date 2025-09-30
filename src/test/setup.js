// Test setup for Vitest
import { vi } from 'vitest';

// Mock canvas and image APIs for testing
global.HTMLCanvasElement = vi.fn();
global.CanvasRenderingContext2D = vi.fn();
global.Image = vi.fn();
global.ImageData = vi.fn();
global.URL = {
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn()
};

// Mock file APIs
global.File = vi.fn();
global.FileReader = vi.fn();
global.Blob = vi.fn();

// Setup DOM elements that tests might need
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000'
  }
});
