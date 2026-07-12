# Handoff: fill in L/EX category real sources

Working note for whoever (human or Claude) picks up the L/EX category work.
**Delete this file once L/EX are fully implemented and merged** — it's not
meant to stay in the repo long-term.

## Project in one paragraph

Eidos is a static, infinite-canvas robot-module gallery (`index.html` /
`scripts/main.js` / `styles/main.css`), deployed as a GitHub Pages MPA
(`.github/workflows/`). The canvas tiles `.module` elements across a seeded
PRNG grid (`moduleAt(c, r)`), each showing a still thumbnail at rest, a
looping hover video on mouseover/press, and — on click/tap — a full-screen
"detail overlay" with a large, high-quality alpha video plus title/metadata.
There is also a `/admin/` color-grading tool (unrelated to this task, see
`admin/`, `scripts/color-curve.js` if curious — do not need to touch it).

## What's already done vs. what's left

**Fully implemented with real 3D-rendered sources**: categories H (Head), C
(Core), S (Shoulder), U (Arm), F (Wrist), E (Gripper/End-effector), W (new,
names TBD) — 89 modules total.

**Still placeholder** (dark box showing just the module code, e.g. "L-B-3"):
categories **L** (Legs/locomotion base) and **EX** (Extension/trailer). No
source video exists for these yet. This is the last remaining chunk of the
same pipeline that was applied to every other category.

### Exact module list to fill in

From `scripts/main.js`, the `MODULES` array currently has (verify this is
still current before starting — it may have changed):

```
L:  L-A-2, L-A-3,
    L-B-1, L-B-2, L-B-3,
    L-C-1, L-C-2, L-C-3, L-C-4,
    L-D-1, L-D-2, L-D-3,
    L-E-1, L-E-2,
    L-F-1, L-F-2, L-F-3,
    L-G-1
    (18 modules)

EX: EX-A-0, EX-A-1, EX-A-2,
    EX-B-1, EX-C-1, EX-D-1
    (6 modules)
```
Total: **24 modules**.

⚠️ **Known inconsistency to resolve**: `MODULE_NAMES` (in `scripts/main.js`)
has an entry for `'L-A-1': 'Standard Biped Legs'`, but `L-A-1` is **not** in
the `MODULES` array — it's orphaned/unused dead data (a leftover ID that
never got included in the live rotation). Ask the user whether `L-A-1`
should (a) be added to `MODULES` with a real source, or (b) have its
`MODULE_NAMES` entry deleted as stale. Don't just silently guess.

## Step 0: get the source files

The user needs to drop 24 `.mov` files into `assets/modules/`, one per
module code above, e.g. `assets/modules/L-A-2.mov`, `assets/modules/EX-A-0.mov`,
etc. This directory is **gitignored** (raw masters, multi-hundred-MB each,
never committed) — check `.gitignore` has an `assets/modules/` entry; add it
if somehow missing.

Before doing any encoding, verify:
```bash
for cat in L EX; do echo "$cat: $(ls assets/modules/${cat}-*.mov 2>/dev/null | wc -l)"; done
find assets/modules -maxdepth 1 -name "* *" -type f   # must be empty (macOS Finder duplicate check)
```
Cross-check the exact filenames present against the module list above — if
counts don't match or specific files are missing, **stop and ask the user**
rather than proceeding with partial data (this happened during the
H/C/S/U/F/E/W round: F was completely missing and S-D-3 never arrived, had
to pause and ask).

## Step 1: figure out which alpha convention this batch uses

**This is the single most important step — do not skip it and do not assume
the format based on a previous round.** Two different source deliveries
were used across this project's history, with incompatible processing
formulas:

| | Old convention (used for the original H/C batch) | New convention (used for the H/C/S/U/F/E/W replacement batch) |
|---|---|---|
| Codec | `qtrle`, pix_fmt `argb` | `prores` (ProRes 4444), pix_fmt `yuva444p12le` |
| Alpha type | Straight, matte = **white** | **Premultiplied**, matte = black |
| Transparent region | RGB (255,255,255), alpha 0 | RGB (0,0,0), alpha 0 |

