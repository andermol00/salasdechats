#!/usr/bin/env bash
# Generates the built-in GIF pack (no API keys, no external services).
# Every GIF is drawn with ImageMagick primitives, animated in 8 frames
# and saved with a transparent background.
set -u

OUT="public/gifs"
BASE="/tmp/gifbase"
FRAMES="/tmp/gifframes"
mkdir -p "$OUT" "$BASE" "$FRAMES"

STAR_POINTS=$(python3 - <<'PY'
import math
pts = []
for i in range(10):
    a = math.radians(-90 + i * 36)
    r = 38 if i % 2 == 0 else 16
    pts.append(f"{48 + r*math.cos(a):.1f},{48 + r*math.sin(a):.1f}")
print(" ".join(pts))
PY
)

# ---------- base drawings (96x96, transparent) ----------

convert -size 96x96 xc:none -fill '#ff4d6d' \
  -draw "path 'M48,80 C14,58 12,36 26,28 C36,22 45,27 48,34 C51,27 60,22 70,28 C84,36 82,58 48,80'" \
  -stroke '#ffc2cd' -strokewidth 3 -draw "path 'M30,38 Q34,29 43,27'" \
  "$BASE/heart.png"

convert -size 96x96 xc:none -fill '#ff8a1f' \
  -draw "path 'M48,8 C62,28 78,34 78,54 a30,30 0 0 1 -60,0 c0,-20 16,-26 30,-46 Z'" \
  -fill '#ffd166' \
  -draw "path 'M48,38 C54,48 62,51 62,61 a14,14 0 0 1 -28,0 c0,-10 8,-13 14,-23 Z'" \
  "$BASE/fire.png"

convert -size 96x96 xc:none -fill '#ffd166' -draw "circle 48,48 48,12" \
  -fill '#3a2a00' -draw "circle 34,40 34,35" -draw "circle 62,40 62,35" \
  -stroke '#3a2a00' -strokewidth 4 -draw "path 'M30,56 Q48,74 66,56'" \
  "$BASE/laugh.png"

convert -size 96x96 xc:none -fill '#8ec5ff' -draw "circle 48,48 48,12" \
  -fill '#12324f' -draw "circle 34,40 34,35" -draw "circle 62,40 62,35" \
  -stroke '#12324f' -strokewidth 4 -draw "path 'M32,66 Q48,52 64,66'" \
  -fill '#3ba7ff' -draw "circle 34,52 34,47" \
  "$BASE/cry.png"

convert -size 96x96 xc:none -fill '#cbd5e1' -draw "circle 48,48 48,12" \
  -fill '#334155' -draw "circle 34,40 34,35" -draw "circle 62,40 62,35" \
  -stroke '#334155' -strokewidth 4 -draw "path 'M32,66 Q48,54 64,66'" \
  "$BASE/sad.png"

convert -size 96x96 xc:none -fill '#fcd34d' -draw "circle 48,48 48,12" \
  -fill '#0f172a' -draw "roundrectangle 20,34 76,50 5,5" \
  -stroke '#0f172a' -strokewidth 4 -draw "path 'M32,60 Q48,72 64,60'" \
  "$BASE/cool.png"

convert -size 96x96 xc:none -fill '#4f9cf9' -draw "roundrectangle 14,44 32,78 6,6" \
  -fill '#2d7ff9' \
  -draw "path 'M36,78 L36,42 L50,16 a9,9 0 0 1 9,9 v13 h13 a7,7 0 0 1 7,9 l-5,24 a8,8 0 0 1 -8,7 Z'" \
  "$BASE/thumbsup.png"

convert "$BASE/thumbsup.png" -rotate 180 "$BASE/thumbsdown.png"

convert -size 96x96 xc:none -fill '#fbbf24' -draw "polygon $STAR_POINTS" \
  "$BASE/star.png"

convert -size 96x96 xc:none \
  -fill '#ef4444' -draw "path 'M30,52 L16,76 L34,66 Z'" -draw "path 'M66,52 L80,76 L62,66 Z'" \
  -fill '#fb923c' -draw "path 'M40,62 Q48,86 56,62 Z'" \
  -fill '#e2e8f5' -draw "path 'M48,6 C61,19 67,34 67,52 L48,62 L29,52 C29,34 35,19 48,6 Z'" \
  -fill '#38bdf8' -draw "circle 48,38 48,30" \
  "$BASE/rocket.png"

