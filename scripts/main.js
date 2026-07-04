// ── Device detection ──────────────────────────────────────────────────────────
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
                  window.matchMedia('(pointer: coarse)').matches;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// ── Layout constants ──────────────────────────────────────────────────────────
const IMG  = IS_MOBILE ? 130 : 200;
const GAP  = IS_MOBILE ? 100 : 160;
const CELL = IMG + GAP;
document.documentElement.style.setProperty('--mod-img', IMG + 'px');

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

function moduleAt(c, r) {
  const seed = (((c * 73856093) ^ (r * 19349663)) >>> 0) + 1;
  const rng  = mulberry32(seed);
  return MODULES[Math.floor(rng() * MODULES.length)];
}

// ── DOM ───────────────────────────────────────────────────────────────────────
const world           = document.getElementById('world');
const viewport        = document.getElementById('viewport');
const gyroOverlay     = document.getElementById('gyro-overlay');
const gyroToggleBtn   = document.getElementById('gyro-toggle');
const enableMotionBtn = document.getElementById('enable-motion-btn');
const logoBtn         = document.getElementById('logo-btn');
const modOverlay         = document.getElementById('mod-overlay');
const modDetailCompact   = document.getElementById('mod-detail-compact');
const modDetailPrdtLine  = document.getElementById('mod-detail-prdt-line');
const modDetailNameLine  = document.getElementById('mod-detail-name-line');
const modDetailTitle     = document.getElementById('mod-detail-title');
const modDetailImg       = document.getElementById('mod-detail-img');

// ── Overlay state ─────────────────────────────────────────────────────────────
let overlayOpen = false;

// ── Element pool ──────────────────────────────────────────────────────────────
const modulePool = [];

function acquireModule() {
  return modulePool.pop() || (() => {
    const d = document.createElement('div');
    d.className = 'module';
    d.appendChild(document.createElement('img'));
    return d;
  })();
}

function releaseModule(el) {
  const img = el.querySelector('img');
  if (img && img.dataset.mode === 'gif') {
    img.src = `assets/thumbs/${el.dataset.file}.webp`;
    img.dataset.mode = '';
  }
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
  const img = el.querySelector('img');
  img.src          = `assets/thumbs/${file}.webp`;
  img.alt          = file;
  img.dataset.mode = '';
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

  for (let r = rmMinR; r <= rmMaxR; r++)
    for (let c = rmMinC; c <= rmMaxC; c++)
      if (!active.has(c + ',' + r)) preloadWebP(moduleAt(c, r));
}

// ── WebP preload ──────────────────────────────────────────────────────────────
const webpPreloaded = new Set();
function preloadWebP(file) {
  if (webpPreloaded.has(file)) return;
  webpPreloaded.add(file);
  new Image().src = `assets/thumbs/${file}.webp`;
}

// ── GIF cache ─────────────────────────────────────────────────────────────────
const gifCache      = new Map();
const MAX_GIF_CACHE = 16;

function preloadGif(file) {
  if (gifCache.has(file)) return;
  if (gifCache.size >= MAX_GIF_CACHE) gifCache.delete(gifCache.keys().next().value);
  const img = new Image();
  img.src = `assets/${file}.gif`;
  gifCache.set(file, img);
}

function playGif(mod) {
  const file = mod.dataset.file;
  if (!file) return;
  const img = mod.querySelector('img');
  if (!img || img.dataset.mode === 'gif') return;
  img.src = '';
  img.src = `assets/${file}.gif`;
  img.dataset.mode = 'gif';
}

function revertGif(mod) {
  const img = mod.querySelector('img');
  if (!img || img.dataset.mode !== 'gif') return;
  img.src = `assets/thumbs/${mod.dataset.file}.webp`;
  img.dataset.mode = '';
}

// ── Gyroscope ─────────────────────────────────────────────────────────────────
let gyroGranted = false, gyroEnabled = false, gyroActive = false;
let gyroCalib = true, gyroBaseBeta = 0, gyroBaseGamma = 0;
let targetGyroX = 0, targetGyroY = 0, gyroVX = 0, gyroVY = 0;
let gyroResumeTimer = null;

function calibrateGyro() {
  gyroCalib = true; gyroBaseBeta = 0; gyroBaseGamma = 0;
  targetGyroX = 0; targetGyroY = 0; gyroVX = 0; gyroVY = 0;
}

