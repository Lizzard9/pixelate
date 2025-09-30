# User Interface Components

## Architecture

- **Framework**: Bootstrap 5 with custom CSS (`main.css`)
- **Design**: Modern responsive layout with gradient backgrounds
- **Structure**: Card-based sidebar with full-screen image area

## Layout Structure

### Main Container (`.container-fluid`)

- **Type**: Bootstrap fluid container with responsive grid
- **Layout**: Row with responsive columns (sidebar + image area)
- **Responsive**: Stacks vertically on mobile/tablet (≤991px)

### Toolbar Card (`.toolbar-card`)

- **Framework**: Bootstrap card component
- **Width**: Responsive (col-lg-4 col-xl-3)
- **Background**: White card with shadow
- **Header**: Primary gradient with app title and icon
- **Purpose**: Contains all controls and console output

### Image Area (`.image-area`)

- **Layout**: Responsive column (col-lg-8 col-xl-9)
- **Background**: Purple-blue gradient (135deg, #667eea to #764ba2)
- **Content**: Centered canvas container with white background
- **Responsive**: Appears above toolbar on mobile (column-reverse)

## Control Components

### File Input

- **Element**: `<input type="file" class="form-control" id="imageFileInput" accept="image/*">`
- **Styling**: Bootstrap form control with file type restriction
- **Icon**: Upload icon with label
- **Purpose**: Image upload with visual feedback

### Action Buttons (Bootstrap styled)

#### Reload Button

- **ID**: `reloadBtn`
- **Classes**: `btn btn-secondary`
- **Function**: `loadImage()` (defined in `main.js`)
- **State**: Disabled until image loaded
- **Icon**: Arrow clockwise icon
- **Purpose**: Restore original image to canvas

#### Save Button

- **ID**: `saveBtn`
- **Classes**: `btn btn-success`
- **Function**: `saveImage()` (defined in `main.js`)
- **State**: Disabled until image loaded
- **Icon**: Download icon
- **Purpose**: Export processed image as PNG

#### Run Button

- **Classes**: `btn btn-primary btn-lg`
- **Function**: `pixelize()` (defined in `main.js`)
- **Icon**: Play icon
- **Purpose**: Execute image processing pipeline
- **Styling**: Large primary button with gradient background

### Parameter Controls

#### Scale Slider

- **ID**: `scale`
- **Classes**: `form-range`
- **Range**: 2-16 (step: 2)
- **Default**: 4
- **Purpose**: Controls pixelation intensity
- **Display**: Custom floating badge showing current value
- **Icon**: Zoom-in icon with label

#### Colors Slider

- **ID**: `colors`
- **Classes**: `form-range`
- **Range**: 4-256 (step: 2)
- **Default**: 16
- **Purpose**: Controls color quantization level
- **Display**: Custom floating badge showing current value
- **Icon**: Palette icon with label

### Processing Options (Bootstrap Checkboxes)

- **Section**: Grouped under "Processing Options" with gear icon
- **Classes**: `form-check` with `form-check-input` and `form-check-label`
- **Styling**: Custom purple accent color when checked

#### Quantize Colors (`quant`)

- **Default**: Checked
- **Purpose**: Enables LIBIMAGEQUANT vs median cut quantization
- **Impact**: Higher quality color reduction when enabled

#### Apply RGB555 (`rgb555`)

- **Default**: Checked
- **Purpose**: Simulates SNES color limitations
- **Effect**: Reduces color precision to 15-bit

#### SNES Crop (`snescrop`)

- **Default**: Unchecked
- **Purpose**: Crops to 256×224 SNES resolution
- **Effect**: Centers and crops image to retro console dimensions

#### Rescale Post-processing (`rescale`)

- **Default**: Checked
- **Purpose**: Upscales image after processing
- **Effect**: Maintains pixelated look at original size

### Console Output

- **Element**: `<textarea id="consoleOutput" class="form-control console-output">`
- **Styling**: Terminal-style with black background and bright green text (#00ff00)
- **Font**: Courier New monospace
- **Dimensions**: 12 rows, responsive width
- **State**: Disabled (read-only) with custom opacity override
- **Purpose**: Displays processing status and debug information
- **Function**: `addToOutput(s)` appends messages (defined in `main.js`)
- **Icon**: Terminal icon with label

## Canvas Element

- **ID**: `canvas`
- **Initial Size**: 500×500px
- **Behavior**: Dynamically resized based on image dimensions
- **Styling**: Responsive with max-width/max-height 100%

## Styling Notes (main.css)

### Modern Design System

- **Framework**: Bootstrap 5 + custom CSS
- **Theme**: Purple-blue gradient primary colors (#667eea to #764ba2)
- **Typography**: System fonts with Bootstrap typography classes
- **Spacing**: Bootstrap spacing utilities (mb-4, p-3, etc.)

### Color Scheme

- **Primary**: Purple-blue gradient backgrounds
- **Success**: Green gradient for save button
- **Secondary**: Gray gradient for secondary actions
- **Background**: Light gray (#f8f9fa)
- **Console**: Terminal green (#00ff00) on black (#000000)

### Responsive Design

- **Breakpoints**:
  - Large (≥992px): Side-by-side layout
  - Medium (768px-991px): Stacked with image above
  - Small (≤576px): Minimal padding and spacing
- **Canvas**: Responsive scaling with object-fit contain
- **Grid**: Bootstrap responsive grid system

## Event Handling (main.js)

### File Input Change

- **Trigger**: File selection
- **Handler**: Event listener in `main.js`
- **Actions**:
  - Enable buttons
  - Store filename
  - Extract metadata via `extractImageMetadata()`
  - Load and display image via `loadImage()`

### Slider Input

- **Trigger**: `oninput` event
- **Action**: Updates floating badge with `textContent`
- **Real-time**: Immediate visual feedback
- **Implementation**: Inline event handlers

### Processing Flow

1. User uploads image → File input handler (`main.js`)
2. User adjusts parameters → Slider updates (inline handlers)
3. User clicks "Run" → `pixelize()` execution (`main.js`)
4. User clicks "Save" → `saveImage()` export (`main.js`)

## Accessibility & UX Improvements

- **Bootstrap accessibility**: Proper ARIA labels and form associations
- **Icons**: Bootstrap Icons for visual context
- **Disabled states**: Clear visual indication with proper opacity
- **Console feedback**: Real-time processing status
- **Responsive design**: Mobile-first approach with touch-friendly controls
- **Loading states**: Button states change based on image availability
