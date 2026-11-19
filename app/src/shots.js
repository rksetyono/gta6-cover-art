// Fixed scenes for screenshots, driven by `?shot=`:
//   ?shot=editor&photo=pier&title=...&layout=hero3&grade=sunset
//       the full editor with a sample photo loaded, ready for a viewport screenshot.
//   ?shot=cover&photo=pier&title=...&layout=...&grade=...&size=wide
//       the cover alone at its export size; window.__coverShot holds the exported
//       PNG scaled down to a JPEG that fits the screenshot limits, and
//       window.__exportPng holds the full exported PNG data URL.
// window.__shotReady is set once the scene is painted.
import { SIZES, LAYOUTS, blankPanel, renderCover } from './cover.js';

/** Scales a canvas down to a JPEG data URL within `maxSide` on its long side
 *  and 250000 bytes, lowering quality and size until it fits. */
function scaledJpeg(canvas, maxSide) {
  for (let side = maxSide; side >= 640; side = Math.round(side * 0.8)) {
    const scale = Math.min(1, side / Math.max(canvas.width, canvas.height));
    const out = document.createElement('canvas');
    out.width = Math.round(canvas.width * scale);
    out.height = Math.round(canvas.height * scale);
    const ctx = out.getContext('2d');
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    for (const quality of [0.88, 0.78, 0.68, 0.58]) {
      const url = out.toDataURL('image/jpeg', quality);
      if (url.length * 0.75 < 250000) return url;
    }
  }
  return canvas.toDataURL('image/jpeg', 0.5);
}

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export async function runShot(shot, query, load, hooks) {
  const state = hooks.getState();
  const title = query.get('title') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'Neon Bay Nights';
  const layout = query.get('layout') ?? 'hero3';
  const grade = query.get('grade') ?? 'sunset';
  const sizeId = query.get('size') ?? 'square';
  const photoName = query.get('photo') ?? 'pier';
  const otherName = photoName === 'pier' ? 'boulevard' : 'pier';

  state.title = title;
  state.subtitle = subtitle;
  state.layout = layout;
  state.grade = grade;
  state.size = sizeId;
  const layoutDef = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0];
  state.panels = Array.from({ length: layoutDef.panels }, (_, i) => blankPanel(i % 2));
  // Per-panel framing for the shot: `zoom` and `oy` are comma lists, one per panel.
  const zooms = query.get('zoom') ? query.get('zoom').split(',').map(Number) : [];
  const oys = query.get('oy') ? query.get('oy').split(',').map(Number) : [];
  state.panels.forEach((p, i) => {
    if (zooms[i] !== undefined) p.zoom = zooms[i];
    if (oys[i] !== undefined) p.oy = oys[i];
  });

  const [first, second] = await Promise.all([
    load(`samples/${photoName}.jpg`),
    load(`samples/${otherName}.jpg`),
  ]);
  state.photos[0] = first;
  state.photos[1] = second;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    // Render the real export at full size, then scale that PNG down for the shot.
    const exported = renderCover(state, sizeId);
    window.__exportPng = exported.toDataURL('image/png');
    window.__coverShot = scaledJpeg(exported, 1280);
    const canvas = document.getElementById('cover');
    canvas.width = exported.width;
    canvas.height = exported.height;
    canvas.getContext('2d').drawImage(exported, 0, 0);
    hooks.syncControls();
    ready();
    return;
  }

  // Editor scene: the preview canvas at its usual capped size, controls visible.
  hooks.syncControls();
  hooks.redraw();
  ready();
}
