# Image Processing Pipeline

## Overview

The application implements a multi-stage image processing pipeline designed to create retro-style pixelated images, particularly targeting SNES-era graphics aesthetics.

## Processing Stages

### 1. Image Input & Metadata Extraction

- **Location**: `extractImageMetadata()` function in `main.js`
- **Process**:
  - Loads image file as ArrayBuffer
  - Extracts PIL metadata (format, mode, size, EXIF, PNG info)
  - Preserves metadata for later restoration during save

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

- **Location**: `saveImage()` function in `main.js`
- **Process**:
  - Reads canvas data as RGBA array
  - Converts to PIL Image
  - Restores original PNG metadata using PngInfo
  - Exports as PNG with preserved metadata

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

- **LIBIMAGEQUANT**: High-quality color quantization (via custom PIL wheel)
- **NumPy**: Efficient array operations for image data
- **PIL/Pillow**: Core image processing functionality
- **Pyodide**: Enables Python execution in browser environment

## Performance Considerations

- Uses vectorized NumPy operations for RGB555 conversion
- Proper memory management with proxy destruction
- Canvas operations optimized for browser performance
- Custom PIL wheel includes LIBIMAGEQUANT for better color quantization
