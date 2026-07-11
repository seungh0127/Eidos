// ── Device detection ──────────────────────────────────────────────────────────
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                  window.matchMedia('(pointer: coarse)').matches;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Safari (desktop + iOS) doesn't support WebM alpha — use HEVC .mov instead
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Bump this whenever module thumb/video assets are re-encoded so browsers
// fetch the new bytes instead of serving a stale cached copy of the same URL.
const ASSET_VERSION = '20260712';

// ── Module list ───────────────────────────────────────────────────────────────
const MODULES = [
  'H-A-1','H-A-2','H-A-3','H-A-4','H-A-5',
  'H-B-1','H-B-2','H-B-3','H-B-4','H-B-5',
  'H-C-1','H-C-2','H-C-3','H-C-4','H-C-5',
  'H-D-1','H-D-2','H-D-3','H-D-4',
  'H-E-1','H-E-2',
  'C-A-1','C-A-2','C-A-3',
  'C-B-1','C-B-2','C-B-3',
  'C-C-1','C-C-2','C-C-3',
  'C-D-1','C-D-2',
  'C-E-1','C-E-2','C-E-3',
  'S-A-1','S-A-2','S-A-3',
  'S-B-1','S-B-2',
  'S-C-1','S-C-2','S-C-3',
  'S-D-1','S-D-2','S-D-3',
  'S-E-1','S-E-2','S-E-3',
  'U-A-1','U-A-2',
  'U-B-1','U-B-2','U-B-3',
  'U-C-1','U-C-2',
  'U-D-1','U-D-2',
  'U-E-1','U-E-2','U-E-3',
  'F-A-1','F-A-2','F-A-3',
  'F-B-1','F-B-2',
  'F-C-1','F-C-2','F-C-3',
  'F-D-1','F-D-2','F-D-3',
  'F-E-1','F-E-2',
  'E-A-1','E-A-2','E-A-3',
  'E-B-1','E-B-2',
  'E-C-1','E-C-2',
  'E-D-1','E-D-2','E-D-3','E-D-4','E-D-5','E-D-6',
  'W-A-1','W-A-2','W-A-3',
  'L-A-2','L-A-3',
  'L-B-1','L-B-2','L-B-3',
  'L-C-1','L-C-2','L-C-3','L-C-4',
  'L-D-1','L-D-2','L-D-3',
  'L-E-1','L-E-2',
  'L-F-1','L-F-2','L-F-3',
  'L-G-1',
  'EX-A-0','EX-A-1','EX-A-2',
  'EX-B-1','EX-C-1','EX-D-1',
];

const MODULE_CATEGORIES = ['H', 'C', 'S', 'U', 'F', 'E', 'W', 'L', 'EX'];
const MODULES_BY_CATEGORY = MODULES.reduce((groups, file) => {
  const category = file.slice(0, file.indexOf('-'));
  (groups[category] ||= []).push(file);
  return groups;
}, {});

// ── Layout constants ──────────────────────────────────────────────────────────
const IMG  = IS_MOBILE ? 130 : 200;
const GAP  = IS_MOBILE ? 100 : 160;
const CELL = IMG + GAP;
document.documentElement.style.setProperty('--mod-img', IMG + 'px');

// ── Module natural source dimensions (base reference: 2000 → IMG px) ─────────
// Only entries that differ from the default 2000×2000 are listed.
const MODULE_SRC = {
  'H-C-1': [2500, 2500], 'H-C-2': [2500, 2500],
  'H-C-3': [2800, 2800],
  'H-C-4': [2500, 2500], 'H-C-5': [2500, 2500],
  'H-E-1': [2000, 2500],
  'C-A-1': [2500, 2500], 'C-A-2': [2500, 2500], 'C-A-3': [2500, 2800],
  'C-B-1': [2500, 2800], 'C-B-2': [2500, 2800], 'C-B-3': [2500, 2800],
  'C-C-1': [2500, 2500], 'C-C-2': [2500, 2500], 'C-C-3': [3000, 2500],
  'C-D-1': [2500, 2500], 'C-D-2': [3400, 2800],
  'C-E-1': [2500, 2800], 'C-E-2': [2500, 2800], 'C-E-3': [2500, 2800],
  'S-A-1': [2200, 2200], 'S-A-2': [2200, 2200], 'S-A-3': [2200, 2200],
  'S-B-2': [2200, 2200],
  'S-C-2': [2500, 2500], 'S-C-3': [2500, 2000],
  'S-D-1': [2500, 2500], 'S-D-2': [2500, 2500],
  'S-E-1': [2500, 2000], 'S-E-2': [2800, 2000], 'S-E-3': [2500, 2000],
  'U-B-1': [2500, 2000], 'U-B-2': [2800, 2000], 'U-B-3': [2800, 2000],
  'U-D-2': [2800, 2000],
  'U-E-1': [2800, 2000], 'U-E-2': [2800, 2000], 'U-E-3': [2800, 2000],
  'F-B-1': [2400, 2000], 'F-B-2': [2400, 2000],
  'F-C-1': [2400, 2000], 'F-C-2': [2800, 2000], 'F-C-3': [2400, 2000],
  'F-D-1': [2600, 2600], 'F-D-2': [2600, 2600], 'F-D-3': [2600, 2600],
  'F-E-1': [2400, 2000], 'F-E-2': [2400, 2000],
  'E-A-1': [2800, 2000], 'E-A-2': [2800, 2000], 'E-A-3': [2800, 2000],
  'E-B-1': [2800, 2000], 'E-B-2': [2800, 2000],
  'E-C-1': [2800, 2000], 'E-C-2': [2800, 2000],
  'E-D-1': [2800, 2600], 'E-D-2': [2600, 2600], 'E-D-3': [2600, 2600],
  'E-D-4': [2600, 2600], 'E-D-5': [2600, 2600], 'E-D-6': [2800, 2600],
  'W-A-1': [2200, 2200], 'W-A-2': [2500, 2500], 'W-A-3': [2500, 2500],
};
const SRC_BASE = 2000;

