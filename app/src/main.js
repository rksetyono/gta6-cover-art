// Neon Bay Cover Studio — wires the editor page.
// Three photo slots, six poster layouts, five colour grades, a title and subtitle,
// drag-to-crop on the preview, undo/redo, and PNG export in the three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { SIZES, LAYOUTS, GRADES, blankPanel, layoutGeometry, drawCover, renderCover, defaultState } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const PREVIEW_MAX = 860;

let state = defaultState();
let selectedPanel = 0;
let undoStack = [];
let redoStack = [];
let drag = null;

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

/** A JSON snapshot of the parts of state undo/redo restores (photos stay live). */
function snapshot() {
  return JSON.stringify({
    size: state.size, layout: state.layout, grade: state.grade,
    title: state.title, subtitle: state.subtitle, stars: state.stars,
    grain: state.grain, vignette: state.vignette,
    panels: state.panels,
  });
}

function pushHistory(before) {
  undoStack.push(before ?? snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function restore(json) {
  const saved = JSON.parse(json);
  const photos = state.photos;
  state = { ...defaultState(), ...saved, photos };
  syncControls();
  redraw();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

/** Redraws the preview at a capped resolution that keeps the export aspect. */
function redraw() {
  const size = SIZES[state.size];
  const scale = Math.min(1, PREVIEW_MAX / Math.max(size.w, size.h));
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  drawCover(canvas, state);
  updatePanelHint();
}

function updatePanelHint() {
  const layout = LAYOUTS.find((l) => l.id === state.layout);
  const panel = state.panels[selectedPanel];
  const hint = document.getElementById('panel-hint');
  const slot = panel ? panel.photo : 0;
  hint.textContent = `Panel ${selectedPanel + 1} of ${layout.panels} · photo ${'ABC'[slot]} · drag the cover to reposition, or use zoom below`;
  const zoom = document.getElementById('zoom');
  if (panel) zoom.value = String(panel.zoom);
  const zoomOut = document.getElementById('zoom-value');
  if (zoomOut) zoomOut.textContent = `${Math.round((panel?.zoom ?? 1) * 100)}%`;
}

/** Rebuilds the layout and grade picker buttons from the engine's tables. */
function buildPickers() {
  const layoutBox = document.getElementById('layouts');
  layoutBox.textContent = '';
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = layout.name;
    b.dataset.layout = layout.id;
    b.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      pushHistory();
      state.layout = layout.id;
      state.panels = Array.from({ length: layout.panels }, (_, i) => state.panels[i] ?? blankPanel(i % 2));
      selectedPanel = 0;
      syncControls();
      redraw();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = document.getElementById('grades');
  gradeBox.textContent = '';
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick grade';
    b.dataset.grade = grade.id;
    b.style.background = `linear-gradient(135deg, ${grade.sky[0]}, ${grade.sky[1]} 55%, ${grade.sky[2]})`;
    b.textContent = grade.name;
    b.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      pushHistory();
      state.grade = grade.id;
      syncControls();
      redraw();
    });
    gradeBox.appendChild(b);
  }
  const sizeBox = document.getElementById('sizes');
  sizeBox.textContent = '';
  for (const [id, size] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.size = id;
    b.textContent = size.label;
    b.addEventListener('click', () => {
      if (state.size === id) return;
      pushHistory();
      state.size = id;
      syncControls();
      redraw();
    });
    sizeBox.appendChild(b);
  }
}

/** Marks the active button in each picker group. */
function syncControls() {
  document.querySelectorAll('#layouts .pick').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .pick').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes .pick').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  document.getElementById('grain').checked = state.grain !== false;
  document.getElementById('vignette').checked = state.vignette !== false;
  document.querySelectorAll('.slot').forEach((slot, i) => {
    slot.classList.toggle('filled', Boolean(state.photos[i]));
    slot.querySelector('.slot-name').textContent = state.photos[i] ? `Photo ${'ABC'[i]} · loaded` : `Photo ${'ABC'[i]} · empty`;
  });
}

/** Loads a sample photo into a slot (the kit's free-to-use samples). */
async function loadSample(slot, name) {
  try {
    state.photos[slot] = await loadImage(`samples/${name}.jpg`);
    pushHistory();
    syncControls();
    redraw();
    status.textContent = `Sample ${name} loaded into photo ${'ABC'[slot]}.`;
  } catch {
    status.textContent = `Could not load sample ${name}.`;
  }
}

