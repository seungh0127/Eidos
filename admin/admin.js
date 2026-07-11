// ── Shared keys with the main site (scripts/main.js reads these too) ──────────
const COLOR_KEYS = {
  brightness:  'eidos_mod_brightness',
  contrast:    'eidos_mod_contrast',
  saturate:    'eidos_mod_saturate',
  curveMaster: 'eidos_mod_curve_master',
  curveR:      'eidos_mod_curve_r',
  curveG:      'eidos_mod_curve_g',
  curveB:      'eidos_mod_curve_b',
  shadows:     'eidos_mod_shadows',
  highlights:  'eidos_mod_highlights',
};
const DEFAULTS = { brightness: 100, contrast: 100, saturate: 100, shadows: 0, highlights: 0 };
const PREVIEW_FILTER_ID = 'eidos-admin-preview-filter';

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function readStoredNumber(key, fallback) {
  const v = localStorage.getItem(COLOR_KEYS[key]);
  return v === null ? fallback : Number(v);
}

// ── Preview content: a handful of real gallery thumbs + one hover video ───────
const PREVIEW_THUMBS = ['H-A-1', 'H-B-2', 'C-D-2', 'C-A-1', 'S-A-1', 'W-A-2', 'F-D-1', 'E-A-1'];

const grid = document.getElementById('preview-grid');
for (const file of PREVIEW_THUMBS) {
  const cell = document.createElement('div');
  cell.className = 'preview-cell';
  const img = document.createElement('img');
  img.src = `../assets/thumbs/${file}.webp`;
  img.alt = file;
  cell.appendChild(img);
  grid.appendChild(cell);
}
(() => {
  const cell = document.createElement('div');
  cell.className = 'preview-cell';
  const video = document.createElement('video');
  video.src = '../assets/H-A-1.mp4';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  cell.appendChild(video);
  grid.appendChild(cell);
})();

