const fileInput = document.querySelector("#imageFileInput");
const canvas = document.querySelector("#canvas");
const canvasCtx = canvas.getContext("2d");
const consoleOutput = document.getElementById("consoleOutput");

let image = null;
let imageMetadata = null;
let originalFileName = null;

function loadImage() {
  canvas.width = image.width;
  canvas.height = image.height;
  canvasCtx.drawImage(image, 0, 0);
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  document.getElementById("reloadBtn").disabled = false;
  document.getElementById("saveBtn").disabled = false;
  originalFileName = file.name;

  // Extract metadata using Pyodide/PIL
  await extractImageMetadata(file);

  image = new Image();
  image.addEventListener("load", () => {
    loadImage();
  });

  image.src = URL.createObjectURL(file);
});

function addToOutput(s) {
  consoleOutput.value += s + "\n";
}

async function extractImageMetadata(file) {
  try {
    let pyodide = await pyodideReadyPromise;

    // Install custom PIL wheel with LIBIMAGEQUANT support
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install(
      "./pillow-10.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl"
    );

    // Convert file to bytes for Python
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    pyodide.globals.set("image_bytes", uint8Array);

    const metadata = pyodide.runPython(`
    import io
    from PIL import Image
    from PIL.PngImagePlugin import PngInfo
    
    # Load image from bytes
    image_file = io.BytesIO(bytes(image_bytes.to_py()))
    img = Image.open(image_file)
    
    # Extract metadata
    metadata = {}
    
    # Get basic info
    metadata['format'] = img.format
    metadata['mode'] = img.mode
    metadata['size'] = img.size
    
    # Extract PNG metadata if available
    if hasattr(img, 'info') and img.info:
        metadata['info'] = dict(img.info)
    
    # Extract EXIF data if available
    if hasattr(img, '_getexif') and img._getexif():
        metadata['exif'] = img._getexif()
    
    metadata
  `);

    imageMetadata = metadata.toJs({ dict_converter: Object.fromEntries });
    addToOutput(`Extracted metadata for ${file.name}`);
  } catch (err) {
    console.error("Error extracting metadata:", err);
    addToOutput(`Warning: Could not extract metadata - ${err}`);
    imageMetadata = null;
  }
}

async function saveImage() {
  if (!canvas) return;

  try {
    let pyodide = await pyodideReadyPromise;

    // Get canvas data
    const canvasData = canvasCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    const imageData = canvasData.data;

    pyodide.globals.set("canvas_data", imageData);
    pyodide.globals.set("canvas_width", canvas.width);
    pyodide.globals.set("canvas_height", canvas.height);
    pyodide.globals.set("original_metadata", imageMetadata);

    const pngBytes = pyodide.runPython(`
    import io
    import numpy as np
    from PIL import Image
    from PIL.PngImagePlugin import PngInfo
    
    # Convert canvas data to PIL Image
    canvas_array = np.array(canvas_data.to_py()).reshape(canvas_height, canvas_width, 4)
    img = Image.fromarray(canvas_array, 'RGBA')
    
    # Create PNG info object to preserve metadata
    pnginfo = PngInfo()
    
    # Restore original metadata if available
    if original_metadata:
        # Convert JsProxy to Python dict
        metadata_dict = original_metadata.to_py() if hasattr(original_metadata, 'to_py') else original_metadata
        if metadata_dict and 'info' in metadata_dict:
            for key, value in metadata_dict['info'].items():
                if isinstance(value, str):
                    pnginfo.add_text(key, value)
    
    # Save to bytes
    output = io.BytesIO()
    img.save(output, format='PNG', pnginfo=pnginfo)
    output.getvalue()
  `);

    // Convert Python bytes to JavaScript Uint8Array
    const uint8Array = new Uint8Array(pngBytes.toJs());

    // Create blob and download
    const blob = new Blob([uint8Array], { type: "image/png" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = originalFileName
      ? originalFileName.replace(/\.[^/.]+$/, "_edited.png")
      : "edited_image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToOutput(`Saved image as ${a.download}`);
  } catch (err) {
    console.error("Error saving image:", err);
    addToOutput(`Error saving image: ${err}`);
  }
}

async function main() {
  let pyodide = await loadPyodide();
  await pyodide.loadPackage("numpy");
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install(
    "./pillow-10.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl"
  );
  return pyodide;
}

let pyodideReadyPromise = main();

async function pixelize() {
  if (!image) return;
  consoleOutput.value = "";

  let pyodide = await pyodideReadyPromise;

  try {
    pyodide.runPython(`
  import numpy as np
  from PIL import Image
  from js import canvas, scale, colors, quant, rgb555, snescrop, rescale, addToOutput, ImageData
  from pyodide.ffi import create_proxy

  # Access to canvas content
  canvasCtx = canvas.getContext("2d")

  # SNES helpers
  toRGB555 = lambda v: v >> 3 << 3
  def apply(arr, fn):
      vfn = np.vectorize(fn,otypes=[arr.dtype])
      return vfn(arr.flatten()).reshape(arr.shape)
  def snes_crop(image):
      width, height = image.size
      new_width, new_height = 256, 224
      left = max([0, (width - new_width)/2])
      top = max([0, (height - new_height)/2])
      right = min([width, (width + new_width)/2])
      bottom = min([height, (height + new_height)/2])
      return image.crop((left, top, right, bottom))

  addToOutput("Starting...")

  # Read canvas ImageData as PIL.Image
  im = Image.fromarray(np.array(canvasCtx.getImageData(0,0,canvas.width,canvas.height,{"pixelFormat":"rgba-unorm8"}).data.to_py()).reshape(canvas.height,canvas.width,4),mode='RGBA')
  w, h = im.width, im.height
  addToOutput(f"Got image of size ({w},{h})")

  # Stupid pixel by resize
  s = int(scale.value)
  w, h = int(w/s), int(h/s)
  im = im.resize((w,h))
  addToOutput(f"Resized by scale {s} to ({w},{h})")

  # Reduce or quantize colors
  if quant.checked:
      im = im.quantize(colors=int(colors.value),method=Image.Quantize.LIBIMAGEQUANT).convert('RGBA')
      addToOutput(f"Quantized to {colors.value} colors")
  else:
      im = im.convert('RGB').quantize(colors=int(colors.value),method=Image.Quantize.MEDIANCUT).convert('RGBA')
      addToOutput(f"Reduced to {colors.value} colors")

  # Apply RGB555
  if rgb555.checked:
    im = Image.fromarray(apply(np.asarray(im.convert('RGB'),dtype='uint8'),toRGB555),'RGB').convert('RGBA')
    addToOutput(f"Applied RGB555")

  # Apply SNES crop
  if snescrop.checked:
    im = snes_crop(im)
    w, h = im.width, im.height
    addToOutput(f"Cropped to ({w},{h})")

  # Rescale post-processing
  if rescale.checked:
    im = im.resize((w*s,h*s))
    w, h = im.width, im.height
    addToOutput(f"Rescaled to ({w},{h})")

  # Convert back to ImageData
  im = np.asarray(im,dtype='uint8').tobytes()
  pixels_proxy = create_proxy(im)
  pixels_buf = pixels_proxy.getBuffer("u8clamped")
  img_data = ImageData.new(pixels_buf.data, w, h)
  canvas.width = w
  canvas.height = h
  canvasCtx.putImageData(img_data, 0, 0)
  pixels_proxy.destroy()
  pixels_buf.release()

  addToOutput("Done!")
`);
  } catch (err) {
    addToOutput(err);
  }
}