function onDeviceOrientation(e) {
  if (!gyroEnabled) return;
  if (gyroCalib) {
    gyroBaseBeta  = e.beta  ?? 0;
    gyroBaseGamma = e.gamma ?? 0;
    gyroCalib = false;
    return;
  }
  const db = (e.beta  ?? 0) - gyroBaseBeta;
  const dg = (e.gamma ?? 0) - gyroBaseGamma;
  const angle = screen.orientation?.angle ?? 0;
  let tiltX, tiltY;
  if      (angle === 0  ) { tiltX =  dg; tiltY =  db; }
  else if (angle === 90 ) { tiltX = -db; tiltY =  dg; }
  else if (angle === 180) { tiltX = -dg; tiltY = -db; }
  else                    { tiltX =  db; tiltY = -dg; }
  const DZ = 3, MX = 20;
  const norm = v => {
    if (Math.abs(v) < DZ) return 0;
    return Math.max(-1, Math.min(1, (v - Math.sign(v) * DZ) / (MX - DZ)));
  };
  targetGyroX = norm(tiltX) * DRIFT * 5;
  targetGyroY = norm(tiltY) * DRIFT * 5;
}

function attachOrientationChange() {
  const handler = () => calibrateGyro();
  if (screen.orientation?.addEventListener) screen.orientation.addEventListener('change', handler);
  else window.addEventListener('orientationchange', handler);
}

function enableGyro() {
  gyroGranted = true; gyroEnabled = true; gyroActive = true;
  calibrateGyro();
  window.addEventListener('deviceorientation', onDeviceOrientation);
  attachOrientationChange();
}

function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}

// ── Gyro popup (mobile only) ──────────────────────────────────────────────────
if (IS_MOBILE) {
  gyroOverlay.classList.add('visible');
  gyroToggleBtn.classList.add('visible');

  enableMotionBtn.addEventListener('click', async () => {
    try {
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === 'granted') enableGyro();
        else { gyroToggleBtn.classList.add('off'); gyroToggleBtn.textContent = 'OFF'; }
      } else if ('DeviceOrientationEvent' in window) {
        enableGyro();
      } else {
        gyroToggleBtn.classList.add('off'); gyroToggleBtn.textContent = 'OFF';
      }
    } catch {
      gyroToggleBtn.classList.add('off'); gyroToggleBtn.textContent = 'OFF';
    }
    gyroOverlay.style.opacity = '0';
    setTimeout(() => { gyroOverlay.classList.remove('visible'); gyroOverlay.style.opacity = ''; }, 400);
  });

  gyroToggleBtn.addEventListener('click', () => {
    if (!gyroGranted) return;
    gyroEnabled = !gyroEnabled;
    gyroActive  = gyroEnabled;
    if (gyroEnabled) {
      calibrateGyro();
      gyroToggleBtn.textContent = 'ON';
      gyroToggleBtn.classList.remove('off');
    } else {
      targetGyroX = 0; targetGyroY = 0;
      gyroToggleBtn.textContent = 'OFF';
      gyroToggleBtn.classList.add('off');
    }
  });
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
  el.dataset.hovered = '1';
  el.style.zIndex = '100';
  el.style.transform = `scale(${(modBaseScale * 1.175).toFixed(4)})`;
  playGif(el);
}

function deactivateModulePress() {
  if (!pressedModule) return;
  pressedModule.dataset.hovered = '';
  pressedModule.style.zIndex = '';
  applyModBaseScale(pressedModule, modBaseScale);
  revertGif(pressedModule);
  pressedModule = null;
}

// ── Animation loop ────────────────────────────────────────────────────────────
let lastTS = 0;