**Diagnostic procedure** (run once on any one new L/EX source file):
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt \
  -of default=noprint_wrappers=1 assets/modules/L-A-2.mov
```
Then sample a semi-transparent edge pixel and check whether RGB scales
proportionally with alpha (premultiplied) or stays close to a constant
matte color regardless of alpha (straight):
```python
import subprocess
raw = subprocess.run(['ffmpeg','-y','-i','assets/modules/L-A-2.mov','-frames:v','1',
                       '-pix_fmt','rgba','-f','rawvideo','-'], capture_output=True).stdout
w = 2000  # match actual decoded width from ffprobe width/height
h = 2000
# scan a row through the object for x where 1 <= alpha <= 250, print (x,r,g,b,a)
for y in [h//2]:
    for x in range(w):
        i = (y*w+x)*4
        a = raw[i+3]
        if 1 <= a <= 250:
            print(x, raw[i], raw[i+1], raw[i+2], a)
```
- If RGB values are roughly `true_edge_color * (alpha/255)` (i.e. they shrink
  toward 0 as alpha drops, at a consistent ratio across several samples) →
  **premultiplied**, matte usually black. Use the "new convention" formulas
  below.
- If RGB values stay close to a constant color (all channels near 255, or
  near some other fixed value) regardless of alpha → **straight alpha**,
  matte is whatever that constant color is (usually white). Use the "old
  convention" un-matte formula instead (see the extensive investigation in
  git log around commits related to "un-matte overlay WebM alpha edges" —
  `git log --oneline --all | grep -i unmatte` to find it, or just ask the
  session history / user if unsure).

Do this check on at least 2 different L/EX source files (they might not all
be delivered in the same batch/convention if provided at different times).

### Formulas for the (more likely) new/premultiplied convention

If step 1 confirms premultiplied-over-black (the most recent/current
delivery convention), use these two ffmpeg geq formulas — both were
validated extensively on H-A-1 and C-D-2 (light + dark/complex geometry)
with zero edge haze or fringe when composited over both white and solid
blue backgrounds:

**A. Opaque white-bg composite** (for thumbnail PNG and hover MP4 — these
never need alpha, so just flatten straight to the final white background,
no un-premultiply required):
```
format=gbrap,geq=\
r='clip(r(X\,Y)+255*(1-alpha(X\,Y)/255)\,0\,255)':\
g='clip(g(X\,Y)+255*(1-alpha(X\,Y)/255)\,0\,255)':\
b='clip(b(X\,Y)+255*(1-alpha(X\,Y)/255)\,0\,255)',format=rgb24
```

**B. Un-premultiply to straight alpha** (for the alpha-preserving overlay
outputs — WebM and MOV. Browsers expect *straight*, not premultiplied,
alpha in `<video>` — feeding raw premultiplied data directly causes a
double-alpha darkening/black-fringe artifact, confirmed earlier this
project):
```
format=gbrap,geq=\
r='clip(255*r(X\,Y)/max(alpha(X\,Y)\,1)\,0\,255)':\
g='clip(255*g(X\,Y)/max(alpha(X\,Y)\,1)\,0\,255)':\
b='clip(255*b(X\,Y)/max(alpha(X\,Y)\,1)\,0\,255)':\
a='alpha(X\,Y)'
```

## Step 2: the four outputs per module (same structure as every other category)

| Output | Path | What it's for | Format / settings |
|---|---|---|---|
| Thumbnail | `assets/thumbs/{file}.png` | shown at rest on the main gallery | PNG, white bg, no alpha, 900px cap, formula A |
| Hover | `assets/{file}.mp4` | plays on mouseover/press on the main gallery | H.264, white bg, no alpha, 900px cap, crf 20, preset slow, `-movflags +faststart` |
| Overlay (Chrome) | `assets/hq/{file}.webm` | detail overlay video, Chrome/other browsers | VP9, straight alpha (formula B), 1600px cap, `-color_range pc` (see gotcha #1 below), crf 24 |
| Overlay (Safari) | `assets/hq/{file}.mov` | detail overlay video, Safari/WebKit | HEVC+alpha: formula-B intermediate → ProRes4444 → `avconvert -p PresetHEVCHighestQualityWithAlpha` |

Reference shell function (adapt `WHITE_COMPOSITE`/`UNPREMULT` to whichever
formula step 1 determined — this example assumes the new/premultiplied
convention):

```bash
SRC="assets/modules"
TMP="/tmp/l_ex_reencode"   # use the session scratchpad dir if available
mkdir -p "$TMP" assets/thumbs assets/hq

WHITE_COMPOSITE="format=gbrap,geq=\
r='clip(r(X\,Y)+255*(1-alpha(X\,Y)/255)\,0\,255)':\
g='clip(g(X\,Y)+255*(1-alpha(X\,Y)/255)\,0\,255)':\
b='clip(b(X\,Y)+255*(1-alpha(X\,Y)/255)\,0\,255)',format=rgb24"

UNPREMULT="format=gbrap,geq=\
r='clip(255*r(X\,Y)/max(alpha(X\,Y)\,1)\,0\,255)':\
g='clip(255*g(X\,Y)/max(alpha(X\,Y)\,1)\,0\,255)':\
b='clip(255*b(X\,Y)/max(alpha(X\,Y)\,1)\,0\,255)':\
a='alpha(X\,Y)'"

encode_one() {
  local src="$1" name="$2"

  ffmpeg -y -v error -i "$src" -frames:v 1 \
    -vf "scale='if(gte(iw,ih),900,-2)':'if(gte(iw,ih),-2,900)':flags=lanczos,$WHITE_COMPOSITE" \
    "assets/thumbs/${name}.png"

  ffmpeg -y -v error -i "$src" \
    -vf "scale='if(gte(iw,ih),900,-2)':'if(gte(iw,ih),-2,900)':flags=lanczos,$WHITE_COMPOSITE" \
    -an -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
    -crf 20 -preset slow -movflags +faststart \
    "assets/${name}.mp4"

  ffmpeg -y -v error -i "$src" \
    -vf "scale='if(gte(iw,ih),1600,-2)':'if(gte(iw,ih),-2,1600)':flags=lanczos,$UNPREMULT,format=yuva420p" \
    -an -c:v libvpx-vp9 -pix_fmt yuva420p -color_range pc -crf 24 -b:v 0 -deadline good -row-mt 1 \
    "assets/hq/${name}.webm"

  local prores="$TMP/${name}_prores.mov"
  ffmpeg -y -v error -i "$src" \
    -vf "scale='if(gte(iw,ih),1600,-2)':'if(gte(iw,ih),-2,1600)':flags=lanczos,$UNPREMULT" \
    -c:v prores_ks -profile:v 4 -an "$prores"
  avconvert -s "$prores" -o "assets/hq/${name}.mov" -p PresetHEVCHighestQualityWithAlpha --replace 2>/dev/null
  rm -f "$prores"

  echo "done: $name"
}
export -f encode_one
export SRC TMP WHITE_COMPOSITE UNPREMULT

for f in "$SRC"/L-*.mov "$SRC"/EX-*.mov; do
  name=$(basename "$f" .mov)
  encode_one "$f" "$name" &
  while [ "$(jobs -r | wc -l)" -ge 4 ]; do sleep 0.3; done
done
wait
echo "=== ALL DONE ==="
```
Run this as a background job (24 modules × 4 outputs — several minutes),
check progress via `grep -c "^done:" logfile` against the expected total (24).

## Step 3: clean up old placeholder assets before/after re-encoding

L/EX currently have leftover placeholder assets from the very first phase
of this project (before any category had real sources — the original
GIF→WebM conversion):
- `assets/thumbs/{file}.png` — dark placeholder box image (just converted
  from webp to png in the immediately-preceding commit, see git log
  "Fix: convert L/EX placeholder thumbnails from webp to png")
- `assets/{file}.webm` — plain placeholder hover webm (no alpha needed
  distinction, this is the pre-3D-render placeholder clip)

Once real sources are encoded, **delete these stale placeholders** for every
module that now has real output, mirroring what was done for
H/C/S/U/F/E/W in the prior round:
```bash
# only for modules that now have real assets/hq/{file}.webm etc:
rm -f assets/{file}.webm   # old placeholder hover clip, superseded by {file}.mp4
# assets/thumbs/{file}.png gets overwritten in place by the new encode, no separate delete needed
```
Do **not** delete `assets/{file}.webm` for any L/EX module that doesn't yet
have a real source (leave its placeholder intact so it keeps rendering
correctly until its turn comes).

## Step 4: register the new modules in scripts/main.js

For **every module that now has real encoded output**, add its file code to
these three places (they currently do NOT include any L/EX entries — verify
with `grep -n "'L-\|'EX-" scripts/main.js` before/after):

1. **`MODULE_SRC`** (only if the source is not a plain 2000×2000 square —
   check native dimensions first):
   ```bash
   for f in assets/modules/L-*.mov assets/modules/EX-*.mov; do
     name=$(basename "$f" .mov)
     dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f")
     echo "$name: $dims"
   done
   ```
   Add entries in the same `'FILE': [width, height]` format as existing rows,
   only for files that differ from 2000×2000.

2. **`HQ_MODULES`** — add every newly-encoded file code here (controls
   whether the overlay uses the small placeholder video or the real
   `assets/hq/` high-quality one — see `getDetailVideoSrc()`).

3. **`HEVC_MODULES`** — add every newly-encoded file code here too (controls
   whether hover uses the H.264 MP4 vs a placeholder WebM, and whether
   overlay uses `.mov` on Safari — see `getHoverVideoSrc()` /
   `getDetailVideoSrc()`). In practice this project has always added a file
   to `HQ_MODULES` and `HEVC_MODULES` together, as a pair — there is no
   case so far where a module is in one but not the other.

4. Bump **`ASSET_VERSION`** (top of `scripts/main.js`) to a new value (e.g.
   today's date) so browsers fetch the new files instead of serving stale
   cached bytes at the same URLs.

## Dual-format architecture (why webm AND mov both exist)

- **Hover** (`getHoverVideoSrc`): always a single H.264 MP4, no alpha,
  flattened to white — works identically on Chrome and Safari (hardware
  decoded everywhere, no alpha-channel browser-compat concerns since
  there's no alpha at all). This is why hover doesn't need a Safari/Chrome
  branch.
- **Overlay** (`getDetailVideoSrc`): needs alpha (the detail view floats
  over a blurred/gradient background, not solid white), and **Chrome and
  Safari do not support the same alpha-video codec**:
  - Chrome → VP9 WebM with an alpha auxiliary track (`assets/hq/{file}.webm`)
  - Safari → HEVC with an alpha auxiliary track (`assets/hq/{file}.mov`) —
    this is an Apple-specific extension Chrome does not reliably support
    (tested directly earlier this project; results were inconsistent
    across platforms, so the two-codec split was kept rather than trying
    to unify on one format for both browsers)
  - Browser selection happens via `IS_SAFARI` (a UA sniff near the top of
    `scripts/main.js`) inside `getDetailVideoSrc()`.
- Modules NOT in `HQ_MODULES`/`HEVC_MODULES` (i.e. still placeholders) fall
  back to the old flat `assets/{file}.webm` for both hover and overlay —
  Chrome plays it, Safari just keeps showing the static thumbnail (no
  hard error, just no motion) since Safari can't decode WebM alpha at all
  and there's no `.mov` to fall back to for placeholders.

## Known gotchas (still apply — do not rediscover the hard way)

1. **Never use the `setrange=pc` ffmpeg FILTER.** It doesn't just tag
   color_range metadata — it actually rescales pixel values, darkening
   colors by ~15/255 on average vs the true source. Use `-color_range pc`
   as an **encoder output flag** only (already in the reference script
   above). This was a real, shipped regression earlier in this project;
   root-caused via pixel-level A/B testing.
2. **VP9 alpha WebM needs an explicit decoder when reading it back** for
   any verification/testing: `ffmpeg -c:v libvpx-vp9 -i file.webm ...`. The
   default decoder silently drops the alpha plane, which will make a
   perfectly fine file look broken during your own QA.
3. **Browsers expect straight (non-premultiplied) alpha.** Feeding
   premultiplied RGBA directly into the WebM/HEVC encoders causes a
   double-attenuation black-fringe artifact at semi-transparent edges.
4. **Cache-busting via `ASSET_VERSION`** — filenames never change across
   re-encodes, so every module asset URL has `?v=${ASSET_VERSION}`
   appended in `scripts/main.js`. Bump it whenever you ship new/changed
   binaries or a browser tab open on an old version won't see the update.
5. **Edge-quality verification method** (how every category was actually
   checked, not just assumed): decode the finished WebM/MOV to a still
   frame, composite it over a **solid `#3B82F6` blue background** (this
   makes any residual white/black fringe immediately visible, unlike
   testing against the site's actual blurred-gradient overlay background
   which can mask subtle haze), and visually inspect. Do this for at least
   one light-colored and one dark/geometrically-complex module per batch.

