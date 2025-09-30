# Project Notes Index

## Project Overview

This is a web-based image pixelation tool that allows users to upload images and apply various retro-style effects, particularly targeting SNES-style graphics.

## Project Structure

```
pixelate_v10/
├── index.html              # Main HTML structure
├── src/
│   ├── main.js            # Application entry point
│   ├── main.css           # Styling and responsive design
│   ├── modules/           # ESM modules
│   │   ├── PixelateApp.js       # Main application coordinator
│   │   ├── ImageProcessor.js    # Pure Canvas API image processing
│   │   ├── MetadataHandler.js   # Image metadata extraction
│   │   ├── UIController.js      # UI state management
│   │   └── CanvasManager.js     # Canvas operations
│   └── test/              # Test files
├── package.json           # Dependencies and scripts
└── .cursor/
    ├── rules/
    │   └── notes.mdc       # Notes management rules
    └── notes/
        ├── index.md        # This file
        ├── ui_components.md # UI layout, styling, and components
        ├── image_processing.md # Processing pipeline and algorithms
        ├── js_conversion_analysis.md # Python to JS conversion analysis
        └── browser_compatibility_lessons.md # Critical lessons about browser libraries
```

## Key Components

### Application Architecture

- **Type**: Modern single-page web application with ESM modules
- **Technologies**: HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, Canvas API
- **Purpose**: Image processing and pixelation with retro gaming aesthetics
- **Architecture**: Clean separation of concerns with modular design

#### Current Implementation (v2.0)

- **Pure JavaScript**: No external image processing dependencies
- **Canvas API**: Native browser image manipulation
- **ESM Modules**: Modern module system with clean imports
- **Vite Build**: Fast development and optimized production builds

### Core Features

- Image upload and display
- Pixelation with configurable scale (2x-16x)
- Color quantization (4-256 colors) with median cut algorithm
- RGB555 color space conversion (SNES-style)
- SNES resolution cropping (256x224)
- Image metadata extraction and preservation
- PNG export with metadata

### Current Dependencies

- **Bootstrap**: UI framework and styling
- **Bootstrap Icons**: Icon set
- **ExifReader**: Image metadata extraction
- **Vite**: Build tool and dev server
- **Vitest**: Testing framework

### Removed Dependencies (Lessons Learned)

- ❌ **Jimp**: Incompatible with browsers (see browser_compatibility_lessons.md)
- ❌ **Pyodide**: Replaced with native JavaScript for better performance
- ❌ **PIL/Pillow**: Server-side library, not suitable for browsers

## Notes Files

- `index.md` - This overview and navigation file
- `image_processing.md` - Detailed documentation of the multi-stage image processing pipeline, algorithms, and dependencies
- `ui_components.md` - Complete breakdown of UI layout, controls, styling, and event handling
- `js_conversion_analysis.md` - Analysis of converting from Python/Pyodide to pure JavaScript implementation
- `browser_compatibility_lessons.md` - **CRITICAL**: Lessons about Jimp incompatibility and browser library selection

## Quick Reference

- **Main application**: `PixelateApp.js` - Application coordinator
- **Image processing**: `ImageProcessor.js` - Pure Canvas API implementation
- **Metadata handling**: `MetadataHandler.js` - ExifReader-based extraction
- **UI management**: `UIController.js` - State and interaction handling
- **Canvas operations**: `CanvasManager.js` - Display and canvas management
- **Entry point**: `src/main.js` - Application initialization
- **HTML structure**: `index.html` - Bootstrap-based layout