// ── Curve editors (declared before anything that calls updateCurveFilter) ─────
function createCurveEditor(canvas, initialPoints, onChange) {
  const size = canvas.width; // logical == pixel (square canvas)
  let points = initialPoints.map(p => p.slice());
  let dragIndex = -1;
  const POINT_R = 5, HIT_R = 11;

  function toCanvasXY(x, y) { return [(x / 255) * size, size - (y / 255) * size]; }
  function toDataXY(cx, cy) {
    return [clamp(Math.round((cx / size) * 255), 0, 255), clamp(Math.round(((size - cy) / size) * 255), 0, 255)];
  }

  function draw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const p = (size * i) / 4;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }
    ctx.strokeStyle = '#ddd'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, size); ctx.lineTo(size, 0); ctx.stroke();
    ctx.setLineDash([]);

    const lut = ColorCurve.buildLUT(points);
    ctx.strokeStyle = '#187CFF'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 255; x++) {
      const [cx, cy] = toCanvasXY(x, lut[x]);
      if (x === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    for (const [x, y] of points) {
      const [cx, cy] = toCanvasXY(x, y);
      ctx.beginPath();
      ctx.arc(cx, cy, POINT_R, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#187CFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function findPointNear(cx, cy) {
    for (let i = 0; i < points.length; i++) {
      const [px, py] = toCanvasXY(points[i][0], points[i][1]);
      if (Math.hypot(px - cx, py - cy) <= HIT_R) return i;
    }
    return -1;
  }

  function getEventXY(e) {
    const rect = canvas.getBoundingClientRect();
    return [(e.clientX - rect.left) * (size / rect.width), (e.clientY - rect.top) * (size / rect.height)];
  }

  canvas.addEventListener('pointerdown', e => {
    const [cx, cy] = getEventXY(e);
    const idx = findPointNear(cx, cy);
    if (idx >= 0) {
      dragIndex = idx;
    } else {
      const [x, y] = toDataXY(cx, cy);
      points.push([x, y]);
      points.sort((a, b) => a[0] - b[0]);
      dragIndex = points.findIndex(p => p[0] === x && p[1] === y);
      draw();
      onChange(points);
    }
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (dragIndex < 0) return;
    const [cx, cy] = getEventXY(e);
    let [x, y] = toDataXY(cx, cy);
    const isEndpoint = dragIndex === 0 || dragIndex === points.length - 1;
    if (isEndpoint) {
      x = points[dragIndex][0];
    } else {
      const minX = points[dragIndex - 1][0] + 1;
      const maxX = points[dragIndex + 1][0] - 1;
      x = clamp(x, minX, maxX);
    }
    points[dragIndex] = [x, y];
    draw();
    onChange(points);
  });

  canvas.addEventListener('pointerup', () => { dragIndex = -1; });

  canvas.addEventListener('dblclick', e => {
    const [cx, cy] = getEventXY(e);
    const idx = findPointNear(cx, cy);
    if (idx > 0 && idx < points.length - 1) {
      points.splice(idx, 1);
      draw();
      onChange(points);
    }
  });

  draw();
  return {
    getPoints: () => points.map(p => p.slice()),
    setPoints: pts => { points = pts.map(p => p.slice()); draw(); },
  };
}

function loadCurvePoints(key) {
  try {
    const p = JSON.parse(localStorage.getItem(COLOR_KEYS[key]));
    return Array.isArray(p) && p.length >= 2 ? p : ColorCurve.IDENTITY_POINTS.map(pt => pt.slice());
  } catch {
    return ColorCurve.IDENTITY_POINTS.map(pt => pt.slice());
  }
}

function updateCurveFilter() {
  const master = curveEditors.master.editor.getPoints();
  const shadows = readStoredNumber('shadows', DEFAULTS.shadows);
  const highlights = readStoredNumber('highlights', DEFAULTS.highlights);
  const lutR = ColorCurve.composeChannelLUT(master, curveEditors.r.editor.getPoints(), shadows, highlights);
  const lutG = ColorCurve.composeChannelLUT(master, curveEditors.g.editor.getPoints(), shadows, highlights);
  const lutB = ColorCurve.composeChannelLUT(master, curveEditors.b.editor.getPoints(), shadows, highlights);
  ColorCurve.applyLUTsToFilter(PREVIEW_FILTER_ID, lutR, lutG, lutB);
}

const curveEditors = {};
document.querySelectorAll('.curve-block').forEach(block => {
  const name = block.dataset.curve; // master | r | g | b
  const key = name === 'master' ? 'curveMaster' : `curve${name.toUpperCase()}`;
  const canvas = block.querySelector('.curve-canvas');
  const editor = createCurveEditor(canvas, loadCurvePoints(key), points => {
    localStorage.setItem(COLOR_KEYS[key], JSON.stringify(points));
    updateCurveFilter();
  });
  curveEditors[name] = { editor, key };
  block.querySelector('.curve-reset').addEventListener('click', () => {
    const identity = ColorCurve.IDENTITY_POINTS.map(p => p.slice());
    editor.setPoints(identity);
    localStorage.setItem(COLOR_KEYS[key], JSON.stringify(identity));
    updateCurveFilter();
  });
});
updateCurveFilter();

// ── Basic sliders (brightness/contrast/saturate) ──────────────────────────────
const basicControls = {
  brightness: document.getElementById('ctl-brightness'),
  contrast:   document.getElementById('ctl-contrast'),
  saturate:   document.getElementById('ctl-saturate'),
};
const basicLabels = {
  brightness: document.getElementById('val-brightness'),
  contrast:   document.getElementById('val-contrast'),
  saturate:   document.getElementById('val-saturate'),
};
function setBasicValue(key, value, { persist = true } = {}) {
  basicControls[key].value = value;
  basicLabels[key].textContent = value + '%';
  document.documentElement.style.setProperty(`--mod-${key}`, value + '%');
  if (persist) localStorage.setItem(COLOR_KEYS[key], String(value));
}
for (const key of Object.keys(basicControls)) {
  setBasicValue(key, readStoredNumber(key, DEFAULTS[key]), { persist: false });
  basicControls[key].addEventListener('input', () => setBasicValue(key, Number(basicControls[key].value)));
}

// ── Shadows / Highlights sliders ───────────────────────────────────────────────
const toneControls = {
  shadows:    document.getElementById('ctl-shadows'),
  highlights: document.getElementById('ctl-highlights'),
};
const toneLabels = {
  shadows:    document.getElementById('val-shadows'),
  highlights: document.getElementById('val-highlights'),
};
function setToneValue(key, value, { persist = true } = {}) {
  toneControls[key].value = value;
  toneLabels[key].textContent = value;
  if (persist) localStorage.setItem(COLOR_KEYS[key], String(value));
  updateCurveFilter();
}
for (const key of Object.keys(toneControls)) {
  setToneValue(key, readStoredNumber(key, DEFAULTS[key]), { persist: false });
  toneControls[key].addEventListener('input', () => setToneValue(key, Number(toneControls[key].value)));
}

// ── Reset all / Copy full config ───────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  for (const key of Object.keys(basicControls)) setBasicValue(key, DEFAULTS[key]);
  for (const key of Object.keys(toneControls)) setToneValue(key, DEFAULTS[key]);
  for (const name of Object.keys(curveEditors)) {
    const { editor, key } = curveEditors[name];
    const identity = ColorCurve.IDENTITY_POINTS.map(p => p.slice());
    editor.setPoints(identity);
    localStorage.setItem(COLOR_KEYS[key], JSON.stringify(identity));
  }
  updateCurveFilter();
});

document.getElementById('btn-copy').addEventListener('click', async () => {
  const config = {
    brightness: Number(basicControls.brightness.value),
    contrast:   Number(basicControls.contrast.value),
    saturate:   Number(basicControls.saturate.value),
    shadows:    Number(toneControls.shadows.value),
    highlights: Number(toneControls.highlights.value),
    curveMaster: curveEditors.master.editor.getPoints(),
    curveR:      curveEditors.r.editor.getPoints(),
    curveG:      curveEditors.g.editor.getPoints(),
    curveB:      curveEditors.b.editor.getPoints(),
  };
  const json = JSON.stringify(config, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    document.getElementById('copy-feedback').textContent = 'Copied to clipboard.';
  } catch {
    document.getElementById('copy-feedback').textContent = json;
  }
  setTimeout(() => { document.getElementById('copy-feedback').textContent = ''; }, 4000);
});
