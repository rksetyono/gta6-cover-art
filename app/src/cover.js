// Neon Bay Cover Studio — the cover engine.
// Draws a multi-panel, GTA-poster-style cover on any 2D canvas: panel photos with
// per-panel crop, a Vice City sunset / neon colour grade, original vector art
// (a slatted sun, palm silhouettes, halftone dots), and a bold gradient title block.
// Everything is drawn from scratch with the canvas API; no image or font is loaded.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080 · Square' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350 · Portrait' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080 · Wide' },
};

export const LAYOUTS = [
  { id: 'hero3', name: 'Hero + 3', panels: 4 },
  { id: 'grid4', name: 'Four Panel', panels: 4 },
  { id: 'triptych', name: 'Triptych', panels: 3 },
  { id: 'snapshots', name: 'Snapshots', panels: 3 },
  { id: 'fullbleed', name: 'Full Bleed', panels: 1 },
  { id: 'mosaic9', name: 'Mosaic 9', panels: 9 },
];

export const GRADES = [
  {
    id: 'sunset', name: 'Vice Sunset',
    sky: ['#ff9a3d', '#ff5e7a', '#b83280'], wash: 'rgba(255, 110, 60, 0.28)',
    overlay: 'rgba(255, 90, 140, 0.16)', deep: '#2b1038',
  },
  {
    id: 'neon', name: 'Neon Night',
    sky: ['#22e6ff', '#7a5cff', '#ff2e88'], wash: 'rgba(40, 120, 255, 0.30)',
    overlay: 'rgba(255, 46, 136, 0.18)', deep: '#0d0a2e',
  },
  {
    id: 'gold', name: 'Palm Gold',
    sky: ['#ffd76a', '#ff9e2c', '#c96a1e'], wash: 'rgba(255, 190, 60, 0.26)',
    overlay: 'rgba(255, 170, 40, 0.14)', deep: '#241708',
  },
  {
    id: 'noir', name: 'Mono Noir',
    sky: ['#e8e8e8', '#9a9a9a', '#3a3a3a'], wash: 'rgba(20, 20, 20, 0.30)',
    overlay: 'rgba(255, 255, 255, 0.08)', deep: '#101010',
  },
  {
    id: 'teal', name: 'Teal Heat',
    sky: ['#2affd5', '#12a5b4', '#ff7a3d'], wash: 'rgba(20, 200, 180, 0.26)',
    overlay: 'rgba(255, 122, 61, 0.16)', deep: '#062a2e',
  },
];

/** A blank panel transform: photo index, zoom and pan offsets (-0.5 .. 0.5). */
export function blankPanel(photoIndex) {
  return { photo: photoIndex, zoom: 1, ox: 0, oy: 0 };
}

/** Panels for a layout: rects in canvas pixels plus the title band rect. */
export function layoutGeometry(layoutId, w, h) {
  const g = Math.round(Math.min(w, h) * 0.014); // gutter
  const bandH = Math.round(h * 0.22);
  const contentH = h - bandH;
  const inset = (x, y, pw, ph) => ({ x, y, w: pw, h: ph, rot: 0 });
  let panels = [];
  if (layoutId === 'hero3') {
    const heroW = Math.round(w * 0.6) - g;
    const sideX = heroW + g * 2;
    const sideW = w - sideX;
    const rowH = Math.round((contentH - g * 2) / 3);
    panels = [
      inset(0, 0, heroW, contentH),
      inset(sideX, 0, sideW, rowH),
      inset(sideX, rowH + g, sideW, rowH),
      inset(sideX, (rowH + g) * 2, sideW, contentH - (rowH + g) * 2),
    ];
  } else if (layoutId === 'grid4') {
    const cw = Math.round((w - g) / 2);
    const ch = Math.round((contentH - g) / 2);
    panels = [
      inset(0, 0, cw, ch), inset(cw + g, 0, w - cw - g, ch),
      inset(0, ch + g, cw, contentH - ch - g), inset(cw + g, ch + g, w - cw - g, contentH - ch - g),
    ];
  } else if (layoutId === 'triptych') {
    const cw = Math.round((w - g * 2) / 3);
    panels = [
      inset(0, 0, cw, contentH),
      inset(cw + g, 0, cw, contentH),
      inset((cw + g) * 2, 0, w - (cw + g) * 2, contentH),
    ];
  } else if (layoutId === 'snapshots') {
    const pw = Math.round(w * 0.44);
    const ph = Math.round(contentH * 0.62);
    panels = [
      { x: Math.round(w * 0.05), y: Math.round(contentH * 0.06), w: pw, h: ph, rot: -0.1 },
      { x: Math.round(w * 0.5) - Math.round(pw / 2), y: Math.round(contentH * 0.2), w: pw, h: ph, rot: 0.03 },
      { x: Math.round(w * 0.95) - pw, y: Math.round(contentH * 0.1), w: pw, h: ph, rot: 0.09 },
    ];
  } else if (layoutId === 'fullbleed') {
    panels = [inset(0, 0, w, h)];
  } else { // mosaic9
    const cw = Math.round((w - g * 2) / 3);
    const ch = Math.round((contentH - g * 2) / 3);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        panels.push(inset(c * (cw + g), r * (ch + g), c === 2 ? w - c * (cw + g) : cw, r === 2 ? contentH - r * (ch + g) : ch));
      }
    }
  }
  return { panels, band: { x: 0, y: contentH, w, h: bandH }, gutter: g };
}

