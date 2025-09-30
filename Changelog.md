# Changelog

All notable changes to the Pixelate Editor project will be documented in this file.

## WIP

- Added comprehensive image metadata display functionality
  - New "View Metadata" button in the UI toolbar
  - Bootstrap modal dialog for organized metadata presentation
  - Support for EXIF data, PNG text chunks, and AI generation parameters
  - Copy to clipboard functionality for metadata export
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
