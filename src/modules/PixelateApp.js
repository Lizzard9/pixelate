import { CanvasManager } from "./CanvasManager.js";
import { ImageProcessor } from "./ImageProcessor.js";
import { MetadataHandler } from "./MetadataHandler.js";
import { UIController } from "./UIController.js";

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
    this.metadataModal = null; // Store Bootstrap modal instance
    this.fallbackModal = null; // Store fallback modal references
  }

  /**
   * Initialize the application
   */
  init() {
    this.setupEventListeners();
    this.uiController.init();
    this.canvasManager.init();

    console.log("Pixelate Editor v2.0 initialized");
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // File input handler
    const fileInput = document.getElementById("imageFileInput");
    fileInput?.addEventListener("change", (e) => this.handleFileSelect(e));

    // Process button handler
    const processBtn = document.getElementById("processBtn");
    processBtn?.addEventListener("click", () => this.processImage());

    // Save button handler
    const saveBtn = document.getElementById("saveBtn");
    saveBtn?.addEventListener("click", () => this.saveImage());

    // Reload button handler
    const reloadBtn = document.getElementById("reloadBtn");
    reloadBtn?.addEventListener("click", () => this.reloadOriginalImage());

    // Metadata button handler
    const metadataBtn = document.getElementById("metadataBtn");
    metadataBtn?.addEventListener("click", () => this.showMetadata());

    // Drag and drop handlers
    this.setupDragAndDrop();
  }

  /**
   * Set up drag and drop functionality
   */
  setupDragAndDrop() {
    const dropZone = document.body;

    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
      document.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () => this.highlight(), false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () => this.unhighlight(), false);
    });

    // Handle dropped files
    dropZone.addEventListener("drop", (e) => this.handleDrop(e), false);
  }

  /**
   * Prevent default drag behaviors
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Highlight the drop zone
   */
  highlight() {
    document.body.classList.add("drag-over");
  }

  /**
   * Remove highlight from drop zone
   */
  unhighlight() {
    document.body.classList.remove("drag-over");
  }

  /**
   * Handle dropped files
   */
  async handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      const file = files[0];

      // Check if it's an image file
      if (!file.type.startsWith("image/")) {
        this.uiController.addConsoleOutput(
          `Error: ${file.name} is not an image file`
        );
        this.uiController.showError(
          "Please drop an image file (PNG, JPG, GIF, etc.)"
        );
        return;
      }

      // Process the dropped file using the same logic as file input
      await this.handleFileLoad(file);
    }
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    await this.handleFileLoad(file);
  }

  /**
   * Common file loading logic for both file input and drag & drop
   */
  async handleFileLoad(file) {
    try {
      this.uiController.showLoading("Loading image...");

      // Store original filename
      this.originalFileName = file.name;

      // Extract metadata
      this.currentMetadata = await this.metadataHandler.extractMetadata(file);
      this.uiController.addConsoleOutput(`Extracted metadata for ${file.name}`);

      // Load image
      this.currentImage = await this.loadImageFromFile(file);
      this.canvasManager.displayImage(this.currentImage);

      // Enable buttons
      this.uiController.enableButtons(["reloadBtn", "saveBtn", "metadataBtn"]);

      this.uiController.hideLoading();
    } catch (error) {
      console.error("Error loading image:", error);
      this.uiController.addConsoleOutput(
        `Error loading image: ${error.message}`
      );
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
      this.uiController.addConsoleOutput("No image loaded");
      return;
    }

    try {
      this.uiController.showLoading("Processing image...");
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

      this.uiController.addConsoleOutput("Processing complete!");
      this.uiController.hideLoading();
    } catch (error) {
      console.error("Error processing image:", error);
      this.uiController.addConsoleOutput(
        `Error processing image: ${error.message}`
      );
      this.uiController.hideLoading();
    }
  }

  /**
   * Save the current canvas as an image
   */
  async saveImage() {
    try {
      this.uiController.showLoading("Saving image...");

      const canvas = this.canvasManager.getCanvas();
      const imageBlob = await this.canvasManager.getCanvasBlob();

      // Preserve metadata if available
      const finalBlob = await this.metadataHandler.preserveMetadata(
        imageBlob,
        this.currentMetadata
      );

      // Download the image
      const filename = this.originalFileName
        ? this.originalFileName.replace(/\.[^/.]+$/, "_pixelated.png")
        : "pixelated_image.png";

      this.downloadBlob(finalBlob, filename);

      this.uiController.addConsoleOutput(`Saved image as ${filename}`);
      this.uiController.hideLoading();
    } catch (error) {
      console.error("Error saving image:", error);
      this.uiController.addConsoleOutput(
        `Error saving image: ${error.message}`
      );
      this.uiController.hideLoading();
    }
  }

  /**
   * Reload the original image
   */
  reloadOriginalImage() {
    if (this.currentImage) {
      this.canvasManager.displayImage(this.currentImage);
      this.uiController.addConsoleOutput("Original image reloaded");
    }
  }

  /**
   * Show metadata modal
   */
  showMetadata() {
    if (!this.currentMetadata) {
      this.uiController.addConsoleOutput("No metadata available");
      return;
    }

    // Format metadata for display
    const formattedMetadata = this.metadataHandler.formatMetadataForDisplay(
      this.currentMetadata
    );

    // Update modal content
    const metadataContent = document.getElementById("metadataContent");
    if (metadataContent) {
      metadataContent.innerHTML = formattedMetadata;
    }

    // Get modal element
    const metadataModalElement = document.getElementById("metadataModal");
    if (!metadataModalElement) {
      console.error("Metadata modal element not found");
      return;
    }

    // Initialize or reuse Bootstrap modal instance
    if (typeof window.bootstrap !== "undefined" && window.bootstrap.Modal) {
      // Dispose of existing modal instance if it exists
      if (this.metadataModal) {
        this.metadataModal.dispose();
      }

      // Create new modal instance
      this.metadataModal = new window.bootstrap.Modal(metadataModalElement, {
        backdrop: true,
        keyboard: true,
        focus: true,
      });

      // Show the modal
      this.metadataModal.show();
    } else if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      // Dispose of existing modal instance if it exists
      if (this.metadataModal) {
        this.metadataModal.dispose();
      }

      // Create new modal instance
      this.metadataModal = new bootstrap.Modal(metadataModalElement, {
        backdrop: true,
        keyboard: true,
        focus: true,
      });

      // Show the modal
      this.metadataModal.show();
    } else {
      // Fallback: manual modal implementation
      this.showModalFallback(metadataModalElement);
    }
  }

  /**
   * Fallback modal implementation when Bootstrap is not available
   * @param {HTMLElement} modalElement - The modal element
   */
  showModalFallback(modalElement) {
    // Clean up any existing fallback modal
    this.hideModalFallback();

    // Show modal
    modalElement.classList.add("show");
    modalElement.style.display = "block";
    modalElement.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    // Add backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop fade show";
    backdrop.id = "metadata-modal-backdrop";
    document.body.appendChild(backdrop);

    // Store references for cleanup
    this.fallbackModal = {
      element: modalElement,
      backdrop: backdrop,
    };

    // Close modal function
    const closeModal = () => this.hideModalFallback();

    // Add event listeners
    backdrop.addEventListener("click", closeModal);

    // Handle close buttons
    const closeButtons = modalElement.querySelectorAll(
      '.btn-close, [data-bs-dismiss="modal"]'
    );
    closeButtons.forEach((btn) => {
      btn.addEventListener("click", closeModal);
    });

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Store escape handler for cleanup
    this.fallbackModal.escapeHandler = handleEscape;
  }

  /**
   * Hide fallback modal
   */
  hideModalFallback() {
    if (this.fallbackModal) {
      // Remove modal display
      this.fallbackModal.element.classList.remove("show");
      this.fallbackModal.element.style.display = "none";
      this.fallbackModal.element.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");

      // Remove backdrop
      if (
        this.fallbackModal.backdrop &&
        this.fallbackModal.backdrop.parentNode
      ) {
        this.fallbackModal.backdrop.parentNode.removeChild(
          this.fallbackModal.backdrop
        );
      }

      // Remove escape key handler
      if (this.fallbackModal.escapeHandler) {
        document.removeEventListener(
          "keydown",
          this.fallbackModal.escapeHandler
        );
      }

      // Clear reference
      this.fallbackModal = null;
    }
  }

  /**
   * Download a blob as a file
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
