import ExifReader from 'exifreader';
import { readFileSync } from 'fs';

// Test script to examine the metadata in our test image
const testImagePath = '69745990-0ede-4812-8f41-834df0749e2c_a1111.png';

try {
  const imageBuffer = readFileSync(testImagePath);
  const tags = ExifReader.load(imageBuffer);
  
  console.log('=== Image Metadata Analysis ===');
  console.log('Available tags:', Object.keys(tags).length);
  
  // Look for PNG text chunks (where AI generation parameters are usually stored)
  const textChunks = Object.keys(tags).filter(key => 
    key.startsWith('PNG-') || 
    key.toLowerCase().includes('text') ||
    key.toLowerCase().includes('comment') ||
    key.toLowerCase().includes('parameters')
  );
  
  console.log('\n=== Text Chunks ===');
  textChunks.forEach(key => {
    console.log(`${key}:`, tags[key]);
  });
  
  // Look for specific AI generation metadata
  const aiKeys = Object.keys(tags).filter(key => 
    key.toLowerCase().includes('parameters') ||
    key.toLowerCase().includes('prompt') ||
    key.toLowerCase().includes('steps') ||
    key.toLowerCase().includes('sampler')
  );
  
  console.log('\n=== AI Generation Metadata ===');
  aiKeys.forEach(key => {
    console.log(`${key}:`, tags[key]);
  });
  
  // Print all metadata for debugging
  console.log('\n=== All Metadata ===');
  Object.entries(tags).forEach(([key, value]) => {
    if (typeof value === 'object' && value.description) {
      console.log(`${key}: ${value.description}`);
    } else {
      console.log(`${key}:`, value);
    }
  });
  
} catch (error) {
  console.error('Error reading metadata:', error);
}
