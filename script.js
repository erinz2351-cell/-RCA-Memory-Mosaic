const canvas = document.querySelector("#trace-canvas");
const context = canvas.getContext("2d");
let image = new Image();
let cleanPlateImage = new Image();
const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
const mosaicCanvas = document.createElement("canvas");
const mosaicContext = mosaicCanvas.getContext("2d", { willReadFrequently: true });
const coarseMosaicCanvas = document.createElement("canvas");
const coarseMosaicContext = coarseMosaicCanvas.getContext("2d");
const animationTilesCanvas = document.createElement("canvas");
const animationTilesContext = animationTilesCanvas.getContext("2d");
const tileMaskCanvas = document.createElement("canvas");
const tileMaskContext = tileMaskCanvas.getContext("2d", { willReadFrequently: true });
const effectCanvas = document.createElement("canvas");
const effectContext = effectCanvas.getContext("2d");
const maskedEffectCanvas = document.createElement("canvas");
const maskedEffectContext = maskedEffectCanvas.getContext("2d");
const reconstructionCanvas = document.createElement("canvas");
const reconstructionContext = reconstructionCanvas.getContext("2d", { willReadFrequently: true });
const selectionCanvas = document.createElement("canvas");
const selectionContext = selectionCanvas.getContext("2d", { willReadFrequently: true });
let maskCanvas = document.createElement("canvas");
let maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
const frame = document.querySelector(".canvas-frame");
const editToolbar = document.querySelector(".edit-toolbar");
const indexView = document.querySelector("#index-view");
const traceView = document.querySelector("#trace-view");
const indexEntries = document.querySelector("#index-entries");
const indexEntryTrack = document.querySelector("#index-entry-track");
const uploadButton = document.querySelector("#upload-button");
const uploadInput = document.querySelector("#upload-input");
const uploadStatus = document.querySelector("#upload-status");
const indexPreview = document.querySelector("#index-preview");
const backToIndex = document.querySelector("#back-to-index");
const traceTitle = document.querySelector("#trace-title");
const traceDate = document.querySelector(".trace-date");
const playButton = document.querySelector("#play-button");
const scrubber = document.querySelector("#scrubber");
const timeReadout = document.querySelector("#time-readout");
const statusLabel = document.querySelector("#status-label");
const editButton = document.querySelector("#edit-button");
const editTools = document.querySelector("#edit-tools");
const doneButton = document.querySelector("#done-button");
const eraseButton = document.querySelector("#erase-button");
const clearMaskButton = document.querySelector("#clear-mask-button");
const brushSize = document.querySelector("#brush-size");
const cleanPlateNote = document.querySelector("#clean-plate-note");
const errorMessage = document.querySelector("#image-error");
const cycleDuration = 8000;
const segmentDurationSeconds = cycleDuration / 4 / 1000;
const fineMosaicCssBlockSize = 8;
const coarseMosaicCssBlockSize = 32;
const supportedUploadTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const archiveEntriesData = [
  { id: "001", title: "PROPERTY LABEL", imagePath: "trace-01.jpg", location: "WHITE CITY", cleanPlatePath: "trace-01-clean.jpg" },
  { id: "002", title: "NAME FRAGMENTS", imagePath: "trace-02.jpg", location: "BATTERSEA STU.02.001B", cleanPlatePath: "trace-02-clean.jpg" },
  { id: "003", title: "QR CODE", imagePath: "trace-03.jpg", location: "WHITE CITY GH.01", cleanPlatePath: "trace-03-clean.jpg" },
  { id: "004", title: "REMNANT", imagePath: "trace-04.jpg", location: "WHITE CITY GH.01", cleanPlatePath: "trace-04-clean.jpg" },
  { id: "005", title: "COLLECTIVE MARKINGS", imagePath: "trace-05.jpg", location: "WHITE CITY GH.01", cleanPlatePath: "trace-05-clean.jpg" },
  { id: "006", title: "EVENT POSTER", imagePath: "trace-06.JPG", location: "", cleanPlatePath: "trace-06-clean.JPG" },
  { id: "007", title: "CAT ZONE DOODLES", imagePath: "trace-07.jpeg", location: "", cleanPlatePath: "trace-07-clean.jpeg" },
  { id: "008", title: "NAILGUN MARKS", imagePath: "trace-08.jpeg", location: "", cleanPlatePath: "trace-08-clean.jpeg" },
  { id: "009", title: "HALLOWEEN DECORATION", imagePath: "trace-09.jpeg", location: "", cleanPlatePath: "trace-09-clean.jpeg" },
  { id: "010", title: "FOLDING PANEL WALL", imagePath: "trace-10.jpeg", location: "", cleanPlatePath: "trace-10-clean.jpeg" }
];
const archiveEntriesById = new Map(archiveEntriesData.map((entry) => [entry.id, entry]));
const masksByEntry = new Map();

let activeTemporaryUrl = null;
let temporaryEntrySequence = 0;
let indexLoopCycleHeight = 0;
let indexLoopOffset = 0;
let indexLoopRowUnit = 0;
let indexLoopSeamGap = 0;
let playing = false;
let editing = false;
let showOriginalOnEntry = true;
let erasing = false;
let drawingPointerId = null;
let activeEntry = null;
let imageReady = false;
let cleanPlateReady = false;
let mosaicFramesReady = false;
let imageLoadGeneration = 0;
let phaseOffset = 0;
let playbackStartedAt = 0;
let lastBrushPoint = null;
let brushAngle = 0;
let viewTransitioning = false;
let previewVisible = false;
let previewPointer = { x: 0, y: 0 };
let previewPosition = { x: 0, y: 0 };
let previewFrameRequest;
let displayWidth = 0;
let displayHeight = 0;
let pixelRatio = 1;
let fineMosaicBlockSize = 0;
let coarseMosaicBlockSize = 0;
let sourcePixels;
let animationTiles = [];
let animationTilePixels;
let animationTileColors;
let frameRequest;

buildIndex();
setImageUnavailable();

