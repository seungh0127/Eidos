// ── Shared color-curve math, used by both the main site and /admin/ ───────────
// Given control points (sorted, strictly increasing x) this builds a smooth
// 256-entry lookup table (LUT) via clamped Catmull-Rom interpolation, so the
// admin preview and the live site always compute pixel-identical results from
// the same stored control points.
const ColorCurve = (() => {
  const IDENTITY_POINTS = [[0, 0], [255, 255]];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // 1D clamped Catmull-Rom through sorted [x,y] points -> Array(256) of y (0-255).
  function buildLUT(points) {
    const pts = (points && points.length >= 2 ? points : IDENTITY_POINTS)
      .slice().sort((a, b) => a[0] - b[0]);
    const lut = new Array(256);

    // Exactly 2 points (the default, and any user-reduced curve) must render
    // as a true straight line — Catmull-Rom with duplicated phantom endpoints
    // does NOT reduce to a line (it bows away from identity by ~12/255 at the
    // quarter points), so short-circuit to plain linear interpolation here.
    if (pts.length === 2) {
      const [x0, y0] = pts[0], [x1, y1] = pts[1];
      const dx = x1 - x0;
      for (let x = 0; x <= 255; x++) {
        const t = dx === 0 ? 0 : (x - x0) / dx;
        lut[x] = clamp(Math.round(y0 + (y1 - y0) * t), 0, 255);
      }
      return lut;
    }

    for (let x = 0; x <= 255; x++) {
      // find segment [p1,p2] containing x
      let seg = pts.length - 2;
      for (let i = 0; i < pts.length - 1; i++) {
        if (x >= pts[i][0] && x <= pts[i + 1][0]) { seg = i; break; }
      }
      const p1 = pts[seg], p2 = pts[seg + 1];
      const p0 = pts[seg - 1] || p1;
      const p3 = pts[seg + 2] || p2;
      const dx = p2[0] - p1[0];
      const t = dx === 0 ? 0 : (x - p1[0]) / dx;
      const t2 = t * t, t3 = t2 * t;
      const y = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
      );
      lut[x] = clamp(Math.round(y), 0, 255);
    }
    return lut;
  }

  // Shadows/highlights: smooth falloff tone adjustment, +/-100 -> +/-60 levels
  // at the extreme, tapering to ~0 effect by the midtones.
  function applyShadowsHighlights(lut, shadows, highlights) {
    if (!shadows && !highlights) return lut;
    const out = new Array(256);
    for (let x = 0; x <= 255; x++) {
      const t = x / 255;
      const shadowWeight = Math.max(0, 1 - t / 0.5) ** 2;
      const highlightWeight = Math.max(0, (t - 0.5) / 0.5) ** 2;
      const delta = (shadows / 100) * 60 * shadowWeight + (highlights / 100) * 60 * highlightWeight;
      out[x] = clamp(Math.round(lut[x] + delta), 0, 255);
    }
    return out;
  }

  // Compose master curve + per-channel curve + shadows/highlights into one LUT.
  function composeChannelLUT(masterPoints, channelPoints, shadows, highlights) {
    const masterLUT = buildLUT(masterPoints);
    const channelLUT = buildLUT(channelPoints);
    let lut = new Array(256);
    for (let x = 0; x <= 255; x++) lut[x] = channelLUT[masterLUT[x]];
    lut = applyShadowsHighlights(lut, shadows, highlights);
    return lut;
  }

  function lutToTableValues(lut) {
    return lut.map(v => (v / 255).toFixed(4)).join(' ');
  }

  function isIdentity(points) {
    if (!points || points.length !== 2) return false;
    return points[0][0] === 0 && points[0][1] === 0 && points[1][0] === 255 && points[1][1] === 255;
  }

  // Create (once) a feComponentTransfer LUT filter with the given id, appended
  // to <body>. Returns the three feFuncR/G/B elements so callers can update
  // tableValues in place — used identically by the main site and /admin/.
  function ensureFilterSVG(id) {
    let filter = document.getElementById(id);
    if (filter) {
      return {
        R: document.getElementById(`${id}-R`),
        G: document.getElementById(`${id}-G`),
        B: document.getElementById(`${id}-B`),
      };
    }
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    filter = document.createElementNS(svgNS, 'filter');
    filter.id = id;
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    const transfer = document.createElementNS(svgNS, 'feComponentTransfer');
    const funcs = {};
    for (const ch of ['R', 'G', 'B']) {
      const func = document.createElementNS(svgNS, `feFunc${ch}`);
      func.setAttribute('type', 'table');
      func.id = `${id}-${ch}`;
      func.setAttribute('tableValues', '0 1');
      transfer.appendChild(func);
      funcs[ch] = func;
    }
    filter.appendChild(transfer);
    svg.appendChild(filter);
    document.body.appendChild(svg);
    return funcs;
  }

  function applyLUTsToFilter(id, lutR, lutG, lutB) {
    const funcs = ensureFilterSVG(id);
    funcs.R.setAttribute('tableValues', lutToTableValues(lutR));
    funcs.G.setAttribute('tableValues', lutToTableValues(lutG));
    funcs.B.setAttribute('tableValues', lutToTableValues(lutB));
  }

  return {
    IDENTITY_POINTS, buildLUT, applyShadowsHighlights, composeChannelLUT,
    lutToTableValues, isIdentity, ensureFilterSVG, applyLUTsToFilter,
  };
})();
