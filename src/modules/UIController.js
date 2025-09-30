/**
 * Handles UI interactions and state management
 */
export class UIController {
  constructor() {
    this.elements = {};
    this.loadingOverlay = null;
  }

  /**
   * Initialize UI controller
   */
  init() {
    this.cacheElements();
    this.createLoadingOverlay();
    this.setupRangeSliders();
  }

  /**
   * Cache frequently used DOM elements
   */
  cacheElements() {
    this.elements = {
      fileInput: document.getElementById('imageFileInput'),
      reloadBtn: document.getElementById('reloadBtn'),
      saveBtn: document.getElementById('saveBtn'),
      consoleOutput: document.getElementById('consoleOutput'),
      scaleSlider: document.getElementById('scale'),
      colorsSlider: document.getElementById('colors'),
      quantCheckbox: document.getElementById('quant'),
      rgb555Checkbox: document.getElementById('rgb555'),
      snescropCheckbox: document.getElementById('snescrop'),
      rescaleCheckbox: document.getElementById('rescale')
    };
  }

  /**
   * Create loading overlay
   */
  createLoadingOverlay() {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    this.loadingOverlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="loading-text mt-3">Processing...</div>
      </div>
    `;
    
    // Add CSS for loading overlay
    const style = document.createElement('style');
    style.textContent = `
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        color: white;
      }
      
      .loading-spinner {
        text-align: center;
      }
      
      .loading-text {
        font-size: 1.1rem;
        font-weight: 500;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(this.loadingOverlay);
  }

  /**
   * Setup range sliders with live value updates
   */
  setupRangeSliders() {
    // Scale slider
    if (this.elements.scaleSlider) {
      const scaleOutput = this.elements.scaleSlider.nextElementSibling;
      this.elements.scaleSlider.addEventListener('input', (e) => {
        if (scaleOutput) scaleOutput.textContent = e.target.value;
      });
    }

    // Colors slider
    if (this.elements.colorsSlider) {
      const colorsOutput = this.elements.colorsSlider.nextElementSibling;
      this.elements.colorsSlider.addEventListener('input', (e) => {
        if (colorsOutput) colorsOutput.textContent = e.target.value;
      });
    }
  }

  /**
   * Get current processing parameters from UI
   * @returns {Object} Processing parameters
   */
  getProcessingParameters() {
    return {
      scale: parseInt(this.elements.scaleSlider?.value || 4),
      colors: parseInt(this.elements.colorsSlider?.value || 16),
      quantize: this.elements.quantCheckbox?.checked || false,
      rgb555: this.elements.rgb555Checkbox?.checked || false,
      snescrop: this.elements.snescropCheckbox?.checked || false,
      rescale: this.elements.rescaleCheckbox?.checked || false
    };
  }

  /**
   * Add message to console output
   * @param {string} message - Message to add
   */
  addConsoleOutput(message) {
    if (this.elements.consoleOutput) {
      const timestamp = new Date().toLocaleTimeString();
      this.elements.consoleOutput.value += `[${timestamp}] ${message}\n`;
      this.elements.consoleOutput.scrollTop = this.elements.consoleOutput.scrollHeight;
    }
  }

  /**
   * Clear console output
   */
  clearConsole() {
    if (this.elements.consoleOutput) {
      this.elements.consoleOutput.value = '';
    }
  }

  /**
   * Enable/disable buttons
   * @param {Array<string>} buttonIds - Array of button IDs to enable
   */
  enableButtons(buttonIds) {
    buttonIds.forEach(id => {
      const button = this.elements[id] || document.getElementById(id);
      if (button) {
        button.disabled = false;
      }
    });
  }

  /**
   * Disable buttons
   * @param {Array<string>} buttonIds - Array of button IDs to disable
   */
  disableButtons(buttonIds) {
    buttonIds.forEach(id => {
      const button = this.elements[id] || document.getElementById(id);
      if (button) {
        button.disabled = true;
      }
    });
  }

  /**
   * Show loading overlay
   * @param {string} message - Loading message
   */
  showLoading(message = 'Processing...') {
    if (this.loadingOverlay) {
      const loadingText = this.loadingOverlay.querySelector('.loading-text');
      if (loadingText) loadingText.textContent = message;
      this.loadingOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @param {string} title - Error title
   */
  showError(message, title = 'Error') {
    // Create a simple error modal using Bootstrap classes
    const errorModal = document.createElement('div');
    errorModal.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    errorModal.style.cssText = 'top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
    errorModal.innerHTML = `
      <strong>${title}:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(errorModal);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorModal.parentNode) {
        errorModal.parentNode.removeChild(errorModal);
      }
    }, 5000);
  }

  /**
   * Show success message
   * @param {string} message - Success message
   * @param {string} title - Success title
   */
  showSuccess(message, title = 'Success') {
    const successModal = document.createElement('div');
    successModal.className = 'alert alert-success alert-dismissible fade show position-fixed';
    successModal.style.cssText = 'top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
    successModal.innerHTML = `
      <strong>${title}:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(successModal);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (successModal.parentNode) {
        successModal.parentNode.removeChild(successModal);
      }
    }, 3000);
  }

  /**
   * Update UI state based on current image
   * @param {boolean} hasImage - Whether an image is loaded
   */
  updateUIState(hasImage) {
    const buttonsToToggle = ['reloadBtn', 'saveBtn'];
    
    if (hasImage) {
      this.enableButtons(buttonsToToggle);
    } else {
      this.disableButtons(buttonsToToggle);
    }
  }
}