function buildIndex() {
  const cycles = [-1, 0, 1].map((cycleIndex) => {
    const cycle = document.createElement("div");
    cycle.className = "index-entry-cycle";
    cycle.dataset.cycleIndex = String(cycleIndex);
    if (cycleIndex !== 0) cycle.setAttribute("aria-hidden", "true");

    for (const entry of archiveEntriesData) {
      const button = document.createElement("button");
      const number = document.createElement("span");
      const title = document.createElement("span");
      button.className = "index-entry";
      button.type = "button";
      button.setAttribute("aria-controls", "trace-view");
      button.dataset.entryId = entry.id;
      if (entry.id === archiveEntriesData[0].id) button.classList.add("index-entry-cycle-start");
      if (cycleIndex !== 0) button.tabIndex = -1;
      number.className = "entry-number";
      number.textContent = entry.id;
      title.className = "entry-title";
      title.textContent = entry.title;
      button.append(number, title);
      button.addEventListener("click", () => enterTrace(entry));
      button.addEventListener("pointerenter", (event) => showIndexPreview(event, entry));
      button.addEventListener("pointermove", (event) => showIndexPreview(event, entry));
      button.addEventListener("pointerleave", handleIndexEntryPointerLeave);
      cycle.append(button);
    }

    return cycle;
  });

  indexEntryTrack.replaceChildren(...cycles);
  updateIndexDirectoryLoopLayout();
}

function normalizeIndexLoopOffset(offset, cycleHeight) {
  if (cycleHeight <= 0) return 0;
  return ((offset + cycleHeight / 2) % cycleHeight + cycleHeight) % cycleHeight - cycleHeight / 2;
}

function applyIndexLoopOffset() {
  indexEntryTrack.style.transform = `translate3d(0, ${-indexLoopOffset}px, 0)`;
}

function updateIndexDirectoryLoopLayout() {
  const centralCycle = indexEntryTrack.querySelector(".index-entry-cycle[data-cycle-index=\"0\"]");
  if (!centralCycle) return;

  const buttons = Array.from(centralCycle.children);
  if (!buttons.length) return;

  const naturalHeight = buttons.reduce((height, button) => height + button.getBoundingClientRect().height, 0);
  const baseCycleHeight = Math.max(indexEntries.clientHeight, naturalHeight);
  const ordinaryGap = buttons.length > 1
    ? (baseCycleHeight - naturalHeight) / (buttons.length - 1)
    : 0;
  const regularRowStride = naturalHeight / buttons.length + ordinaryGap;
  const seamGap = regularRowStride * 2;
  const nextCycleHeight = baseCycleHeight + seamGap;
  if (indexLoopCycleHeight > 0) {
    const previousScrollOffset = normalizeIndexLoopOffset(
      indexLoopOffset - indexLoopSeamGap,
      indexLoopCycleHeight
    );
    indexLoopOffset = normalizeIndexLoopOffset(
      seamGap + previousScrollOffset * nextCycleHeight / indexLoopCycleHeight,
      nextCycleHeight
    );
  } else {
    indexLoopOffset = seamGap;
  }
  indexLoopCycleHeight = nextCycleHeight;
  indexLoopRowUnit = regularRowStride;
  indexLoopSeamGap = seamGap;

  for (const cycle of indexEntryTrack.children) {
    const cycleIndex = Number(cycle.dataset.cycleIndex);
    cycle.style.height = `${nextCycleHeight}px`;
    cycle.style.top = `${cycleIndex * nextCycleHeight}px`;
    cycle.style.setProperty("--index-seam-gap", `${seamGap}px`);
  }
  applyIndexLoopOffset();
}

function handleIndexWheel(event) {
  if (!indexLoopCycleHeight || event.deltaY === 0) return;
  event.preventDefault();

  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= indexLoopRowUnit;
  if (event.deltaMode === 2) delta *= indexEntries.clientHeight;
  indexLoopOffset = normalizeIndexLoopOffset(indexLoopOffset + delta, indexLoopCycleHeight);
  applyIndexLoopOffset();
}

function handleIndexEntryPointerLeave(event) {
  const hoveredElement = document.elementFromPoint(event.clientX, event.clientY);
  const hoveredButton = hoveredElement && hoveredElement.closest(".index-entry");
  const entry = hoveredButton && indexEntries.contains(hoveredButton)
    ? archiveEntriesById.get(hoveredButton.dataset.entryId)
    : null;

  if (entry) {
    showIndexPreview(event, entry);
  } else {
    hideIndexPreview();
  }
}

function setImageUnavailable() {
  imageReady = false;
  canvas.hidden = true;
  editToolbar.hidden = true;
}

function loadImage(entry) {
  const loadGeneration = ++imageLoadGeneration;
  cancelAnimationFrame(frameRequest);
  frameRequest = undefined;
  imageReady = false;
  cleanPlateReady = false;
  cleanPlateImage = new Image();
  mosaicFramesReady = false;
  animationTiles = [];
  animationTilePixels = undefined;
  animationTileColors = undefined;
  sourcePixels = undefined;
  cleanPlateNote.textContent = "";
  errorMessage.hidden = true;
  setImageUnavailable();

  const requestedImage = new Image();
  image = requestedImage;
  requestedImage.onload = () => {
    if (loadGeneration !== imageLoadGeneration || activeEntry !== entry) return;
    imageReady = true;
    canvas.hidden = false;
    editToolbar.hidden = false;
    updateCleanPlateState(entry);
    useEntryMask(entry);
    resizeCanvas();
    loadCleanPlate(entry, loadGeneration);
  };
  requestedImage.onerror = (event) => {
    if (loadGeneration !== imageLoadGeneration || activeEntry !== entry) return;
    if (entry.isTemporary) {
      console.error("Unable to load the selected temporary image.", event);
      errorMessage.textContent = "This image could not be read. Choose a valid JPEG, PNG, or WebP image.";
      revokeActiveTemporaryUrl();
    } else {
      console.error(`Unable to load archive image "${entry.imagePath}".`, event);
      errorMessage.textContent = `Image unavailable: ${entry.imagePath}`;
    }
    setImageUnavailable();
    errorMessage.hidden = false;
  };
  requestedImage.src = entry.imagePath;
}