function getModDisplaySize(file) {
  const [sw, sh] = MODULE_SRC[file] || [SRC_BASE, SRC_BASE];
  return [Math.round(IMG * sw / SRC_BASE), Math.round(IMG * sh / SRC_BASE)];
}

// ── PRNG ──────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  seed = seed >>> 0;
  return function () {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCell(c, r, salt = 0) {
  let h = Math.imul(c, 73856093) ^ Math.imul(r, 19349663) ^ Math.imul(salt, 83492791);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function positiveMod(n, m) {
  return ((n % m) + m) % m;
}

function moduleAt(c, r) {
  const categoryIndex = positiveMod(c * 3 + r * 2, MODULE_CATEGORIES.length);
  const category = MODULE_CATEGORIES[categoryIndex];
  const modules = MODULES_BY_CATEGORY[category] || MODULES;
  const seed = hashCell(c, r, 1);
  const rng = mulberry32(seed + 1);
  return modules[Math.floor(rng() * modules.length)];
}

// ── DOM ───────────────────────────────────────────────────────────────────────
const world           = document.getElementById('world');
const viewport        = document.getElementById('viewport');
const logoBtn         = document.getElementById('logo-btn');
const modOverlay         = document.getElementById('mod-overlay');
const modDetailCompact   = document.getElementById('mod-detail-compact');
const modDetailPrdtLine  = document.getElementById('mod-detail-prdt-line');
const modDetailNameLine  = document.getElementById('mod-detail-name-line');
const modDetailTitle     = document.getElementById('mod-detail-title');
const modDetailVideo     = document.getElementById('mod-detail-video');

// ── Overlay state ─────────────────────────────────────────────────────────────
let overlayOpen = false;
let overlayRevealRaf = null;

// ── Element pool ──────────────────────────────────────────────────────────────
const modulePool = [];

function acquireModule() {
  return modulePool.pop() || (() => {
    const d = document.createElement('div');
    d.className = 'module';
    const img = document.createElement('img');
    img.className = 'module-thumb';
    img.decoding = 'async';
    img.draggable = false;        // block drag-to-save
    const video = document.createElement('video');
    video.className = 'module-video';
    video.muted = true;
    video.loop  = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'none';       // never load video until hover/press
    video.draggable = false;      // block drag-to-save
    video.controls = false;
    video.removeAttribute('controls');
    d.appendChild(img);
    d.appendChild(video);
    return d;
  })();
}

function releaseModule(el) {
  cleanupModuleVideo(el);
  el.style.transform = '';
  el.style.zIndex    = '';
  el.dataset.hovered = '';
  if (modulePool.length < 300) modulePool.push(el);
}

// ── Active modules ────────────────────────────────────────────────────────────
const active = new Map();

function addModule(c, r) {
  const key = c + ',' + r;
  if (active.has(key)) return;
  const file = moduleAt(c, r);
  const el   = acquireModule();
  el.dataset.file = file;
  el.style.left   = (c * CELL) + 'px';
  el.style.top    = (r * CELL) + 'px';
  setupModuleMedia(el, file);
  applyModBaseScale(el, modBaseScale);
  world.appendChild(el);
  active.set(key, el);
}

function removeModule(key) {
  const el = active.get(key);
  if (!el) return;
  world.removeChild(el);
  releaseModule(el);
  active.delete(key);
}

// ── Camera ────────────────────────────────────────────────────────────────────
const INIT_CAM_X = -window.innerWidth  / 2;
const INIT_CAM_Y = -window.innerHeight / 2;
const INIT_SCALE = IS_MOBILE ? 0.75 : 1.0;

// Restore from sessionStorage if available
const _sx = parseFloat(sessionStorage.getItem('eidos_camX'));
const _sy = parseFloat(sessionStorage.getItem('eidos_camY'));
const _ss = parseFloat(sessionStorage.getItem('eidos_scale'));
let camX  = isNaN(_sx) ? INIT_CAM_X : _sx;
let camY  = isNaN(_sy) ? INIT_CAM_Y : _sy;
let scale = isNaN(_ss) ? INIT_SCALE  : _ss;
const MIN_SCALE = 0.35, MAX_SCALE = 1.5;

// Save camera before leaving
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem('eidos_camX',  camX);
  sessionStorage.setItem('eidos_camY',  camY);
  sessionStorage.setItem('eidos_scale', scale);
});