/** Seeded random (mulberry32) so the grain is identical on every export. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tileable grain pattern canvas, built once per session. */
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const s = 160;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  const rnd = seededRandom(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** Draws one photo into a rect, cover-fit, with the panel's zoom and pan. */
function drawPhotoInto(ctx, photo, rect, panel) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const scale = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const pw = iw * scale;
  const ph = ih * scale;
  const dx = rect.x + (rect.w - pw) / 2 + panel.ox * rect.w;
  const dy = rect.y + (rect.h - ph) / 2 + panel.oy * rect.h;
  ctx.drawImage(photo, dx, dy, pw, ph);
}

/** The colour grade: a warm wash, a coloured overlay and a dark foot for the panel. */
function applyGrade(ctx, rect, grade, strength) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(255, 255, 255, 0)');
  wash.addColorStop(1, grade.wash);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.55 * strength;
  ctx.fillStyle = grade.overlay;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const foot = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.55, rect.x, rect.y + rect.h);
  foot.addColorStop(0, 'rgba(0, 0, 0, 0)');
  foot.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = foot;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** A retro slatted sun: gradient disc cut by widening horizontal gaps. */
function drawSun(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, grade.sky[0]);
  grad.addColorStop(0.55, grade.sky[1]);
  grad.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = grade.deep;
  let y = cy + r * 0.05;
  let gap = Math.max(2, r * 0.03);
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap + r * 0.16;
    gap *= 1.55;
  }
  ctx.restore();
}

/** A palm silhouette: a leaning trunk and six drooping fronds, all original paths. */
function drawPalm(ctx, x, y, s, lean, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.055);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.55, s * 0.16, -s * 0.92);
  ctx.stroke();
  const topX = s * 0.16;
  const topY = -s * 0.92;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.08 + i * 0.17);
    const len = s * (0.46 - Math.abs(i - 2.5) * 0.04);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + s * 0.12;
    ctx.lineWidth = Math.max(1.5, s * 0.028);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.5, topY + Math.sin(a) * len * 0.4 - s * 0.1, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Rows of dots that fade upward, the halftone edge of the title block. */