function loadCleanPlate(entry, loadGeneration) {
  if (!entry.cleanPlatePath) {
    cleanPlateReady = false;
    updateCleanPlateState(entry);
    return;
  }

  const requestedCleanPlate = new Image();
  cleanPlateImage = requestedCleanPlate;
  requestedCleanPlate.onload = () => {
    if (loadGeneration !== imageLoadGeneration || activeEntry !== entry) return;
    updateCleanPlateState(entry);
    rebuildReconstruction();
    render();
  };
  requestedCleanPlate.onerror = () => {
    if (loadGeneration !== imageLoadGeneration || activeEntry !== entry) return;
    cleanPlateReady = false;
    updateCleanPlateState(entry);
  };
  requestedCleanPlate.src = entry.cleanPlatePath;
}

function updateTraceMetadata(entry) {
  traceTitle.textContent = entry.isTemporary ? entry.title : `${entry.id} — ${entry.title}`;
  traceDate.textContent = entry.location;
}

function useEntryMask(entry) {
  let entryMask = masksByEntry.get(entry.id);
  if (!entryMask || entryMask.width !== image.naturalWidth || entryMask.height !== image.naturalHeight) {
    entryMask = document.createElement("canvas");
    entryMask.width = image.naturalWidth;
    entryMask.height = image.naturalHeight;
    masksByEntry.set(entry.id, entryMask);
  }
  maskCanvas = entryMask;
  maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
}

function updateCleanPlateState(entry) {
  const isLoaded = cleanPlateImage.complete && cleanPlateImage.naturalWidth > 0;
  cleanPlateReady = isLoaded
    && cleanPlateImage.naturalWidth === image.naturalWidth
    && cleanPlateImage.naturalHeight === image.naturalHeight;

  if (cleanPlateReady) {
    cleanPlateNote.textContent = "";
  } else if (isLoaded) {
    cleanPlateNote.textContent = `${entry.cleanPlatePath} dimensions must match ${entry.imagePath}.`;
  } else {
    cleanPlateNote.replaceChildren(
      entry.isTemporary
        ? "Add a Clean Plate for your trace for reliable erasure."
        : `Add ${entry.id} — ${entry.title} for reliable erasure.`,
      document.createElement("br"),
      "Current background is a local estimate."
    );
  }
}

function resizeCanvas() {
  if (!imageReady) return;
  if (traceView.hidden) return;

  const bounds = frame.getBoundingClientRect();
  const availableWidth = Math.max(1, bounds.width);
  const availableHeight = Math.max(1, window.innerHeight * 0.62);
  const scale = Math.min(
    availableWidth / image.naturalWidth,
    availableHeight / image.naturalHeight,
    1
  );
  pixelRatio = window.devicePixelRatio || 1;

  displayWidth = image.naturalWidth * scale;
  displayHeight = image.naturalHeight * scale;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = Math.round(displayWidth * pixelRatio);
  canvas.height = Math.round(displayHeight * pixelRatio);
  [effectCanvas, maskedEffectCanvas, reconstructionCanvas, selectionCanvas].forEach((surface) => {
    surface.width = canvas.width;
    surface.height = canvas.height;
  });
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  sourceContext.imageSmoothingEnabled = false;
  sourceContext.drawImage(image, 0, 0);
  sourcePixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const requestedBlockSize = Math.max(
    1,
    Math.round(fineMosaicCssBlockSize * image.naturalWidth / displayWidth)
  );
  if (!mosaicFramesReady || requestedBlockSize !== fineMosaicBlockSize) {
    buildMosaicFrame();
    mosaicFramesReady = true;
    if (activeEntry && masksByEntry.has(activeEntry.id) && !editing) {
      buildAnimationTiles();
    }
  }
  rebuildReconstruction();
  render();
}

function showIndexPreview(event, entry) {
  if (!event || event.pointerType === "touch" || window.matchMedia("(hover: none)").matches) return;
  if (indexPreview.dataset.entryId !== entry.id) {
    indexPreview.dataset.entryId = entry.id;
    indexPreview.src = entry.imagePath;
  }
  previewVisible = true;
  previewPointer = { x: event.clientX, y: event.clientY };
  if (!indexPreview.classList.contains("is-visible")) {
    previewPosition = { ...previewPointer };
    indexPreview.classList.add("is-visible");
    updateIndexPreview();
    return;
  }
  if (!previewFrameRequest) previewFrameRequest = requestAnimationFrame(updateIndexPreview);
}

function updateIndexPreview() {
  previewFrameRequest = undefined;
  const width = indexPreview.offsetWidth || Math.min(window.innerWidth * 0.25, 280);
  const height = indexPreview.offsetHeight || width * 0.75;
  const targetX = Math.max(width / 2 + 12, Math.min(window.innerWidth - width / 2 - 12, previewPointer.x + width * 0.62));
  const targetY = Math.max(height / 2 + 12, Math.min(window.innerHeight - height / 2 - 12, previewPointer.y + height * 0.58));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smoothing = reducedMotion ? 1 : 0.22;

  previewPosition.x += (targetX - previewPosition.x) * smoothing;
  previewPosition.y += (targetY - previewPosition.y) * smoothing;
  indexPreview.style.left = `${previewPosition.x}px`;
  indexPreview.style.top = `${previewPosition.y}px`;

  if (previewVisible && Math.hypot(targetX - previewPosition.x, targetY - previewPosition.y) > 0.5) {
    previewFrameRequest = requestAnimationFrame(updateIndexPreview);
  }
}

function hideIndexPreview() {
  previewVisible = false;
  indexPreview.classList.remove("is-visible");
  if (previewFrameRequest) {
    cancelAnimationFrame(previewFrameRequest);
    previewFrameRequest = undefined;
  }
}

function transitionDuration() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400;
}

function enterTrace(entry) {
  if (viewTransitioning) return;
  viewTransitioning = true;
  hideIndexPreview();
  activeEntry = entry;
  updateTraceMetadata(entry);
  if (entry.isTemporary) {
    erasing = false;
    eraseButton.setAttribute("aria-pressed", "false");
    eraseButton.textContent = "Erase Brush";
  }
  prepareTraceEntry();
  loadImage(entry);
  if (transitionDuration() === 0) {
    indexView.hidden = true;
    indexView.classList.remove("is-entering", "is-leaving", "is-visible");
    traceView.hidden = false;
    traceView.setAttribute("aria-hidden", "false");
    traceView.classList.remove("is-leaving");
    traceView.classList.add("is-visible");
    resizeCanvas();
    viewTransitioning = false;
    return;
  }

  indexView.classList.add("is-leaving");
  traceView.hidden = false;
  traceView.setAttribute("aria-hidden", "false");
  void traceView.offsetWidth;
  window.setTimeout(() => {
    traceView.classList.add("is-visible");
    resizeCanvas();
  }, 0);

  window.setTimeout(() => {
    indexView.hidden = true;
    indexView.classList.remove("is-leaving");
    viewTransitioning = false;
  }, transitionDuration());
}

