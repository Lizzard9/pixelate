# Project Notes Index

## Project Overview

This is a web-based image pixelation tool that allows users to upload images and apply various retro-style effects, particularly targeting SNES-style graphics.

## Project Structure

```
pixelate_v10/
├── index.html              # Main HTML structure (155 lines)
├── main.css               # All styling and responsive design (142 lines)
├── main.js                # Complete JavaScript functionality (254 lines)
├── pillow-10.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl  # Custom PIL wheel with LIBIMAGEQUANT
└── .cursor/
    ├── rules/
    │   └── notes.mdc       # Notes management rules
    └── notes/
        ├── index.md        # This file
        ├── ui_components.md # UI layout, styling, and components
        └── image_processing.md # Processing pipeline and algorithms
```

## Key Components

### Application Architecture

- **Type**: Single-page web application with separated concerns
- **Technologies**: HTML5, CSS3, JavaScript, Bootstrap 5, Pyodide (Python in browser)
- **Purpose**: Image processing and pixelation with retro gaming aesthetics

#### File Breakdown

- **`index.html`**: Clean HTML structure with Bootstrap components
- **`main.css`**: Modern responsive styling with gradients and mobile optimization
- **`main.js`**: Complete functionality including Pyodide integration and image processing

### Core Features

- Image upload and display
- Pixelation with configurable scale
- Color quantization (4-256 colors)
- RGB555 color space conversion (SNES-style)
- SNES resolution cropping (256x224)
- Image metadata preservation
- PNG export with metadata

### Dependencies

- **Pyodide**: Python runtime in browser
- **PIL/Pillow**: Image processing (custom build with LIBIMAGEQUANT)
- **NumPy**: Array operations for image data

## Notes Files

- `index.md` - This overview and navigation file
- `image_processing.md` - Detailed documentation of the multi-stage image processing pipeline, algorithms, and dependencies
- `ui_components.md` - Complete breakdown of UI layout, controls, styling, and event handling

## Quick Reference

- **Main processing function**: `pixelize()` in `main.js`
- **Image loading**: `loadImage()` and file input handler in `main.js`
- **Save functionality**: `saveImage()` in `main.js`
- **UI styling**: All responsive design and modern styling in `main.css`
- **HTML structure**: Clean Bootstrap-based layout in `index.html`
