// ── Possibilities Carousel ────────────────────────────────────────────────────
(function () {
  const IMGS      = 9;
  const SPEED_PC  = 80;
  const SPEED_MOB = 50;

  const carousel = document.getElementById('poss-carousel');
  const track    = document.getElementById('poss-track');
  if (!carousel || !track) return;

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

  function isMobile() { return window.innerWidth <= 768; }

  function updateDimensions() {
    const divisor = isMobile() ? 1.2 : 3.2;
    speed  = isMobile() ? SPEED_MOB : SPEED_PC;
    itemW  = window.innerWidth / divisor;
    totalW = itemW * IMGS;
    document.querySelectorAll('.poss-item').forEach(el => {
      el.style.width = itemW + 'px';
    });
  }
  updateDimensions();
  window.addEventListener('resize', updateDimensions);

  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

  function animateTo(target, duration, onDone) {
    animating = true;
    paused    = true;
    const startOffset = offsetX;
    const startTime   = performance.now();
    let diff = ((target - startOffset) % totalW + totalW) % totalW;
    if (diff > totalW / 2) diff -= totalW;
    const endOffset = startOffset + diff;

    function step(ts) {
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

  function scheduleResume() {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; }, 1000);
  }

  function onItemClick(idx) {
    const center = window.innerWidth / 2 - itemW / 2;
    const pos0 = idx * itemW - center;
    const pos1 = (idx + IMGS) * itemW - center;
    const d0 = Math.abs(((pos0 - offsetX + totalW) % totalW));
    const d1 = Math.abs(((pos1 - offsetX + totalW) % totalW));
    const target = d0 <= d1 ? pos0 : pos1;
    animateTo(((target % totalW) + totalW) % totalW, 900, scheduleResume);
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
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const trackX  = clientX + offsetX;
      const idx     = Math.floor(trackX / itemW) % IMGS;
      onItemClick(idx);
    } else {
      scheduleResume();
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