const DRIFT    = 0.55;
const DRIFT_DX = Math.cos(150 * Math.PI / 180) * DRIFT;
const DRIFT_DY = Math.sin(150 * Math.PI / 180) * DRIFT;

function applyCamera() {
  world.style.transform = `scale(${scale}) translate(${-camX}px,${-camY}px)`;
}

// ── Module base scale ─────────────────────────────────────────────────────────
function getModBaseScale(s) {
  if (s >= 1.0) return 1.0;
  return Math.max(0.65, 1.0 - (1.0 - s) * 0.3);
}
let modBaseScale = getModBaseScale(scale);

function applyModBaseScale(el, mbs) {
  el.style.transform = mbs < 1.0 ? `scale(${mbs.toFixed(4)})` : '';
}

function updateModuleBaseScales() {
  const mbs = getModBaseScale(scale);
  if (Math.abs(mbs - modBaseScale) < 0.0005) return;
  modBaseScale = mbs;
  for (const el of active.values()) {
    if (el.dataset.hovered === '1') continue;
    applyModBaseScale(el, mbs);
  }
}

// ── Viewport culling ──────────────────────────────────────────────────────────
let lastBounds = null;

function updateModules() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const margin = CELL;
  const minC = Math.floor((camX - margin) / CELL);
  const maxC = Math.floor((camX + vw / scale + margin) / CELL);
  const minR = Math.floor((camY - margin) / CELL);
  const maxR = Math.floor((camY + vh / scale + margin) / CELL);

  if (lastBounds &&
      minC === lastBounds.minC && maxC === lastBounds.maxC &&
      minR === lastBounds.minR && maxR === lastBounds.maxR) return;
  lastBounds = { minC, maxC, minR, maxR };

  const rm = CELL * 2;
  const rmMinC = Math.floor((camX - rm) / CELL);
  const rmMaxC = Math.floor((camX + vw / scale + rm) / CELL);
  const rmMinR = Math.floor((camY - rm) / CELL);
  const rmMaxR = Math.floor((camY + vh / scale + rm) / CELL);

  for (const [key, el] of active) {
    const comma = key.indexOf(',');
    const c = +key.slice(0, comma), r = +key.slice(comma + 1);
    if (c < rmMinC || c > rmMaxC || r < rmMinR || r > rmMaxR) removeModule(key);
  }
  for (let r = minR; r <= maxR; r++)
    for (let c = minC; c <= maxC; c++) addModule(c, r);

}

// ── Module media helpers ──────────────────────────────────────────────────────
// Only one module's video is ever loaded/playing at a time. At rest every module
// shows a lightweight WebP thumb; the video src is attached only on hover/press.
let activeHoverModule = null;
let hoverToken = 0;

function setupModuleMedia(el, file) {
  const [dw, dh] = getModDisplaySize(file);
  const img   = el.querySelector('.module-thumb');
  const video = el.querySelector('.module-video');
  if (img) {
    img.style.width  = dw + 'px';
    img.style.height = dh + 'px';
    img.src = `assets/thumbs/${file}.webp?v=${ASSET_VERSION}`;
    img.alt = file;
  }
  if (video) {
    video.style.width  = dw + 'px';
    video.style.height = dh + 'px';
    video.preload = 'none';
    video.removeAttribute('src');   // no video file loaded at creation
  }
  el.classList.remove('video-active');
}

function playModuleVideo(el) {
  const video = el.querySelector('.module-video');
  if (!video) return;
  const file = el.dataset.file;
  if (!file) return;
  const token = ++hoverToken;
  el._hoverToken = token;
  const src = getHoverVideoSrc(file);
  if (!video.src.endsWith(src)) {
    video.src = src;
    video.load();
  }
  const reveal = () => {
    if (el._hoverToken !== token) return;   // stale hover — ignore
    el.classList.add('video-active');       // swap thumb -> video once ready
  };
  const start = () => {
    if (el._hoverToken !== token) return;
    video.play().then(reveal).catch(() => {}); // load error keeps thumb visible
  };
  if (video.readyState >= 2) {
    start();
  } else {
    const onReady = () => { video.removeEventListener('loadeddata', onReady); start(); };
    video.addEventListener('loadeddata', onReady);
  }
}

// Pause + fully release a module's video (drop src so Safari MOV leaves memory)
function stopHoverVideo(el) {
  const video = el.querySelector('.module-video');
  if (video) {
    video.pause();
    try { video.currentTime = 0; } catch {}
    video.removeAttribute('src');
    video.load();
  }
  el.classList.remove('video-active');
}

// Tear down the currently-active hover/press module and restore its rest state
function stopActiveHoverVideo() {
  const el = activeHoverModule;
  if (!el) return;
  activeHoverModule = null;
  el._hoverToken = (el._hoverToken || 0) + 1;  // invalidate any pending reveal
  stopHoverVideo(el);
  el.dataset.hovered = '';
  applyModBaseScale(el, modBaseScale);
  el.style.zIndex = '';
}

