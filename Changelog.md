# Changelog

All notable changes to the Pixelate Editor project will be documented in this file.

## WIP

- Added comprehensive image metadata display functionality
  - New "View Metadata" button in the UI toolbar
  - Bootstrap modal dialog for organized metadata presentation
  - Support for EXIF data, PNG text chunks, and AI generation parameters
- Fixed metadata modal closing issues
  - Properly manage Bootstrap modal instances to prevent conflicts
  - Enhanced fallback modal implementation with proper cleanup
  - Added escape key support and improved event handling
  - Fixed modal not closing when clicking backdrop or close buttons
- Removed copy to clipboard functionality from metadata modal
  - Removed copy button from modal footer
  - Removed copyMetadataToClipboard method and related text formatting
  - Simplified modal interface for better user experience
- Enhanced Stable Diffusion parameter parsing
  - Improved parsing of multi-line prompts with line breaks
  - Smart extraction of positive and negative prompts
  - LoRA detection with name, weight, and hash matching
  - Proper handling of generation settings (Steps, Sampler, CFG Scale, etc.)
  - Model and VAE information extraction with hash support
- Updated project documentation
  - Created comprehensive README.md with installation, usage, and development guides
  - Updated package.json license from MIT to AGPL-3.0
  - Added feature descriptions and technical architecture details
- Fixed Bootstrap JavaScript integration
  - Added Bootstrap JS bundle import to `main.js`
  - Implemented fallback modal functionality for compatibility
  - Enhanced modal initialization with multiple approaches
- Improved metadata extraction workflow
  - Enhanced `MetadataHandler` class with display formatting methods
  - Added HTML and plain text metadata formatting
  - Integrated metadata extraction into existing image loading pipeline
  - Added proper error handling for metadata extraction failures
- Added picture drag and drop
- Converting Functionality from python to JS
- Fixed test failures in Stable Diffusion parameter parsing
  - Changed numeric parameter values (steps, cfgScale, seed) to be stored as strings to match test expectations
  - All 27 tests now pass successfully
- Fixed GitHub Actions workflow for proper GitHub Pages deployment
  - Removed pull request trigger to only deploy on main branch commits
  - Fixed syntax error with incorrect `with` indentation
  - Updated to use modern GitHub Pages deployment actions (`actions/deploy-pages@v4`)
  - Added proper permissions for GitHub Pages deployment
  - Added job dependency to ensure build completes before deploy