## Verification checklist before committing

```bash
# counts should match the number of newly-encoded modules
ls assets/thumbs/{L,EX}-*.png | wc -l
ls assets/{L,EX}-*.mp4 | wc -l
ls assets/hq/{L,EX}-*.webm | wc -l
ls assets/hq/{L,EX}-*.mov | wc -l

# alpha sanity (explicit decoder!) on a few samples
ffmpeg -c:v libvpx-vp9 -i assets/hq/L-A-2.webm -vf "alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN" -frames:v 1 -f null - 2>&1 | grep YMIN
ffprobe -v error -select_streams v:0 -show_entries stream=color_range -of csv=p=0 assets/hq/L-A-2.webm   # expect "pc"

# thumb corner should be pure white (255,255,255), not black
python3 -c "
import subprocess
raw = subprocess.run(['ffmpeg','-y','-i','assets/thumbs/L-A-2.png','-pix_fmt','rgb24','-f','rawvideo','-'], capture_output=True).stdout
print(tuple(raw[0:3]))
"
```
Then in the live preview:
1. Reload, confirm no console errors.
2. Hover a newly-added L/EX module on the main gallery — should show the
   real hover MP4, not a dark placeholder box.
3. Click/tap it — overlay should open with the real HQ alpha video, title,
   and product code. Compare edge quality against a solid-color background
   using the technique in gotcha #5.
4. Spot-check a couple more modules across different L/EX sub-groups (not
   just the first one) since geometry/lighting varies a lot between them
   (e.g. `L-G-1` "Monowheel Speedster" vs `EX-D-1` "Stargazer Trailer" look
   nothing alike).

## After L/EX are fully done

Once every module in `MODULES` has a real (non-placeholder) source, the
placeholder-fallback code paths in `getHoverVideoSrc()` /
`getDetailVideoSrc()` (the `HEVC_MODULES.has(file) ? ... : ...` ternaries)
become dead branches — not urgent to remove, but worth a cleanup pass someday.
Also consider deleting `scripts/convert-modules.sh` at that point (a
legacy Codex-era helper script, not invoked by anything live, still
references the old `.webp` thumbnail format — already flagged as
cleanup-later in a previous handoff, never acted on).