function loop(ts) {
  const dt = Math.min(ts - lastTS, 50) / 16.667;
  lastTS = ts;

  if (!isDragging) {
    gyroVX += (targetGyroX - gyroVX) * 0.18;
    gyroVY += (targetGyroY - gyroVY) * 0.18;

    if (!REDUCED_MOTION) {
      if (IS_MOBILE && gyroEnabled && gyroActive && !pressedModule) {
        const inertiaLen = Math.hypot(velX, velY);
        const gyroW = Math.max(0, 1 - inertiaLen / 6);
        camX += gyroVX * dt / scale * gyroW;
        camY += gyroVY * dt / scale * gyroW;
      } else if (!IS_MOBILE || !pressedModule) {
        camX += DRIFT_DX * dt / scale;
        camY += DRIFT_DY * dt / scale;
      }
    }
  }

  if (!isDragging) {
    if (Math.abs(velX) > 0.05 || Math.abs(velY) > 0.05) {
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

function openOverlay(file) {
  const name = MODULE_NAMES[file] || '';
  modDetailCompact.textContent  = compactCode(file);
  modDetailPrdtLine.textContent = `PRDT CODE : ${file}`;
  modDetailNameLine.textContent = name.toUpperCase();
  modDetailTitle.textContent    = name || file;
  modDetailImg.alt = name || file;
  modDetailImg.src = `assets/${file}.gif`;
  modOverlay.setAttribute('aria-hidden', 'false');
  modOverlay.classList.add('open');
  document.body.classList.add('mod-overlay-open');
  overlayOpen = true;
  for (const el of active.values()) {
    if (el.dataset.hovered === '1') {
      el.dataset.hovered = '';
      applyModBaseScale(el, modBaseScale);
      el.style.zIndex = '';
      revertGif(el);
    }
  }
  const hl = document.getElementById('hover-label');
  if (hl) hl.classList.remove('visible');
}

function closeOverlay() {
  modOverlay.classList.remove('open');
  modOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mod-overlay-open');
  overlayOpen = false;
  setTimeout(() => { modDetailImg.src = ''; }, 300);
}

modOverlay.addEventListener('click', e => {
  if (e.target === modOverlay || e.target.id === 'mod-overlay-bg') closeOverlay();
});
document.getElementById('mod-overlay-content').addEventListener('click', e => e.stopPropagation());
window.addEventListener('keydown', e => { if (e.key === 'Escape' && overlayOpen) closeOverlay(); });

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
    mod.dataset.hovered = '1';
    mod.style.transform = `scale(${(modBaseScale * 1.22).toFixed(4)})`;
    mod.style.zIndex    = '100';
    playGif(mod);
    showLabel(mod.dataset.file);
  });

  world.addEventListener('mouseout', e => {
    if (overlayOpen) return;
    const mod = e.target.closest('.module');
    if (!mod || mod.contains(e.relatedTarget)) return;
    mod.dataset.hovered = '';
    applyModBaseScale(mod, modBaseScale);
    mod.style.zIndex = '';
    revertGif(mod);
    hideLabel();
  });

  window.addEventListener('mousemove', e => {
    labelX = e.clientX; labelY = e.clientY;
    if (labelVisible && !labelRafId) labelRafId = requestAnimationFrame(updateLabelPos);
    if (isDragging) hideLabel();
  }, { passive: true });

  let gifTimer = null;
  viewport.addEventListener('mousemove', e => {
    clearTimeout(gifTimer);
    gifTimer = setTimeout(() => {
      const wx = e.clientX / scale + camX;
      const wy = e.clientY / scale + camY;
      const r  = CELL * 1.5;
      const c0 = Math.floor((wx - r) / CELL), c1 = Math.floor((wx + r) / CELL);
      const r0 = Math.floor((wy - r) / CELL), r1 = Math.floor((wy + r) / CELL);
      for (let row = r0; row <= r1; row++)
        for (let col = c0; col <= c1; col++) {
          const dx = wx - (col * CELL + IMG / 2), dy = wy - (row * CELL + IMG / 2);
          if (dx * dx + dy * dy < r * r) preloadGif(moduleAt(col, row));
        }
    }, 80);
  });
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
    clearTimeout(gyroResumeTimer);
    gyroActive = false;
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
    const wasMoved  = touchMoved;
    const wasPressed = pressedModule !== null;
    clearTimeout(pressTimer);
    deactivateModulePress();
    isDragging = false; touch1 = null; pinchState = null;
    const cap = 25;
    velX = Math.max(-cap, Math.min(cap, velX));
    velY = Math.max(-cap, Math.min(cap, velY));
    if (gyroEnabled) {
      clearTimeout(gyroResumeTimer);
      gyroResumeTimer = setTimeout(() => { calibrateGyro(); gyroActive = true; }, 400);
    }
    // Tap detection: short touch, no movement, no long press
    if (!wasMoved && !wasPressed && !overlayOpen) {
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

logoBtn.addEventListener('click', resetCamera);
