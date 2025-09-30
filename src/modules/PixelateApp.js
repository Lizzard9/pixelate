import { ImageProcessor } from './ImageProcessor.js';
import { MetadataHandler } from './MetadataHandler.js';
import { UIController } from './UIController.js';
import { CanvasManager } from './CanvasManager.js';

/**
 * Main application class that coordinates all components
 */
export class PixelateApp {
  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.metadataHandler = new MetadataHandler();
    this.uiController = new UIController();
    this.canvasManager = new CanvasManager();
    
    this.currentImage = null;
    this.currentMetadata = null;
    this.originalFileName = null;
  }

  /**
   * Initialize the application
   */
  init() {
    this.setupEventListeners();
    this.uiController.init();
    this.canvasManager.init();
    
    console.log('Pixelate Editor v2.0 initialized');
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // File input handler
    const fileInput = document.getElementById('imageFileInput');
    fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Process button handler
    const processBtn = document.getElementById('processBtn');
    processBtn?.addEventListener('click', () => this.processImage());

    // Save button handler
    const saveBtn = document.getElementById('saveBtn');
    saveBtn?.addEventListener('click', () => this.saveImage());

    // Reload button handler
    const reloadBtn = document.getElementById('reloadBtn');
    reloadBtn?.addEventListener('click', () => this.reloadOriginalImage());
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.uiController.showLoading('Loading image...');
      
      // Store original filename
      this.originalFileName = file.name;
      
      // Extract metadata
      this.currentMetadata = await this.metadataHandler.extractMetadata(file);
      this.uiController.addConsoleOutput(`Extracted metadata for ${file.name}`);
      
      // Load image
      this.currentImage = await this.loadImageFromFile(file);
      this.canvasManager.displayImage(this.currentImage);
      
      // Enable buttons
      this.uiController.enableButtons(['reloadBtn', 'saveBtn']);
      
      this.uiController.hideLoading();
    } catch (error) {
      console.error('Error loading image:', error);
      this.uiController.addConsoleOutput(`Error loading image: ${error.message}`);
      this.uiController.hideLoading();
    }
  }

  /**
   * Load image from file
   */
  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Process the current image with pixelation effects
   */
  async processImage() {
    if (!this.currentImage) {
      this.uiController.addConsoleOutput('No image loaded');
      return;
    }

    try {
      this.uiController.showLoading('Processing image...');
      this.uiController.clearConsole();
      
      // Get processing parameters from UI
      const params = this.uiController.getProcessingParameters();
      
      // Process the image
      const processedImageData = await this.imageProcessor.processImage(
        this.currentImage,
        params,
        (message) => this.uiController.addConsoleOutput(message)
      );
      
      // Display the processed image
      this.canvasManager.displayImageData(processedImageData);
      
      this.uiController.addConsoleOutput('Processing complete!');
      this.uiController.hideLoading();
    } catch (error) {
      console.error('Error processing image:', error);
      this.uiController.addConsoleOutput(`Error processing image: ${error.message}`);
      this.uiController.hideLoading();
    }
  }

  /**
   * Save the current canvas as an image
   */
  async saveImage() {
    try {
      this.uiController.showLoading('Saving image...');
      
      const canvas = this.canvasManager.getCanvas();
      const imageBlob = await this.canvasManager.getCanvasBlob();
      
      // Preserve metadata if available
      const finalBlob = await this.metadataHandler.preserveMetadata(
        imageBlob,
        this.currentMetadata
      );
      
      // Download the image
      const filename = this.originalFileName 
        ? this.originalFileName.replace(/\.[^/.]+$/, '_pixelated.png')
        : 'pixelated_image.png';
        
      this.downloadBlob(finalBlob, filename);
      
      this.uiController.addConsoleOutput(`Saved image as ${filename}`);
      this.uiController.hideLoading();
    } catch (error) {
      console.error('Error saving image:', error);
      this.uiController.addConsoleOutput(`Error saving image: ${error.message}`);
      this.uiController.hideLoading();
    }
  }

  /**
   * Reload the original image
   */
  reloadOriginalImage() {
    if (this.currentImage) {
      this.canvasManager.displayImage(this.currentImage);
      this.uiController.addConsoleOutput('Original image reloaded');
    }
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
