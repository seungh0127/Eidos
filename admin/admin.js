// ── Shared keys with the main site (scripts/main.js reads these too) ──────────
const COLOR_KEYS = {
  brightness: 'eidos_mod_brightness',
  contrast:   'eidos_mod_contrast',
  saturate:   'eidos_mod_saturate',
};
const DEFAULTS = { brightness: 100, contrast: 100, saturate: 100 };

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
// One live hover video so motion/alpha content can be judged too, not just stills.
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

// ── Controls ───────────────────────────────────────────────────────────────────
const controls = {
  brightness: document.getElementById('ctl-brightness'),
  contrast:   document.getElementById('ctl-contrast'),
  saturate:   document.getElementById('ctl-saturate'),
};
const valueLabels = {
  brightness: document.getElementById('val-brightness'),
  contrast:   document.getElementById('val-contrast'),
  saturate:   document.getElementById('val-saturate'),
};

function readStored(key) {
  const v = localStorage.getItem(COLOR_KEYS[key]);
  return v === null ? DEFAULTS[key] : Number(v);
}

function applyLive(key, value) {
  document.documentElement.style.setProperty(`--mod-${key === 'saturate' ? 'saturate' : key}`, value + '%');
  valueLabels[key].textContent = value + '%';
}

function setValue(key, value, { persist = true } = {}) {
  controls[key].value = value;
  applyLive(key, value);
  if (persist) localStorage.setItem(COLOR_KEYS[key], String(value));
}

// Init from any previously saved values (so revisiting the admin page resumes
// where you left off, and reflects what the main site is currently showing).
for (const key of Object.keys(controls)) {
  setValue(key, readStored(key), { persist: false });
  controls[key].addEventListener('input', () => {
    setValue(key, Number(controls[key].value));
  });
}

// ── Reset / Copy ────────────────────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', () => {
  for (const key of Object.keys(controls)) setValue(key, DEFAULTS[key]);
});

document.getElementById('btn-copy').addEventListener('click', async () => {
  const css = `:root {\n  --mod-brightness: ${controls.brightness.value}%;\n  --mod-contrast: ${controls.contrast.value}%;\n  --mod-saturate: ${controls.saturate.value}%;\n}`;
  try {
    await navigator.clipboard.writeText(css);
    document.getElementById('copy-feedback').textContent = 'Copied to clipboard.';
  } catch {
    document.getElementById('copy-feedback').textContent = css;
  }
  setTimeout(() => { document.getElementById('copy-feedback').textContent = ''; }, 4000);
});
