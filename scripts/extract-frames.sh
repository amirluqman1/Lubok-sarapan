#!/usr/bin/env bash
# Converts the source video into scroll-sequence frames + menu images.
#   public/frames/hd/000.webp …   every frame, 720 px wide (default)
#   public/frames/lite/000.webp … every 2nd frame, 480 px wide (slow connections / save-data)
#   public/img/menu-*.webp        crops of real frames for the menu cards
# Usage: bash scripts/extract-frames.sh [media/nasi-lemak-assembly.mp4]
set -euo pipefail
SRC="${1:-media/nasi-lemak-assembly.mp4}"
OUT=public
TMP=$(mktemp -d)
rm -rf "$OUT/frames" && mkdir -p "$OUT/frames/hd" "$OUT/frames/lite" "$OUT/img"
ffmpeg -v error -i "$SRC" -vsync 0 "$TMP/%03d.png"
i=0
for f in "$TMP"/*.png; do
  n=$(printf '%03d' $i)
  ffmpeg -v error -y -i "$f" -c:v libwebp -quality 66 "$OUT/frames/hd/$n.webp"
  if (( i % 2 == 0 )); then
    ffmpeg -v error -y -i "$f" -vf scale=480:-2 -c:v libwebp -quality 62 "$OUT/frames/lite/$(printf '%03d' $((i/2))).webp"
  fi
  i=$((i+1))
done
LAST=$(printf '%03d' $((i-1)))
crop() { ffmpeg -v error -y -i "$TMP/$1.png" -vf "crop=$2,scale=$3:-2" -c:v libwebp -quality 78 "$OUT/img/$4.webp"; }
crop "$LAST" 720:540:0:400 800 menu-full
crop 110 720:540:0:400 800 menu-biasa
crop "$LAST" 520:390:40:400 800 menu-chicken
crop "$LAST" 400:300:320:620 800 menu-sambal
crop "$LAST" 400:300:80:640 800 menu-egg
crop "$LAST" 720:1280:0:0 720 poster
echo "frames: $i  (hd) / $(( (i+1)/2 )) (lite)"
du -sh "$OUT/frames/hd" "$OUT/frames/lite" "$OUT/img"
rm -rf "$TMP"
