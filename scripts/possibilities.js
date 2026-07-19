// ── Possibilities Carousel ────────────────────────────────────────────────────
(function () {
  const IMGS      = 18;
  const SPEED_PC  = 80;
  const SPEED_MOB = 50;
  const DRAG_RESUME_DELAY       = 1000;
  const DEACTIVATE_RESUME_DELAY = 3000;

  // Safari (desktop + iOS) doesn't support WebM alpha — use HEVC .mov instead.
  const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Native canvas size of each source video (from ffprobe) — the robots were
  // deliberately rendered at different relative scales, so these ratios are
  // used to size each one on screen instead of uniformly filling its slot.
  const VIDEO_DIMS = {
    1:  [1200, 1700], 2:  [1200, 1700], 3:  [1500, 1600],
    4:  [1500, 2100], 5:  [2000, 2100], 6:  [1500, 1800],
    7:  [1500, 1200], 8:  [1600, 2000], 9:  [1300, 1800],
    10: [2200, 1700], 11: [1200, 1700], 12: [1900, 1600],
    13: [2000, 1800], 14: [2100, 1500], 15: [1800, 2100],
    16: [1800, 1800], 17: [1200, 1800], 18: [1500, 1700],
  };
  // Largest native long edge across all 18 — the robot(s) at this size render
  // at REF_FRACTION of the slot; everyone else scales down proportionally.
  const SRC_BASE      = Math.max(...Object.values(VIDEO_DIMS).map(([w, h]) => Math.max(w, h)));
  const REF_FRACTION  = 1.1;

  const carousel = document.getElementById('poss-carousel');
  const track    = document.getElementById('poss-track');
  if (!carousel || !track) return;

  // Each robot's video: assign the per-browser source and force a frame to
  // paint while paused (preload="metadata" alone often leaves the canvas
  // blank until a frame is actually decoded).
  track.querySelectorAll('.poss-video').forEach(video => {
    const n = video.closest('.poss-item').dataset.n;
    const ext = IS_SAFARI ? 'mov' : 'webm';
    video.src = `assets/hq/${n}.${ext}`;
    video.addEventListener('loadedmetadata', () => {
      if (video.currentTime === 0) {
        try { video.currentTime = 0.01; } catch {}
      }
    }, { once: true });
  });

  let itemW     = 0;
  let totalW    = 0;
  let speed     = SPEED_PC;
  let offsetX   = 0;
  let paused    = false;
  let animating = false;
  let lastTs    = null;

  let dragMoved       = false;
  let dragStartX      = 0;
  let dragOffsetStart = 0;
  let resumeTimer     = null;
  let pointerDownX    = 0;
  let pointerHeld     = false;

  let activeEl    = null;
  let activeVideo = null;

  function isMobile() { return window.innerWidth <= 768; }

  function updateDimensions() {
    const divisor    = isMobile() ? 1.15 : 3.3;
    const refDivisor = isMobile() ? 1.0  : 2.7;
    speed  = isMobile() ? SPEED_MOB : SPEED_PC;
    itemW  = window.innerWidth / divisor;
    totalW = itemW * IMGS;
    // Robot size is tied to refDivisor, not the item slot width — so slot
    // spacing (divisor) can be tightened without shrinking the robots.
    const refPx = (window.innerWidth / refDivisor) * REF_FRACTION;
    document.querySelectorAll('.poss-item').forEach(el => {
      el.style.width = itemW + 'px';
      const dims = VIDEO_DIMS[el.dataset.n];
      const video = el.querySelector('.poss-video');
      if (dims && video) {
        video.style.width  = Math.round(refPx * dims[0] / SRC_BASE) + 'px';
        video.style.height = Math.round(refPx * dims[1] / SRC_BASE) + 'px';
      }
    });
  }
  updateDimensions();
  window.addEventListener('resize', updateDimensions);

  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

  // Bumping animToken cancels any in-flight animateTo — otherwise a click
  // that deactivates mid-centering-animation would leave the old animation's
  // rAF loop running, visibly nudging the belt for the rest of its duration
  // even though playback already stopped.
  let animToken = 0;

  function animateTo(target, duration, onDone) {
    const myToken = ++animToken;
    animating = true;
    paused    = true;
    const startOffset = offsetX;
    const startTime   = performance.now();
    let diff = ((target - startOffset) % totalW + totalW) % totalW;
    if (diff > totalW / 2) diff -= totalW;
    const endOffset = startOffset + diff;

    function step(ts) {
      if (myToken !== animToken) return;
      const t = Math.min((ts - startTime) / duration, 1);
      offsetX = startOffset + diff * easeInOut(t);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        offsetX = ((endOffset % totalW) + totalW) % totalW;
        animating = false;
        onDone && onDone();
      }
    }
    requestAnimationFrame(step);
  }

  function render(ts) {
    if (!paused && !animating) {
      if (lastTs !== null) {
        offsetX += (ts - lastTs) * speed / 1000;
        if (offsetX >= totalW) offsetX -= totalW;
      }
      lastTs = ts;
    } else {
      lastTs = null;
    }
    track.style.transform = `translateX(${-offsetX}px)`;
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function scheduleResume(delay) {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; }, delay);
  }

  // ── Active robot: centers, plays looping with sound; siblings dim to 30% ──
  function deactivate() {
    animToken++;      // cancel any in-flight centering animation
    animating = false;
    if (activeEl) {
      activeVideo.pause();
      try { activeVideo.currentTime = 0; } catch {}
      activeVideo.muted = true;
      activeEl.classList.remove('active');
      track.classList.remove('has-active');
      activeEl    = null;
      activeVideo = null;
    }
    scheduleResume(DEACTIVATE_RESUME_DELAY);
  }

  function activate(domIdx, el) {
    const video = el.querySelector('.poss-video');
    if (!video) return;
    clearTimeout(resumeTimer);
    if (activeEl && activeEl !== el) {
      activeVideo.pause();
      try { activeVideo.currentTime = 0; } catch {}
      activeVideo.muted = true;
      activeEl.classList.remove('active');
    }
    activeEl    = el;
    activeVideo = video;
    el.classList.add('active');
    track.classList.add('has-active');
    // Unmute + play synchronously within the click handler's call stack, so
    // browsers treat this as a user gesture and allow audio playback.
    video.muted = false;
    video.play().catch(() => {});

    const center = window.innerWidth / 2 - itemW / 2;
    const target = domIdx * itemW - center;
    animateTo(((target % totalW) + totalW) % totalW, 900);
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (animating) return;
    dragMoved       = false;
    pointerDownX    = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartX      = pointerDownX;
    dragOffsetStart = offsetX;
    pointerHeld     = true;
    paused          = true;
    clearTimeout(resumeTimer);
    carousel.classList.add('dragging');
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!pointerHeld) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = dragStartX - clientX;
    if (!dragMoved && Math.abs(clientX - pointerDownX) > 5) dragMoved = true;
    if (dragMoved) {
      offsetX = ((dragOffsetStart + delta) % totalW + totalW) % totalW;
    }
  }

  function onPointerUp(e) {
    pointerHeld = false;
    carousel.classList.remove('dragging');
    if (!dragMoved) {
      const clientX  = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const trackX   = clientX + offsetX;
      const domCount = track.children.length;
      const domIdx   = ((Math.floor(trackX / itemW) % domCount) + domCount) % domCount;
      const el       = track.children[domIdx];
      if (el !== activeEl) {
        // Clicking the active robot itself is a no-op (stays playing).
        // Clicking anywhere else stops it; clicking a robot while none is
        // active picks that one.
        if (activeEl) deactivate();
        else activate(domIdx, el);
      }
    } else {
      scheduleResume(DRAG_RESUME_DELAY);
    }
    dragMoved = false;
  }

  carousel.addEventListener('mousedown',  onPointerDown, { passive: false });
  carousel.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('mousemove',  onPointerMove);
  window.addEventListener('touchmove',  onPointerMove, { passive: true });
  window.addEventListener('mouseup',    onPointerUp);
  window.addEventListener('touchend',   onPointerUp);
})();

// ── Logo: navigate to main ────────────────────────────────────────────────────
document.getElementById('logo-btn').addEventListener('click', () => {
  window.location.href = '../';
});