function drawHalftone(ctx, x, y, w, h, colour) {
  const step = Math.max(8, Math.round(w / 90));
  ctx.fillStyle = colour;
  for (let row = 0; row * step < h; row++) {
    const r = Math.max(0.6, (step * 0.32) * (1 - row * step / h));
    for (let col = 0; col * step < w; col++) {
      const cx = x + col * step + (row % 2 ? step / 2 : 0);
      ctx.beginPath();
      ctx.arc(cx, y + row * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A five-star heat meter; rating may be a half value (0..5). */
function drawStars(ctx, x, y, size, rating, colour, emptyColour) {
  const star = (cx, cy, s, fill) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? s : s * 0.45;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  for (let i = 0; i < 5; i++) {
    const cx = x + i * size * 1.25 + size / 2;
    star(cx, y + size / 2, size / 2, emptyColour);
    const fill = Math.max(0, Math.min(1, rating - i));
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + i * size * 1.25, y, size * 1.25 * fill, size);
      ctx.clip();
      star(cx, y + size / 2, size / 2, colour);
      ctx.restore();
    }
  }
}

/** One panel: white frame, photo (or a sunset placeholder), grade, decorations. */
function drawPanel(ctx, rect, photo, panel, grade, index, layoutId) {
  ctx.save();
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.rot);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    rect = { x: 0, y: 0, w: rect.w, h: rect.h };
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  // Sky behind the photo: visible as a letterbox when the panel is zoomed out.
  const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.6, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (photo) {
    drawPhotoInto(ctx, photo, rect, panel);
  } else {
    const sky = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    sky.addColorStop(0, grade.sky[0]);
    sky.addColorStop(0.6, grade.sky[1]);
    sky.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    drawSun(ctx, rect.x + rect.w * 0.5, rect.y + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.3, grade);
    drawPalm(ctx, rect.x + rect.w * 0.12, rect.y + rect.h * 0.98, Math.min(rect.w, rect.h) * 0.5, -0.12, 'rgba(20, 8, 30, 0.85)');
    drawPalm(ctx, rect.x + rect.w * 0.88, rect.y + rect.h * 0.98, Math.min(rect.w, rect.h) * 0.42, 0.14, 'rgba(20, 8, 30, 0.8)');
  }
  applyGrade(ctx, rect, grade, 1);
  // A thin inner light on the top edge, so panels read as separate poster cards.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = Math.max(1, rect.w * 0.004);
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.restore();
  // The white poster frame, drawn in the panel's own rotated frame.
  ctx.save();
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.rot);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    rect = { x: 0, y: 0, w: rect.w, h: rect.h };
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, Math.min(rect.w, rect.h) * 0.018);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Splits a title into at most two lines that fit `maxWidth` at `font`. */
function wrapTitle(ctx, text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else { lines.push(line); line = word; }
    if (lines.length === 1 && line && ctx.measureText(line).width > maxWidth) {
      lines.push(line);
      line = '';
      break;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** The title block: dark band, halftone edge, gradient display title, neon subtitle. */
function drawTitleBlock(ctx, band, state, grade) {
  const { w, h } = band;
  const pad = Math.round(w * 0.035);
  // The band: deep colour fading up into the panels. Its top row holds the heat
  // meter (left) and the badge ribbon (right); a halftone strip sits below them
  // and the title + subtitle fill the lower two thirds, so nothing collides.
  const bandGrad = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
  bandGrad.addColorStop(0, grade.deep);
  bandGrad.addColorStop(1, '#12081c');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  drawHalftone(ctx, band.x + pad, band.y + Math.round(band.h * 0.22), band.w - pad * 2, Math.round(band.h * 0.09), 'rgba(255, 255, 255, 0.22)');

  const title = (state.title || 'SUNSET HEIST').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const cx = band.x + band.w / 2;
  const textW = band.w - pad * 2;
  const family = `'Arial Black', 'Liberation Sans', 'DejaVu Sans', sans-serif`;
  // Size the title so title + subtitle both fit the band's lower two thirds,
  // even on two lines: total height is cap height + lines + subtitle.
  let size = Math.round(band.h * (sub ? 0.28 : 0.36));
  let lines = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const font = `900 ${size}px ${family}`;
    lines = wrapTitle(ctx, title, textW, font);
    if (lines.length <= 2 && !(lines.length === 2 && sub && attempt === 0)) break;
    size = Math.round(size * 0.78);
  }
  const lineH = size * 0.98;
  const subSize = Math.round(size * 0.34);
  const totalH = Math.round(size * 0.72 + lines.length * lineH + (sub ? subSize * 0.65 : 0));
  const contentTop = band.y + band.h * 0.34;
  const contentH = band.h * 0.66;
  let y = contentTop + (contentH - totalH) / 2 + size * 0.72;

  ctx.save();
  ctx.translate(cx, 0);
  ctx.rotate(-0.012);
  ctx.translate(-cx, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const line of lines) {
    // Condensed display lettering: squeeze the text horizontally, then fill it
    // with a sunset gradient, a dark outline and a soft drop shadow.
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(0.86, 1);
    ctx.translate(-cx, -y);
    const fill = ctx.createLinearGradient(0, y - size, 0, y + size * 0.12);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.45, grade.sky[0]);
    fill.addColorStop(1, grade.sky[1]);
    ctx.font = `900 ${size}px ${family}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.14);
    ctx.strokeStyle = 'rgba(16, 6, 26, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(line, cx, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = fill;
    ctx.fillText(line, cx, y);
    ctx.restore();
    y += lineH;
  }
  ctx.restore();

  if (sub) {
    ctx.font = `italic 700 ${subSize}px 'Liberation Sans', 'DejaVu Sans', sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = grade.sky[1];
    ctx.shadowBlur = subSize * 0.7;
    ctx.fillText(sub.toUpperCase(), cx, y + subSize * 0.35);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }

  // Badge ribbon: a tilted pill in the band's top-right corner, beside the stars.
  const badge = 'NEON BAY';
  const badgeSize = Math.round(band.h * 0.11);
  ctx.save();
  ctx.font = `900 ${badgeSize}px ${family}`;
  const bw = ctx.measureText(badge).width + badgeSize * 1.6;
  const bh = badgeSize * 1.9;
  ctx.translate(band.x + band.w - bw / 2 - pad * 0.7, band.y + band.h * 0.1 + bh / 2);
  ctx.rotate(0.06);
  ctx.fillStyle = grade.sky[1];
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, 0, badgeSize * 0.06);
  ctx.restore();

  // The heat meter: five stars in the band's top-left corner.
  const starSize = Math.round(band.h * 0.11);
  drawStars(ctx, band.x + pad, band.y + band.h * 0.04, starSize, state.stars ?? 4.5, '#ffd76a', 'rgba(255, 255, 255, 0.28)');
}