// Culling cleanup: also invalidate pending reveals and clear active ref
function cleanupModuleVideo(el) {
  if (el === activeHoverModule) activeHoverModule = null;
  el._hoverToken = (el._hoverToken || 0) + 1;
  const video = el.querySelector('.module-video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  el.classList.remove('video-active');
}

function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}


// ── Drag / inertia state ──────────────────────────────────────────────────────
let isDragging = false;
let velX = 0, velY = 0;
let dragStartX, dragStartY, dragCamX0, dragCamY0, prevMX, prevMY, prevT;
let touch1 = null, touchMoved = false, prevTX, prevTY, prevTT;
let pinchState = null;
let pressTimer = null, pressedModule = null;

function activateModulePress(el) {
  if (pressedModule) deactivateModulePress();
  pressedModule = el;
  if (activeHoverModule && activeHoverModule !== el) stopActiveHoverVideo();
  activeHoverModule = el;
  el.dataset.hovered = '1';
  el.style.zIndex = '100';
  el.style.transform = `scale(${(modBaseScale * 1.175).toFixed(4)})`;
  playModuleVideo(el);
}

function deactivateModulePress() {
  if (!pressedModule) return;
  const el = pressedModule;
  pressedModule = null;
  if (activeHoverModule === el) {
    stopActiveHoverVideo();
  } else {
    stopHoverVideo(el);
    el.dataset.hovered = '';
    el.style.zIndex = '';
    applyModBaseScale(el, modBaseScale);
  }
}

// ── Animation loop ────────────────────────────────────────────────────────────
let lastTS = 0;

