# Image Processing Pipeline

## Overview

The application implements a multi-stage image processing pipeline designed to create retro-style pixelated images, particularly targeting SNES-era graphics aesthetics. The current implementation (v2.0) uses pure JavaScript with Canvas API for processing and comprehensive metadata preservation.

## Processing Stages

### 1. Image Input & Metadata Extraction

- **Location**: `MetadataHandler.js` - `extractMetadata()` method
- **Process**:
  - Uses ExifReader library to extract comprehensive metadata
  - Supports EXIF data, PNG text chunks, and AI generation parameters
  - Parses Stable Diffusion parameters (prompts, settings, model info)
  - Preserves metadata for restoration during save

### 2. Canvas Loading

- **Location**: `loadImage()` function in `main.js`
- **Process**: Draws original image to HTML5 canvas for processing

### 3. Pixelation Pipeline (Python/Pyodide)

**Location**: `pixelize()` function in `main.js` with embedded Python code

#### Stage 3.1: Canvas to PIL Conversion

- Reads canvas ImageData as RGBA array
- Converts to PIL Image object
- **Key Code**: `Image.fromarray(np.array(...).reshape(...))`

#### Stage 3.2: Downscaling ("Stupid Pixel Resize")

- Reduces image size by scale factor (2x-16x)
- Creates pixelated effect through resolution reduction
- **Formula**: `new_size = (width/scale, height/scale)`

#### Stage 3.3: Color Reduction

Two methods available:

- **Quantization** (default): Uses LIBIMAGEQUANT algorithm for high-quality color reduction
- **Median Cut**: Standard PIL quantization method
- **Range**: 4-256 colors

#### Stage 3.4: RGB555 Conversion (Optional)

- **Purpose**: Simulates SNES color limitations
- **Method**: Bit-shift operation `v >> 3 << 3`
- **Effect**: Reduces color precision to 5 bits per channel

#### Stage 3.5: SNES Cropping (Optional)

- **Target Resolution**: 256x224 pixels
- **Method**: Center crop to SNES screen dimensions
- **Function**: `snes_crop()` in embedded Python code

#### Stage 3.6: Upscaling (Optional)

- Restores image to original scale after processing
- Maintains pixelated appearance with larger pixels

### 4. Canvas Update

- Converts processed PIL image back to ImageData
- Updates HTML5 canvas with results
- **Memory Management**: Properly destroys proxies and releases buffers

### 5. Export with Metadata Preservation

- **Location**: `MetadataHandler.js` - `preserveMetadata()` method
- **Process**:
  - Parses PNG chunks from processed image blob
  - Creates PNG tEXt chunks for metadata preservation
  - Preserves AI generation parameters (prompts, settings, model info)
  - Preserves EXIF data as PNG tEXt chunks
  - Adds processing information (software, date)
  - Rebuilds PNG with proper CRC32 validation
  - Exports as PNG with comprehensive metadata preservation

## Key Algorithms

### RGB555 Conversion

```python
toRGB555 = lambda v: v >> 3 << 3
```

Simulates SNES 15-bit color depth by truncating lower 3 bits.

### SNES Crop Calculation

```python
left = max([0, (width - new_width)/2])
top = max([0, (height - new_height)/2])
right = min([width, (width + new_width)/2])
bottom = min([height, (height + new_height)/2])
```

Centers the crop area while respecting image boundaries.

## Dependencies & Libraries

- **ExifReader**: Comprehensive metadata extraction from image files
- **Canvas API**: Native browser image processing and manipulation
- **Bootstrap**: UI framework and styling
- **Vite**: Build tool and development server

## Performance Considerations

- Uses vectorized NumPy operations for RGB555 conversion
- Proper memory management with proxy destruction
- Canvas operations optimized for browser performance
- Custom PIL wheel includes LIBIMAGEQUANT for better color quantization
