// Main entry point for the Pixelate Editor
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './main.css';

import { PixelateApp } from './modules/PixelateApp.js';

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new PixelateApp();
  app.init();
});
