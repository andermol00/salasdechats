#!/usr/bin/env bash
# Genera los GIFs animados propios de No Trace. Solo hace falta ImageMagick.
# Los archivos generados en public/gifs/ se suben al repositorio; Render no
# necesita ejecutar este script ni instalar ImageMagick.
set -euo pipefail

OUT="$(cd "$(dirname "$0")/.." && pwd)/public/gifs"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

make_gif() {
  local slug="$1" label="$2" bg="$3" panel="$4" accent="$5" light="$6"
  local folder="$TMP/$slug"
  mkdir -p "$folder"

  local sizes=(32 34 37 40 42 40 37 34 32 30 31 32)
  local ymoves=(1 0 -1 -3 -4 -3 -1 0 1 2 1 0)
  local dots=(0 3 7 11 15 19 23 20 16 12 8 4)
  local frame=""

  for i in {0..11}; do
    local sz="${sizes[$i]}" y="${ymoves[$i]}" dot="${dots[$i]}"
    local deco_x=$((25 + dot * 8)) deco_y=$((24 + (i % 4) * 2))
    local bar_x=$((33 + dot * 6))
    local spark_x=$((177 - dot * 5)) spark_y=$((103 - (i % 3) * 4))
    frame="$folder/$(printf '%02d' "$i").png"

    convert -size 224x144 "xc:$bg" \
      -fill "$panel" -stroke "$accent" -strokewidth 2 \
      -draw 'roundrectangle 5,5 218,138 20,20' \
      -stroke none -fill "$accent" \
      -draw "roundrectangle 20,19 $((20 + (i % 4) * 12)),24 3,3" \
      -draw "circle $deco_x,$deco_y $((deco_x + 3)),$deco_y" \
      -draw "circle $spark_x,$spark_y $((spark_x + 3)),$spark_y" \
      -draw "roundrectangle $bar_x,116 $((bar_x + 20)),120 2,2" \
      -draw 'circle 192,29 195,29' \
      -fill "$light" -font DejaVu-Sans-Bold -gravity center -pointsize "$sz" \
      -annotate "+0+$y" "$label" \
      -fill "$accent" -pointsize 11 -annotate +0+46 'NO TRACE  /  GIF' \
      "$frame"
  done

  convert -delay 8 -loop 0 "$folder"/*.png -colors 96 -layers Optimize "$OUT/$slug.gif"
  echo "  $slug.gif: $(stat -c '%s' "$OUT/$slug.gif") bytes"
}

# Reacciones tipo GIF, con texto animado (no SVG, no stickers, no API).
echo 'Generando GIFs de No Trace...'
make_gif hola 'HOLA!'   '#0b1930' '#112a41' '#22d3ee' '#dffaff'
make_gif jaja 'JAJA'    '#291534' '#3a1a47' '#f472b6' '#ffe9f5'
make_gif wow  'WOW!'    '#241838' '#36204d' '#c084fc' '#f7e8ff'
make_gif si   'SI!'     '#0d2a27' '#113b36' '#34d399' '#e3fff4'
make_gif no   'NOOO'    '#30191f' '#45202b' '#fb7185' '#ffeaef'
make_gif bravo 'BRAVO!' '#1c2337' '#293853' '#60a5fa' '#ecf6ff'
make_gif fiesta 'FIESTA' '#2c1c2d' '#452744' '#fbbf24' '#fff6d7'
make_gif gracias 'GRACIAS' '#1a2430' '#21384b' '#38bdf8' '#ecf9ff'
make_gif amor 'AMOR'    '#301a30' '#442040' '#f472b6' '#ffe5f1'
make_gif vamos 'VAMOS!' '#102a29' '#173e3b' '#2dd4bf' '#dcfff9'
make_gif ok 'OK!'       '#1d2436' '#2c3650' '#818cf8' '#eef2ff'
make_gif sorpresa 'OMG!' '#2a211a' '#413024' '#fb923c' '#fff1e4'
echo 'Listo.'