function returnToIndex() {
  if (viewTransitioning) return;
  viewTransitioning = true;
  prepareTraceEntry();
  if (transitionDuration() === 0) {
    indexView.hidden = false;
    indexView.classList.remove("is-entering", "is-leaving", "is-visible");
    traceView.hidden = true;
    traceView.setAttribute("aria-hidden", "true");
    traceView.classList.remove("is-visible", "is-leaving");
    releaseTemporaryEntry();
    viewTransitioning = false;
    return;
  }

  indexView.classList.add("is-entering");
  indexView.hidden = false;
  traceView.classList.add("is-leaving");
  void indexView.offsetWidth;
  window.setTimeout(() => indexView.classList.remove("is-entering"), 0);

  window.setTimeout(() => {
    traceView.hidden = true;
    traceView.setAttribute("aria-hidden", "true");
    traceView.classList.remove("is-visible", "is-leaving");
    indexView.classList.remove("is-entering", "is-visible");
    releaseTemporaryEntry();
    viewTransitioning = false;
  }, transitionDuration());
}

function revokeActiveTemporaryUrl() {
  if (!activeTemporaryUrl) return;
  URL.revokeObjectURL(activeTemporaryUrl);
  activeTemporaryUrl = null;
}

function releaseTemporaryEntry() {
  if (!activeEntry || !activeEntry.isTemporary) return;

  imageLoadGeneration += 1;
  revokeActiveTemporaryUrl();
  const temporaryMask = masksByEntry.get(activeEntry.id);
  if (temporaryMask) {
    masksByEntry.delete(activeEntry.id);
    if (maskCanvas === temporaryMask) {
      maskCanvas = document.createElement("canvas");
      maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
    }
  }
  activeEntry = null;
  imageReady = false;
  cleanPlateReady = false;
  image = new Image();
  cleanPlateImage = new Image();
  sourcePixels = undefined;
  animationTiles = [];
  animationTilePixels = undefined;
  animationTileColors = undefined;
  mosaicFramesReady = false;
  [
    canvas,
    sourceCanvas,
    mosaicCanvas,
    coarseMosaicCanvas,
    animationTilesCanvas,
    tileMaskCanvas,
    effectCanvas,
    maskedEffectCanvas,
    reconstructionCanvas,
    selectionCanvas
  ].forEach((surface) => {
    surface.width = 0;
    surface.height = 0;
  });
  cleanPlateNote.textContent = "";
  errorMessage.hidden = true;
  setImageUnavailable();
}

function prepareTraceEntry() {
  cancelAnimationFrame(frameRequest);
  frameRequest = undefined;
  playing = false;
  editing = false;
  showOriginalOnEntry = true;
  phaseOffset = 0;
  playbackStartedAt = 0;
  drawingPointerId = null;
  lastBrushPoint = null;
  canvas.classList.remove("editing");
  editButton.hidden = false;
  editTools.hidden = true;
  playButton.disabled = false;
  playButton.textContent = "Play";
  playButton.setAttribute("aria-pressed", "false");
  scrubber.disabled = false;
  scrubber.value = "0";
  render();
}

function averageTileColor(left, top, right, bottom) {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const index = (y * sourceCanvas.width + x) * 4;
      red += sourcePixels[index];
      green += sourcePixels[index + 1];
      blue += sourcePixels[index + 2];
      count += 1;
    }
  }

  return [
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count)
  ];
}

function buildMosaicLevel(targetCanvas, targetContext, blockSize) {
  const width = Math.ceil(sourceCanvas.width / blockSize);
  const height = Math.ceil(sourceCanvas.height / blockSize);
  targetCanvas.width = width;
  targetCanvas.height = height;
  const framePixels = targetContext.createImageData(width, height);

  for (let y = 0; y < height; y += 1) {
    const top = y * blockSize;
    const bottom = Math.min(top + blockSize, sourceCanvas.height);
    for (let x = 0; x < width; x += 1) {
      const left = x * blockSize;
      const right = Math.min(left + blockSize, sourceCanvas.width);
      const color = averageTileColor(left, top, right, bottom);
      const index = (y * width + x) * 4;
      framePixels.data[index] = color[0];
      framePixels.data[index + 1] = color[1];
      framePixels.data[index + 2] = color[2];
      framePixels.data[index + 3] = 255;
    }
  }

  targetContext.putImageData(framePixels, 0, 0);
}

function buildMosaicFrame() {
  const sourcePixelsPerCssPixel = image.naturalWidth / displayWidth;
  fineMosaicBlockSize = Math.max(1, Math.round(fineMosaicCssBlockSize * sourcePixelsPerCssPixel));
  coarseMosaicBlockSize = Math.max(
    fineMosaicBlockSize + 1,
    Math.round(coarseMosaicCssBlockSize * sourcePixelsPerCssPixel)
  );
  buildMosaicLevel(mosaicCanvas, mosaicContext, fineMosaicBlockSize);
  buildMosaicLevel(coarseMosaicCanvas, coarseMosaicContext, coarseMosaicBlockSize);
  tileMaskCanvas.width = mosaicCanvas.width;
  tileMaskCanvas.height = mosaicCanvas.height;
  animationTilesCanvas.width = mosaicCanvas.width * 2;
  animationTilesCanvas.height = mosaicCanvas.height * 2;
  animationTilePixels = animationTilesContext.createImageData(
    animationTilesCanvas.width,
    animationTilesCanvas.height
  );
}

