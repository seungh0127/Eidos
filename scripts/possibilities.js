// ── Possibilities Carousel ────────────────────────────────────────────────────
(function () {
  const IMGS      = 18;
  const SPEED_PC  = 80;
  const SPEED_MOB = 50;
  const DRAG_RESUME_DELAY       = 1000;
  const DEACTIVATE_RESUME_DELAY = 3000;
  const LOOP_LIMIT              = 2;   // auto-advance after this many plays

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

  const ROBOT_INFO = {
    1:  { name: 'Carry Mate',     request: 'Bring my laptop here from inside the house.' },
    2:  { name: 'Play Mate',      request: 'Take care of my dog while I’m away.' },
    3:  { name: 'Service Runner', request: 'It’s crowded and hectic. Please handle the serving and item delivery.' },
    4:  { name: 'Heavy Porter',   request: 'These moving boxes are too heavy. Move them quickly from the entrance to the living room.' },
    5:  { name: 'Power Brace',    request: 'Hold the camera equipment steady so it doesn’t shake.' },
    6:  { name: 'Pace Mate',      request: 'Run with me today and match my pace. Please carry my bag too.' },
    7:  { name: 'Robo Pup',       request: 'Take care of my child while I step out for a bit.' },
    8:  { name: 'Cart Centaur',   request: 'Pull this heavy cart and equipment safely to the destination.' },
    9:  { name: 'Yard Runner',    request: 'Run a few small errands between the house and the yard.' },
    10: { name: 'Info Carrier',   request: 'Show information to people at the event and hand out items at the same time.' },
    11: { name: 'Multi Hand',     request: 'Help me organize ingredients and clean up while I cook.' },
    12: { name: 'Snow Porter',    request: 'It’s hard to carry things through the snow. Please move the equipment and supplies.' },
    13: { name: 'Lift Loader',    request: 'Lift these heavy boxes from the floor and place them on the loading platform.' },
    14: { name: 'Aqua Scout',     request: 'Check the flooded area and clean where needed.' },
    15: { name: 'Cable Climber',  request: 'Help me install cables and camera equipment in a high place.' },
    16: { name: 'Quad Worker',    request: 'Hold this part in place and assemble it precisely.' },
    17: { name: 'Pocket Cart',    request: 'I have too many small things to carry. Load them up and follow beside me.' },
    18: { name: 'Scan Keeper',    request: 'Scan this whole space and record what has changed.' },
  };

  const carousel     = document.getElementById('poss-carousel');
  const track        = document.getElementById('poss-track');
  const infoEl       = document.getElementById('poss-info');
  const infoBadgeEl  = document.getElementById('poss-info-badge');
  const infoReqEl    = document.getElementById('poss-info-request');
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
    // Looping is driven manually (see onVideoEnded) so playback counts can
    // be tracked and the carousel can auto-advance after LOOP_LIMIT plays.
    video.loop = false;
    video.addEventListener('ended', onVideoEnded);
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

  let activeEl        = null;
  let activeVideo     = null;
  let activeLoopCount = 0;

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
    infoEl.classList.remove('visible');
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
    // Always start from frame 0, even the very first activation — the
    // paused-thumbnail trick in the setup loop above nudges currentTime to
    // 0.01, so without this reset the very first play could visibly skip in.
    try { video.currentTime = 0; } catch {}
    activeEl        = el;
    activeVideo     = video;
    activeLoopCount = 0;
    el.classList.add('active');
    track.classList.add('has-active');
    const info = ROBOT_INFO[el.dataset.n];
    if (info) {
      infoBadgeEl.textContent = info.name;
      // One sentence per line — requests are short (1-2 sentences) but read
      // cleaner broken up rather than wrapping mid-sentence.
      const sentences = info.request.match(/[^.]+\.\s*/g) || [info.request];
      infoReqEl.innerHTML = sentences.map(s => s.trim()).join('<br>');
    }
    infoEl.classList.add('visible');
    // Unmute + play synchronously within the click handler's call stack, so
    // browsers treat this as a user gesture and allow audio playback.
    video.muted = false;
    video.play().catch(() => {});

    const center = window.innerWidth / 2 - itemW / 2;
    const target = domIdx * itemW - center;
    animateTo(((target % totalW) + totalW) % totalW, 500);
  }

  // After the active robot has played through LOOP_LIMIT times, move on to
  // the next one in sequence instead of looping forever.
  function onVideoEnded(e) {
    const video = e.target;
    if (video !== activeVideo) return;   // stale listener from a non-active video
    activeLoopCount++;
    if (activeLoopCount < LOOP_LIMIT) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      advanceToNext();
    }
  }

  function advanceToNext() {
    if (!activeEl) return;
    const items   = track.children;
    const idx     = Array.prototype.indexOf.call(items, activeEl);
    const nextIdx = (idx + 1) % items.length;
    activate(nextIdx, items[nextIdx]);
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (animating) return;
    dragMoved    = false;
    pointerDownX = e.touches ? e.touches[0].clientX : e.clientX;
    if (activeEl) {
      // A robot is active — leave the belt in place while it plays. Clicks
      // still work (onPointerUp reads its own coordinates independently),
      // just the drag-to-scroll machinery stays inert.
      pointerHeld = false;
      e.preventDefault();
      return;
    }
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
    if (e.touches) e.preventDefault();   // stop the page from scrolling under the drag
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = dragStartX - clientX;
    if (!dragMoved && Math.abs(clientX - pointerDownX) > 5) dragMoved = true;
    if (dragMoved) {
      offsetX = ((dragOffsetStart + delta) % totalW + totalW) % totalW;
    }
  }

  // Slots tile the whole carousel edge-to-edge, but each robot's actual
  // video content is smaller than its slot (empty margin above it, and
  // around it for non-square robots) — so "background" only makes sense as
  // "outside every robot's own rendered bounds," not "outside every slot."
  function findRobotAt(clientX, clientY) {
    const items = track.children;
    for (let i = 0; i < items.length; i++) {
      const video = items[i].querySelector('.poss-video');
      if (!video) continue;
      const r = video.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return { el: items[i], domIdx: i };
      }
    }
    return null;
  }

  function onPointerUp(e) {
    pointerHeld = false;
    carousel.classList.remove('dragging');
    if (!dragMoved) {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const hit = findRobotAt(clientX, clientY);
      if (!hit) {
        // Clicked the background — return to the default (no robot
        // selected) state.
        deactivate();
      } else if (hit.el === activeEl) {
        // Clicking the already-active robot again stops it.
        deactivate();
      } else {
        // Clicking any other robot (whether or not one is already active)
        // switches straight to it — activate() itself stops whatever was
        // previously playing before starting the new one.
        activate(hit.domIdx, hit.el);
      }
    } else {
      scheduleResume(DRAG_RESUME_DELAY);
    }
    dragMoved = false;
  }

  carousel.addEventListener('mousedown',  onPointerDown, { passive: false });
  carousel.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('mousemove',  onPointerMove);
  window.addEventListener('touchmove',  onPointerMove, { passive: false });
  window.addEventListener('mouseup',    onPointerUp);
  window.addEventListener('touchend',   onPointerUp);
})();

// ── Logo: navigate to main ────────────────────────────────────────────────────
document.getElementById('logo-btn').addEventListener('click', () => {
  window.location.href = '../';
});
