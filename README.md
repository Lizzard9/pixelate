[![Build and Deploy to GitHub Pages](https://github.com/Lizzard9/pixelate/actions/workflows/node.js.yml/badge.svg)](https://github.com/Lizzard9/pixelate/actions/workflows/node.js.yml)
![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Canvas API](https://img.shields.io/badge/Canvas-API-orange.svg)

# Pixelate Editor

This is a pure JS web-based image pixelation tool with retro gaming aesthetics, specifically designed to create SNES-style graphics from modern images.
The original idea and python implementation is by [n_Arno](https://civitai.com/user/n_Arno) to be found on [CivitAi](https://civitai.com/models/1994335).

## Docs

[Check AI notes.](./.cursor/notes/index.md)

### Core Image Processing

- **Pixelation**: Configurable scale factor (2x-16x) with nearest neighbor sampling
- **Color Quantization**: Reduce colors from 4-256 using median cut algorithm
- **RGB555 Conversion**: SNES-style color space conversion with bit manipulation
- **SNES Resolution Cropping**: Center crop to authentic 256x224 resolution
- **Metadata Preservation**: Extract and preserve image metadata including AI generation parameters

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Modern web browser with Canvas API support

### Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pixelate_v10
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

### Production Build

```bash
npm run build
npm run preview
```

## Usage

### Basic Workflow

1. **Load Image**: Drag and drop an image file or click to select (stays in your browser, no upload)
2. **Configure Settings**:
   - **Pixelation Scale**: Choose scale factor (2x-16x)
   - **Color Count**: Set number of colors (4-256)
   - **RGB555 Mode**: Enable SNES-style color conversion
   - **SNES Crop**: Apply 256x224 resolution cropping
3. **Process**: Click "Pixelate Image" to apply effects
4. **Export**: Download the processed image as PNG

### Metadata Extraction

The tool automatically extracts and can display image metadata, including:

- AI generation parameters (Stable Diffusion, etc.)
- EXIF data
- Image dimensions and format information

### Testing

The project includes comprehensive tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### Dependencies

[See package.json](./package.json)

#### Runtime Dependencies

- **Bootstrap 5.3.8**: UI framework and responsive design
- **Bootstrap Icons 1.13.1**: Icon set for UI elements
- **ExifReader 4.32.0**: Image metadata extraction

#### Development Dependencies

- **Vite 7.1.7**: Build tool and development server
- **Vitest 3.2.4**: Testing framework
- **jsdom 27.0.0**: DOM simulation for testing

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

This means:

- ✅ You can use, modify, and distribute this software
- ✅ You can use it for commercial purposes
- ⚠️ You must provide source code for any modifications
- ⚠️ If you run this software on a server, you must provide source code to users
- ⚠️ Any derivative works must also be licensed under AGPL-3.0

See the [LICENSE](LICENSE) file for full details.