function rebuildReconstruction() {
  if (!imageReady) return;

  reconstructionContext.clearRect(0, 0, reconstructionCanvas.width, reconstructionCanvas.height);
  reconstructionContext.imageSmoothingEnabled = true;
  reconstructionContext.drawImage(
    cleanPlateReady ? cleanPlateImage : image,
    0,
    0,
    reconstructionCanvas.width,
    reconstructionCanvas.height
  );
  if (cleanPlateReady) return;

  selectionContext.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);
  selectionContext.drawImage(maskCanvas, 0, 0, selectionCanvas.width, selectionCanvas.height);
  const maskPixels = selectionContext.getImageData(0, 0, selectionCanvas.width, selectionCanvas.height).data;
  const background = reconstructionContext.getImageData(0, 0, reconstructionCanvas.width, reconstructionCanvas.height);
  const pixels = background.data;
  const width = reconstructionCanvas.width;
  const height = reconstructionCanvas.height;
  const directions = [
    [1, 0], [0.924, 0.383], [0.707, 0.707], [0.383, 0.924],
    [0, 1], [-0.383, 0.924], [-0.707, 0.707], [-0.924, 0.383],
    [-1, 0], [-0.924, -0.383], [-0.707, -0.707], [-0.383, -0.924],
    [0, -1], [0.383, -0.924], [0.707, -0.707], [0.924, -0.383]
  ];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (maskPixels[index + 3] < 8) continue;

      let found = false;
      for (let radius = 2; radius <= 96 && !found; radius += 2) {
        for (const [dx, dy] of directions) {
          const sampleX = Math.round(x + dx * radius);
          const sampleY = Math.round(y + dy * radius);
          if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) continue;
          const sampleIndex = (sampleY * width + sampleX) * 4;
          if (maskPixels[sampleIndex + 3] >= 8) continue;
          pixels[index] = pixels[sampleIndex];
          pixels[index + 1] = pixels[sampleIndex + 1];
          pixels[index + 2] = pixels[sampleIndex + 2];
          found = true;
          break;
        }
      }
    }
  }

  reconstructionContext.putImageData(background, 0, 0);
}

