import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataHandler } from '../modules/MetadataHandler.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('MetadataHandler', () => {
  let metadataHandler;
  let testImageBuffer;

  beforeEach(() => {
    metadataHandler = new MetadataHandler();
    
    // Load test image
    try {
      const testImagePath = resolve(__dirname, '69745990-0ede-4812-8f41-834df0749e2c_a1111.png');
      testImageBuffer = readFileSync(testImagePath);
    } catch (error) {
      console.warn('Test image not found, some tests may be skipped');
    }
  });

  describe('constructor', () => {
    it('should initialize with supported formats', () => {
      expect(metadataHandler.supportedFormats).toContain('image/jpeg');
      expect(metadataHandler.supportedFormats).toContain('image/png');
      expect(metadataHandler.supportedFormats).toContain('image/tiff');
    });
  });

  describe('getFileFormat', () => {
    it('should extract format from filename', () => {
      const mockFile = { name: 'test.png' };
      expect(metadataHandler.getFileFormat(mockFile)).toBe('png');
    });

    it('should handle files without extension', () => {
      const mockFile = { name: 'test' };
      expect(metadataHandler.getFileFormat(mockFile)).toBe('unknown');
    });

    it('should handle uppercase extensions', () => {
      const mockFile = { name: 'test.JPG' };
      expect(metadataHandler.getFileFormat(mockFile)).toBe('jpg');
    });
  });

  describe('getTagValue', () => {
    it('should extract description from tag object', () => {
      const tag = { description: 'test value', value: 'other' };
      expect(metadataHandler.getTagValue(tag)).toBe('test value');
    });

    it('should extract value if no description', () => {
      const tag = { value: 'test value' };
      expect(metadataHandler.getTagValue(tag)).toBe('test value');
    });

    it('should return primitive values as-is', () => {
      expect(metadataHandler.getTagValue('string')).toBe('string');
      expect(metadataHandler.getTagValue(123)).toBe(123);
    });

    it('should handle arrays', () => {
      const array = [1, 2, 3];
      expect(metadataHandler.getTagValue(array)).toEqual(array);
    });
  });

  describe('parseStableDiffusionParameters', () => {
    it('should parse SD parameters text', () => {
      const paramText = `magical fantasy forest, epic oak trees
Negative prompt: ugly, bad anatomy
Steps: 30, Sampler: DPM++ 3M, CFG scale: 6.5, Seed: 2921279476, Size: 888x1184`;

      const parsed = metadataHandler.parseStableDiffusionParameters(paramText);
      
      expect(parsed.steps).toBe('30');
      expect(parsed.sampler).toBe('DPM++ 3M');
      expect(parsed.cfgScale).toBe('6.5');
      expect(parsed.seed).toBe('2921279476');
      expect(parsed.size).toBe('888x1184');
    });

    it('should handle malformed parameters gracefully', () => {
      const paramText = 'invalid format';
      const parsed = metadataHandler.parseStableDiffusionParameters(paramText);
      expect(typeof parsed).toBe('object');
    });
  });

  describe('extractMetadata', () => {
    it('should extract basic file metadata', async () => {
      const mockFile = {
        name: 'test.png',
        type: 'image/png',
        size: 1024,
        lastModified: Date.now(),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
      };

      const metadata = await metadataHandler.extractMetadata(mockFile);
      
      expect(metadata.format).toBe('png');
      expect(metadata.size).toBe(1024);
      expect(metadata.name).toBe('test.png');
      expect(metadata.type).toBe('image/png');
      expect(typeof metadata.lastModified).toBe('number');
    });

    it('should handle extraction errors gracefully', async () => {
      const mockFile = {
        name: 'test.png',
        type: 'image/png',
        size: 1024,
        lastModified: Date.now(),
        arrayBuffer: () => Promise.reject(new Error('Read error'))
      };

      const metadata = await metadataHandler.extractMetadata(mockFile);
      
      expect(metadata.error).toBeDefined();
      expect(metadata.format).toBe('png');
    });
  });

  // Test with actual image file if available
  if (typeof testImageBuffer !== 'undefined') {
    describe('real image metadata extraction', () => {
      it('should extract metadata from test image', async () => {
        const mockFile = {
          name: '69745990-0ede-4812-8f41-834df0749e2c_a1111.png',
          type: 'image/png',
          size: testImageBuffer.length,
          lastModified: Date.now(),
          arrayBuffer: () => Promise.resolve(testImageBuffer.buffer)
        };

        const metadata = await metadataHandler.extractMetadata(mockFile);
        
        expect(metadata.format).toBe('png');
        expect(metadata.tags).toBeDefined();
        
        // Check for AI generation metadata
        if (metadata.ai && Object.keys(metadata.ai).length > 0) {
          console.log('Found AI metadata:', metadata.ai);
          
          // Should contain some AI-related data
          expect(typeof metadata.ai).toBe('object');
        }
        
        // Check for PNG text chunks
        if (metadata.png && Object.keys(metadata.png).length > 0) {
          console.log('Found PNG metadata:', metadata.png);
          expect(typeof metadata.png).toBe('object');
        }
      });
    });
  }

  describe('preserveMetadata', () => {
    it('should return blob when metadata preservation not implemented', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/png' });
      const mockMetadata = { format: 'png' };
      
      const result = await metadataHandler.preserveMetadata(mockBlob, mockMetadata);
      
      expect(result).toBe(mockBlob);
    });
  });
});