convert -size 96x96 xc:none -fill '#fde68a' -draw "roundrectangle 41,28 55,80 2,2" \
  -fill '#f43f5e' -draw "roundrectangle 16,40 80,80 5,5" \
  -fill '#fb7185' -draw "roundrectangle 12,28 84,44 4,4" \
  -fill '#fde68a' -draw "roundrectangle 41,44 55,80 2,2" \
  -draw "path 'M48,28 C38,28 32,22 36,16 C40,11 47,16 48,28 Z'" \
  -draw "path 'M48,28 C58,28 64,22 60,16 C56,11 49,16 48,28 Z'" \
  "$BASE/gift.png"

convert -size 96x96 xc:none \
  -fill '#7c3aed' -draw "path 'M42,14 L16,82 L46,58 Z'" \
  -fill '#a78bfa' -draw "path 'M42,14 L74,54 L16,82 Z'" \
  -fill '#fbbf24' -draw "circle 76,16 76,11" \
  -fill '#22d3ee' -draw "circle 86,36 86,31" \
  -fill '#f472b6' -draw "circle 62,8 62,4" \
  "$BASE/party.png"

convert -size 96x96 xc:none -fill '#7c4a21' -draw "roundrectangle 20,44 64,76 5,5" \
  -stroke '#7c4a21' -strokewidth 5 -draw "path 'M64,50 h6 a9,9 0 0 1 0,18 h-6'" \
  -stroke '#cbd5e1' -strokewidth 3 -draw "path 'M34,34 Q39,27 34,20'" -draw "path 'M50,36 Q55,29 50,22'" \
  "$BASE/coffee.png"

convert -size 96x96 xc:none -fill '#a5b4fc' -draw "circle 48,48 48,14" \
  -fill '#7c8ae0' -draw "circle 38,36 38,31" -draw "circle 58,58 58,53" -draw "circle 60,34 60,30" \
  "$BASE/moon.png"

convert -size 96x96 xc:none -fill '#e2e8f5' -draw "circle 48,48 48,14" \
  -stroke '#0ea5e9' -strokewidth 4 -fill none -draw "circle 48,48 48,14" \
  -stroke '#0f172a' -strokewidth 4 -draw "path 'M48,26 L48,48 L62,56'" \
  "$BASE/clock.png"

# ---------- frame animation ----------

build_frames() {
  local name="$1" mode="$2"; shift 2
  local i=0 v
  rm -f "${FRAMES}/${name}"_*.png
  for v in "$@"; do
    case "$mode" in
      scale) convert "$BASE/$name.png" -background none -resize "${v}%x${v}%" \
               -gravity center -background none -extent 96x96 \
               "${FRAMES}/${name}_${i}.png" ;;
      roll)  convert "$BASE/$name.png" -background none -roll "+0+${v}" \
               "${FRAMES}/${name}_${i}.png" ;;
      spin)  convert "$BASE/$name.png" -background none -resize 72%x72% \
               -background none -rotate "$v" -gravity center -background none -extent 96x96 \
               "${FRAMES}/${name}_${i}.png" ;;
      shake) convert "$BASE/$name.png" -background none -resize 84%x84% \
               -background none -rotate "$v" -gravity center -background none -extent 96x96 \
               "${FRAMES}/${name}_${i}.png" ;;
      flick) convert "$BASE/$name.png" -background none -resize "$v" \
               -gravity center -background none -extent 96x96 \
               "${FRAMES}/${name}_${i}.png" ;;
    esac
    i=$((i + 1))
  done
  # shellcheck disable=SC2046
  convert $(ls "${FRAMES}/${name}"_*.png | sort) -background none \
    -alpha on -delay 14 -loop 0 -layers Optimize "$OUT/$name.gif"
}

build_frames heart   scale 100 106 110 106 100 95 97 100
build_frames fire    flick "100%x100%" "98%x104%" "102%x96%" "97%x106%" "100%x100%" "103%x94%" "99%x102%" "100%x100%"
build_frames laugh   roll  0 -4 -7 -4 0 2 3 0
build_frames cry     roll  0 -3 -5 -3 0 2 2 0
build_frames sad     scale 100 103 100 97 100 103 100 97
build_frames cool    roll  0 -3 -5 -3 0 2 3 0
build_frames thumbsup   roll 0 -5 -8 -5 0 3 4 0
build_frames thumbsdown roll 0 5 8 5 0 -3 -4 0
build_frames star    spin  0 25 50 25 0 -25 -50 -25
build_frames rocket  roll  0 -5 -9 -5 0 4 6 0
build_frames gift    shake -7 -4 0 4 7 4 0 -4
build_frames party   shake -6 -3 0 3 6 3 0 -3
build_frames coffee  scale 100 104 107 104 100 97 99 100
build_frames moon    scale 100 104 108 104 100 96 98 100
build_frames clock   spin  0 45 90 135 180 225 270 315

ls -la "$OUT"