function animationWeights(timestamp) {
  const phase = ((currentPhase(timestamp) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const seconds = (phase / (Math.PI * 2)) * (cycleDuration / 1000);
  const segment = Math.min(3, Math.floor(seconds / segmentDurationSeconds));
  const progress = (seconds - segment * segmentDurationSeconds) / segmentDurationSeconds;
  const eased = progress * progress * (3 - 2 * progress);

  if (segment === 0) {
    return {
      seconds,
      fragmentation: eased,
      eraseProgress: 0,
      restoreProgress: 0,
      erasing: false,
      restoring: false,
      tileScale: 1,
      originalMix: 0,
      mosaicMix: 0
    };
  }
  if (segment === 1) {
    return {
      seconds,
      fragmentation: 1 - eased * 0.2,
      eraseProgress: eased,
      restoreProgress: 0,
      erasing: true,
      restoring: false,
      tileScale: 1,
      originalMix: 0,
      mosaicMix: 0
    };
  }
  if (segment === 2) {
    return {
      seconds,
      fragmentation: 0.8 - eased * 0.1,
      eraseProgress: 0,
      restoreProgress: eased,
      erasing: false,
      restoring: true,
      tileScale: 1,
      originalMix: 0,
      mosaicMix: 0
    };
  }
  const originalProgress = smoothProgress(6, 7.5, seconds);
  const loopProgress = smoothProgress(7.75, 8, seconds);
  return {
    seconds,
    fragmentation: 0.7 * (1 - originalProgress),
    eraseProgress: 0,
    restoreProgress: 1 - originalProgress,
    erasing: false,
    restoring: true,
    tileScale: 1 - originalProgress,
    originalMix: seconds < 7.75 ? originalProgress : 1 - loopProgress,
    mosaicMix: loopProgress
  };
}

function compositeTrace(weights) {
  effectContext.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
  effectContext.globalCompositeOperation = "lighter";
  effectContext.globalAlpha = weights.fine;
  effectContext.imageSmoothingEnabled = false;
  effectContext.drawImage(
    mosaicCanvas,
    0,
    0,
    mosaicCanvas.width * fineMosaicBlockSize * effectCanvas.width / image.naturalWidth,
    mosaicCanvas.height * fineMosaicBlockSize * effectCanvas.height / image.naturalHeight
  );
  effectContext.globalAlpha = weights.coarse;
  effectContext.drawImage(
    coarseMosaicCanvas,
    0,
    0,
    coarseMosaicCanvas.width * coarseMosaicBlockSize * effectCanvas.width / image.naturalWidth,
    coarseMosaicCanvas.height * coarseMosaicBlockSize * effectCanvas.height / image.naturalHeight
  );
  effectContext.globalAlpha = weights.erased;
  effectContext.imageSmoothingEnabled = true;
  effectContext.drawImage(reconstructionCanvas, 0, 0);
  effectContext.globalAlpha = 1;
  effectContext.globalCompositeOperation = "source-over";

  maskedEffectContext.clearRect(0, 0, maskedEffectCanvas.width, maskedEffectCanvas.height);
  maskedEffectContext.drawImage(effectCanvas, 0, 0);
  maskedEffectContext.globalCompositeOperation = "destination-in";
  maskedEffectContext.drawImage(maskCanvas, 0, 0, maskedEffectCanvas.width, maskedEffectCanvas.height);
  maskedEffectContext.globalCompositeOperation = "source-over";
}

function smoothProgress(start, end, value) {
  const amount = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return amount * amount * (3 - 2 * amount);
}

function tileNoise(x, y, salt) {
  let value = Math.imul(x + salt, 374761393) + Math.imul(y + salt * 13, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function buildAnimationTiles() {
  if (!mosaicCanvas.width || !mosaicCanvas.height) return;

  tileMaskContext.clearRect(0, 0, tileMaskCanvas.width, tileMaskCanvas.height);
  tileMaskContext.imageSmoothingEnabled = true;
  tileMaskContext.drawImage(maskCanvas, 0, 0, tileMaskCanvas.width, tileMaskCanvas.height);
  const selectedPixels = tileMaskContext.getImageData(0, 0, tileMaskCanvas.width, tileMaskCanvas.height).data;
  animationTileColors = mosaicContext.getImageData(0, 0, mosaicCanvas.width, mosaicCanvas.height).data;
  animationTiles = [];

  for (let y = 0; y < mosaicCanvas.height; y += 1) {
    for (let x = 0; x < mosaicCanvas.width; x += 1) {
      const index = (y * mosaicCanvas.width + x) * 4;
      if (selectedPixels[index + 3] === 0) continue;

      animationTiles.push({
        x,
        y,
        red: animationTileColors[index],
        green: animationTileColors[index + 1],
        blue: animationTileColors[index + 2],
        threshold: 0.08 + tileNoise(x, y, 1) * 0.72,
        angle: tileNoise(x, y, 2) * Math.PI * 2,
        shift: 0.5 + tileNoise(x, y, 3) * 1.5,
        wobble: tileNoise(x, y, 4) * Math.PI * 2,
        trail: tileNoise(x, y, 5)
      });
    }
  }
}

function blendAnimationPixel(pixels, x, y, red, green, blue, alpha) {
  const width = animationTilesCanvas.width;
  const height = animationTilesCanvas.height;
  if (x < 0 || x >= width || y < 0 || y >= height || alpha <= 0) return;

  const index = (y * width + x) * 4;
  const destinationAlpha = pixels[index + 3] / 255;
  const outputAlpha = alpha + destinationAlpha * (1 - alpha);
  const retainedAlpha = destinationAlpha * (1 - alpha);
  pixels[index] = Math.round((red * alpha + pixels[index] * retainedAlpha) / outputAlpha);
  pixels[index + 1] = Math.round((green * alpha + pixels[index + 1] * retainedAlpha) / outputAlpha);
  pixels[index + 2] = Math.round((blue * alpha + pixels[index + 2] * retainedAlpha) / outputAlpha);
  pixels[index + 3] = Math.round(outputAlpha * 255);
}

function renderAnimationTiles(state) {
  const pixels = animationTilePixels.data;
  pixels.fill(0);
  const cycleSeconds = cycleDuration / 1000;
  const displacementEnvelope = Math.sin(Math.PI * state.seconds / cycleSeconds);
  const trailNeighbors = animationTileColors;

  for (const tile of animationTiles) {
    const staggerEnd = tile.threshold + (1 - tile.threshold) * 0.42;
    let visibility = 1;
    if (state.erasing) {
      visibility = 1 - smoothProgress(tile.threshold, staggerEnd, state.eraseProgress);
    } else if (state.restoring) {
      visibility = smoothProgress(tile.threshold, staggerEnd, state.restoreProgress);
    }
    if (visibility <= 0.001) continue;

    const angle = tile.angle + Math.sin(state.seconds * 2.7 + tile.wobble) * 0.24;
    const shift = tile.shift * state.fragmentation * displacementEnvelope * 2;
    const offsetX = Math.round(Math.cos(angle) * shift);
    const offsetY = Math.round(Math.sin(angle) * shift);
    const tileSize = 2 * state.tileScale;
    if (tileSize <= 0.001) continue;
    const left = tile.x * 2 + offsetX + 1 - tileSize / 2;
    const top = tile.y * 2 + offsetY + 1 - tileSize / 2;
    blendAnimationRect(
      pixels,
      left,
      top,
      tileSize,
      tileSize,
      tile.red,
      tile.green,
      tile.blue,
      visibility
    );

    const directionX = Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle))
      ? Math.sign(Math.cos(angle))
      : 0;
    const directionY = directionX === 0 ? Math.sign(Math.sin(angle)) : 0;
    const neighborX = tile.x - directionX;
    const neighborY = tile.y - directionY;
    if (
      state.fragmentation <= 0.01
      || neighborX < 0
      || neighborX >= mosaicCanvas.width
      || neighborY < 0
      || neighborY >= mosaicCanvas.height
    ) continue;

    const neighborIndex = (neighborY * mosaicCanvas.width + neighborX) * 4;
    const trailLength = Math.max(1, Math.round(1 + tile.trail * 3 * state.fragmentation));
    for (let step = 1; step <= trailLength; step += 1) {
      const trailAlpha = visibility * state.fragmentation * 0.22 * (1 - (step - 1) / (trailLength + 1));
      const trailOffset = step * tileSize / 2;
      blendAnimationRect(
        pixels,
        left - directionX * trailOffset,
        top - directionY * trailOffset,
        tileSize,
        tileSize,
        trailNeighbors[neighborIndex],
        trailNeighbors[neighborIndex + 1],
        trailNeighbors[neighborIndex + 2],
        trailAlpha
      );
    }
  }

  animationTilesContext.putImageData(animationTilePixels, 0, 0);
}

function blendAnimationRect(pixels, left, top, width, height, red, green, blue, alpha) {
  const right = Math.min(animationTilesCanvas.width, Math.ceil(left + width));
  const bottom = Math.min(animationTilesCanvas.height, Math.ceil(top + height));
  const startX = Math.max(0, Math.floor(left));
  const startY = Math.max(0, Math.floor(top));

  for (let y = startY; y < bottom; y += 1) {
    const coverageY = Math.max(0, Math.min(bottom, y + 1, top + height) - Math.max(y, top));
    for (let x = startX; x < right; x += 1) {
      const coverageX = Math.max(0, Math.min(right, x + 1, left + width) - Math.max(x, left));
      blendAnimationPixel(pixels, x, y, red, green, blue, alpha * coverageX * coverageY);
    }
  }
}

function compositeAnimatedTrace(state) {
  const cycleSeconds = cycleDuration / 1000;
  if (!animationTiles.length) {
    maskedEffectContext.clearRect(0, 0, maskedEffectCanvas.width, maskedEffectCanvas.height);
    return;
  }
  if (state.seconds < 0.0001 || state.seconds > cycleSeconds - 0.0001) {
    compositeTrace({ fine: 1, coarse: 0, erased: 0 });
    return;
  }

  renderAnimationTiles(state);
  effectContext.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
  effectContext.globalCompositeOperation = "source-over";
  effectContext.globalAlpha = 1;
  effectContext.imageSmoothingEnabled = true;
  effectContext.drawImage(reconstructionCanvas, 0, 0);
  effectContext.imageSmoothingEnabled = false;
  effectContext.drawImage(
    animationTilesCanvas,
    0,
    0,
    mosaicCanvas.width * fineMosaicBlockSize * effectCanvas.width / image.naturalWidth,
    mosaicCanvas.height * fineMosaicBlockSize * effectCanvas.height / image.naturalHeight
  );
  if (state.originalMix > 0) {
    effectContext.imageSmoothingEnabled = true;
    effectContext.globalAlpha = state.originalMix;
    effectContext.drawImage(image, 0, 0, effectCanvas.width, effectCanvas.height);
    effectContext.globalAlpha = 1;
  }
  if (state.mosaicMix > 0) {
    effectContext.imageSmoothingEnabled = false;
    effectContext.globalAlpha = state.mosaicMix;
    effectContext.drawImage(
      mosaicCanvas,
      0,
      0,
      mosaicCanvas.width * fineMosaicBlockSize * effectCanvas.width / image.naturalWidth,
      mosaicCanvas.height * fineMosaicBlockSize * effectCanvas.height / image.naturalHeight
    );
    effectContext.globalAlpha = 1;
  }
  effectContext.imageSmoothingEnabled = true;

  maskedEffectContext.clearRect(0, 0, maskedEffectCanvas.width, maskedEffectCanvas.height);
  maskedEffectContext.drawImage(effectCanvas, 0, 0);
  maskedEffectContext.globalCompositeOperation = "destination-in";
  maskedEffectContext.drawImage(maskCanvas, 0, 0, maskedEffectCanvas.width, maskedEffectCanvas.height);
  maskedEffectContext.globalCompositeOperation = "source-over";
}

function render(timestamp) {
  if (!imageReady || displayWidth === 0 || displayHeight === 0) return;

  const state = editing
    ? {
      fine: 1,
      coarse: 0,
      erased: 0,
      seconds: 0,
      fragmentation: 0,
      eraseProgress: 0,
      restoreProgress: 0,
      erasing: false,
      restoring: false
    }
    : animationWeights(timestamp);
  context.clearRect(0, 0, displayWidth, displayHeight);
  context.imageSmoothingEnabled = true;
  context.drawImage(image, 0, 0, displayWidth, displayHeight);
  if (!showOriginalOnEntry) {
    if (editing) {
      compositeTrace(state);
    } else {
      compositeAnimatedTrace(state);
    }
    context.drawImage(maskedEffectCanvas, 0, 0, displayWidth, displayHeight);
  }

  const cyclePosition = ((currentPhase(timestamp) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const atCycleEnd = !playing && phaseOffset > 0 && cyclePosition < 0.000001;
  const timelinePosition = editing ? 0 : (atCycleEnd ? cycleDuration : (cyclePosition / (Math.PI * 2)) * cycleDuration);
  const seconds = Math.floor(timelinePosition / 1000);
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsPart = String(seconds % 60).padStart(2, "0");
  timeReadout.textContent = `${minutesPart}:${secondsPart}`;
  scrubber.value = String(Math.round(timelinePosition));

  const cycleSeconds = cycleDuration / 1000;
  if (
    state.seconds < 0.05
    || state.seconds > cycleSeconds - 0.05
    || state.originalMix >= 0.98 && state.mosaicMix < 0.02
  ) {
    statusLabel.textContent = "CLEAR";
  } else if (state.eraseProgress > 0.5 || state.restoreProgress < 0.5 && state.seconds >= cycleSeconds / 2) {
    statusLabel.textContent = "RECONSTRUCTING";
  } else {
    statusLabel.textContent = "FADING";
  }
}

function currentPhase(timestamp = performance.now()) {
  if (!playing) return phaseOffset;
  return phaseOffset + ((timestamp - playbackStartedAt) / cycleDuration) * Math.PI * 2;
}

function animate(timestamp) {
  if (!playing) return;

  render(timestamp);
  frameRequest = requestAnimationFrame(animate);
}

function pausePlayback() {
  phaseOffset = currentPhase() % (Math.PI * 2);
  playing = false;
  cancelAnimationFrame(frameRequest);
  frameRequest = undefined;
  playButton.textContent = "Play";
  playButton.setAttribute("aria-pressed", "false");
  render();
}

function startPlayback() {
  playbackStartedAt = performance.now();
  playing = true;
  showOriginalOnEntry = false;
  playButton.textContent = "Pause";
  playButton.setAttribute("aria-pressed", "true");
  render(playbackStartedAt);
  frameRequest = requestAnimationFrame(animate);
}

window.memoryMosaicDebug = {
  showMaximumMosaic() {
    if (!imageReady) return;
    if (playing) pausePlayback();
    if (editing) {
      editing = false;
      showOriginalOnEntry = false;
      playButton.disabled = false;
      scrubber.disabled = false;
      editButton.hidden = false;
      editTools.hidden = true;
      canvas.classList.remove("editing");
      rebuildReconstruction();
      buildAnimationTiles();
    }
    phaseOffset = Math.PI / 2;
    render();
  },
  resumeAnimation() {
    if (!imageReady || playing) return;
    startPlayback();
  }
};

function beginEditing() {
  pausePlayback();
  phaseOffset = 0;
  editing = true;
  showOriginalOnEntry = false;
  playButton.disabled = true;
  scrubber.disabled = true;
  editButton.hidden = true;
  editTools.hidden = false;
  canvas.classList.add("editing");
  render();
}

function finishEditing() {
  drawingPointerId = null;
  lastBrushPoint = null;
  editing = false;
  playButton.disabled = false;
  scrubber.disabled = false;
  editButton.hidden = false;
  editTools.hidden = true;
  canvas.classList.remove("editing");
  rebuildReconstruction();
  buildAnimationTiles();
  phaseOffset = 0;
  startPlayback();
}

function imagePoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(image.naturalWidth, (event.clientX - bounds.left) * (image.naturalWidth / bounds.width))),
    y: Math.max(0, Math.min(image.naturalHeight, (event.clientY - bounds.top) * (image.naturalHeight / bounds.height)))
  };
}

function brushFootprint(centerX, centerY, angle, width, length, scale) {
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const bristle = width * 0.075;
  const edgeSteps = 5;
  const localPoints = [];

  for (let i = 0; i <= edgeSteps; i += 1) {
    const t = i / edgeSteps;
    const jitter = i === 0 || i === edgeSteps ? 0 : Math.sin((i + 1) * 12.9898 + centerX * 0.13 + centerY * 0.07) * bristle;
    localPoints.push({ x: -halfLength + length * t, y: -halfWidth + jitter });
  }
  for (let i = edgeSteps; i >= 0; i -= 1) {
    const t = i / edgeSteps;
    const jitter = i === 0 || i === edgeSteps ? 0 : Math.sin((i + 2) * 8.332 + centerX * 0.11 - centerY * 0.09) * bristle;
    localPoints.push({ x: -halfLength + length * t, y: halfWidth + jitter });
  }

  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return localPoints.map((point) => ({
    x: (centerX + point.x * cosine - point.y * sine) * scale,
    y: (centerY + point.x * sine + point.y * cosine) * scale
  }));
}

function paintBrushSegment(from, to) {
  const sizeCss = Number(brushSize.value);
  const size = sizeCss * (image.naturalWidth / displayWidth);
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const distance = Math.hypot(deltaX, deltaY);
  const angle = distance > 0 ? Math.atan2(deltaY, deltaX) : brushAngle;
  const length = Math.max(size * 0.7, distance + size * 0.42);
  const centerX = (from.x + to.x) / 2;
  const centerY = (from.y + to.y) / 2;
  const points = brushFootprint(centerX, centerY, angle, size, length, 1);

  maskContext.beginPath();
  maskContext.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => maskContext.lineTo(point.x, point.y));
  maskContext.closePath();
  maskContext.globalCompositeOperation = erasing ? "destination-out" : "source-over";
  maskContext.globalAlpha = 1;
  maskContext.fillStyle = "#fff";
  maskContext.fill();
  maskContext.globalAlpha = 1;
  maskContext.globalCompositeOperation = "source-over";
  brushAngle = angle;
}