/** Downloads a canvas as a PNG file. */
function downloadCanvas(exportCanvas, filename) {
  return new Promise((resolve) => {
    exportCanvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

/** Exports the current state at one size; returns the PNG blob. */
async function exportSize(sizeId) {
  const size = SIZES[sizeId];
  const out = renderCover(state, sizeId);
  const blob = await downloadCanvas(out, `neon-bay-cover-${size.w}x${size.h}.png`);
  status.textContent = `Saved neon-bay-cover-${size.w}x${size.h}.png (${size.w} × ${size.h}).`;
  return blob;
}

/** For screenshots: the exported PNG of a size as a data URL. */
export async function exportDataUrl(sizeId) {
  const out = renderCover(state, sizeId);
  return out.toDataURL('image/png');
}

window.__neonBay = { exportDataUrl, getState: () => state, redraw };

function wirePhotoSlots() {
  document.querySelectorAll('.slot').forEach((slot, i) => {
    const file = slot.querySelector('input[type=file]');
    file.addEventListener('change', async () => {
      const chosen = file.files[0];
      if (!chosen) return;
      try {
        state.photos[i] = await loadImage(URL.createObjectURL(chosen));
        pushHistory();
        syncControls();
        redraw();
        status.textContent = `Photo ${'ABC'[i]} loaded from ${chosen.name}.`;
      } catch {
        status.textContent = `Could not read ${chosen.name} as an image.`;
      }
    });
    slot.querySelectorAll('[data-sample]').forEach((b) => {
      b.addEventListener('click', () => loadSample(i, b.dataset.sample));
    });
    slot.querySelector('[data-fill-all]').addEventListener('click', () => {
      if (!state.photos[i]) { status.textContent = `Load photo ${'ABC'[i]} first.`; return; }
      pushHistory();
      state.panels.forEach((p) => { p.photo = i; });
      redraw();
      status.textContent = `All panels now use photo ${'ABC'[i]}.`;
    });
  });
}

/** Which panel (if any) sits under a point on the preview canvas. */
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const px = ((clientX - r.left) / r.width) * canvas.width;
  const py = ((clientY - r.top) / r.height) * canvas.height;
  const { panels } = layoutGeometry(state.layout, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

function wireCanvasDrag() {
  canvas.addEventListener('pointerdown', (e) => {
    const hit = panelAt(e.clientX, e.clientY);
    if (hit < 0) return;
    selectedPanel = hit;
    const panel = state.panels[hit];
    drag = { x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy, moved: false, before: snapshot() };
    canvas.setPointerCapture(e.pointerId);
    updatePanelHint();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const panel = state.panels[selectedPanel];
    const { panels } = layoutGeometry(state.layout, canvas.width, canvas.height);
    const rect = panels[selectedPanel];
    panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (e.clientX - drag.x) / r.width * (canvas.width / rect.w)));
    panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (e.clientY - drag.y) / r.height * (canvas.height / rect.h)));
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag?.moved) pushHistory(drag.before);
    drag = null;
  });
}

function wireControls() {
  // Text and zoom edits mutate live on every keystroke, so the pre-edit snapshot
  // is taken on focus / first input and pushed only when the edit commits.
  let textBefore = null;
  let zoomBefore = null;
  titleInput.addEventListener('focus', () => { textBefore = snapshot(); });
  subtitleInput.addEventListener('focus', () => { textBefore = snapshot(); });
  titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
  titleInput.addEventListener('change', () => { if (textBefore) pushHistory(textBefore); textBefore = null; });
  subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
  subtitleInput.addEventListener('change', () => { if (textBefore) pushHistory(textBefore); textBefore = null; });
  document.getElementById('zoom').addEventListener('input', (e) => {
    if (!zoomBefore) zoomBefore = snapshot();
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('zoom').addEventListener('change', () => { if (zoomBefore) pushHistory(zoomBefore); zoomBefore = null; });
  document.getElementById('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
  document.getElementById('vignette').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; redraw(); });
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  document.getElementById('export').addEventListener('click', () => exportSize(state.size));
  document.getElementById('export-all').addEventListener('click', async () => {
    status.textContent = 'Exporting all three sizes…';
    for (const id of Object.keys(SIZES)) await exportSize(id);
    status.textContent = 'Saved all three sizes: 1080 × 1080, 1080 × 1350, 1920 × 1080.';
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

buildPickers();
wirePhotoSlots();
wireCanvasDrag();
wireControls();
syncControls();
syncUndoButtons();

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShot(query.get('shot'), query, loadImage, { getState: () => state, setState: (s) => { state = s; }, redraw, syncControls });
} else {
  // Start with both free samples already loaded, so the first cover is one click away.
  Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')]).then(([pier, boulevard]) => {
    state.photos[0] = pier;
    state.photos[1] = boulevard;
    syncControls();
    redraw();
  }).catch(() => redraw());
  redraw();
}
