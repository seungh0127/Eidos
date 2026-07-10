#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  set -- assets/modules/S-*.mov assets/modules/U-*.mov
fi

mkdir -p assets/thumbs assets/hq work/module-convert

WHITE_900="scale='if(gte(iw,ih),900,-2)':'if(gte(iw,ih),-2,900)':flags=lanczos,format=rgba,split[fg][bg];[bg]drawbox=x=0:y=0:w=iw:h=ih:color=white@1:t=fill[bg];[bg][fg]overlay=format=auto"
ALPHA_1600="scale='if(gte(iw,ih),1600,-2)':'if(gte(iw,ih),-2,1600)':flags=lanczos,format=yuva420p"

for src in "$@"; do
  [ -f "$src" ] || continue
  name="$(basename "$src" .mov)"
  echo "Converting $name"

  ffmpeg -y -v error -i "$src" \
    -vf "$WHITE_900,format=yuv420p" \
    -an -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
    -crf 18 -preset slow -movflags +faststart \
    "assets/${name}.mp4"

  tmp_png="work/module-convert/${name}.png"
  ffmpeg -y -v error -i "$src" \
    -vf "$WHITE_900,format=rgb24" \
    -frames:v 1 "$tmp_png"
  cwebp -quiet -q 88 "$tmp_png" -o "assets/thumbs/${name}.webp"
  rm -f "$tmp_png"

  ffmpeg -y -v error -i "$src" \
    -vf "$ALPHA_1600" \
    -an -c:v libvpx-vp9 -pix_fmt yuva420p \
    -b:v 0 -crf 28 -deadline good -row-mt 1 \
    "assets/hq/${name}.webm"

  ffmpeg -y -v error -i "$src" \
    -vf "$ALPHA_1600,format=yuv420p" \
    -an -c:v libx265 -tag:v hvc1 -pix_fmt yuv420p \
    -crf 22 -preset medium -movflags +faststart \
    "assets/hq/${name}.mov"
done