function loop(ts) {
  const dt = Math.min(ts - lastTS, 50) / 16.667;
  lastTS = ts;

  if (!isDragging) {
    if (!REDUCED_MOTION && !overlayOpen && !pressedModule) {
      camX += DRIFT_DX * dt / scale;
      camY += DRIFT_DY * dt / scale;
    }
  }

  if (!isDragging) {
    if (!overlayOpen && (Math.abs(velX) > 0.05 || Math.abs(velY) > 0.05)) {
      camX += velX * dt;
      camY += velY * dt;
      velX *= Math.pow(0.88, dt);
      velY *= Math.pow(0.88, dt);
    } else {
      velX = 0; velY = 0;
    }
  }

  updateModules();
  updateModuleBaseScales();
  applyCamera();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ── Module name map ───────────────────────────────────────────────────────────
const MODULE_NAMES = {
  'H-A-1':'Block Head','H-A-2':'Expression Block','H-A-3':'Split Face Head','H-A-4':'Tablet Face Head','H-A-5':'Ambient Light Head',
  'H-B-1':'Pebble Head','H-B-2':'Buddy Head','H-B-3':'Sidecar Head','H-B-4':'Blind Work Head','H-B-5':'Desk Head',
  'H-C-1':'Utility Vision Head','H-C-2':'Binocular Work Head','H-C-3':'Pan-Tilt Sensor Head','H-C-4':'Projection Head','H-C-5':'Rugged Vision Head',
  'H-D-1':'Rugged Sensor Head','H-D-2':'Thermal Rescue Head','H-D-3':'Aquatic Sealed Head','H-D-4':'Night Guardian Head',
  'H-E-1':'Periscope Head','H-E-2':'Drone Dock Head',
  'C-A-1':'Domestic Pillar Core','C-A-2':'Soft Belly Core','C-A-3':'Home Dock Core',
  'C-B-1':'Slim Service Tower','C-B-2':'Tray Spine Core','C-B-3':'Counter Core',
  'C-C-1':'Heavy Load Core','C-C-2':'Exo-Frame Core','C-C-3':'Counterbalanced Core',
  'C-D-1':'Rugged Field Core','C-D-2':'Rescue Capsule Core',
  'C-E-1':'Micro Dock Core','C-E-2':'Flat Sled Core','C-E-3':'Pivot Dock Core',
  'S-A-1':'Soft Assist Shoulder Base','S-A-2':'Dual Soft Shoulder','S-A-3':'Dual Soft Shoulder',
  'S-B-1':'High-Torque Shoulder','S-B-2':'Piston-Assist Shoulder',
  'S-C-1':'Compact Precision Shoulder','S-C-2':'Camera Rig Shoulder','S-C-3':'Tool Rail Shoulder',
  'S-D-1':'Wide Utility Shoulder','S-D-2':'Multi-Arm Bridge','S-D-3':'Tray Support Shoulder',
  'S-E-1':'Rear Assist Shoulder','S-E-2':'Service Hitch Shoulder','S-E-3':'Studio Boom Shoulder',
  'U-A-1':'Short Service Link','U-A-2':'Balanced Link Arm',
  'U-B-1':'Linear Power Arm','U-B-2':'Dual Piston Arm','U-B-3':'Load Lock Arm',
  'U-C-1':'Passive Compliant Arm','U-C-2':'Force-Limited Arm',
  'U-D-1':'Compact Precision Arm','U-D-2':'Stabilized Precision Arm',
  'U-E-1':'Tool Rail Arm','U-E-2':'Boom Link Arm','U-E-3':'Hose Cable Arm',
  'F-A-1':'Basic Connector Port','F-A-2':'Basic Rotate Wrist','F-A-3':'Basic Rotate Wrist',
  'F-B-1':'Multi-Axis Precision Wrist','F-B-2':'Multi-Axis Precision Wrist',
  'F-C-1':'Quick Dock Wrist','F-C-2':'Powered Tool Wrist','F-C-3':'Tool Turret Wrist',
  'F-D-1':'Mechanical Lock Wrist','F-D-2':'Clamp Support Wrist','F-D-3':'Shock Load Wrist',
  'F-E-1':'Force-Sensing Wrist','F-E-2':'Breakaway Safety Wrist',
  'E-A-1':'Adaptive Soft Gripper','E-A-2':'Adaptive Soft Gripper','E-A-3':'Adaptive Soft Gripper',
  'E-B-1':'Parallel Utility Gripper','E-B-2':'Heavy Clamp Gripper',
  'E-C-1':'Precision Finger Gripper','E-C-2':'Stabilized Detail Holder',
  'E-D-1':'Task End-Effector Base','E-D-2':'Cleaning Brush / Wiper Tool','E-D-3':'Spray / Nozzle Tool','E-D-4':'Powered Driver Tool','E-D-5':'Rescue Cutter / Pull Tool','E-D-6':'Tray Support End',
  // TODO: names not finalized yet — placeholder until product naming is confirmed
  'W-A-1':'TBD Module W-A-1','W-A-2':'TBD Module W-A-2','W-A-3':'TBD Module W-A-3',
  'L-A-1':'Standard Biped Legs','L-A-2':'Stabilized Work Biped','L-A-3':'Compact Biped Legs',
  'L-B-1':'Foot-Wheel Biped','L-B-2':'Roller-Knee Biped','L-B-3':'Compact Quadruped',
  'L-C-1':'Compact Quadruped','L-C-2':'Compact Quadruped','L-C-3':'Heavy Quadruped Carrier','L-C-4':'Caterpillar Quadruped',
  'L-D-1':'Wheel Base','L-D-2':'Omni Wheel Base','L-D-3':'Stable Four Wheel Base',
  'L-E-1':'Compact Track Base','L-E-2':'Articulated Crawler Base',
  'L-F-1':'Flat Cargo Platform','L-F-2':'Ski / Sled Runner Base','L-F-3':'Tow Trailer Platform',
  'L-G-1':'Monowheel Speedster',
  'EX-A-0':'Power Extension Base','EX-A-1':'Utility Cargo Trailer','EX-A-2':'Secure Delivery Trailer',
  'EX-B-1':'Battery Extension Pack','EX-C-1':'Tool Rack Trailer','EX-D-1':'Stargazer Trailer'
};

// ── Module Detail Overlay ─────────────────────────────────────────────────────
function compactCode(code) { return code.replaceAll('-', ''); }

// Modules with high-quality overlay versions in assets/hq/
const HQ_MODULES = new Set([
  'H-A-1','H-A-2','H-A-3','H-A-4','H-A-5',
  'H-B-1','H-B-2','H-B-3','H-B-4','H-B-5',
  'H-C-1','H-C-2','H-C-3','H-C-4','H-C-5',
  'H-D-1','H-D-2','H-D-3','H-D-4',
  'H-E-1','H-E-2',
  'C-A-1','C-A-2','C-A-3',
  'C-B-1','C-B-2','C-B-3',
  'C-C-1','C-C-2','C-C-3',
  'C-D-1','C-D-2',
  'C-E-1','C-E-2','C-E-3',
  'S-A-1','S-A-2','S-A-3',
  'S-B-1','S-B-2',
  'S-C-1','S-C-2','S-C-3',
  'S-D-1','S-D-2',
  'S-E-1','S-E-2','S-E-3',
  'U-A-1','U-A-2',
  'U-B-1','U-B-2','U-B-3',
  'U-C-1','U-C-2',
  'U-D-1','U-D-2',
  'U-E-1','U-E-2','U-E-3',
  'F-A-1','F-A-2','F-A-3',
  'F-B-1','F-B-2',
  'F-C-1','F-C-2','F-C-3',
  'F-D-1','F-D-2','F-D-3',
  'F-E-1','F-E-2',
  'E-A-1','E-A-2','E-A-3',
  'E-B-1','E-B-2',
  'E-C-1','E-C-2',
  'E-D-1','E-D-2','E-D-3','E-D-4','E-D-5','E-D-6',
  'W-A-1','W-A-2','W-A-3',
]);

// Modules with MP4 hover clips and MOV overlay fallbacks.
const HEVC_MODULES = new Set([
  'H-A-1','H-A-2','H-A-3','H-A-4','H-A-5',
  'H-B-1','H-B-2','H-B-3','H-B-4','H-B-5',
  'H-C-1','H-C-2','H-C-3','H-C-4','H-C-5',
  'H-D-1','H-D-2','H-D-3','H-D-4',
  'H-E-1','H-E-2',
  'C-A-1','C-A-2','C-A-3',
  'C-B-1','C-B-2','C-B-3',
  'C-C-1','C-C-2','C-C-3',
  'C-D-1','C-D-2',
  'C-E-1','C-E-2','C-E-3',
  'S-A-1','S-A-2','S-A-3',
  'S-B-1','S-B-2',
  'S-C-1','S-C-2','S-C-3',
  'S-D-1','S-D-2',
  'S-E-1','S-E-2','S-E-3',
  'U-A-1','U-A-2',
  'U-B-1','U-B-2','U-B-3',
  'U-C-1','U-C-2',
  'U-D-1','U-D-2',
  'U-E-1','U-E-2','U-E-3',
  'F-A-1','F-A-2','F-A-3',
  'F-B-1','F-B-2',
  'F-C-1','F-C-2','F-C-3',
  'F-D-1','F-D-2','F-D-3',
  'F-E-1','F-E-2',
  'E-A-1','E-A-2','E-A-3',
  'E-B-1','E-B-2',
  'E-C-1','E-C-2',
  'E-D-1','E-D-2','E-D-3','E-D-4','E-D-5','E-D-6',
  'W-A-1','W-A-2','W-A-3',
]);

function getHoverVideoSrc(file) {
  // Main page bg is white, so hover clips need no alpha. Designed (H/C) modules
  // ship a single H.264 MP4 — hardware-decoded on both Chrome and Safari with no
  // alpha overhead (keeps Safari light). Placeholder modules keep their WebM
  // (Chrome plays it; on Safari the WebP thumb simply stays visible).
  const path = HEVC_MODULES.has(file) ? `assets/${file}.mp4` : `assets/${file}.webm`;
  return `${path}?v=${ASSET_VERSION}`;
}

function getDetailVideoSrc(file) {
  const ext = (IS_SAFARI && HEVC_MODULES.has(file)) ? 'mov' : 'webm';
  const path = HQ_MODULES.has(file) ? `assets/hq/${file}.${ext}` : `assets/${file}.${ext}`;
  return `${path}?v=${ASSET_VERSION}`;
}

function openOverlay(file) {
  const name = MODULE_NAMES[file] || '';
  modDetailCompact.textContent  = compactCode(file);
  modDetailPrdtLine.textContent = `PRDT CODE : ${file}`;
  modDetailNameLine.textContent = name.toUpperCase();
  modDetailTitle.textContent    = name || file;
  stopActiveHoverVideo();               // release any main-page hover video first
  if (overlayRevealRaf) cancelAnimationFrame(overlayRevealRaf);
  modOverlay.classList.remove('content-ready');
  modOverlay.setAttribute('aria-hidden', 'false');
  modOverlay.classList.add('open');
  document.body.classList.add('mod-overlay-open');
  overlayOpen = true;
  const hl = document.getElementById('hover-label');
  if (hl) hl.classList.remove('visible');
  overlayRevealRaf = requestAnimationFrame(() => {
    overlayRevealRaf = null;
    if (!overlayOpen) return;
    modDetailVideo.src = getDetailVideoSrc(file);
    modDetailVideo.load();
    modDetailVideo.play().catch(() => {});
    modOverlay.classList.add('content-ready');
  });
}

function closeOverlay() {
  if (overlayRevealRaf) {
    cancelAnimationFrame(overlayRevealRaf);
    overlayRevealRaf = null;
  }
  modOverlay.classList.remove('content-ready');
  modOverlay.classList.remove('open');
  modOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mod-overlay-open');
  modOverlayContent.classList.remove('over-pause-zone', 'grabbing');
  overlayOpen = false;
  setTimeout(() => {
    modDetailVideo.pause();
    modDetailVideo.removeAttribute('src');
    modDetailVideo.load();
  }, 300);
}

// #mod-detail-video is pointer-events:none (anti-save), so its interactions are
// handled on the parent #mod-overlay-content via coordinate hit-testing.
const modOverlayContent = document.getElementById('mod-overlay-content');
modDetailVideo.draggable = false;
modDetailVideo.controls  = false;
modDetailVideo.removeAttribute('controls');

function eventXY(e) {
  if (typeof e.clientX === 'number') return [e.clientX, e.clientY];
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  return t ? [t.clientX, t.clientY] : [null, null];
}
// The pause/play (and keep-open) hit area is a smaller centered rectangle —
// ~70% of the video box — so tapping the outer ring still closes the overlay.
const DETAIL_HIT_SCALE = 0.7;
function isOverDetailVideo(e) {
  const [x, y] = eventXY(e);
  if (x == null) return false;
  const r = modDetailVideo.getBoundingClientRect();
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;
  const hw = (r.width  * DETAIL_HIT_SCALE) / 2;
  const hh = (r.height * DETAIL_HIT_SCALE) / 2;
  return x >= cx - hw && x <= cx + hw && y >= cy - hh && y <= cy + hh;
}

// Click the backdrop (anywhere but the module video) to close.
modOverlay.addEventListener('click', e => {
  if (overlayOpen && !isOverDetailVideo(e)) closeOverlay();
});
window.addEventListener('keydown', e => { if (e.key === 'Escape' && overlayOpen) closeOverlay(); });

// ── Overlay video: pause while pressing the video (PC + mobile) ───────────────
if (!IS_MOBILE) {
  // Cursor: grab over the pause zone, grabbing while pressing it
  modOverlayContent.addEventListener('mousemove', e => {
    modOverlayContent.classList.toggle('over-pause-zone', overlayOpen && isOverDetailVideo(e));
  });
  modOverlayContent.addEventListener('mousedown', e => {
    if (overlayOpen && isOverDetailVideo(e)) {
      modDetailVideo.pause();
      modOverlayContent.classList.add('grabbing');
    }
  });
  window.addEventListener('mouseup', () => {
    modOverlayContent.classList.remove('grabbing');
    if (overlayOpen && modDetailVideo.paused) modDetailVideo.play().catch(() => {});
  });
} else {
  modOverlayContent.addEventListener('touchstart', e => { if (overlayOpen && isOverDetailVideo(e)) modDetailVideo.pause(); }, { passive: true });
  modOverlayContent.addEventListener('touchend',   () => { if (overlayOpen && modDetailVideo.paused) modDetailVideo.play().catch(() => {}); }, { passive: true });
}

// Block the default right-click / long-press menu on module sources.
// (Sources sit under pointer-events:none children, so the event target is the
// .module / #mod-overlay-content container — matched via closest().)
document.addEventListener('contextmenu', e => {
  if (
    e.target.closest('.module') ||
    e.target.closest('#mod-detail-video') ||
    e.target.closest('#mod-overlay-content')
  ) {
    e.preventDefault();
  }
});

// ── Desktop: hover label + GIF ────────────────────────────────────────────────
if (!IS_MOBILE) {
  const hoverLabel = document.getElementById('hover-label');
  let labelX = 0, labelY = 0, labelRafId = null, labelVisible = false;

  function showLabel(file) {
    const name = MODULE_NAMES[file];
    hoverLabel.textContent = name ? `${file}  ${name}` : file;
    hoverLabel.classList.add('visible');
    labelVisible = true;
  }

  function hideLabel() {
    hoverLabel.classList.remove('visible');
    labelVisible = false;
  }

  function updateLabelPos() {
    labelRafId = null;
    if (!labelVisible) return;
    const OFFSET = 16;
    const lw = hoverLabel.offsetWidth, lh = hoverLabel.offsetHeight;
    const vw = window.innerWidth,      vh = window.innerHeight;
    const x = labelX + OFFSET + lw > vw ? labelX - OFFSET - lw : labelX + OFFSET;
    const y = labelY + OFFSET + lh > vh ? labelY - OFFSET - lh : labelY + OFFSET;
    hoverLabel.style.transform = `translate(${x}px,${y}px)`;
  }

  world.addEventListener('mouseover', e => {
    if (overlayOpen || isDragging) return;
    const mod = e.target.closest('.module');
    if (!mod) return;
    // Release the previously-hovered module so only one video is ever loaded
    if (activeHoverModule && activeHoverModule !== mod) stopActiveHoverVideo();
    activeHoverModule = mod;
    // Immediate UI feedback — independent of video loading
    mod.dataset.hovered = '1';
    mod.style.transform = `scale(${(modBaseScale * 1.22).toFixed(4)})`;
    mod.style.zIndex    = '100';
    showLabel(mod.dataset.file);
    playModuleVideo(mod);          // async; thumb stays until video is ready
  });

  world.addEventListener('mouseout', e => {
    if (overlayOpen) return;
    const mod = e.target.closest('.module');
    if (!mod || mod.contains(e.relatedTarget)) return;
    if (activeHoverModule === mod) {
      stopActiveHoverVideo();
    } else {
      stopHoverVideo(mod);
      mod.dataset.hovered = '';
      applyModBaseScale(mod, modBaseScale);
      mod.style.zIndex = '';
    }
    hideLabel();
  });

  window.addEventListener('mousemove', e => {
    labelX = e.clientX; labelY = e.clientY;
    if (labelVisible && !labelRafId) labelRafId = requestAnimationFrame(updateLabelPos);
    if (isDragging) hideLabel();
  }, { passive: true });

}

// ── Desktop: click to open overlay ───────────────────────────────────────────
if (!IS_MOBILE) {
  let clickDownX = 0, clickDownY = 0;
  viewport.addEventListener('mousedown', e => { clickDownX = e.clientX; clickDownY = e.clientY; }, true);
  viewport.addEventListener('click', e => {
    if (overlayOpen) return;
    if (Math.hypot(e.clientX - clickDownX, e.clientY - clickDownY) > 6) return;
    const mod = e.target.closest('.module');
    if (mod) openOverlay(mod.dataset.file);
  });
}

// ── Desktop: drag ─────────────────────────────────────────────────────────────
if (!IS_MOBILE) {
  viewport.addEventListener('mousedown', e => {
    if (overlayOpen) return;
    isDragging = true;
    viewport.classList.add('dragging');
    dragStartX = e.clientX; dragStartY = e.clientY;
    dragCamX0  = camX;      dragCamY0  = camY;
    velX = 0; velY = 0;
    prevMX = e.clientX; prevMY = e.clientY; prevT = performance.now();
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    camX = dragCamX0 - (e.clientX - dragStartX) / scale;
    camY = dragCamY0 - (e.clientY - dragStartY) / scale;
    const now = performance.now(), dt2 = now - prevT;
    if (dt2 > 0) {
      velX = ((prevMX - e.clientX) / scale) / dt2 * 16;
      velY = ((prevMY - e.clientY) / scale) / dt2 * 16;
    }
    prevMX = e.clientX; prevMY = e.clientY; prevT = now;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    viewport.classList.remove('dragging');
    const cap = 25;
    velX = Math.max(-cap, Math.min(cap, velX));
    velY = Math.max(-cap, Math.min(cap, velY));
  });
}

// ── Mobile: touch ─────────────────────────────────────────────────────────────
if (IS_MOBILE) {
  viewport.addEventListener('touchstart', e => {
    if (overlayOpen) return;
    if (e.touches.length === 2) {
      clearTimeout(pressTimer);
      deactivateModulePress();
      isDragging = false;
      touch1 = null;
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      pinchState = { dist0: dist, scale0: scale, wx: midX / scale + camX, wy: midY / scale + camY, midX, midY };
      return;
    }
    if (e.touches.length !== 1) return;
    pinchState = null;
    const t = e.touches[0];
    touch1 = { x: t.clientX, y: t.clientY, camX, camY };
    touchMoved = false; isDragging = false; velX = 0; velY = 0;
    prevTX = t.clientX; prevTY = t.clientY; prevTT = performance.now();
    clearTimeout(pressTimer);
    const tx = t.clientX, ty = t.clientY;
    pressTimer = setTimeout(() => {
      if (!touchMoved) {
        const el = document.elementFromPoint(tx, ty)?.closest?.('.module');
        if (el) activateModulePress(el);
      }
    }, 180);
  }, { passive: true });

  viewport.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchState) {
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchState.scale0 * dist / pinchState.dist0));
      scale = newScale;
      camX  = pinchState.wx - pinchState.midX / scale;
      camY  = pinchState.wy - pinchState.midY / scale;
      lastBounds = null;
      return;
    }
    if (!touch1 || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touch1.x, dy = t.clientY - touch1.y;
    if (!touchMoved && Math.hypot(dx, dy) > 8) {
      touchMoved = true;
      clearTimeout(pressTimer);
      deactivateModulePress();
      isDragging = true;
    }
    if (isDragging) {
      camX = touch1.camX - dx / scale;
      camY = touch1.camY - dy / scale;
      const now = performance.now(), dt2 = now - prevTT;
      if (dt2 > 0) {
        velX = ((prevTX - t.clientX) / scale) / dt2 * 16;
        velY = ((prevTY - t.clientY) / scale) / dt2 * 16;
      }
      prevTX = t.clientX; prevTY = t.clientY; prevTT = now;
    }
  }, { passive: false });

  viewport.addEventListener('touchend', e => {
    if (e.touches.length > 0) return;
    const wasMoved = touchMoved;
    clearTimeout(pressTimer);
    deactivateModulePress();
    isDragging = false; touch1 = null; pinchState = null;
    const cap = 25;
    velX = Math.max(-cap, Math.min(cap, velX));
    velY = Math.max(-cap, Math.min(cap, velY));
    // Tap detection: short touch, no movement, no long press
    if (!wasMoved && !overlayOpen) {
      const ct = e.changedTouches[0];
      const el = document.elementFromPoint(ct.clientX, ct.clientY)?.closest?.('.module');
      if (el) openOverlay(el.dataset.file);
    }
  }, { passive: true });
}