/** Draws the whole cover onto `canvas` from a state object. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES.find((g) => g.id === state.grade) ?? GRADES[0];
  const { panels, band, gutter } = layoutGeometry(state.layout, w, h);

  // Poster paper: deep colour behind the gutters.
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, w, h);

  if (state.layout === 'snapshots') {
    // A sunset backdrop with a slatted sun and palms behind the tilted photos.
    const sky = ctx.createLinearGradient(0, 0, 0, band.y);
    sky.addColorStop(0, grade.sky[0]);
    sky.addColorStop(0.55, grade.sky[1]);
    sky.addColorStop(1, grade.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, band.y);
    drawSun(ctx, w * 0.5, band.y * 0.42, Math.min(w, band.y) * 0.3, grade);
  }

  panels.forEach((rect, i) => {
    const panel = state.panels[i] ?? blankPanel(i % 3);
    const photo = state.photos[panel.photo] ?? null;
    drawPanel(ctx, rect, photo, panel, grade, i, state.layout);
  });

  if (state.layout !== 'fullbleed') {
    drawTitleBlock(ctx, band, state, grade);
  } else {
    // Full bleed: the title floats on a gradient scrim over the photo.
    const scrim = ctx.createLinearGradient(0, band.y - band.h * 0.6, 0, h);
    scrim.addColorStop(0, 'rgba(10, 4, 18, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 18, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, band.y - band.h * 0.6, w, h - (band.y - band.h * 0.6));
    drawTitleBlock(ctx, band, state, grade);
  }

  // Outer poster frame.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, gutter * 0.9);
  ctx.strokeRect(gutter / 2, gutter / 2, w - gutter, h - gutter);

  if (state.vignette !== false) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain !== false) {
    const tile = getGrainTile();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

/** Renders a state into a fresh canvas at one of the export sizes. */
export function renderCover(state, sizeId) {
  const size = SIZES[sizeId] ?? SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  return canvas;
}

/** The default state: hero layout, sunset grade, two sample photos loaded. */
export function defaultState() {
  const panels = LAYOUTS.find((l) => l.id === 'hero3').panels;
  return {
    size: 'square',
    layout: 'hero3',
    grade: 'sunset',
    title: 'Sunset Heist',
    subtitle: 'Neon Bay Nights',
    stars: 4.5,
    grain: true,
    vignette: true,
    photos: [null, null, null],
    panels: Array.from({ length: panels }, (_, i) => blankPanel(i % 2)),
  };
}
