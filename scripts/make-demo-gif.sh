#!/usr/bin/env bash
# Builds docs/demo.gif from the frames written by scripts/record-demo.mjs.
#   scripts/make-demo-gif.sh [framesDir] [out.gif] [fps]
#
# 1. drops the 1 s lead-in and crossfades the last second into the opening frames, so the
#    14 s loop has no visible jump;
# 2. scales to 960 px and applies a small "deadband": pixels that only flicker (film grain,
#    particle twinkle, sub-pixel camera drift) keep their previous value, so static areas are
#    identical between frames and compress; real motion passes through untouched;
# 3. two-pass ffmpeg palette (256 colours, ordered/bayer dither, which unlike error diffusion
#    stays stable on unchanged pixels);
# 4. gifsicle -O3 --lossy=60 if gifsicle is installed (apt-get install gifsicle).
#
# Measured on the 2026-10 recording: 960 px @ 10 fps ≈ 8.4 MB (15 fps ≈ 12 MB).
set -euo pipefail
IN=${1:-/tmp/gridpulse-frames}
OUT=${2:-docs/demo.gif}
FPS=${3:-10}
FINAL=/tmp/gridpulse-frames-final
PALETTE=/tmp/gridpulse-palette.png
LEAD=15   # frames (1 s at the 15 fps capture rate)
FADE=15   # frames

rm -rf "$FINAL" && mkdir -p "$FINAL"
python3 -I - "$IN" "$FINAL" "$LEAD" "$FADE" <<'PY'
import sys, glob, os
from PIL import Image, ImageChops
src, dst, lead, fade = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
frames = sorted(glob.glob(os.path.join(src, 'frame_*.png')))
n = len(frames)
load = lambda f: Image.open(f).convert('RGB').resize((960, 570), Image.LANCZOS)
seq = [load(f) for f in frames[lead:n - fade]]                     # demo seconds 0 .. 13
for i, f in enumerate(frames[n - fade:]):                          # demo second 13 .. 14
    a = (i + 1) / (fade + 1)                                       # fade into the lead-in, so the
    seq.append(Image.blend(load(f), load(frames[i]), a))           # last frame flows into frame 1
T = 10  # luma difference below which a pixel keeps its previous value
prev = None
for k, cur in enumerate(seq, 1):
    if prev is not None:
        moving = ImageChops.difference(cur, prev).convert('L').point(lambda v: 255 if v >= T else 0)
        cur = Image.composite(cur, prev, moving)
    cur.save(os.path.join(dst, f'frame_{k:04d}.png'))
    prev = cur
print(f'{len(seq)} frames ({len(seq) / 15:.1f} s) written to {dst}')
PY

ffmpeg -loglevel error -y -r 15 -i "$FINAL/frame_%04d.png" \
  -vf "fps=$FPS,palettegen=max_colors=256:stats_mode=diff" "$PALETTE"
ffmpeg -loglevel error -y -r 15 -i "$FINAL/frame_%04d.png" -i "$PALETTE" \
  -lavfi "fps=$FPS [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 "$OUT"
if command -v gifsicle >/dev/null; then
  gifsicle -O3 --lossy=60 "$OUT" -o "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
fi
echo "$OUT: $(( $(stat -c %s "$OUT") / 1024 )) KiB at $FPS fps"