// ── Wheel zoom ────────────────────────────────────────────────────────────────
viewport.addEventListener('wheel', e => {
  if (overlayOpen) return;
  e.preventDefault();
  const mx = e.clientX, my = e.clientY;
  const wx = mx / scale + camX, wy = my / scale + camY;
  let delta = e.deltaY;
  if (e.deltaMode === 1) delta *= 20;
  if (e.deltaMode === 2) delta *= 300;
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * Math.pow(0.998, delta)));
  if (newScale !== scale) {
    scale = newScale;
    camX  = wx - mx / scale;
    camY  = wy - my / scale;
  }
}, { passive: false });

window.addEventListener('resize', () => { lastBounds = null; });

// ── Logo: reset camera ────────────────────────────────────────────────────────
let resetAnim = null;

function resetCamera() {
  if (resetAnim) cancelAnimationFrame(resetAnim);
  const startX = camX, startY = camY, startScale = scale;
  const startTime = performance.now();
  const duration = 600;
  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const e = ease(t);
    camX  = startX  + (INIT_CAM_X - startX)  * e;
    camY  = startY  + (INIT_CAM_Y - startY)  * e;
    scale = startScale + (INIT_SCALE - startScale) * e;
    velX = 0; velY = 0;
    applyCamera();
    updateModules();
    if (t < 1) resetAnim = requestAnimationFrame(step);
    else resetAnim = null;
  }
  resetAnim = requestAnimationFrame(step);
}

logoBtn.addEventListener('click', () => {
  if (overlayOpen) closeOverlay();
  else resetCamera();
});
