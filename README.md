# Pixelate Editor

A modern web-based image pixelation tool with retro gaming aesthetics, specifically designed to create SNES-style graphics from modern images.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Canvas API](https://img.shields.io/badge/Canvas-API-orange.svg)

## Features

### Core Image Processing

- **Pixelation**: Configurable scale factor (2x-16x) with nearest neighbor sampling
- **Color Quantization**: Reduce colors from 4-256 using median cut algorithm
- **RGB555 Conversion**: SNES-style color space conversion with bit manipulation
- **SNES Resolution Cropping**: Center crop to authentic 256x224 resolution
- **Metadata Preservation**: Extract and preserve image metadata including AI generation parameters

### User Interface

- **Modern Design**: Bootstrap 5-based responsive interface
- **Drag & Drop**: Intuitive image upload with visual feedback
- **Real-time Preview**: Instant preview of processing effects
- **Export Options**: High-quality PNG export with metadata preservation
- **Processing Feedback**: Loading states and progress indicators

### Technical Features

- **Pure JavaScript**: No external image processing dependencies
- **Canvas API**: Native browser image manipulation for optimal performance
- **ESM Modules**: Modern module system with clean separation of concerns
- **Comprehensive Testing**: Full test suite with real image validation
- **Browser Compatible**: Works in all modern browsers without plugins

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

4. **Open in browser**
   Navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## Usage

### Basic Workflow

1. **Upload Image**: Drag and drop an image file or click to select
2. **Configure Settings**:
   - **Pixelation Scale**: Choose scale factor (2x-16x)
   - **Color Count**: Set number of colors (4-256)
   - **RGB555 Mode**: Enable SNES-style color conversion
   - **SNES Crop**: Apply 256x224 resolution cropping
3. **Process**: Click "Pixelate Image" to apply effects
4. **Export**: Download the processed image as PNG

### Advanced Features

#### Metadata Extraction

The tool automatically extracts and displays image metadata, including:

- AI generation parameters (Stable Diffusion, etc.)
- Camera EXIF data
- Image dimensions and format information

#### SNES-Style Processing

For authentic retro gaming aesthetics:

- Enable RGB555 conversion for 15-bit color depth
- Use SNES cropping for correct aspect ratio
- Apply moderate pixelation (4x-8x scale)
- Limit colors to 16-64 for authentic palette

## Architecture

### Modern JavaScript Implementation

The project uses a clean, modular architecture with ES6+ features:

- **PixelateApp.js**: Main application coordinator managing the processing pipeline
- **ImageProcessor.js**: Core image processing using pure Canvas API
- **MetadataHandler.js**: Image metadata extraction using ExifReader
- **UIController.js**: UI state management and event handling
- **CanvasManager.js**: Canvas display and manipulation operations

### Processing Pipeline

1. **Image Loading**: File upload → Canvas ImageData conversion
2. **Downscaling**: Canvas drawImage with configurable scale factor
3. **Color Quantization**: Median cut algorithm implementation
4. **RGB555 Conversion**: Bit manipulation for SNES color simulation
5. **SNES Cropping**: Center crop to 256x224 resolution
6. **Export**: Canvas to PNG blob with metadata preservation

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create production build
- `npm run preview` - Preview production build
- `npm run test` - Run test suite
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report

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

Test files include:

- Unit tests for image processing algorithms
- Integration tests with real images
- Metadata extraction validation
- UI interaction testing

### Dependencies

#### Runtime Dependencies

- **Bootstrap 5.3.8**: UI framework and responsive design
- **Bootstrap Icons 1.13.1**: Icon set for UI elements
- **ExifReader 4.32.0**: Image metadata extraction

#### Development Dependencies

- **Vite 7.1.7**: Build tool and development server
- **Vitest 3.2.4**: Testing framework
- **jsdom 27.0.0**: DOM simulation for testing

## Browser Compatibility

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

Requires Canvas API support and ES6+ JavaScript features.

## Performance

### Bundle Size

- **Production Build**: ~100KB (97% smaller than previous Python implementation)
- **Runtime Dependencies**: Minimal overhead with native Canvas API
- **Load Time**: Fast initial load with no runtime compilation

### Processing Speed

- **Native Performance**: Direct Canvas API manipulation
- **Memory Efficient**: No large runtime dependencies
- **Responsive UI**: Non-blocking processing with progress feedback

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

This means:

- ✅ You can use, modify, and distribute this software
- ✅ You can use it for commercial purposes
- ⚠️ You must provide source code for any modifications
- ⚠️ If you run this software on a server, you must provide source code to users
- ⚠️ Any derivative works must also be licensed under AGPL-3.0

See the [LICENSE](LICENSE) file for full details.

## Acknowledgments

- Built with modern web technologies and Canvas API
- Inspired by retro gaming aesthetics and SNES graphics
- Uses median cut algorithm for color quantization
- Metadata handling powered by ExifReader

## Support

For questions, issues, or contributions, please use the GitHub issue tracker.
