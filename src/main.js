// Main entry point for the Pixelate Editor
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./main.css";

import { PixelateApp } from "./modules/PixelateApp.js";

// Initialize the application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new PixelateApp();
  app.init();
});
