// ── About page: word-reveal + spotlight ──────────────────────────────────────
const ABOUT_FULL = "Eidos is an on-demand robotic service that extends AI responses beyond the screen and into physical action in the real world. Whatever you need, it arrives in the form best suited to the moment, helping turn your intentions into reality. As possibilities once confined to the screen lead to tangible change, AI will become a future living infrastructure that supports every moment of everyday life. Whenever and wherever you need it, call Eidos.";

const aboutTextEl     = document.getElementById('about-text');
const aboutTextBlueEl = document.getElementById('about-text-blue');
let revealTimers = [];

function buildWordSpans(el) {
  const words = ABOUT_FULL.split(' ');
  el.innerHTML = '';
  const inners = [];
  words.forEach((word, i) => {
    const wWrap = document.createElement('span');
    wWrap.className = 'word-wrap';
    const wInner = document.createElement('span');
    wInner.className = 'word-inner';
    wInner.textContent = word;
    wWrap.appendChild(wInner);
    inners.push(wInner);
    el.appendChild(wWrap);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
  return inners;
}

function startTyping() {
  revealTimers.forEach(t => clearTimeout(t));
  revealTimers = [];
  const mainInners = buildWordSpans(aboutTextEl);
  const blueInners = buildWordSpans(aboutTextBlueEl);
  const stagger = 70;
  mainInners.forEach((inner, i) => {
    const t = setTimeout(() => {
      inner.classList.add('revealed');
      blueInners[i].classList.add('revealed');
    }, i * stagger);
    revealTimers.push(t);
  });
}

// Start animation on load
startTyping();

// ── Spotlight: text mask reveal ───────────────────────────────────────────────
(function () {
  const textContainer = document.getElementById('about-text-container');
  const blueLayer     = document.getElementById('about-text-blue');

  textContainer.addEventListener('mousemove', e => {
    const r = textContainer.getBoundingClientRect();
    blueLayer.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    blueLayer.style.setProperty('--my', (e.clientY - r.top)  + 'px');
  });
  textContainer.addEventListener('mouseleave', () => {
    blueLayer.style.setProperty('--mx', '-9999px');
    blueLayer.style.setProperty('--my', '-9999px');
  });

  const badgeWrap = document.getElementById('about-badge-wrap');
  const badgeSpot = document.getElementById('badge-spotlight');
  if (badgeWrap && badgeSpot) {
    badgeWrap.addEventListener('mouseenter', () => { badgeSpot.style.opacity = '1'; });
    badgeWrap.addEventListener('mouseleave', () => { badgeSpot.style.opacity = '0'; });
    badgeWrap.addEventListener('mousemove', e => {
      const r = badgeWrap.getBoundingClientRect();
      badgeSpot.style.left = (e.clientX - r.left) + 'px';
      badgeSpot.style.top  = (e.clientY - r.top)  + 'px';
    });
  }
})();

// ── Logo: navigate to main ────────────────────────────────────────────────────
document.getElementById('logo-btn').addEventListener('click', () => {
  window.location.href = '../';
});