function paintBrushTo(point) {
  const distance = Math.hypot(point.x - lastBrushPoint.x, point.y - lastBrushPoint.y);
  const size = Number(brushSize.value) * (image.naturalWidth / displayWidth);
  const spacing = Math.max(1, size * 0.28);
  const steps = Math.max(1, Math.ceil(distance / spacing));
  let previous = lastBrushPoint;

  for (let step = 1; step <= steps; step += 1) {
    const fraction = step / steps;
    const next = {
      x: lastBrushPoint.x + (point.x - lastBrushPoint.x) * fraction,
      y: lastBrushPoint.y + (point.y - lastBrushPoint.y) * fraction
    };
    paintBrushSegment(previous, next);
    previous = next;
  }

  lastBrushPoint = point;
}

function paintAt(event) {
  const point = imagePoint(event);
  if (!lastBrushPoint) lastBrushPoint = point;
  paintBrushTo(point);
  render();
}

playButton.addEventListener("click", () => {
  if (playing) {
    pausePlayback();
  } else {
    startPlayback();
  }
});

scrubber.addEventListener("input", () => {
  const requestedPosition = Number(scrubber.value);
  if (playing) pausePlayback();
  showOriginalOnEntry = false;
  phaseOffset = (requestedPosition / cycleDuration) * Math.PI * 2;
  render();
});

editButton.addEventListener("click", beginEditing);
doneButton.addEventListener("click", finishEditing);

eraseButton.addEventListener("click", () => {
  erasing = !erasing;
  eraseButton.setAttribute("aria-pressed", String(erasing));
  eraseButton.textContent = erasing ? "Erase Brush: On" : "Erase Brush";
});

brushSize.addEventListener("input", render);

canvas.addEventListener("pointerdown", (event) => {
  if (!editing || !imageReady) return;
  event.preventDefault();
  drawingPointerId = event.pointerId;
  canvas.setPointerCapture(event.pointerId);
  const point = imagePoint(event);
  lastBrushPoint = point;
  paintBrushSegment(point, point);
  render();
});

canvas.addEventListener("pointermove", (event) => {
  if (!editing) return;
  if (drawingPointerId === event.pointerId && lastBrushPoint) {
    event.preventDefault();
    paintAt(event);
  }
});

function endPainting(event) {
  if (drawingPointerId !== event.pointerId) return;
  drawingPointerId = null;
  lastBrushPoint = null;
  render();
}

canvas.addEventListener("pointerup", endPainting);
canvas.addEventListener("pointercancel", endPainting);

clearMaskButton.addEventListener("click", () => {
  maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  rebuildReconstruction();
  buildAnimationTiles();
  render();
});

window.addEventListener("resize", resizeCanvas);

backToIndex.addEventListener("click", returnToIndex);
indexEntries.addEventListener("wheel", handleIndexWheel, { passive: false });

uploadButton.addEventListener("click", () => {
  uploadStatus.hidden = true;
  uploadStatus.textContent = "";
  uploadInput.click();
});

uploadInput.addEventListener("change", () => {
  const file = uploadInput.files[0];
  uploadInput.value = "";
  if (!file) return;

  uploadStatus.hidden = true;
  uploadStatus.textContent = "";
  if (!supportedUploadTypes.has(file.type.toLowerCase())) {
    uploadStatus.textContent = "Choose a JPEG, PNG, or WebP image.";
    uploadStatus.hidden = false;
    return;
  }

  let objectUrl;
  try {
    objectUrl = URL.createObjectURL(file);
  } catch (error) {
    console.error("Unable to create a temporary URL for the selected image.", error);
    uploadStatus.textContent = "This image could not be opened. Choose another JPEG, PNG, or WebP image.";
    uploadStatus.hidden = false;
    return;
  }

  revokeActiveTemporaryUrl();
  activeTemporaryUrl = objectUrl;
  uploadStatus.hidden = true;
  uploadStatus.textContent = "";
  enterTrace({
    id: `temporary-${++temporaryEntrySequence}`,
    title: "YOUR TRACE",
    location: "",
    imagePath: objectUrl,
    isTemporary: true
  });
});

window.addEventListener("pagehide", revokeActiveTemporaryUrl);

if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(resizeCanvas).observe(frame);
  new ResizeObserver(updateIndexDirectoryLoopLayout).observe(indexEntries);
} else {
  window.addEventListener("resize", updateIndexDirectoryLoopLayout);
}
